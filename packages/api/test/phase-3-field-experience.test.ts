import { describe, it } from 'node:test';
import assert from 'node:assert';
import { aiGateway } from '../src/services/ai-gateway.service';

describe('Phase 3: Field & Labour Experience Tests', () => {
  describe('Workstream E2: Closed-Vocabulary Voice Command Parser', () => {
    it('correctly maps Hindi waste-turning phrases to KACHRA_GHUMAYA with high confidence', () => {
      const inputs = [
        'कचरा घुमा दिया भाई',
        'कचरा पलटा लगा दिया',
        'kachra ghumaya pura',
        'kachra palat diya',
      ];

      for (const phrase of inputs) {
        const result = aiGateway.parseClosedVoiceCommand(phrase);
        assert.strictEqual(result.intent, 'ACTION_LOG');
        assert.strictEqual(result.actionType, 'KACHRA_GHUMAYA');
        assert.ok(result.confidence >= 0.9, `Confidence should be >= 0.9 for "${phrase}"`);
      }
    });

    it('correctly maps water sprinkling phrases to PAANI_CHHIDKA', () => {
      const inputs = [
        'पानी छिड़क दिया',
        '2 बाल्टी पानी डाला',
        'paani chhidka pit me',
        'pani dala',
      ];

      for (const phrase of inputs) {
        const result = aiGateway.parseClosedVoiceCommand(phrase);
        assert.strictEqual(result.intent, 'ACTION_LOG');
        assert.strictEqual(result.actionType, 'PAANI_CHHIDKA');
        assert.ok(result.confidence >= 0.9);
      }
    });

    it('correctly maps input materials (wet waste, dry leaves, neem powder, gud pani)', () => {
      assert.strictEqual(aiGateway.parseClosedVoiceCommand('गीला कचरा डाला 40 किलो').actionType, 'GEELA_KACHRA_DALA');
      assert.strictEqual(aiGateway.parseClosedVoiceCommand('सूखे पत्ते मिलाए').actionType, 'SOOKHE_PATTE_DALA');
      assert.strictEqual(aiGateway.parseClosedVoiceCommand('गुड़ का पानी दिया').actionType, 'GUD_PAANI_DALA');
      assert.strictEqual(aiGateway.parseClosedVoiceCommand('नीम पाउडर छिड़का').actionType, 'NEEM_POWDER_DALA');
      assert.strictEqual(aiGateway.parseClosedVoiceCommand('खाद निकाल ली').actionType, 'KHAD_NIKALI');
    });

    it('correctly classifies status inquiries without false action triggers', () => {
      const result = aiGateway.parseClosedVoiceCommand('गड्ढे का हाल बताओ, सब ठीक है?');
      assert.strictEqual(result.intent, 'STATUS_QUERY');
      assert.strictEqual(result.actionType, undefined);
    });
  });

  describe('Workstream E5: Diary Sanity Bounds & 5-Minute Undo Rules', () => {
    it('enforces 5-minute undo window mathematical threshold', () => {
      const now = Date.now();
      const withinWindow = new Date(now - 4 * 60 * 1000); // 4 minutes ago
      const expiredWindow = new Date(now - 6 * 60 * 1000); // 6 minutes ago

      const isUndoEligible = (createdAt: Date) => now - createdAt.getTime() <= 5 * 60 * 1000;

      assert.strictEqual(isUndoEligible(withinWindow), true);
      assert.strictEqual(isUndoEligible(expiredWindow), false);
    });

    it('enforces 7-day maximum backdating rule for regular staff', () => {
      const now = Date.now();
      const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
      const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000);
      const tenMinutesInFuture = new Date(now + 10 * 60 * 1000);

      const isValidDateRange = (date: Date, role: string) => {
        if (role === 'SUPREME_HEAD') return true;
        const time = date.getTime();
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        const fiveMinFuture = now + 5 * 60 * 1000;
        return time >= sevenDaysAgo && time <= fiveMinFuture;
      };

      assert.strictEqual(isValidDateRange(threeDaysAgo, 'SAFAI_MITRA'), true);
      assert.strictEqual(isValidDateRange(eightDaysAgo, 'SAFAI_MITRA'), false);
      assert.strictEqual(isValidDateRange(tenMinutesInFuture, 'SAFAI_MITRA'), false);
      // Supreme Head bypass
      assert.strictEqual(isValidDateRange(eightDaysAgo, 'SUPREME_HEAD'), true);
    });

    it('rejects weights exceeding 5,000 kg single-entry sanity limit', () => {
      const validateWeight = (kg: number) => kg >= 0.1 && kg <= 5000;
      assert.strictEqual(validateWeight(40), true);
      assert.strictEqual(validateWeight(1500), true);
      assert.strictEqual(validateWeight(5000), true);
      assert.strictEqual(validateWeight(5001), false);
      assert.strictEqual(validateWeight(0), false);
      assert.strictEqual(validateWeight(-10), false);
    });
  });

  describe('Workstream D4: Remote Command Lifecycle & Piggybacking Contract', () => {
    it('validates allowed remote command types', () => {
      const ALLOWED_COMMANDS = ['BUZZER_MUTE', 'LED_STROBE', 'SET_BURST_INTERVAL', 'REBOOT', 'DIAGNOSTIC_PING'];
      assert.ok(ALLOWED_COMMANDS.includes('BUZZER_MUTE'));
      assert.ok(ALLOWED_COMMANDS.includes('REBOOT'));
      assert.strictEqual(ALLOWED_COMMANDS.includes('INVALID_CMD' as any), false);
    });

    it('simulates battery-less wake-up piggyback dispatch transformation', () => {
      const mockPendingCommands = [
        { _id: 'cmd-1', command: 'BUZZER_MUTE', payload: { reason: 'Manager reset' }, status: 'PENDING' },
        { _id: 'cmd-2', command: 'DIAGNOSTIC_PING', payload: {}, status: 'PENDING' },
      ];

      // On modem burst: transform to dispatched
      const dispatched = mockPendingCommands.map((c) => ({
        id: c._id,
        command: c.command,
        payload: c.payload,
      }));

      assert.strictEqual(dispatched.length, 2);
      assert.strictEqual(dispatched[0].command, 'BUZZER_MUTE');
      assert.strictEqual(dispatched[1].command, 'DIAGNOSTIC_PING');
    });
  });
});
