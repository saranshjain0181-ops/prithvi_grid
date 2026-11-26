import { LiveTelemetry } from '../db/models/LiveTelemetry';
import { TelemetryRollupHourly } from '../db/models/TelemetryRollupHourly';
import { TelemetryRollupDaily } from '../db/models/TelemetryRollupDaily';

/**
 * Service to calculate tiered rollups for long-term SWM compliance audit trails.
 */
export async function computeHourlyRollups(targetHour?: Date): Promise<number> {
  const end = targetHour ? new Date(targetHour) : new Date();
  end.setMinutes(0, 0, 0); // Round down to top of the hour

  const start = new Date(end.getTime() - 60 * 60 * 1000); // 1 hour prior

  const aggregation = await LiveTelemetry.aggregate([
    {
      $match: {
        timestamp: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: {
          nodeId: '$nodeId',
          facilityId: '$facilityId',
          entityId: '$entityId',
          boxId: '$boxId',
        },
        count: { $sum: 1 },
        minTemp: { $min: '$tempC' },
        maxTemp: { $max: '$tempC' },
        avgTemp: { $avg: '$tempC' },
        minMoist: { $min: '$moisturePct' },
        maxMoist: { $max: '$moisturePct' },
        avgMoist: { $avg: '$moisturePct' },
        minPh: { $min: '$ph' },
        maxPh: { $max: '$ph' },
        avgPh: { $avg: '$ph' },
        minMethane: { $min: '$methanePpm' },
        maxMethane: { $max: '$methanePpm' },
        avgMethane: { $avg: '$methanePpm' },
        minPressure: { $min: '$airPressureHpa' },
        maxPressure: { $max: '$airPressureHpa' },
        avgPressure: { $avg: '$airPressureHpa' },
        minBattery: { $min: '$batteryMv' },
        maxBattery: { $max: '$batteryMv' },
        avgBattery: { $avg: '$batteryMv' },
      },
    },
  ]);

  let upsertCount = 0;
  for (const group of aggregation) {
    await TelemetryRollupHourly.findOneAndUpdate(
      {
        bucketStart: start,
        'metadata.nodeId': group._id.nodeId,
      },
      {
        bucketStart: start,
        bucketEnd: end,
        metadata: {
          nodeId: group._id.nodeId,
          facilityId: group._id.facilityId,
          entityId: group._id.entityId,
          boxId: group._id.boxId,
        },
        count: group.count,
        temp: {
          min: Number(group.minTemp.toFixed(1)),
          max: Number(group.maxTemp.toFixed(1)),
          avg: Number(group.avgTemp.toFixed(1)),
        },
        moisture: {
          min: Number(group.minMoist.toFixed(1)),
          max: Number(group.maxMoist.toFixed(1)),
          avg: Number(group.avgMoist.toFixed(1)),
        },
        ph: {
          min: Number(group.minPh.toFixed(2)),
          max: Number(group.maxPh.toFixed(2)),
          avg: Number(group.avgPh.toFixed(2)),
        },
        methane: {
          min: Math.round(group.minMethane),
          max: Math.round(group.maxMethane),
          avg: Math.round(group.avgMethane),
        },
        airPressure: {
          min: Number(group.minPressure.toFixed(1)),
          max: Number(group.maxPressure.toFixed(1)),
          avg: Number(group.avgPressure.toFixed(1)),
        },
        batteryMv: {
          min: Math.round(group.minBattery),
          max: Math.round(group.maxBattery),
          avg: Math.round(group.avgBattery),
        },
      },
      { upsert: true, new: true }
    );
    upsertCount++;
  }

  return upsertCount;
}

export async function computeDailyRollups(targetDay?: Date): Promise<number> {
  const day = targetDay ? new Date(targetDay) : new Date();
  day.setUTCHours(0, 0, 0, 0);

  const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000);

  const hourlyBuckets = await TelemetryRollupHourly.find({
    bucketStart: { $gte: day, $lt: nextDay },
  }).lean();

  if (hourlyBuckets.length === 0) return 0;

  // Group by nodeId
  const byNode = new Map<string, typeof hourlyBuckets>();
  for (const h of hourlyBuckets) {
    const key = h.metadata.nodeId.toString();
    const existing = byNode.get(key) || [];
    existing.push(h);
    byNode.set(key, existing);
  }

  let dailyCount = 0;
  for (const [nodeIdStr, buckets] of byNode.entries()) {
    const meta = buckets[0].metadata;
    const totalPackets = buckets.reduce((acc, cur) => acc + cur.count, 0);

    const thermophilicHours = buckets.filter((b) => b.temp.avg >= 55).length;
    const aerobicHours = buckets.filter((b) => b.methane.avg < 300).length;

    // Compliance score formula: (thermophilicHours/24 * 50) + (aerobicHours/24 * 50)
    const complianceScore = Math.min(
      100,
      Math.round((thermophilicHours / Math.max(1, buckets.length)) * 50 + (aerobicHours / Math.max(1, buckets.length)) * 50)
    );

    const minTemp = Math.min(...buckets.map((b) => b.temp.min));
    const maxTemp = Math.max(...buckets.map((b) => b.temp.max));
    const avgTemp = buckets.reduce((acc, cur) => acc + cur.temp.avg, 0) / buckets.length;

    const minMoist = Math.min(...buckets.map((b) => b.moisture.min));
    const maxMoist = Math.max(...buckets.map((b) => b.moisture.max));
    const avgMoist = buckets.reduce((acc, cur) => acc + cur.moisture.avg, 0) / buckets.length;

    const minPh = Math.min(...buckets.map((b) => b.ph.min));
    const maxPh = Math.max(...buckets.map((b) => b.ph.max));
    const avgPh = buckets.reduce((acc, cur) => acc + cur.ph.avg, 0) / buckets.length;

    const minMethane = Math.min(...buckets.map((b) => b.methane.min));
    const maxMethane = Math.max(...buckets.map((b) => b.methane.max));
    const avgMethane = buckets.reduce((acc, cur) => acc + cur.methane.avg, 0) / buckets.length;

    const minPressure = Math.min(...buckets.map((b) => b.airPressure.min));
    const maxPressure = Math.max(...buckets.map((b) => b.airPressure.max));
    const avgPressure = buckets.reduce((acc, cur) => acc + cur.airPressure.avg, 0) / buckets.length;

    const minBattery = Math.min(...buckets.map((b) => b.batteryMv.min));
    const maxBattery = Math.max(...buckets.map((b) => b.batteryMv.max));
    const avgBattery = buckets.reduce((acc, cur) => acc + cur.batteryMv.avg, 0) / buckets.length;

    await TelemetryRollupDaily.findOneAndUpdate(
      {
        bucketDate: day,
        'metadata.nodeId': meta.nodeId,
      },
      {
        bucketDate: day,
        metadata: meta,
        totalPackets,
        thermophilicHours,
        aerobicHours,
        complianceScore,
        temp: { min: minTemp, max: maxTemp, avg: Number(avgTemp.toFixed(1)) },
        moisture: { min: minMoist, max: maxMoist, avg: Number(avgMoist.toFixed(1)) },
        ph: { min: minPh, max: maxPh, avg: Number(avgPh.toFixed(2)) },
        methane: { min: minMethane, max: maxMethane, avg: Math.round(avgMethane) },
        airPressure: { min: minPressure, max: maxPressure, avg: Number(avgPressure.toFixed(1)) },
        batteryMv: { min: minBattery, max: maxBattery, avg: Math.round(avgBattery) },
        pinned: true,
      },
      { upsert: true, new: true }
    );
    dailyCount++;
  }

  return dailyCount;
}
