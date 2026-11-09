// Stockage local (IndexedDB) : projets et poignées de fichiers vidéo.
// Rien ne quitte l'appareil.

const DB_NAME = "arc9-lite";
let dbp: Promise<IDBDatabase | null> | null = null;
const memory = new Map<string, unknown>();

function open(): Promise<IDBDatabase | null> {
  dbp ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore("kv");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbp;
}

export async function get<T>(key: string): Promise<T | undefined> {
  const db = await open();
  if (!db) return memory.get(key) as T | undefined;
  return new Promise((resolve) => {
    const r = db.transaction("kv").objectStore("kv").get(key);
    r.onsuccess = () => resolve(r.result as T | undefined);
    r.onerror = () => resolve(undefined);
  });
}

export async function set(key: string, value: unknown): Promise<void> {
  memory.set(key, value);
  const db = await open();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function del(key: string): Promise<void> {
  memory.delete(key);
  const db = await open();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
