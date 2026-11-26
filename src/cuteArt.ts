import { loadUrl } from './resources';
import type { StickerType } from './types';

const face = `<g fill="#655044" stroke="none"><ellipse cx="-12" cy="2" rx="3" ry="4"/><ellipse cx="12" cy="2" rx="3" ry="4"/></g><path d="M-6 13q6 7 12 0" fill="none"/><g fill="#efa8a5" stroke="none" opacity=".8"><ellipse cx="-24" cy="12" rx="7" ry="4"/><ellipse cx="24" cy="12" rx="7" ry="4"/></g>`;
const roundFace = (eyes: string, mouth: string) => `<circle cy="0" r="32" fill="#ffe6a3"/>${eyes}<path d="${mouth}" fill="none"/><g fill="#efa8a5" stroke="none"><ellipse cx="-22" cy="12" rx="6" ry="4"/><ellipse cx="22" cy="12" rx="6" ry="4"/></g>`;
export const CUTE_ART = {
  bunny: `<g fill="#fffaf4"><ellipse cx="-14" cy="-23" rx="10" ry="19" transform="rotate(-12 -14 -23)"/><ellipse cx="14" cy="-23" rx="10" ry="19" transform="rotate(12 14 -23)"/><ellipse cy="9" rx="34" ry="27"/></g><g stroke="none" fill="#f5bebf"><ellipse cx="-14" cy="-25" rx="4" ry="11"/><ellipse cx="14" cy="-25" rx="4" ry="11"/></g><g transform="translate(0 5)">${face}</g>`,
  bear: `<g fill="#dcb489"><circle cx="-25" cy="-22" r="12"/><circle cx="25" cy="-22" r="12"/><ellipse cy="4" rx="35" ry="31"/></g><g fill="#f5d2b3" stroke="none"><circle cx="-25" cy="-22" r="6"/><circle cx="25" cy="-22" r="6"/><ellipse cy="15" rx="16" ry="12"/></g>${face}<ellipse cy="9" rx="4" ry="3" fill="#655044"/>`,
  cat: `<path d="M-31-9-33-34-12-23Q0-28 13-23l20-11-2 27q11 37-31 40Q-42 31-31-9Z" fill="#ffe0bb"/><path d="m-26-17 1-10 9 7m31 0 10-7-1 10" fill="#efafa2" stroke="none"/>${face}<path d="m-30 7-13-3m13 11-14 2m74-10 13-3m-13 11 14 2" fill="none"/>`,
  smile: roundFace(`<path d="M-19 0q7-10 14 0M5 0q7-10 14 0" fill="none"/>`, 'M-11 11Q0 29 11 11Z'),
  wink: roundFace(`<ellipse cx="-12" cy="0" rx="3" ry="4" fill="#655044" stroke="none"/><path d="m7-4 10 5-10 5" fill="none"/>`, 'M-6 14q8 7 16-2'),
  blush: roundFace(`<path d="m-18-2 9 3m18 0 9-3" fill="none"/>`, 'M-5 14q5-4 10 0'),
  strawberry: `<path d="M-27-13Q0-24 27-13q14 20-22 47Q0 39-5 34-41 7-27-13Z" fill="#ed949a"/><path d="m0-14-18-15 20 7 12-13 1 15 18 1-19 8-11-8-13 8Z" fill="#91ad83"/><g stroke="#fff1cd" stroke-width="3"><path d="m-16-1 1 3M1-3l1 3m15-1-1 3m-26 9 1 3m15-2-1 3m-7 7 1 3"/></g>`,
  flower: `<g fill="#fff4df"><ellipse cy="-22" rx="12" ry="16"/><ellipse cx="21" cy="-6" rx="16" ry="12" transform="rotate(-20 21 -6)"/><ellipse cx="13" cy="20" rx="12" ry="16" transform="rotate(-35 13 20)"/><ellipse cx="-13" cy="20" rx="12" ry="16" transform="rotate(35 -13 20)"/><ellipse cx="-21" cy="-6" rx="16" ry="12" transform="rotate(20 -21 -6)"/></g><circle r="15" fill="#efd17c"/><path d="M-6 3q6 6 12 0" fill="none"/><g fill="#655044" stroke="none"><circle cx="-5" cy="-3" r="1.5"/><circle cx="5" cy="-3" r="1.5"/></g>`,
  rainbow: `<g fill="none" stroke-width="9"><path d="M-33 18a33 33 0 0 1 66 0" stroke="#e9a2ac"/><path d="M-24 18a24 24 0 0 1 48 0" stroke="#efd28d"/><path d="M-15 18a15 15 0 0 1 30 0" stroke="#a9c9b4"/></g><path d="M-45 24q-6-13 6-18 3-12 15-7 13-1 14 12 10 13-6 17h-22q-4 0-7-4Zm57 0q-6-13 6-18 3-12 15-7 13-1 14 12 10 13-6 17H19q-4 0-7-4Z" fill="#fffaf4"/>`,
  cloud: `<path d="M-38 22q-12-15 2-26 3-21 24-16Q1-40 21-21 44-23 42-1q17 22-9 30h-57q-10 0-14-7Z" fill="#f5fbff"/>${face}`,
  bow: `<path d="M-3-4Q-43-40-41-5q-7 34 36 14L-19 35l17-5L8 9q47 23 36-15-1-33-38 2Z" fill="#edafbd"/><ellipse cy="2" rx="10" ry="12" fill="#f6c7cc"/><path d="m-13-6-15-7m42 7 15-7" fill="none" stroke="#c98394"/>`,
  cherry: `<path d="M-22 8Q-11-5 1-31m24 42Q27-16 1-31" fill="none" stroke="#80996e" stroke-width="4"/><path d="M1-31q20-18 36 0-21 9-36 0" fill="#a7bc8d"/><circle cx="-22" cy="15" r="18" fill="#e996a0"/><circle cx="24" cy="18" r="18" fill="#d98091"/><path d="M-30 6q-7 3-6 11m52-8q-7 3-6 11" stroke="#ffe4dd" stroke-width="4" fill="none"/>`,
} as const;
export type CuteStickerType = keyof typeof CUTE_ART;
export const STICKER_CATALOG: { type: StickerType; label: string; group: 'classic' | 'faces' | 'decor' }[] = [
  {type:'bunny',label:'兔兔',group:'faces'},{type:'bear',label:'小熊',group:'faces'},{type:'cat',label:'猫猫',group:'faces'},
  {type:'smile',label:'开心脸',group:'faces'},{type:'wink',label:'眨眼脸',group:'faces'},{type:'blush',label:'害羞脸',group:'faces'},
  {type:'strawberry',label:'草莓',group:'decor'},{type:'flower',label:'小花',group:'decor'},{type:'rainbow',label:'彩虹',group:'decor'},
  {type:'cloud',label:'云朵',group:'decor'},{type:'bow',label:'蝴蝶结',group:'decor'},{type:'cherry',label:'樱桃',group:'decor'},
  {type:'tape',label:'胶带',group:'classic'},{type:'stamp',label:'邮票',group:'classic'},{type:'arrow',label:'箭头',group:'classic'},
  {type:'star',label:'星星',group:'classic'},{type:'heart',label:'心情印章',group:'classic'},
];
export function cuteMarkup(type: CuteStickerType) {
  return `<g stroke="#80675a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${CUTE_ART[type]}</g>`;
}
export const svgUrl = (body: string, viewBox = '-55 -44 110 88') => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${viewBox==='-55 -44 110 88'?110:800}" height="${viewBox==='-55 -44 110 88'?88:1000}">${body}</svg>`)}`;
const urls = new Map<string,string>();
export function cuteStickerUrl(type: StickerType) {
  if (!(type in CUTE_ART)) return undefined;
  if (!urls.has(type)) urls.set(type,svgUrl(cuteMarkup(type as CuteStickerType)));
  return urls.get(type)!;
}
const images = new Map<string,Promise<HTMLImageElement>>();
export function loadArt(url: string): Promise<HTMLImageElement> {
  if (!images.has(url)) images.set(url,loadUrl(url).catch(()=>{images.delete(url);throw new Error('手绘装饰加载失败，请刷新后重试。');}));
  return images.get(url)!;
}
