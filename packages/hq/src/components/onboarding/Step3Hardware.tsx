import type { OnboardingFormData, CompostBox, ArchType } from '@/types';

interface Step3Props {
  data: OnboardingFormData;
  onChange: (field: keyof OnboardingFormData, value: unknown) => void;
}

const ARCH_TYPES: ArchType[] = ['Single', 'Master-Slave Array'];

function buildBoxes(count: number, nodesPerBox: number, existingBoxes: CompostBox[]): CompostBox[] {
  return Array.from({ length: count }, (_, i) => {
    const existing = existingBoxes[i];
    return existing
      ? { ...existing, nodesCount: nodesPerBox, nodes: buildNodes(nodesPerBox, existing.nodes) }
      : {
          boxNo: i + 1,
          capacityKg: 100,
          nodesCount: nodesPerBox,
          nodes: buildNodes(nodesPerBox, []),
        };
  });
}

function buildNodes(count: number, existing: CompostBox['nodes']) {
  return Array.from({ length: count }, (_, i) => existing[i] ?? { nodeNo: i + 1, mac: '', imei: '', simNo: '' });
}

export default function Step3Hardware({ data, onChange }: Step3Props) {
  const updateBoxCount = (count: number) => {
    const boxes = buildBoxes(count, data.boxes[0]?.nodesCount ?? 1, data.boxes);
    onChange('noOfBoxes', count);
    onChange('boxes', boxes);
  };

  const updateNodesPerBox = (nodes: number) => {
    const boxes = buildBoxes(data.noOfBoxes, nodes, data.boxes);
    onChange('boxes', boxes);
  };

  const updateBoxField = (boxIndex: number, field: 'capacityKg', value: number) => {
    const newBoxes = data.boxes.map((b, i) => (i === boxIndex ? { ...b, [field]: value } : b));
    onChange('boxes', newBoxes);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-hq-text">Hardware Layout</h2>
        <p className="text-sm text-hq-muted mt-1">Define compost box count, capacity, and node architecture</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="hq-label">No. of Compost Boxes *</label>
          <input
            className="hq-input"
            type="number"
            min={1}
            max={20}
            value={data.noOfBoxes}
            onChange={(e) => updateBoxCount(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="hq-label">Nodes per Box *</label>
          <input
            className="hq-input"
            type="number"
            min={1}
            max={8}
            value={data.boxes[0]?.nodesCount ?? 1}
            onChange={(e) => updateNodesPerBox(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="hq-label">Architecture Type *</label>
          <select
            className="hq-select"
            value={data.architecture}
            onChange={(e) => onChange('architecture', e.target.value as ArchType)}
          >
            {ARCH_TYPES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Per-box capacity table */}
      {data.boxes.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-hq-muted uppercase tracking-wider mb-3">Box Configuration</h3>
          <div className="border border-hq-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-hq-bg text-hq-muted text-xs uppercase">
                  <th className="px-4 py-2 text-left">Box #</th>
                  <th className="px-4 py-2 text-left">Capacity (kg)</th>
                  <th className="px-4 py-2 text-left">Nodes</th>
                </tr>
              </thead>
              <tbody>
                {data.boxes.map((box, i) => (
                  <tr key={box.boxNo} className="border-t border-hq-border">
                    <td className="px-4 py-2 text-hq-muted font-mono">Box {box.boxNo}</td>
                    <td className="px-4 py-2">
                      <input
                        className="hq-input w-28"
                        type="number"
                        min={10}
                        value={box.capacityKg}
                        onChange={(e) => updateBoxField(i, 'capacityKg', Number(e.target.value))}
                      />
                    </td>
                    <td className="px-4 py-2 text-hq-text font-mono">{box.nodesCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
