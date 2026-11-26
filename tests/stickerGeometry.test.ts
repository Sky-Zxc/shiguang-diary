import { describe, expect, it } from 'vitest';
import { createDiary, duplicatePage } from '../src/model';
import { visualBounds } from '../src/photoGeometry';
import { clampStickerCenter, stickerGeometry, STICKER_POSITIONS } from '../src/stickerGeometry';
import type { Sticker } from '../src/types';

const sticker: Sticker = { id: 'star', type: 'star', position: 0, rotation: 12 };
describe('贴纸自由位置', () => {
  it('旧日记仍使用预设位置，自定义位置用于绘制和命中', () => {
    const original = stickerGeometry(sticker);
    expect(original.x + original.w / 2).toBe(STICKER_POSITIONS[0].x);
    const custom = stickerGeometry({ ...sticker, center: { x: 315, y: 620 } });
    expect(custom.x + custom.w / 2).toBe(315); expect(custom.y + custom.h / 2).toBe(620);
    expect(custom.rotation).toBe(12);
  });
  it('拖至页外时，旋转后的整个贴纸仍在页面内', () => {
    for (const rotation of [-170, -45, 0, 12, 89]) {
      for (const direction of [-1, 1]) {
        const item = { ...sticker, rotation };
        const center = clampStickerCenter(item, { x: direction * 10000, y: direction * 10000 });
        const bounds = visualBounds(stickerGeometry({ ...item, center }));
        expect(bounds.left).toBeGreaterThanOrEqual(23.999); expect(bounds.right).toBeLessThanOrEqual(776.001);
        expect(bounds.top).toBeGreaterThanOrEqual(23.999); expect(bounds.bottom).toBeLessThanOrEqual(976.001);
      }
    }
  });
  it('非法坐标可回退，复制页位置独立', () => {
    expect(clampStickerCenter(sticker, { x: NaN, y: Infinity })).toEqual(STICKER_POSITIONS[0]);
    const page = createDiary().pages[0]; page.stickers.push({ ...sticker, center: { x: 300, y: 500 } });
    const copy = duplicatePage(page); copy.stickers[0].center!.x = 420;
    expect(page.stickers[0].center!.x).toBe(300);
  });
});
