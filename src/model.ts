import type { Diary, DiaryPage, Template } from './types';

export const WIDTH = 800;
export const HEIGHT = 1000;
export const MAX_PAGES = 3;
export const MAX_PHOTOS = 6;
export const MAX_STICKERS = 8;
export const DEFAULT_TEMPLATE: Template = { paper: 'cream', border: 'wavy', font: 'mashan', textColor: '#514b3c', fontSize: 16 };
export function uid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // HTTP LAN addresses are not secure contexts; getRandomValues remains available.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function createPage(template = DEFAULT_TEMPLATE): DiaryPage {
  return { id: uid(), photos: [], layout: 'polaroid', text: { title: '', body: '', date: localDate(), mood: '开心', weather: '晴天', location: '' }, template: { ...template }, stickers: [] };
}
export function createDiary(): Diary {
  const page = createPage();
  const now = new Date().toISOString();
  return { id: uid(), title: '我的日记本', createdAt: now, updatedAt: now, defaults: { ...DEFAULT_TEMPLATE }, pages: [page], lastActivePageId: page.id, revision: 0 };
}
export function duplicatePage(page: DiaryPage): DiaryPage {
  const copy = structuredClone(page);
  copy.id = uid();
  copy.photos.forEach(photo => { photo.id = uid(); });
  copy.stickers.forEach(sticker => { sticker.id = uid(); });
  return copy;
}
export function addPage(diary: Diary, copyId?: string): Diary {
  if (diary.pages.length >= MAX_PAGES) throw new Error('每本日记最多支持 3 页');
  const result = structuredClone(diary);
  const index = result.pages.findIndex(p => p.id === copyId);
  const page = index >= 0 ? duplicatePage(result.pages[index]) : createPage(result.defaults);
  result.pages.splice(index >= 0 ? index + 1 : result.pages.length, 0, page);
  result.lastActivePageId = page.id;
  return result;
}
export function removePage(diary: Diary, id: string): Diary {
  if (diary.pages.length <= 1) throw new Error('至少保留 1 页');
  const result = structuredClone(diary);
  const index = result.pages.findIndex(p => p.id === id);
  if (index < 0) return result;
  result.pages.splice(index, 1);
  if (result.lastActivePageId === id) result.lastActivePageId = result.pages[Math.max(0, index - 1)].id;
  return result;
}
export const photoKeys = (diary: Diary) => diary.pages.flatMap(p => p.photos.map(photo => photo.blobKey));
export function applyStyle(diary: Diary, pageId: string): Diary {
  const result = structuredClone(diary);
  const source = result.pages.find(p => p.id === pageId);
  if (source) result.pages.forEach(p => { if (p.id !== pageId) p.template = { ...source.template }; });
  return result;
}
