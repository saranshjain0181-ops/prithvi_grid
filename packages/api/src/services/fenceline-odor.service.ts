import {
  OdorPoint,
  OdorRating,
  NeighbourContact,
  NeighbourNotice,
  NeighbourComplaint,
  OdorCharacter,
} from '../db/models/FencelineOdor';

export class FencelineOdorService {
  private points: Map<string, OdorPoint> = new Map();
  private ratings: OdorRating[] = [];
  private contacts: Map<string, NeighbourContact> = new Map();
  private notices: NeighbourNotice[] = [];
  private complaints: NeighbourComplaint[] = [];

  public registerPoint(point: OdorPoint): void {
    this.points.set(point.pointId, point);
  }

  public registerContact(contact: NeighbourContact): void {
    this.contacts.set(contact.contactId, contact);
  }

  public recordRating(rating: OdorRating): OdorRating {
    this.ratings.push(rating);
    return rating;
  }

  public evaluateTurningWindRisk(params: {
    facilityId: string;
    windDirectionDegrees: number;
    windSpeedKmph: number;
  }): { isTurningSafe: boolean; warning?: string; affectedReceptor?: string } {
    const sensitivePoints = Array.from(this.points.values()).filter(
      (p) => p.facilityId === params.facilityId && p.isSensitiveReceptor
    );

    for (const point of sensitivePoints) {
      // Approximate vector angle: assume receptor is at angle ~90° (East boundary)
      const diff = Math.abs(params.windDirectionDegrees - 90);
      const angleDelta = Math.min(diff, 360 - diff);

      if (angleDelta <= 35 && params.windSpeedKmph >= 5) {
        return {
          isTurningSafe: false,
          warning: `Wind (${params.windDirectionDegrees}°, ${params.windSpeedKmph}km/h) blows toward sensitive receptor: ${point.receptorName}. Delay pile turning until wind shifts [EXPERT-REVIEW]`,
          affectedReceptor: point.receptorName,
        };
      }
    }

    return { isTurningSafe: true };
  }

  public sendNeighbourNotice(params: {
    facilityId: string;
    title: string;
    activityType: 'HIGH_VOLUME_TURNING' | 'COMPOST_SCREENING' | 'MAINTENANCE';
    scheduledDate: string;
    messageHindi: string;
    messageEnglish: string;
  }): NeighbourNotice {
    const recipients = Array.from(this.contacts.values()).filter(
      (c) => c.facilityId === params.facilityId && c.consentGranted
    );

    const notice: NeighbourNotice = {
      noticeId: `NOT-${Date.now()}`,
      facilityId: params.facilityId,
      title: params.title,
      activityType: params.activityType,
      scheduledDate: params.scheduledDate,
      messageHindi: params.messageHindi,
      messageEnglish: params.messageEnglish,
      sentAt: new Date().toISOString(),
      recipientsCount: recipients.length,
    };

    this.notices.push(notice);
    return notice;
  }

  public logComplaint(params: {
    facilityId: string;
    contactId?: string;
    locationDescription: string;
    observedOdorCharacter: OdorCharacter;
  }): NeighbourComplaint {
    const complaintId = `COMP-${Date.now()}`;
    const reportedAt = new Date().toISOString();
    const responseDueAt = new Date(Date.now() + 4 * 3600 * 1000).toISOString(); // 4-hour SLA

    const complaint: NeighbourComplaint = {
      complaintId,
      facilityId: params.facilityId,
      contactId: params.contactId,
      locationDescription: params.locationDescription,
      observedOdorCharacter: params.observedOdorCharacter,
      reportedAt,
      responseDueAt,
      status: 'OPEN',
    };

    this.complaints.push(complaint);
    return complaint;
  }

  public getBoundaryOdorSummary(facilityId: string) {
    const recentRatings = this.ratings.filter((r) => {
      const pt = this.points.get(r.pointId);
      return pt?.facilityId === facilityId;
    });

    const highOdorReadings = recentRatings.filter((r) => r.intensity >= 3);
    const complaints = this.complaints.filter((c) => c.facilityId === facilityId);

    return {
      totalSurveysLogged: recentRatings.length,
      highOdorIncidents: highOdorReadings.length,
      openComplaintsCount: complaints.filter((c) => c.status === 'OPEN').length,
      recentNoticesCount: this.notices.filter((n) => n.facilityId === facilityId).length,
    };
  }
}
