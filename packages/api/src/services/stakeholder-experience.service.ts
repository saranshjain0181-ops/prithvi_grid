import {
  StakeholderExperienceView,
  StakeholderGroupSentiment,
} from '../db/models/StakeholderExperience';

export class StakeholderExperienceService {
  public computeExperienceView(params: {
    tenantId: string;
    facilityId: string;
    groupsData: {
      groupName: StakeholderGroupSentiment['groupName'];
      openComplaints: number;
      avgResponseHours: number;
      pulseSatisfactionPct: number;
      topIssue: string;
    }[];
    noticesBroadcastedCount: number;
    compostDistributedKg: number;
  }): StakeholderExperienceView {
    const groups: StakeholderGroupSentiment[] = params.groupsData.map((g) => {
      // Index score: 100 base, minus complaints penalty, plus pulse satisfaction weight
      let score = g.pulseSatisfactionPct;
      score -= g.openComplaints * 8;
      if (g.avgResponseHours > 4) {
        score -= Math.round(g.avgResponseHours - 4) * 2;
      }
      score = Math.max(0, Math.min(100, Math.round(score)));

      return {
        groupName: g.groupName,
        experienceIndex: score,
        openComplaints: g.openComplaints,
        averageResponseTimeHours: g.avgResponseHours,
        pulseSatisfactionPct: g.pulseSatisfactionPct,
        topAffectingIssue: g.topIssue,
      };
    });

    const overallIndex =
      groups.length > 0
        ? Math.round(groups.reduce((acc, g) => acc + g.experienceIndex, 0) / groups.length)
        : 85;

    return {
      tenantId: params.tenantId,
      facilityId: params.facilityId,
      asOfDate: new Date().toISOString(),
      overallExperienceIndex: overallIndex,
      groups,
      totalNoticesBroadcasted: params.noticesBroadcastedCount,
      compostDistributedToCommunityKg: params.compostDistributedKg,
      greenBadgeStatus: overallIndex >= 80 ? 'CERTIFIED' : 'UNDER_REVIEW',
    };
  }
}
