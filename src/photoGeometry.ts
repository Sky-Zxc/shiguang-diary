import type { DiaryPage, PhotoBounds } from './types';

export interface Box extends PhotoBounds { rotation?: number }
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
export const RESIZE_HANDLES: { id: ResizeHandle; label: string; x: number; y: number }[] = [
  { id: 'nw', label: '左上角', x: 0, y: 0 },
  { id: 'n', label: '上边', x: .5, y: 0 },
  { id: 'ne', label: '右上角', x: 1, y: 0 },
  { id: 'e', label: '右边', x: 1, y: .5 },
  { id: 'se', label: '右下角', x: 1, y: 1 },
  { id: 's', label: '下边', x: .5, y: 1 },
  { id: 'sw', label: '左下角', x: 0, y: 1 },
  { id: 'w', label: '左边', x: 0, y: .5 },
];
export const MIN_PHOTO_SIZE = 96;
const LIMITS = { left: 32, right: 768, top: 180, bottom: 894 };

export function visualBounds(box: Box) {
  const radians = (box.rotation ?? 0) * Math.PI / 180;
  const halfW = Math.abs(Math.cos(radians)) * box.w / 2 + Math.abs(Math.sin(radians)) * box.h / 2;
  const halfH = Math.abs(Math.sin(radians)) * box.w / 2 + Math.abs(Math.cos(radians)) * box.h / 2;
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  return { left: cx - halfW, right: cx + halfW, top: cy - halfH, bottom: cy + halfH };
}
function inside(box: Box) {
  const b = visualBounds(box), tolerance = .001;
  return b.left >= LIMITS.left - tolerance && b.right <= LIMITS.right + tolerance &&
    b.top >= LIMITS.top - tolerance && b.bottom <= LIMITS.bottom + tolerance;
}
export function photoGeometry(page: DiaryPage): Box[] {
  const n = page.photos.length;
  if (!n) return [];
  const area = { x: 70, y: 208, w: 660, h: n > 2 ? 348 : 310 };
  const cols = n === 1 ? 1 : n === 2 ? 2 : n === 3 && page.layout === 'scattered' ? 3 : 2;
  const rows = Math.ceil(n / cols), gap = 22;
  return page.photos.map((photo, i) => {
    const w = (area.w - gap * (cols - 1)) / cols, h = (area.h - gap * (rows - 1)) / rows;
    const scattered = page.layout === 'scattered' || page.layout === 'polaroid';
    const rotation = scattered ? photo.rotation : 0;
    const automatic: Box = { x: area.x + i % cols * (w + gap), y: area.y + Math.floor(i / cols) * (h + gap) + (page.layout === 'scattered' && i % 2 ? 12 : 0), w, h, rotation };
    const bounds = photo.bounds;
    if (bounds && Object.values(bounds).every(Number.isFinite) && bounds.w >= MIN_PHOTO_SIZE && bounds.h >= MIN_PHOTO_SIZE && inside({ ...bounds, rotation })) return { ...bounds, rotation };
    return automatic;
  });
}

// Keep the opposite edge/corner fixed, even for a rotated photo. Screen deltas
// are supplied in the fixed 800x1000 page coordinate system.
export function resizePhotoBox(start: Box, handle: ResizeHandle, dx: number, dy: number): Box {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return { ...start };
  const direction = RESIZE_HANDLES.find(item => item.id === handle)!;
  const sx = direction.x * 2 - 1, sy = direction.y * 2 - 1;
  const radians = (start.rotation ?? 0) * Math.PI / 180, cos = Math.cos(radians), sin = Math.sin(radians);
  const localX = dx * cos + dy * sin, localY = -dx * sin + dy * cos;
  const widthDelta = sx ? Math.max(MIN_PHOTO_SIZE, start.w + sx * localX) - start.w : 0;
  const heightDelta = sy ? Math.max(MIN_PHOTO_SIZE, start.h + sy * localY) - start.h : 0;
  const candidate = (amount: number): Box => {
    const dw = widthDelta * amount, dh = heightDelta * amount;
    const cx = start.x + start.w / 2 + sx * dw / 2 * cos - sy * dh / 2 * sin;
    const cy = start.y + start.h / 2 + sx * dw / 2 * sin + sy * dh / 2 * cos;
    return { x: cx - (start.w + dw) / 2, y: cy - (start.h + dh) / 2, w: start.w + dw, h: start.h + dh, rotation: start.rotation };
  };
  if (inside(candidate(1))) return candidate(1);
  // A generated, rotated frame can slightly overlap the top content boundary.
  // In that case allow inward adjustments without making its existing overlap worse.
  const original = visualBounds(start);
  const acceptable = (box: Box) => {
    const b = visualBounds(box), tolerance = .001;
    return b.left >= Math.min(LIMITS.left, original.left) - tolerance && b.right <= Math.max(LIMITS.right, original.right) + tolerance &&
      b.top >= Math.min(LIMITS.top, original.top) - tolerance && b.bottom <= Math.max(LIMITS.bottom, original.bottom) + tolerance;
  };
  let low = 0, high = 1;
  for (let i = 0; i < 36; i++) { const mid = (low + high) / 2; if (acceptable(candidate(mid))) low = mid; else high = mid; }
  return candidate(low);
}

export function resetPhotoBounds(page: DiaryPage) {
  page.photos.forEach(photo => { delete photo.bounds; });
}
