import { describe, expect, it } from 'vitest';
import { createDiary, duplicatePage } from '../src/model';
import { MIN_PHOTO_SIZE, photoFrameInsets, photoGeometry, resetPhotoBounds, resizePhotoBox, visualBounds, type Box } from '../src/photoGeometry';

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


describe('自动相框贴合照片', () => {
  it('横图、竖图和全景图的内框保持原比例，不产生灰色填充区域', () => {
    for (const frame of ['white', 'rounded', 'shadow'] as const) {
      for (const [width, height] of [[1200, 900], [900, 1200], [4000, 600]]) {
        const page = createDiary().pages[0];
        page.photos.push({ id: 'photo', blobKey: 'image', name: 'a.jpg', rotation: 0, frame });
        const box = photoGeometry(page, { imageSizes: { image: { width, height } } })[0];
        const { pad, bottom } = photoFrameInsets(page.photos[0], page.layout);
        expect((box.w - pad * 2) / (box.h - pad - bottom)).toBeCloseTo(width / height, 8);
        expect(box.x + box.w / 2).toBeCloseTo(400);
        expect(box.y).toBe(208);
        expect(box.w).toBeLessThanOrEqual(660);
        expect(box.h).toBeLessThanOrEqual(310);
      }
    }
  });
  it('多张不同比例照片在各布局中保持完整，自动收紧行距', () => {
    const imageSizes = { landscape: { width: 1200, height: 900 }, portrait: { width: 900, height: 1200 } };
    for (const layout of ['polaroid', 'duo', 'scattered', 'grid', 'tape'] as const) {
      const page = createDiary().pages[0]; page.layout = layout;
      page.photos = Array.from({ length: 6 }, (_, i) => ({ id: String(i), blobKey: i % 2 ? 'portrait' : 'landscape', name: 'a.jpg', rotation: 0, frame: 'white' }));
      const boxes = photoGeometry(page, { imageSizes });
      boxes.forEach((box, i) => {
        const image = imageSizes[page.photos[i].blobKey as keyof typeof imageSizes];
        const { pad, bottom } = photoFrameInsets(page.photos[i], layout);
        expect((box.w - pad * 2) / (box.h - pad - bottom)).toBeCloseTo(image.width / image.height, 8);
        expect(box.x).toBeGreaterThanOrEqual(70); expect(box.x + box.w).toBeLessThanOrEqual(730);
        expect(box.y + box.h).toBeLessThanOrEqual(568);
      });
    }
  });
  it('旧草稿直接根据图片尺寸适配，并保留用户已调整的背景', () => {
    const page = createDiary().pages[0];
    page.photos.push({ id: 'photo', blobKey: 'image', name: 'a.jpg', rotation: 0, frame: 'white' });
    const options = { imageSizes: { image: { width: 1200, height: 900 } } };
    expect(photoGeometry(page, options)[0].w).toBeLessThan(500);
    page.photos[0].bounds = { x: 100, y: 230, w: 600, h: 300 };
    expect(photoGeometry(page, options)[0]).toMatchObject(page.photos[0].bounds);
    resetPhotoBounds(page);
    expect(photoGeometry(page, options)[0].w).toBeLessThan(500);
  });
});
