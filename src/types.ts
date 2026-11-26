export type Paper = 'cream' | 'kraft' | 'yellow' | 'grid' | 'lined';
export type Border = 'wavy' | 'tape' | 'torn';
export type Layout = 'polaroid' | 'duo' | 'scattered' | 'grid' | 'tape';
export type StickerType = 'tape' | 'stamp' | 'arrow' | 'star' | 'heart';
export interface Template {
  paper: Paper; border: Border; font: 'mashan' | 'zhimang'; textColor: string; fontSize: number;
}
export interface Photo {
  id: string; blobKey: string; name: string; rotation: number; frame: 'white' | 'rounded' | 'shadow';
  bounds?: PhotoBounds;
}
export interface PhotoBounds { x: number; y: number; w: number; h: number }
export interface Sticker {
  id: string; type: StickerType; position: number; rotation: number;
}
export interface DiaryPage {
  id: string; photos: Photo[]; layout: Layout;
  text: { title: string; body: string; date: string; mood: string; weather: string; location: string };
  template: Template; stickers: Sticker[];
}
export interface Diary {
  id: string; title: string; createdAt: string; updatedAt: string;
  defaults: Template; pages: DiaryPage[]; lastActivePageId: string;
  revision: number; cover?: string;
}
export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error';
