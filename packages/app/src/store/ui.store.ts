import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Locale = 'hi' | 'en';

export interface HierarchyNode {
  id: string;
  name: string;
  assetCode?: string;
  status?: string;
}

export interface HierarchyBox {
  id: string;
  name: string;
  assetCode?: string;
  capacityKg?: number;
  nodes: HierarchyNode[];
}

export interface HierarchyFacility {
  id: string;
  name: string;
  code?: string;
  boxes: HierarchyBox[];
}

interface UiState {
  selectedFacilityId: string | null;
  selectedBoxId: string | null;
  selectedNodeId: string | null;
  locale: Locale;
  isSidebarOpen: boolean;
  hierarchy: HierarchyFacility[];
  setSelectedFacility: (facilityId: string | null) => void;
  setSelectedBox: (boxId: string | null) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setHierarchy: (hierarchy: HierarchyFacility[]) => void;
  setLocale: (locale: Locale) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const DEFAULT_HIERARCHY: HierarchyFacility[] = [
  {
    id: '6ad8fe7a25c838ac7f70262a', // Real seeded facility ID
    name: 'Indore Central NOC Facility',
    code: 'IND-NOC-01',
    boxes: [
      {
        id: '6ad8fe7a25c838ac7f70263c', // Real seeded box ID
        name: 'Central Gaddha Alpha',
        assetCode: 'BOX-IND-001',
        capacityKg: 1500,
        nodes: [
          {
            id: '6ad8fe7a25c838ac7f70264e', // Real seeded node ID
            name: 'Central Sensor Node A1',
            assetCode: 'NODE-ESP32-001',
            status: 'ACTIVE',
          },
          {
            id: '6ad8fe7a25c838ac7f70265f',
            name: 'Central Sensor Node A2',
            assetCode: 'NODE-ESP32-002',
            status: 'ACTIVE',
          },
        ],
      },
      {
        id: '6ad8fe7a25c838ac7f70266a',
        name: 'Central Gaddha Beta',
        assetCode: 'BOX-IND-002',
        capacityKg: 1500,
        nodes: [
          {
            id: '6ad8fe7a25c838ac7f70267b',
            name: 'Sensor Node B1',
            assetCode: 'NODE-ESP32-003',
            status: 'ACTIVE',
          },
        ],
      },
    ],
  },
];

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      selectedFacilityId: DEFAULT_HIERARCHY[0].id,
      selectedBoxId: DEFAULT_HIERARCHY[0].boxes[0].id,
      selectedNodeId: DEFAULT_HIERARCHY[0].boxes[0].nodes[0].id,
      locale: 'hi',
      isSidebarOpen: false,
      hierarchy: DEFAULT_HIERARCHY,

      setSelectedFacility: (facilityId) => {
        const hier = get().hierarchy;
        const fac = hier.find((f) => f.id === facilityId) || hier[0];
        const firstBox = fac?.boxes[0];
        const firstNode = firstBox?.nodes[0];
        set({
          selectedFacilityId: fac?.id || null,
          selectedBoxId: firstBox?.id || null,
          selectedNodeId: firstNode?.id || null,
        });
      },

      setSelectedBox: (boxId) => {
        const hier = get().hierarchy;
        const facId = get().selectedFacilityId;
        const fac = hier.find((f) => f.id === facId) || hier[0];
        const box = fac?.boxes.find((b) => b.id === boxId) || fac?.boxes[0];
        const firstNode = box?.nodes[0];
        set({
          selectedBoxId: box?.id || null,
          selectedNodeId: firstNode?.id || null,
        });
      },

      setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

      setHierarchy: (hierarchy) => {
        if (!hierarchy || hierarchy.length === 0) return;
        const currentFac = hierarchy.find((f) => f.id === get().selectedFacilityId) || hierarchy[0];
        const currentBox = currentFac?.boxes.find((b) => b.id === get().selectedBoxId) || currentFac?.boxes[0];
        const currentNode = currentBox?.nodes.find((n) => n.id === get().selectedNodeId) || currentBox?.nodes[0];
        set({
          hierarchy,
          selectedFacilityId: currentFac?.id || null,
          selectedBoxId: currentBox?.id || null,
          selectedNodeId: currentNode?.id || null,
        });
      },

      setLocale: (locale) => set({ locale }),

      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
    }),
    {
      name: 'prithvi-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedFacilityId: state.selectedFacilityId,
        selectedBoxId: state.selectedBoxId,
        selectedNodeId: state.selectedNodeId,
        locale: state.locale,
      }),
    }
  )
);
