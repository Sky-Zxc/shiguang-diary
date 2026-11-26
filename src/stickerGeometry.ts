import { HEIGHT, WIDTH } from './model';
import { visualBounds, type Box } from './photoGeometry';
import type { Sticker } from './types';

export const STICKER_POSITIONS = [
  { x: 680, y: 112 }, { x: 110, y: 113 }, { x: 690, y: 492 }, { x: 90, y: 490 },
  { x: 690, y: 866 }, { x: 110, y: 878 }, { x: 410, y: 92 }, { x: 420, y: 905 },
];
export interface StickerCenter { x: number; y: number }
function preset(sticker: Sticker) {
  return STICKER_POSITIONS[sticker.position] ?? STICKER_POSITIONS[0];
}
export function clampStickerCenter(sticker: Sticker, center: StickerCenter): StickerCenter {
  const fallback = preset(sticker);
  const extents = visualBounds({ x: -55, y: -44, w: 110, h: 88, rotation: sticker.rotation });
  return {
    x: Math.max(24 - extents.left, Math.min(WIDTH - 24 - extents.right, Number.isFinite(center.x) ? center.x : fallback.x)),
    y: Math.max(24 - extents.top, Math.min(HEIGHT - 24 - extents.bottom, Number.isFinite(center.y) ? center.y : fallback.y)),
  };
}
export function stickerGeometry(sticker: Sticker): Box {
  const center = clampStickerCenter(sticker, sticker.center ?? preset(sticker));
  return { x: center.x - 55, y: center.y - 44, w: 110, h: 88, rotation: sticker.rotation };
}
