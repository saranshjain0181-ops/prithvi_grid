import React, { useEffect } from 'react';
import { useUiStore } from '../../store/ui.store';
import { apiClient } from '../../api/client';
import { ChevronRight, Building2, Box, Radio } from 'lucide-react';

export const HierarchicalContextSelector: React.FC<{ isCompact?: boolean }> = ({ isCompact = false }) => {
  const {
    hierarchy,
    selectedFacilityId,
    selectedBoxId,
    selectedNodeId,
    setSelectedFacility,
    setSelectedBox,
    setSelectedNode,
    setHierarchy,
  } = useUiStore();

  // Fetch real hierarchy from backend on mount
  useEffect(() => {
    let isMounted = true;
    apiClient
      .get('/assets/hierarchy')
      .then((res) => {
        if (isMounted && res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setHierarchy(res.data.data);
        }
      })
      .catch(() => {
        // Fallback already pre-seeded in store
      });
    return () => {
      isMounted = false;
    };
  }, [setHierarchy]);

  const currentFacility = hierarchy.find((f) => f.id === selectedFacilityId) || hierarchy[0];
  const availableBoxes = currentFacility?.boxes || [];
  const currentBox = availableBoxes.find((b) => b.id === selectedBoxId) || availableBoxes[0];
  const availableNodes = currentBox?.nodes || [];
  const currentNode = availableNodes.find((n) => n.id === selectedNodeId) || availableNodes[0];

  return (
    <div
      className={`flex items-center gap-1.5 md:gap-2 flex-wrap ${
        isCompact ? 'text-[11px]' : 'text-xs'
      }`}
    >
      {/* 1. Facility / Plant Combo-Box */}
      <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:border-emerald-500">
        <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <select
          value={currentFacility?.id || ''}
          onChange={(e) => setSelectedFacility(e.target.value)}
          className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[160px] truncate"
        >
          {hierarchy.map((fac) => (
            <option key={fac.id} value={fac.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
              {fac.name}
            </option>
          ))}
        </select>
      </div>

      <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-600 flex-shrink-0" />

      {/* 2. Compost Pit / Box Combo-Box */}
      <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:border-emerald-500">
        <Box className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        <select
          value={currentBox?.id || ''}
          onChange={(e) => setSelectedBox(e.target.value)}
          className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer max-w-[120px] sm:max-w-[150px] truncate"
        >
          {availableBoxes.map((b) => (
            <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-600 flex-shrink-0" />

      {/* 3. Sensor Node Combo-Box */}
      <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 shadow-sm transition-all hover:border-emerald-500">
        <Radio className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 animate-pulse" />
        <select
          value={currentNode?.id || ''}
          onChange={(e) => setSelectedNode(e.target.value)}
          className="bg-transparent font-bold text-emerald-800 dark:text-emerald-300 focus:outline-none cursor-pointer max-w-[110px] sm:max-w-[140px] truncate"
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
export default HierarchicalContextSelector;
