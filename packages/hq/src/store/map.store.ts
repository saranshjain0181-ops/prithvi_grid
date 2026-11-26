import { create } from 'zustand';
import type { Facility, FacilityStatus } from '@/types';

interface MapState {
  facilities: Facility[];
  selectedFacilityId: string | null;
  filterStatus: FacilityStatus | 'ALL';
  setFacilities: (facilities: Facility[]) => void;
  updateFacilityStatus: (
    facilityId: string,
    status: FacilityStatus,
    sensors: Facility['sensors'],
    lastPing: string,
  ) => void;
  selectFacility: (id: string | null) => void;
  setFilterStatus: (status: FacilityStatus | 'ALL') => void;
}

export const useMapStore = create<MapState>((set) => ({
  facilities: [],
  selectedFacilityId: null,
  filterStatus: 'ALL',

  setFacilities: (facilities) => set({ facilities }),

  updateFacilityStatus: (facilityId, status, sensors, lastPing) =>
    set((state) => ({
      facilities: state.facilities.map((f) =>
        f.id === facilityId ? { ...f, status, sensors, lastPing } : f,
      ),
    })),

  selectFacility: (id) => set({ selectedFacilityId: id }),

  setFilterStatus: (status) => set({ filterStatus: status }),
}));
