import {
  Actuator,
  AutomationMode,
  ActuatorCommand,
  SafetyTrip,
  InterlockRule,
} from '../db/models/ActuatorGateway';

export class ActuatorGatewayService {
  private actuators: Map<string, Actuator> = new Map();
  private interlocks: Map<string, InterlockRule[]> = new Map();
  private commands: Map<string, ActuatorCommand> = new Map();
  private trips: SafetyTrip[] = [];

  public registerActuator(actuator: Actuator): void {
    this.actuators.set(actuator.actuatorId, actuator);
    if (!this.interlocks.has(actuator.actuatorId)) {
      this.interlocks.set(actuator.actuatorId, []);
    }
  }

  public registerInterlock(interlock: InterlockRule): void {
    const list = this.interlocks.get(interlock.actuatorId) || [];
    list.push(interlock);
    this.interlocks.set(interlock.actuatorId, list);
  }

  public transitionMode(params: {
    actuatorId: string;
    targetMode: AutomationMode;
    electricalSafetyCertId?: string;
    approvedByAuthorityMatrix: boolean;
  }): { success: boolean; actuator: Actuator; message: string } {
    const actuator = this.actuators.get(params.actuatorId);
    if (!actuator) throw new Error(`Actuator ${params.actuatorId} not found`);

    if (params.targetMode === 'AUTOMATIC') {
      if (!params.approvedByAuthorityMatrix) {
        throw new Error(
          'Transition to AUTOMATIC requires formal Authority Matrix sign-off'
        );
      }
      if (!params.electricalSafetyCertId && !actuator.electricalSafetyCertifiedAt) {
        throw new Error(
          'Transition to AUTOMATIC requires recorded electrical safety certification [EXPERT-REVIEW]'
        );
      }
    }

    actuator.currentMode = params.targetMode;
    if (params.electricalSafetyCertId) {
      actuator.electricalSafetyCertifiedAt = new Date().toISOString();
    }

    return {
      success: true,
      actuator,
      message: `Actuator transitioned to mode ${params.targetMode}`,
    };
  }

  public setManualOverride(actuatorId: string, isActive: boolean): void {
    const actuator = this.actuators.get(actuatorId);
    if (actuator) {
      actuator.manualOverrideActive = isActive;
    }
  }

  public dispatchCommand(params: {
    actuatorId: string;
    idempotencyKey: string;
    targetDurationSeconds: number;
    context: Record<string, any>;
  }): ActuatorCommand {
    const actuator = this.actuators.get(params.actuatorId);
    if (!actuator) throw new Error(`Actuator ${params.actuatorId} not found`);

    const commandId = `CMD-${Date.now()}`;

    // Hardware safety check: Physical manual override switch always wins
    if (actuator.manualOverrideActive) {
      const cmd: ActuatorCommand = {
        commandId,
        idempotencyKey: params.idempotencyKey,
        actuatorId: params.actuatorId,
        targetDurationSeconds: params.targetDurationSeconds,
        mode: actuator.currentMode,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        status: 'OVERRIDDEN_MANUAL',
        failureReason: 'Physical manual switch active at equipment',
      };
      this.commands.set(commandId, cmd);
      return cmd;
    }

    // Safety check: Command cap
    const safeDuration = Math.min(params.targetDurationSeconds, actuator.maxRunSecondsPerCommand);

    // Daily budget check
    if (actuator.currentDailySecondsUsed + safeDuration > actuator.dailyMaxSecondsBudget) {
      const cmd: ActuatorCommand = {
        commandId,
        idempotencyKey: params.idempotencyKey,
        actuatorId: params.actuatorId,
        targetDurationSeconds: safeDuration,
        mode: actuator.currentMode,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        status: 'VETOED_INTERLOCK',
        failureReason: 'Daily run time budget exceeded',
      };
      this.commands.set(commandId, cmd);
      return cmd;
    }

    // Check Interlocks
    const interlocks = this.interlocks.get(params.actuatorId) || [];
    for (const rule of interlocks) {
      if (rule.isTriggered(params.context)) {
        const cmd: ActuatorCommand = {
          commandId,
          idempotencyKey: params.idempotencyKey,
          actuatorId: params.actuatorId,
          targetDurationSeconds: safeDuration,
          mode: actuator.currentMode,
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60000).toISOString(),
          status: 'VETOED_INTERLOCK',
          failureReason: `Interlock vetoed: ${rule.description}`,
        };
        this.commands.set(commandId, cmd);
        return cmd;
      }
    }

    const cmd: ActuatorCommand = {
      commandId,
      idempotencyKey: params.idempotencyKey,
      actuatorId: params.actuatorId,
      targetDurationSeconds: safeDuration,
      mode: actuator.currentMode,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      status: 'SENT',
    };

    this.commands.set(commandId, cmd);
    return cmd;
  }

  public confirmCommandExecution(params: {
    commandId: string;
    measuredCurrentAmps: number;
  }): ActuatorCommand {
    const cmd = this.commands.get(params.commandId);
    if (!cmd) throw new Error(`Command ${params.commandId} not found`);

    const actuator = this.actuators.get(cmd.actuatorId);

    // If current sensor reports 0 amps while command is active -> FAULT
    if (params.measuredCurrentAmps <= 0.05) {
      cmd.status = 'FAULT';
      cmd.failureReason = 'Current sensor detected zero amperage (actuator failed to fire or power severed)';
      if (actuator) actuator.status = 'FAULT';

      this.trips.push({
        tripId: `TRIP-${Date.now()}`,
        actuatorId: cmd.actuatorId,
        reason: cmd.failureReason,
        timestamp: new Date().toISOString(),
        resetRequired: true,
      });
      return cmd;
    }

    cmd.status = 'CONFIRMED';
    cmd.confirmedAt = new Date().toISOString();
    cmd.measuredCurrentAmps = params.measuredCurrentAmps;

    if (actuator) {
      actuator.currentDailySecondsUsed += cmd.targetDurationSeconds;
      actuator.lastCurrentAmpsReading = params.measuredCurrentAmps;
      actuator.status = 'ONLINE';
    }

    return cmd;
  }

  public getActuatorStatus(actuatorId: string) {
    const actuator = this.actuators.get(actuatorId);
    const actuatorCommands = Array.from(this.commands.values()).filter(
      (c) => c.actuatorId === actuatorId
    );
    const trips = this.trips.filter((t) => t.actuatorId === actuatorId);

    return {
      actuator,
      totalCommandsSent: actuatorCommands.length,
      confirmedCommands: actuatorCommands.filter((c) => c.status === 'CONFIRMED').length,
      faultsCount: actuatorCommands.filter((c) => c.status === 'FAULT').length,
      interlockVetoesCount: actuatorCommands.filter((c) => c.status === 'VETOED_INTERLOCK').length,
      safetyTrips: trips,
    };
  }
}
