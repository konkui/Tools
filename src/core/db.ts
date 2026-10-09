/**
 * IndexedDB 最小封装：Promise 风格、按 store 名存取。
 * 当前 store：animLib（动画素材库）、project（各工具的工作项目自动保存）。
 * 新增存储：在 openDb 的 onupgradeneeded 中登记并提升 DB_VERSION。
 */
const DB_NAME = 'gamedevkit';
const DB_VERSION = 1;

export const STORE_ANIM_LIB = 'animLib';
export const STORE_PROJECT = 'project';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_ANIM_LIB)) db.createObjectStore(STORE_ANIM_LIB);
        if (!db.objectStoreNames.contains(STORE_PROJECT)) db.createObjectStore(STORE_PROJECT);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function request<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const r = run(t.objectStore(store));
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      }),
  );
}

export const idbGet = <T>(store: string, key: string): Promise<T | undefined> =>
  request<T | undefined>(store, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>);

export const idbGetAll = <T>(store: string): Promise<T[]> =>
  request<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>);

export const idbPut = (store: string, key: string, value: unknown): Promise<IDBValidKey> =>
  request(store, 'readwrite', (s) => s.put(value, key));

export const idbDelete = (store: string, key: string): Promise<undefined> =>
  request(store, 'readwrite', (s) => s.delete(key));
