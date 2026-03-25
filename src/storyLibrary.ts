// src/storyLibrary.ts — IndexedDB-based story library

export interface SavedStory {
    id?: number;
    title: string;
    markdown: string;
    characters: string;
    audience: string;
    framework: string;
    style: string;
    date: string;           // ISO date string
}

const DB_NAME = 'storyGen_library';
const DB_VERSION = 1;
const STORE_NAME = 'stories';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('date', 'date', { unique: false });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveStoryToLibrary(story: SavedStory): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.add(story);
        req.onsuccess = () => resolve(req.result as number);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
    });
}

export async function getAllStories(): Promise<SavedStory[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
            // Sort newest first
            const stories = (req.result as SavedStory[]).sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            resolve(stories);
        };
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
    });
}

export async function deleteStoryFromLibrary(id: number): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
    });
}
