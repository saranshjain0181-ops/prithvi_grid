import { create } from 'zustand';
import type { ThresholdConfig } from '@/types';

interface ConfigState {
  thresholds: ThresholdConfig | null;
  isDirty: boolean;
  setThresholds: (thresholds: ThresholdConfig) => void;
  updateThreshold: <K extends keyof ThresholdConfig>(key: K, value: ThresholdConfig[K]) => void;
  resetDirty: () => void;
}

const DEFAULT_THRESHOLDS: ThresholdConfig = {
  tempMin: 55,
  tempMax: 65,
  moistureMin: 40,
  moistureMax: 60,
  methaneAlert: 300,
  methaneCritical: 450,
  phAcidCrash: 5.2,
  pressureCompaction: 1015,
  verificationWaitMins: 15,
  nodeOfflineTimeoutMins: 30,
};

export const useConfigStore = create<ConfigState>((set) => ({
  thresholds: DEFAULT_THRESHOLDS,
  isDirty: false,

  setThresholds: (thresholds) => set({ thresholds, isDirty: false }),

  updateThreshold: (key, value) =>
    set((state) => ({
      thresholds: state.thresholds ? { ...state.thresholds, [key]: value } : state.thresholds,
      isDirty: true,
    })),

  resetDirty: () => set({ isDirty: false }),
}));
