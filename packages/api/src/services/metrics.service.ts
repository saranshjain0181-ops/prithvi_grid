/**
 * Prithvi Grid — OpenMetrics & Prometheus Instrumentation Service (Workstream I3)
 * Provides zero-dependency, high-throughput OpenMetrics / Prometheus metrics collection.
 */

type MetricLabels = Record<string, string | number>;

interface CounterRecord {
  name: string;
  help: string;
  values: Map<string, number>;
}

interface GaugeRecord {
  name: string;
  help: string;
  values: Map<string, number>;
}

interface HistogramRecord {
  name: string;
  help: string;
  buckets: number[];
  counts: Map<string, number[]>; // labelKey -> bucket counts
  sums: Map<string, number>;
  totals: Map<string, number>;
}

class MetricsRegistry {
  private counters = new Map<string, CounterRecord>();
  private gauges = new Map<string, GaugeRecord>();
  private histograms = new Map<string, HistogramRecord>();

  private formatLabels(labels?: MetricLabels): string {
    if (!labels || Object.keys(labels).length === 0) return '';
    const parts = Object.entries(labels).map(
      ([k, v]) => `${k}="${String(v).replace(/"/g, '\\"')}"`
    );
    return `{${parts.join(',')}}`;
  }

  private getLabelKey(labels?: MetricLabels): string {
    if (!labels) return '';
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
  }

  registerCounter(name: string, help: string): void {
    if (!this.counters.has(name)) {
      this.counters.set(name, { name, help, values: new Map() });
    }
  }

  registerGauge(name: string, help: string): void {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, { name, help, values: new Map() });
    }
  }

  registerHistogram(name: string, help: string, buckets: number[] = [10, 50, 100, 250, 500, 1000, 2500]): void {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, {
        name,
        help,
        buckets: [...buckets].sort((a, b) => a - b),
        counts: new Map(),
        sums: new Map(),
        totals: new Map(),
      });
    }
  }

  incrementCounter(name: string, labels?: MetricLabels, inc = 1): void {
    const c = this.counters.get(name);
    if (!c) return;
    const key = this.formatLabels(labels);
    c.values.set(key, (c.values.get(key) || 0) + inc);
  }

  setGauge(name: string, value: number, labels?: MetricLabels): void {
    const g = this.gauges.get(name);
    if (!g) return;
    const key = this.formatLabels(labels);
    g.values.set(key, value);
  }

  observeHistogram(name: string, value: number, labels?: MetricLabels): void {
    const h = this.histograms.get(name);
    if (!h) return;
    const labelKey = this.getLabelKey(labels);

    if (!h.counts.has(labelKey)) {
      h.counts.set(labelKey, new Array(h.buckets.length + 1).fill(0));
      h.sums.set(labelKey, 0);
      h.totals.set(labelKey, 0);
    }

    const bucketCounts = h.counts.get(labelKey)!;
    h.sums.set(labelKey, (h.sums.get(labelKey) || 0) + value);
    h.totals.set(labelKey, (h.totals.get(labelKey) || 0) + 1);

    for (let i = 0; i < h.buckets.length; i++) {
      if (value <= h.buckets[i]) {
        bucketCounts[i] += 1;
      }
    }
    // +Inf bucket
    bucketCounts[h.buckets.length] += 1;
  }

  toPrometheusFormat(): string {
    const lines: string[] = [
      '# Prithvi Grid Central Ingestion Engine — OpenMetrics Export',
      `# Timestamp: ${new Date().toISOString()}`,
      '',
    ];

    // Counters
    for (const [, c] of this.counters) {
      lines.push(`# HELP ${c.name} ${c.help}`);
      lines.push(`# TYPE ${c.name} counter`);
      if (c.values.size === 0) {
        lines.push(`${c.name} 0`);
      } else {
        for (const [labels, val] of c.values) {
          lines.push(`${c.name}${labels} ${val}`);
        }
      }
      lines.push('');
    }

    // Gauges
    for (const [, g] of this.gauges) {
      lines.push(`# HELP ${g.name} ${g.help}`);
      lines.push(`# TYPE ${g.name} gauge`);
      if (g.values.size === 0) {
        lines.push(`${g.name} 0`);
      } else {
        for (const [labels, val] of g.values) {
          lines.push(`${g.name}${labels} ${val}`);
        }
      }
      lines.push('');
    }

    // Histograms
    for (const [, h] of this.histograms) {
      lines.push(`# HELP ${h.name} ${h.help}`);
      lines.push(`# TYPE ${h.name} histogram`);
      for (const [labelKey, bucketCounts] of h.counts) {
        const baseLabels = labelKey ? labelKey.split(',').map((p) => p.split('=')) : [];
        const formatWithExtra = (extra: string) => {
          const all = [...baseLabels, extra.split('=')];
          return `{${all.map(([k, v]) => `${k}="${v}"`).join(',')}}`;
        };

        for (let i = 0; i < h.buckets.length; i++) {
          lines.push(`${h.name}_bucket${formatWithExtra(`le=${h.buckets[i]}`)} ${bucketCounts[i]}`);
        }
        lines.push(`${h.name}_bucket${formatWithExtra('le=+Inf')} ${bucketCounts[h.buckets.length]}`);
        lines.push(`${h.name}_sum${labelKey ? `{${labelKey.replace(/=/g, '="').replace(/,/g, '",')}"}` : ''} ${h.sums.get(labelKey) || 0}`);
        lines.push(`${h.name}_count${labelKey ? `{${labelKey.replace(/=/g, '="').replace(/,/g, '",')}"}` : ''} ${h.totals.get(labelKey) || 0}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

export const metricsRegistry = new MetricsRegistry();

// Initialize System Metrics
metricsRegistry.registerCounter(
  'prithvi_telemetry_packets_ingested_total',
  'Total raw telemetry packets ingested via 4G hardware endpoints'
);
metricsRegistry.registerHistogram(
  'prithvi_telemetry_ingest_duration_ms',
  'Time in milliseconds taken to process and acknowledge an ingestion payload',
  [10, 25, 50, 100, 250, 500, 1000]
);
metricsRegistry.registerGauge(
  'prithvi_supercapacitor_voltage_mv',
  'Latest reported supercapacitor voltage in millivolts'
);
metricsRegistry.registerCounter(
  'prithvi_sanjivani_alerts_total',
  'Total biological emergency alerts triggered by Sanjivani Engine'
);
metricsRegistry.registerCounter(
  'prithvi_kaam_ka_saboot_verifications_total',
  'Total labour task verifications classified by physical variance engine'
);
metricsRegistry.registerGauge(
  'prithvi_active_nodes_count',
  'Count of physical IoT nodes grouped by lifecycle status'
);
metricsRegistry.registerCounter(
  'prithvi_http_requests_total',
  'Total HTTP requests processed by Fastify gateway'
);
metricsRegistry.registerHistogram(
  'prithvi_http_request_duration_ms',
  'HTTP request execution duration across Fastify routes',
  [5, 15, 50, 100, 300, 1000, 3000]
);
