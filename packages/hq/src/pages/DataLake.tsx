import React from 'react';
import { DataLakeGrid } from '../components/data-grid/DataLakeGrid';

export const DataLake: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Infinite MongoDB Atlas Data Lake Workspace
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Direct schema-less inspection across all 9 collections in the Prithvi Grid central lake.
        </p>
      </div>

      <DataLakeGrid />
    </div>
  );
};
export default DataLake;
