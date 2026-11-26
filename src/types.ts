export type Paper = 'cream' | 'kraft' | 'yellow' | 'grid' | 'lined' | 'blush' | 'mint' | 'sky' | 'lavender';
export type Border = 'wavy' | 'tape' | 'torn';
export type Layout = 'polaroid' | 'duo' | 'scattered' | 'grid' | 'tape';
export type Theme = 'classic' | 'strawberry' | 'bunny' | 'bear' | 'sky' | 'candy' | 'kitty';
export type StickerType = 'tape' | 'stamp' | 'arrow' | 'star' | 'heart' | 'bunny' | 'bear' | 'cat' | 'smile' | 'wink' | 'blush' | 'strawberry' | 'flower' | 'rainbow' | 'cloud' | 'bow' | 'cherry';
export interface Template {
  theme?: Theme; paper: Paper; border: Border; font: 'mashan' | 'zhimang'; textColor: string; fontSize: number;
}
export interface Photo {
  id: string; blobKey: string; name: string; rotation: number; frame: 'white' | 'rounded' | 'shadow';
  bounds?: PhotoBounds;
}
export interface PhotoBounds { x: number; y: number; w: number; h: number }
export interface Sticker {
  id: string; type: StickerType; position: number; rotation: number; center?: { x: number; y: number };
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
