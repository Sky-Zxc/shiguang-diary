import { getImage } from './db';
import { uid } from './model';
import type { Photo } from './types';

export const pendingBlobs = new Map<string, Blob>();
const imageCache = new Map<string, Promise<HTMLImageElement>>();
const objectUrls = new Map<string, string>();
export function withTimeout<T>(promise: Promise<T>, message: string, ms = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
export function loadUrl(url: string) {
  return withTimeout(new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片加载失败，请替换或删除失效照片。'));
    image.src = url;
  }), '图片加载超时，请重试。');
}
export function loadPhoto(key: string): Promise<HTMLImageElement> {
  if (!imageCache.has(key)) {
    const job = (async () => {
      const blob = pendingBlobs.get(key) ?? await getImage(key);
      if (!blob) throw new Error('照片文件缺失，请替换或删除失效照片。');
      const url = URL.createObjectURL(blob);
      objectUrls.set(key, url);
      try { return await loadUrl(url); }
      catch (error) { URL.revokeObjectURL(url); objectUrls.delete(key); throw error; }
    })().catch(error => { imageCache.delete(key); throw error; });
    imageCache.set(key, job);
  }
  return imageCache.get(key)!;
}
export async function photoUrl(key: string) { await loadPhoto(key); return objectUrls.get(key)!; }
export function clearResourceCache() {
  objectUrls.forEach(url => URL.revokeObjectURL(url));
  objectUrls.clear(); imageCache.clear(); pendingBlobs.clear();
}
const fontNames = { mashan: 'MaShan', zhimang: 'ZhiMang' };
export async function ensureFont(font: keyof typeof fontNames) {
  const result = await withTimeout(document.fonts.load(`24px "${fontNames[font]}"`, '今天记录生活'), '字体加载超时，请重试。');
  if (!result.length) throw new Error('手写字体加载失败，请刷新后重试。');
  return fontNames[font];
}
export async function preparePhoto(file: File): Promise<Photo> {
  if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} 超过 10MB，请选择更小的照片。`);
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const valid = (bytes[0] === 0xff && bytes[1] === 0xd8) ||
    (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) ||
    (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP');
  if (!valid) throw new Error(`${file.name} 格式不支持，请使用 JPG、PNG 或 WebP。`);
  const inputUrl = URL.createObjectURL(file);
  try {
    const image = await loadUrl(inputUrl);
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('浏览器无法处理照片，请换用最新版浏览器。');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('照片压缩失败，请重试。')), 'image/webp', 0.88));
    const blobKey = uid();
    pendingBlobs.set(blobKey, blob);
    return { id: uid(), blobKey, name: file.name, rotation: Math.random() * 6 - 3, frame: 'white' };
  } finally { URL.revokeObjectURL(inputUrl); }
}
