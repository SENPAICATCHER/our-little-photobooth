// IndexedDB Persistent Storage for Serverless / Static Hosting (Netlify)

const DB_NAME = 'OurLittlePhotoboothDB';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('roomCode', 'roomCode', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function savePhotoLocally({ roomCode, dataUrl, layout = 'side-by-side', filter = 'vintage-film', caption = '', photoType = 'composite', dimensions = '1400x1050', adjustments = '{}' }) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const photo = {
      id: `local-photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      roomCode: (roomCode || 'DEFAULT').toUpperCase(),
      url: dataUrl,
      layout,
      filter,
      caption,
      photoType,
      dimensions,
      adjustments: typeof adjustments === 'string' ? JSON.parse(adjustments || '{}') : adjustments,
      isFavorite: false,
      createdAt: Date.now()
    };
    const req = store.add(photo);
    req.onsuccess = () => resolve(photo);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function getPhotosLocally(roomCode) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('roomCode');
    const req = index.getAll((roomCode || 'DEFAULT').toUpperCase());
    req.onsuccess = () => {
      const sorted = (req.result || []).sort((a, b) => b.createdAt - a.createdAt);
      resolve(sorted);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function deletePhotoLocally(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function toggleFavoriteLocally(id, isFavorite) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (item) {
        item.isFavorite = isFavorite;
        store.put(item);
      }
      resolve(true);
    };
    getReq.onerror = (e) => reject(e.target.error);
  });
}

export async function updateCaptionLocally(id, caption) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (item) {
        item.caption = caption;
        store.put(item);
      }
      resolve(true);
    };
    getReq.onerror = (e) => reject(e.target.error);
  });
}
