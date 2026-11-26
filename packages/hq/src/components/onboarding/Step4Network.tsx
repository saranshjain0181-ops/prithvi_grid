import type { OnboardingFormData, CompostBox } from '@/types';

interface Step4Props {
  data: OnboardingFormData;
  onChange: (field: keyof OnboardingFormData, value: unknown) => void;
}

export default function Step4Network({ data, onChange }: Step4Props) {
  const updateNodeField = (
    boxIndex: number,
    nodeIndex: number,
    field: 'mac' | 'imei' | 'simNo',
    value: string,
  ) => {
    const newBoxes: CompostBox[] = data.boxes.map((box, bi) =>
      bi === boxIndex
        ? {
            ...box,
            nodes: box.nodes.map((node, ni) =>
              ni === nodeIndex ? { ...node, [field]: value } : node,
            ),
          }
        : box,
    );
    onChange('boxes', newBoxes);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-hq-text">Network Information</h2>
        <p className="text-sm text-hq-muted mt-1">Enter MAC address, IMEI, and SIM details for each node</p>
      </div>

      {data.boxes.map((box, bi) => (
        <div key={box.boxNo}>
          <h3 className="text-sm font-semibold text-hq-accent mb-2">
            Box {box.boxNo} — {box.nodesCount} node(s)
          </h3>
          <div className="border border-hq-border rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-hq-bg text-hq-muted text-xs uppercase">
                  <th className="px-3 py-2 text-left w-16">Node</th>
                  <th className="px-3 py-2 text-left">MAC Address</th>
                  <th className="px-3 py-2 text-left">IMEI Number</th>
                  <th className="px-3 py-2 text-left">Airtel SIM No.</th>
                </tr>
              </thead>
              <tbody>
                {box.nodes.map((node, ni) => (
                  <tr key={node.nodeNo} className="border-t border-hq-border">
                    <td className="px-3 py-2 text-hq-muted font-mono text-center">N{node.nodeNo}</td>
                    <td className="px-3 py-1.5">
                      <input
                        className="hq-input font-mono text-xs"
                        value={node.mac}
                        onChange={(e) => updateNodeField(bi, ni, 'mac', e.target.value)}
                        placeholder="AA:BB:CC:DD:EE:FF"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        className="hq-input font-mono text-xs"
                        value={node.imei}
                        onChange={(e) => updateNodeField(bi, ni, 'imei', e.target.value)}
                        placeholder="15-digit IMEI"
                        maxLength={15}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        className="hq-input font-mono text-xs"
                        value={node.simNo}
                        onChange={(e) => updateNodeField(bi, ni, 'simNo', e.target.value)}
                        placeholder="SIM ICCID"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
