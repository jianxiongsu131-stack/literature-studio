export type StoredPdf = {
  literatureId: string;
  name: string;
  blob: Blob;
  importedAt: string;
};

const databaseName = "yanji-local-pdfs";
const storeName = "pdf-files";

function openPdfDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: "literatureId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("无法打开本地 PDF 数据库"));
  });
}

export async function getStoredPdf(literatureId: string): Promise<StoredPdf | null> {
  const database = await openPdfDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(literatureId);
    request.onsuccess = () => resolve((request.result as StoredPdf | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("无法读取本地 PDF"));
    transaction.oncomplete = () => database.close();
  });
}

export async function saveStoredPdf(literatureId: string, file: File): Promise<StoredPdf> {
  const database = await openPdfDatabase();
  const stored: StoredPdf = {
    literatureId,
    name: file.name,
    blob: file,
    importedAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(stored);
    transaction.oncomplete = () => {
      database.close();
      resolve(stored);
    };
    transaction.onerror = () => reject(transaction.error ?? new Error("无法保存本地 PDF"));
  });
}

export async function deleteStoredPdf(literatureId: string): Promise<void> {
  const database = await openPdfDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(literatureId);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error ?? new Error("无法移除本地 PDF"));
  });
}
