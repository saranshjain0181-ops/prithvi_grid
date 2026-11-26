import React, { useState } from 'react';
import { Crown, Building2, Box, Radio, ChevronRight } from 'lucide-react';

interface ClientEntity {
  id: string;
  name: string;
  facilities: {
    id: string;
    name: string;
    boxes: {
      id: string;
      name: string;
      nodes: {
        id: string;
        name: string;
      }[];
    }[];
  }[];
}

const SEEDED_CLIENTS: ClientEntity[] = [
  {
    id: 'ent-1',
    name: 'Prithvi Grid Central',
    facilities: [
      {
        id: 'fac-1',
        name: 'Indore Central NOC Facility',
        boxes: [
          {
            id: 'box-1',
            name: 'Central Gaddha Alpha',
            nodes: [
              { id: 'node-1', name: 'Central Sensor Node A1' },
              { id: 'node-2', name: 'Sensor Node A2' },
            ],
          },
          {
            id: 'box-2',
            name: 'Central Gaddha Beta',
            nodes: [{ id: 'node-3', name: 'Sensor Node B1' }],
          },
        ],
      },
    ],
  },
  {
    id: 'ent-2',
    name: 'Indore Residency RWA',
    facilities: [
      {
        id: 'fac-2',
        name: 'Residency Bio-Processing Yard',
        boxes: [
          {
            id: 'box-3',
            name: 'Residency Pit 1',
            nodes: [{ id: 'node-4', name: 'Residency Node R1' }],
          },
        ],
      },
    ],
  },
  {
    id: 'ent-3',
    name: 'Apollo Hospitals BWG',
    facilities: [
      {
        id: 'fac-3',
        name: 'Apollo Onsite Processing Unit',
        boxes: [
          {
            id: 'box-4',
            name: 'Hospital Canteen Pit 1',
            nodes: [{ id: 'node-5', name: 'Apollo Bio-Node H1' }],
          },
        ],
      },
    ],
  },
  {
    id: 'ent-4',
    name: 'Chappan Dukan Market',
    facilities: [
      {
        id: 'fac-4',
        name: 'Chappan Food Bio-Station',
        boxes: [
          {
            id: 'box-5',
            name: 'Chappan Pit Alpha',
            nodes: [{ id: 'node-6', name: 'Chappan Node C1' }],
          },
        ],
      },
    ],
  },
];

export const HQHierarchicalSelector: React.FC = () => {
  const [selectedClientId, setSelectedClientId] = useState(SEEDED_CLIENTS[0].id);
  const [selectedFacilityId, setSelectedFacilityId] = useState(SEEDED_CLIENTS[0].facilities[0].id);
  const [selectedBoxId, setSelectedBoxId] = useState(SEEDED_CLIENTS[0].facilities[0].boxes[0].id);
  const [selectedNodeId, setSelectedNodeId] = useState(SEEDED_CLIENTS[0].facilities[0].boxes[0].nodes[0].id);

  const currentClient = SEEDED_CLIENTS.find((c) => c.id === selectedClientId) || SEEDED_CLIENTS[0];
  const availableFacilities = currentClient.facilities;
  const currentFacility = availableFacilities.find((f) => f.id === selectedFacilityId) || availableFacilities[0];
  const availableBoxes = currentFacility.boxes;
  const currentBox = availableBoxes.find((b) => b.id === selectedBoxId) || availableBoxes[0];
  const availableNodes = currentBox.nodes;
  const currentNode = availableNodes.find((n) => n.id === selectedNodeId) || availableNodes[0];

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = SEEDED_CLIENTS.find((c) => c.id === clientId) || SEEDED_CLIENTS[0];
    const fac = client.facilities[0];
    setSelectedFacilityId(fac.id);
    const box = fac.boxes[0];
    setSelectedBoxId(box.id);
    const node = box.nodes[0];
    setSelectedNodeId(node.id);
  };

  const handleFacilityChange = (facilityId: string) => {
    setSelectedFacilityId(facilityId);
    const fac = availableFacilities.find((f) => f.id === facilityId) || availableFacilities[0];
    const box = fac.boxes[0];
    setSelectedBoxId(box.id);
    const node = box.nodes[0];
    setSelectedNodeId(node.id);
  };

  const handleBoxChange = (boxId: string) => {
    setSelectedBoxId(boxId);
    const box = availableBoxes.find((b) => b.id === boxId) || availableBoxes[0];
    const node = box.nodes[0];
    setSelectedNodeId(node.id);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap text-xs">
      {/* 1. Client / Entity */}
      <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-emerald-500 transition-all">
        <Crown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
        <select
          value={currentClient.id}
          onChange={(e) => handleClientChange(e.target.value)}
          className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer max-w-[130px] truncate"
        >
          {SEEDED_CLIENTS.map((c) => (
            <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-600 flex-shrink-0" />

      {/* 2. Facility */}
      <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-emerald-500 transition-all">
        <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <select
          value={currentFacility.id}
          onChange={(e) => handleFacilityChange(e.target.value)}
          className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer max-w-[130px] truncate"
        >
          {availableFacilities.map((f) => (
            <option key={f.id} value={f.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-600 flex-shrink-0" />

      {/* 3. Compost Pit */}
      <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-emerald-500 transition-all">
        <Box className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        <select
          value={currentBox.id}
          onChange={(e) => handleBoxChange(e.target.value)}
          className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer max-w-[120px] truncate"
        >
          {availableBoxes.map((b) => (
            <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-600 flex-shrink-0" />

      {/* 4. Node */}
      <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 shadow-xs hover:border-emerald-500 transition-all">
        <Radio className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 animate-pulse" />
        <select
          value={currentNode.id}
          onChange={(e) => setSelectedNodeId(e.target.value)}
          className="bg-transparent font-bold text-emerald-800 dark:text-emerald-300 focus:outline-none cursor-pointer max-w-[120px] truncate"
        >
          {availableNodes.map((n) => (
            <option key={n.id} value={n.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
              {n.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
export default HQHierarchicalSelector;
