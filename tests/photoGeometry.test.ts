import { describe, expect, it } from 'vitest';
import { createDiary, duplicatePage } from '../src/model';
import { MIN_PHOTO_SIZE, photoGeometry, resetPhotoBounds, resizePhotoBox, visualBounds, type Box } from '../src/photoGeometry';

function anchor(box: Box, x: number, y: number) {
  const a = (box.rotation ?? 0) * Math.PI / 180;
  return { x: box.x + box.w / 2 + x * box.w / 2 * Math.cos(a) - y * box.h / 2 * Math.sin(a), y: box.y + box.h / 2 + x * box.w / 2 * Math.sin(a) + y * box.h / 2 * Math.cos(a) };
}
describe('照片背景大小', () => {
  it('拖动右边只改变宽度，左边保持不动', () => {
    const start = { x: 100, y: 240, w: 500, h: 300, rotation: 0 };
    const next = resizePhotoBox(start, 'e', -220, 0);
    expect(next).toEqual({ ...start, w: 280 });
  });
  it('旋转后拖动右下角时，左上角仍固定', () => {
    const start = { x: 170, y: 240, w: 300, h: 240, rotation: 3 };
    const next = resizePhotoBox(start, 'se', 80, 50);
    const before = anchor(start, -1, -1), after = anchor(next, -1, -1);
    expect(after.x).toBeCloseTo(before.x, 6); expect(after.y).toBeCloseTo(before.y, 6);
    expect(next.w).toBeGreaterThan(start.w); expect(next.h).toBeGreaterThan(start.h);
  });
  it('缩小不能出现负宽高，放大不能越过页面有效边界', () => {
    const start = { x: 100, y: 240, w: 500, h: 300, rotation: 0 };
    const tiny = resizePhotoBox(start, 'se', -10000, -10000);
    expect(tiny.w).toBe(MIN_PHOTO_SIZE); expect(tiny.h).toBe(MIN_PHOTO_SIZE);
    const large = resizePhotoBox({ ...start, rotation: -3 }, 'se', 10000, 10000);
    const bounds = visualBounds(large);
    expect(bounds.right).toBeLessThanOrEqual(768.002); expect(bounds.bottom).toBeLessThanOrEqual(894.002);
    expect(bounds.left).toBeGreaterThanOrEqual(31.998); expect(bounds.top).toBeGreaterThanOrEqual(179.998);
  });
  it('手动背景可复制并独立修改，恢复时回到自动尺寸', () => {
    const page = createDiary().pages[0];
    page.photos.push({ id: 'photo', blobKey: 'image', name: 'portrait.png', rotation: 0, frame: 'white', bounds: { x: 180, y: 230, w: 260, h: 350 } });
    expect(photoGeometry(page)[0]).toMatchObject({ x: 180, y: 230, w: 260, h: 350 });
    const copy = duplicatePage(page); copy.photos[0].bounds!.w = 300;
    expect(page.photos[0].bounds!.w).toBe(260);
    resetPhotoBounds(copy); expect(copy.photos[0].bounds).toBeUndefined(); expect(photoGeometry(copy)[0].w).toBe(660);
  });
  it('旧草稿没有自定义字段时正常排版，非法尺寸不影响画布', () => {
    const page = createDiary().pages[0];
    page.photos.push({ id: 'photo', blobKey: 'image', name: 'a.png', rotation: 0, frame: 'white' });
    const automatic = photoGeometry(page)[0]; expect(automatic.w).toBe(660);
    page.photos[0].bounds = { x: NaN, y: 250, w: -30, h: 0 };
    expect(photoGeometry(page)[0]).toEqual(automatic);
    expect(resizePhotoBox(automatic, 'e', NaN, Infinity)).toEqual(automatic);
  });
});
