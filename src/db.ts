import { openDB, type DBSchema } from 'idb';
import type { Diary } from './types';
import { photoKeys } from './model';

interface DiaryDB extends DBSchema {
  diaries: { key: string; value: Diary };
  images: { key: string; value: Blob | { data: ArrayBuffer; type: string } };
}
let database: ReturnType<typeof openDB<DiaryDB>> | undefined;
function db() {
  return database ??= openDB<DiaryDB>('shiguang-diary', 1, {
    upgrade(database) { database.createObjectStore('diaries', { keyPath: 'id' }); database.createObjectStore('images'); },
  });
}
export class ConflictError extends Error {
  constructor() { super('这本日记已在另一个标签页修改，请先重新打开最新草稿，避免覆盖。'); }
}
export async function listDiaries() {
  const diaries = await (await db()).getAll('diaries');
  return diaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function getImage(key: string) {
  const stored=await (await db()).get('images', key);
  if(!stored)return undefined;
  return stored instanceof Blob?stored:new Blob([stored.data],{type:stored.type});
}

// Metadata and image writes share a transaction; revisions prevent silent cross-tab overwrites.
export async function saveDiary(diary: Diary, blobs: Map<string, Blob>, expectedRevision: number) {
  const used = new Set(photoKeys(diary));
  // Some WebKit builds cannot persist Blob backing files. Serialize before opening
  // the transaction so neither Blob preparation nor an unrelated await can expire it.
  const binaryImages=new Map<string,{data:ArrayBuffer;type:string}>();
  await Promise.all([...used].map(async key=>{
    const blob=blobs.get(key);
    if(blob)binaryImages.set(key,{data:await blob.arrayBuffer(),type:blob.type});
  }));
  const database = await db();
  const tx = database.transaction(['diaries', 'images'], 'readwrite');
  const stored = await tx.objectStore('diaries').get(diary.id);
  if ((stored?.revision ?? 0) !== expectedRevision) {
    tx.abort(); await tx.done.catch(() => {}); throw new ConflictError();
  }
  const next = { ...diary, revision: expectedRevision + 1 };
  for (const key of used) {
    if (binaryImages.has(key)) await tx.objectStore('images').put(binaryImages.get(key)!, key);
    else if (!await tx.objectStore('images').getKey(key)) {
      tx.abort(); await tx.done.catch(() => {}); throw new Error('照片文件缺失，请替换或删除失效照片后重试。');
    }
  }
  await tx.objectStore('diaries').put(next);
  // Reclaim images only when no persisted page refers to them, including copied pages.
  const all = await tx.objectStore('diaries').getAll();
  const referenced = new Set(all.flatMap(photoKeys));
  for (const key of await tx.objectStore('images').getAllKeys()) {
    if (!referenced.has(key)) await tx.objectStore('images').delete(key);
  }
  await tx.done;
  return next.revision;
}
export async function deleteDiary(id: string) {
  const database = await db();
  const tx = database.transaction(['diaries', 'images'], 'readwrite');
  await tx.objectStore('diaries').delete(id);
  const referenced = new Set((await tx.objectStore('diaries').getAll()).flatMap(photoKeys));
  for (const key of await tx.objectStore('images').getAllKeys()) {
    if (!referenced.has(key)) await tx.objectStore('images').delete(key);
  }
  await tx.done;
}
