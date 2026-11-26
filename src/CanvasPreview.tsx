import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react';
import { HEIGHT, WIDTH } from './model';
import { hitTest, renderPage, type RenderResult } from './renderer';
import { photoGeometry, resizePhotoBox, RESIZE_HANDLES, type Box, type ResizeHandle } from './photoGeometry';
import type { DiaryPage, PhotoBounds } from './types';

interface Props {
  page: DiaryPage; selected?: string; interactive?: boolean;
  onSelect?: (id: string, kind: 'photo' | 'sticker') => void;
  onResize?: (id: string, bounds: PhotoBounds) => void;
  onCover?: (url: string) => void;
}
interface Draft { id: string; bounds: PhotoBounds }
interface Drag { id: string; start: Box; handle: ResizeHandle; clientX: number; clientY: number; scale: number }
const asBounds = ({ x, y, w, h }: Box): PhotoBounds => ({ x, y, w, h });

export function CanvasPreview({ page, selected, interactive = false, onSelect, onResize, onCover }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultRef = useRef<RenderResult | null>(null);
  const coverCallback = useRef(onCover); coverCallback.current = onCover;
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [overflow, setOverflow] = useState(false);
  const [retry, setRetry] = useState(0);
  const [boxes, setBoxes] = useState<RenderResult['boxes']>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const draftRef = useRef<Draft | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const previewPage = useMemo(() => draft ? {
    ...page, photos: page.photos.map(photo => photo.id === draft.id ? { ...photo, bounds: draft.bounds } : photo),
  } : page, [page, draft]);
  const selectedIndex = previewPage.photos.findIndex(photo => photo.id === selected);
  const selection = selectedIndex >= 0
    ? { ...photoGeometry(previewPage)[selectedIndex], id: selected!, kind: 'photo' as const }
    : boxes.find(box => box.id === selected);

  useEffect(() => {
    let active = true;
    // Keep the last canvas visible during dragging without a flickering loader.
    if (!dragRef.current) setState('loading');
    void renderPage(previewPage, { scale: 1.5, preview: interactive }).then(result => {
      if (!active || !canvasRef.current) return;
      canvasRef.current.width = result.canvas.width; canvasRef.current.height = result.canvas.height;
      canvasRef.current.getContext('2d')?.drawImage(result.canvas, 0, 0);
      resultRef.current = result; setBoxes(result.boxes); setState('ready'); setOverflow(result.overflow);
      setMessage(result.errors.length ? '有照片加载失败，请替换或删除失效照片。' : '');
      if (!dragRef.current) {
        const cover = document.createElement('canvas'); cover.width = 240; cover.height = 300;
        cover.getContext('2d')?.drawImage(result.canvas, 0, 0, 240, 300);
        coverCallback.current?.(cover.toDataURL('image/jpeg', 0.72));
      }
    }).catch(error => {
      if (active) { setState('error'); setMessage(error instanceof Error ? error.message : '预览加载失败，请重试。'); }
    });
    return () => { active = false; };
  }, [previewPage, retry, interactive]);

  function startResize(event: PointerEvent<HTMLButtonElement>, handle: ResizeHandle) {
    if (!selection || selection.kind !== 'photo' || !onResize || event.button !== 0 || dragRef.current) return;
    event.preventDefault(); event.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect?.width) return;
    event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: selection.id, start: { ...selection }, handle, clientX: event.clientX, clientY: event.clientY, scale: WIDTH / rect.width };
  }
  function moveResize(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current; if (!drag) return;
    const bounds = asBounds(resizePhotoBox(drag.start, drag.handle, (event.clientX - drag.clientX) * drag.scale, (event.clientY - drag.clientY) * drag.scale));
    draftRef.current = { id: drag.id, bounds }; setDraft(draftRef.current);
  }
  function endResize(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    if (!dragRef.current) return;
    const final = draftRef.current;
    dragRef.current = null; draftRef.current = null; setDraft(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancelled && final) onResize?.(final.id, final.bounds);
  }
  function keyboardResize(event: KeyboardEvent<HTMLButtonElement>, handle: ResizeHandle) {
    if (event.key === 'Escape' && dragRef.current) {
      event.preventDefault(); dragRef.current = null; draftRef.current = null; setDraft(null); return;
    }
    if (!selection || selection.kind !== 'photo' || !onResize || dragRef.current) return;
    const step = event.shiftKey ? 20 : 4;
    const deltas: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const delta = deltas[event.key]; if (!delta) return;
    event.preventDefault(); event.stopPropagation();
    onResize(selection.id, asBounds(resizePhotoBox(selection, handle, ...delta)));
  }
  return <div className="preview-group">
    <div className={`canvas-paper ${interactive ? 'interactive' : ''}`}>
      <canvas ref={canvasRef} aria-label={`日记预览：${page.text.title || '未命名页面'}，${page.text.body || '暂无正文'}`} role="img"
        onClick={event => {
          if (!interactive) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width * WIDTH, y = (event.clientY - rect.top) / rect.height * HEIGHT;
          const box = [...(resultRef.current?.boxes ?? [])].reverse().find(box => hitTest(box, x, y));
          if (box) onSelect?.(box.id, box.kind);
        }} />
      {selection && interactive && <span className={`selection-box ${selection.kind === 'photo' ? 'photo-selection' : ''}`} data-photo-id={selection.kind === 'photo' ? selection.id : undefined}
        style={{ left: `${selection.x / WIDTH * 100}%`, top: `${selection.y / HEIGHT * 100}%`, width: `${selection.w / WIDTH * 100}%`, height: `${selection.h / HEIGHT * 100}%`, transform: `rotate(${selection.rotation ?? 0}deg)` }}>
        {selection.kind === 'photo' && onResize && RESIZE_HANDLES.map(handle => <button key={handle.id} type="button"
          className={`resize-handle resize-${handle.id}`} style={{ left: `${handle.x * 100}%`, top: `${handle.y * 100}%` }}
          aria-label={`调整照片背景${handle.label}大小`} title="拖动调整照片背景大小；方向键微调，Shift 加快"
          onClick={event => event.stopPropagation()}
          onPointerDown={event => startResize(event, handle.id)} onPointerMove={moveResize}
          onPointerUp={event => endResize(event)} onPointerCancel={event => endResize(event, true)}
          onLostPointerCapture={event => endResize(event, true)} onKeyDown={event => keyboardResize(event, handle.id)} />)}
      </span>}
      {state === 'loading' && <div className="canvas-loading"><LoaderCircle className="spin" size={18} /><span>准备纸张与字体…</span></div>}
      {state === 'error' && <div className="canvas-error"><AlertTriangle /><p>{message}</p><button className="btn small" onClick={() => setRetry(v => v + 1)}><RefreshCw size={15} />重试预览</button></div>}
    </div>
    {interactive && selection?.kind === 'photo' && onResize && <p className="photo-resize-tip">拖动边或角调整照片背景大小 · 方向键可微调</p>}
    {interactive && state === 'ready' && (overflow || message) && <p className="inline-warning" role="alert"><AlertTriangle size={15} />{overflow ? '文字超出当前版式，请精简内容或调小字号后再导出。' : message}</p>}
  </div>;
}
