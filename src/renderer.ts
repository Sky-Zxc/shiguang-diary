import { HEIGHT, WIDTH } from './model';
import { stickerGeometry } from './stickerGeometry';
import { ensureFont, loadPhoto } from './resources';
import type { DiaryPage, StickerType } from './types';
import { photoFrameInsets, photoGeometry, visualBounds, type Box, type PhotoLayoutOptions } from './photoGeometry';

export interface HitBox extends Box { id: string; kind: 'photo' | 'sticker' }
export interface RenderResult { canvas: HTMLCanvasElement; overflow: boolean; errors: string[]; boxes: HitBox[]; photoLayout: PhotoLayoutOptions }
const papers = { cream: '#f9f4e6', kraft: '#d9bc93', yellow: '#fff0c8', grid: '#f8f6eb', lined: '#f6f3e9' };
function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius = 5) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
}
function line(ctx: CanvasRenderingContext2D, points: number[][]) {
  ctx.beginPath(); points.forEach(([x, y], i) => { if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke();
}
function tape(ctx: CanvasRenderingContext2D, x: number, y: number, w = 104, h = 30, angle = -0.1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.fillStyle = '#a4ad87b0';
  ctx.beginPath(); ctx.moveTo(-w/2, -h/2);
  for (let i = 0; i < 6; i++) ctx.lineTo(w/2 + (i % 2 ? -4 : 2), -h/2 + h*i/5);
  ctx.lineTo(-w/2, h/2);
  for (let i = 5; i >= 0; i--) ctx.lineTo(-w/2 + (i % 2 ? 3 : -2), -h/2 + h*i/5);
  ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#7b855b30'; ctx.lineWidth = 1;
  for (let i = -w/2 + 8; i < w/2; i += 12) line(ctx, [[i, -h/2], [i+6, h/2]]);
  ctx.restore();
}
export function drawSticker(ctx: CanvasRenderingContext2D, type: StickerType, x: number, y: number, rotation = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation * Math.PI / 180);
  ctx.strokeStyle = '#8c634d'; ctx.fillStyle = '#d7a46c'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (type === 'tape') tape(ctx, 0, 0, 108, 32, 0);
  if (type === 'star') {
    ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI/2 + i*Math.PI/5; const r = i%2 ? 14 : 31; const px=Math.cos(a)*r, py=Math.sin(a)*r; if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py); } ctx.closePath();ctx.fill();ctx.stroke();
    line(ctx, [[-42,-26],[-48,-32]]); line(ctx, [[39,4],[48,6]]);
  }
  if (type === 'heart') {
    ctx.strokeStyle = '#ae6f65'; ctx.fillStyle = '#dcada0';ctx.beginPath();ctx.moveTo(0,28);ctx.bezierCurveTo(-60,-7,-26,-48,0,-20);ctx.bezierCurveTo(26,-48,60,-7,0,28);ctx.fill();ctx.stroke();
  }
  if (type === 'arrow') {
    ctx.strokeStyle = '#6e7c59';ctx.beginPath();ctx.moveTo(-40,15);ctx.bezierCurveTo(-2,25,-15,-34,34,-12);ctx.stroke();line(ctx,[[20,-28],[35,-12],[15,-8]]);
  }
  if (type === 'stamp') {
    ctx.strokeStyle = '#9c7763';ctx.fillStyle = '#f7e8d0';rounded(ctx,-30,-37,60,74,1);ctx.fill();ctx.setLineDash([3,4]);ctx.stroke();ctx.setLineDash([]);ctx.strokeRect(-22,-29,44,49);
    ctx.fillStyle = '#85916d';ctx.beginPath();ctx.arc(0,-5,14,0,Math.PI*2);ctx.fill();ctx.fillStyle = '#f7e8d0';ctx.beginPath();ctx.arc(4,-9,9,0,Math.PI*2);ctx.fill();ctx.font = '10px sans-serif';ctx.textAlign='center';ctx.fillStyle='#806c58';ctx.fillText('GOOD DAY',0,30);
  }
  ctx.restore();
}
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let current = '';
    for (const char of Array.from(paragraph)) {
      if (current && ctx.measureText(current + char).width > width) { lines.push(current); current = char; }
      else current += char;
    }
    lines.push(current);
  }
  return lines;
}
export async function renderPage(page: DiaryPage, options: { scale?: number; preview?: boolean; strict?: boolean } = {}): Promise<RenderResult> {
  const { scale = 1, preview = false, strict = false } = options;
  const font = await ensureFont(page.template.font);
  const canvas = document.createElement('canvas');canvas.width=WIDTH*scale;canvas.height=HEIGHT*scale;
  const ctx = canvas.getContext('2d');if(!ctx)throw new Error('画布初始化失败，请更新浏览器后重试。');
  ctx.scale(scale,scale); ctx.fillStyle=papers[page.template.paper];ctx.fillRect(0,0,WIDTH,HEIGHT);
  // Deterministic paper grain stays identical across preview, refresh and export.
  ctx.fillStyle='#654f2c0a';for(let i=0;i<7000;i++){ const x=(i*137.19)%WIDTH,y=(i*79.57)%HEIGHT;ctx.fillRect(x,y,0.8,0.8); }
  if(page.template.paper==='grid'||page.template.paper==='lined') {
    ctx.strokeStyle='#9aab942b';ctx.lineWidth=1;
    for(let y=28;y<HEIGHT;y+=28)line(ctx,[[0,y],[WIDTH,y]]);
    if(page.template.paper==='grid')for(let x=28;x<WIDTH;x+=28)line(ctx,[[x,0],[x,HEIGHT]]);
  }
  ctx.strokeStyle='#8a8c6980';ctx.lineWidth=1.7;
  if(page.template.border==='wavy') {
    ctx.beginPath();
    for(let x=25;x<=775;x+=3){const y=25+Math.sin(x/8)*2; x===25?ctx.moveTo(x,y):ctx.lineTo(x,y);}
    for(let y=25;y<=975;y+=3)ctx.lineTo(775+Math.sin(y/8)*2,y);
    for(let x=775;x>=25;x-=3)ctx.lineTo(x,975+Math.sin(x/8)*2);
    for(let y=975;y>=25;y-=3)ctx.lineTo(25+Math.sin(y/8)*2,y);ctx.closePath();ctx.stroke();
  } else if(page.template.border==='tape') {
    ctx.strokeStyle='#8a8c6940';ctx.strokeRect(28,28,744,944);tape(ctx,80,32,100,29,-0.5);tape(ctx,720,970,100,29,-0.5);
  } else {
    ctx.strokeStyle='#9e89694f';ctx.beginPath();for(let i=0;i<100;i++){const x=22+i*7.6,y=22+((i*13)%9);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();line(ctx,[[24,35],[24,968],[775,968],[775,35]]);
  }
  ctx.fillStyle=page.template.textColor;ctx.textBaseline='alphabetic';ctx.textAlign='left';
  ctx.font=`17px "${font}"`;
  const date=page.text.date? page.text.date.replaceAll('-',' / ') : '';
  ctx.fillText(date,70,78);
  ctx.textAlign='right';ctx.fillText([page.text.weather,page.text.mood].filter(Boolean).join(' · '),730,78);ctx.textAlign='left';
  ctx.font=`43px "${font}"`;const titleLines = wrap(ctx,page.text.title,650);
  ctx.fillText(titleLines[0]??'',70,147);
  ctx.strokeStyle='#bfa98688';ctx.lineWidth=1;line(ctx,[[70,174],[730,174]]);
  ctx.font='11px Georgia,serif';ctx.fillStyle='#8e8878';ctx.fillText('LITTLE MOMENTS, BEAUTIFULLY KEPT.',70,192);
  ctx.font=`${page.template.fontSize*1.5}px "${font}"`;
  const lines=page.text.body?wrap(ctx,page.text.body,650):[];
  const lineHeight=page.template.fontSize*2.35;
  const boxes: HitBox[]=[], errors:string[]=[];
  const photos=await Promise.all(page.photos.map(async photo=>{
    try {return await loadPhoto(photo.blobKey);} catch(error){if(strict)throw error; errors.push(photo.id);return null;}
  }));
  const photoLayout: PhotoLayoutOptions = { imageSizes: {} };
  page.photos.forEach((photo, index) => {
    const image = photos[index];
    if (image) photoLayout.imageSizes![photo.blobKey] = { width: image.naturalWidth, height: image.naturalHeight };
  });
  // Give a single photo the available page width and height after reserving its text.
  // Dimensions come from the actual image, so older diaries need no migration.
  if (page.photos.length === 1) photoLayout.availableHeight = Math.max(310, Math.min(590, 902 - 208 - 42 - Math.max(0, lines.length - 1) * lineHeight - 20));
  const geometries=photoGeometry(page, photoLayout);
  page.photos.forEach((photo,index)=>{
    const box=geometries[index];boxes.push({...box,id:photo.id,kind:'photo'});
    ctx.save();ctx.translate(box.x+box.w/2,box.y+box.h/2);ctx.rotate((box.rotation??0)*Math.PI/180);
    const x=-box.w/2,y=-box.h/2;
    ctx.shadowColor='#51402a30';ctx.shadowBlur=photo.frame==='shadow'?14:7;ctx.shadowOffsetY=4;
    ctx.fillStyle='#fffdf6';rounded(ctx,x,y,box.w,box.h,photo.frame==='rounded'?18:2);ctx.fill();ctx.shadowColor='transparent';
    const { pad, bottom }=photoFrameInsets(photo,page.layout);
    const image=photos[index];
    if(image){
      const availableW=box.w-pad*2,availableH=box.h-pad-bottom;
      const ratio=Math.min(availableW/image.naturalWidth,availableH/image.naturalHeight);
      const w=image.naturalWidth*ratio,h=image.naturalHeight*ratio;
      ctx.save();rounded(ctx,x+pad,y+pad,availableW,availableH,photo.frame==='rounded'?12:0);ctx.clip();
      ctx.fillStyle='#eee9df';ctx.fillRect(x+pad,y+pad,availableW,availableH);
      ctx.drawImage(image,x+pad+(availableW-w)/2,y+pad+(availableH-h)/2,w,h);ctx.restore();
    } else {
      ctx.fillStyle='#e8e0d1';ctx.fillRect(x+pad,y+pad,box.w-pad*2,box.h-pad-bottom);ctx.fillStyle='#866e58';ctx.font='16px sans-serif';ctx.textAlign='center';ctx.fillText('照片加载失败',0,0);ctx.textAlign='left';
    }
    if(page.layout==='tape')tape(ctx,0,y+7,96,26,0.05);ctx.restore();
  });
  const bodyY=geometries.length ? Math.ceil(Math.max(...geometries.map(box=>visualBounds(box).bottom)))+42 : 242;
  ctx.fillStyle=page.template.textColor;ctx.font=`${page.template.fontSize*1.5}px "${font}"`;
  const overflow=titleLines.length>1 || (lines.length>0 && bodyY+(lines.length-1)*lineHeight>902);
  ctx.save();ctx.beginPath();ctx.rect(65,bodyY-30,670,934-(bodyY-30));ctx.clip();
  lines.forEach((text,i)=>ctx.fillText(text,74,bodyY+i*lineHeight));ctx.restore();
  if(preview&&!page.text.body){ctx.fillStyle='#938a76';ctx.font=`22px "${font}"`;ctx.fillText('写一点今天的小事吧…',74,bodyY);}
  if(preview&&!page.photos.length){
    ctx.fillStyle='#8d997211';ctx.strokeStyle='#939d7766';ctx.setLineDash([6,7]);rounded(ctx,70,580,660,210,4);ctx.fill();ctx.stroke();ctx.setLineDash([]);
    ctx.font=`22px "${font}"`;ctx.fillStyle='#7d866b';ctx.textAlign='center';ctx.fillText('让一张照片，替你留住今天',400,692);ctx.textAlign='left';
  }
  page.stickers.forEach(sticker=>{const box=stickerGeometry(sticker);drawSticker(ctx,sticker.type,box.x+box.w/2,box.y+box.h/2,sticker.rotation);boxes.push({...box,id:sticker.id,kind:'sticker'});});
  ctx.font=`17px "${font}"`;ctx.fillStyle=page.template.textColor;ctx.fillText(page.text.location?`于 ${page.text.location}`:'',72,947);
  ctx.textAlign='right';ctx.font='italic 16px Georgia,serif';ctx.fillStyle='#8c8f6f';ctx.fillText('a day to remember',728,947);
  return {canvas,overflow,errors,boxes,photoLayout};
}
export function hitTest(box: HitBox, x: number, y: number) {
  const cx=box.x+box.w/2,cy=box.y+box.h/2,a=-(box.rotation??0)*Math.PI/180;
  const dx=x-cx,dy=y-cy,rx=dx*Math.cos(a)-dy*Math.sin(a),ry=dx*Math.sin(a)+dy*Math.cos(a);
  return Math.abs(rx)<=box.w/2&&Math.abs(ry)<=box.h/2;
}
