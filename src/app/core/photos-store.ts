import { Injectable } from '@angular/core';
export interface Photo {
  id: string;
  created: number;
  blob: Blob;
}
@Injectable({ providedIn: 'root' })
export class PhotosStore {
  private db?: Promise<IDBDatabase>;
  private open(): Promise<IDBDatabase> {
    return (this.db ??= new Promise((resolve, reject) => {
      const request = indexedDB.open('pwa-pocket', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('photos', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        this.db = undefined;
        reject(request.error);
      };
    }));
  }
  private async transaction<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photos', mode);
      const req = action(tx.objectStore('photos'));
      tx.oncomplete = () => resolve(req.result);
      tx.onabort = () => reject(tx.error ?? req.error);
      tx.onerror = () => reject(tx.error ?? req.error);
    });
  }
  list() {
    return this.transaction('readonly', (s) => s.getAll() as IDBRequest<Photo[]>);
  }
  save(photo: Photo) {
    return this.transaction('readwrite', (s) => s.put(photo));
  }
  remove(id: string) {
    return this.transaction('readwrite', (s) => s.delete(id));
  }
}
