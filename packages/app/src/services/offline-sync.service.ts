/**
 * Offline Sync Service using native browser IndexedDB
 * Enables Safai Mitras to log actions and compost diary entries even when inside
 * basements or rural compost sheds with zero 4G connectivity.
 * Auto-syncs when network connectivity resumes.
 * (Workstream E1)
 */
import { actionsApi } from '@/api/actions.api';
import { diaryApi } from '@/api/diary.api';

export type OfflineTaskType = 'ACTION_TRIGGER' | 'DIARY_ENTRY';

export interface OfflineTaskItem {
  id: string;
  type: OfflineTaskType;
  payload: Record<string, any>;
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

const DB_NAME = 'prithvi_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_queue';

class OfflineSyncService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private listeners: Set<(count: number) => void> = new Set();
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.syncAll();
      });
    }
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported in this environment'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  public subscribe(listener: (count: number) => void): () => void {
    this.listeners.add(listener);
    this.getPendingCount().then((count) => listener(count)).catch(() => {});
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.getPendingCount().then((count) => {
      this.listeners.forEach((l) => l(count));
    }).catch(() => {});
  }

  public async enqueue(type: OfflineTaskType, payload: Record<string, any>): Promise<OfflineTaskItem> {
    const db = await this.getDB();
    const item: OfflineTaskItem = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      type,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.add(item);

      req.onsuccess = () => {
        this.notify();
        resolve(item);
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async getAllPending(): Promise<OfflineTaskItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async getPendingCount(): Promise<number> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.count();

        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return 0;
    }
  }

  public async removeItem(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => {
        this.notify();
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async syncAll(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 };
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    try {
      const items = await this.getAllPending();
      // Sort oldest first (FIFO)
      items.sort((a, b) => a.createdAt - b.createdAt);

      for (const item of items) {
        try {
          if (item.type === 'ACTION_TRIGGER') {
            await actionsApi.trigger({
              actionType: item.payload.actionType,
              boxId: item.payload.boxId,
              nodeId: item.payload.nodeId,
              notes: item.payload.notes ? `${item.payload.notes} [Synced from offline queue]` : '[Synced from offline queue]',
            });
          } else if (item.type === 'DIARY_ENTRY') {
            await diaryApi.createEntry({
              boxId: item.payload.boxId,
              flowType: item.payload.flowType,
              weightKg: item.payload.weightKg,
              recordedAt: item.payload.recordedAt || new Date(item.createdAt).toISOString(),
              notes: item.payload.notes ? `${item.payload.notes} [Synced from offline queue]` : '[Synced from offline queue]',
            });
          }

          await this.removeItem(item.id);
          synced++;
        } catch (err: any) {
          failed++;
          // If network error occurred, abort loop to preserve remaining items
          if (!navigator.onLine || err?.message?.includes('Network Error')) {
            break;
          }

          // If client-side validation error (e.g. invalid ID or expired constraint),
          // increment retryCount or drop after 5 retries to avoid permanent queue poisoning
          if (item.retryCount >= 4) {
            await this.removeItem(item.id);
          } else {
            const db = await this.getDB();
            const tx = db.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            item.retryCount += 1;
            item.lastError = err?.response?.data?.message || err?.message || 'Sync failed';
            store.put(item);
          }
        }
      }
    } finally {
      this.isSyncing = false;
      this.notify();
    }

    return { synced, failed };
  }
}

export const offlineSyncService = new OfflineSyncService();
