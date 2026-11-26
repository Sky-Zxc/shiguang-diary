import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs/promises';

async function ready(page: Page) { await expect(page.locator('.canvas-loading')).toHaveCount(0); }
async function geometry(page: Page) {
  await ready(page);
  return page.locator('.photo-selection').evaluate(node => {
    const style=(node as HTMLElement).style;
    return {x:parseFloat(style.left)*8,y:parseFloat(style.top)*10,w:parseFloat(style.width)*8,h:parseFloat(style.height)*10};
  });
}
for (const [kind,width,height] of [['横图',1200,900],['竖图',900,1200]] as const) {
  test(`${kind}相框无灰边、短正文自动放大、PNG 保持 4:5`,async({page,browserName})=>{
    await page.goto('/');await page.getByRole('button',{name:'记录我的美好时光'}).click();
    const encoded=await page.evaluate(({width,height})=>{
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d')!;
      ctx.fillStyle='#345d7a';ctx.fillRect(0,0,width,height);
      ctx.fillStyle='#ee3322';ctx.fillRect(0,0,48,height);ctx.fillStyle='#2255ee';ctx.fillRect(width-48,0,48,height);
      ctx.fillStyle='#22cc55';ctx.fillRect(0,0,width,48);ctx.fillStyle='#bb44cc';ctx.fillRect(0,height-48,width,48);
      return canvas.toDataURL('image/png').split(',')[1];
    },{width,height});
    await page.getByLabel('上传照片',{exact:true}).setInputFiles({name:'edge-markers.png',mimeType:'image/png',buffer:Buffer.from(encoded,'base64')});
    await expect(page.locator('.photo-thumb')).toHaveCount(1);
    // An unrotated layout makes edge pixels observable without approximating rotations.
    await page.getByRole('button',{name:'双图并排',exact:true}).click();
    await page.getByLabel('给今天起个名字').fill('把快乐装进照片');await page.getByLabel('日记正文').fill('今天值得记住。');
    await page.getByRole('button',{name:'选中照片 1',exact:true}).click();
    const short=await geometry(page);
    expect((short.w-22)/(short.h-22)).toBeCloseTo(width/height,5);
    expect(short.h).toBeGreaterThan(400);
    if(kind==='横图')expect(short.w).toBeCloseTo(660,5);
    await page.getByLabel('日记正文').fill(Array(7).fill('今天的见闻需要多记录一些。').join('\n'));
    const long=await geometry(page);expect(long.h).toBeLessThan(short.h-80);
    await expect(page.locator('.inline-warning')).toHaveCount(0);
    await page.getByLabel('日记正文').fill('今天值得记住。');
    const restored=await geometry(page);expect(restored.h).toBeCloseTo(short.h,5);
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出当前页 PNG',exact:true}).click();
    const png=await download,bytes=await fs.readFile((await png.path())!);
    expect(bytes.readUInt32BE(16)).toBe(1600);expect(bytes.readUInt32BE(20)).toBe(2000);
    const colors=await page.evaluate(async({encoded,box})=>{
      const image=new Image();image.src=`data:image/png;base64,${encoded}`;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);
      const points=[[box.x+15,box.y+box.h/2],[box.x+box.w-15,box.y+box.h/2],[box.x+box.w/2,box.y+15],[box.x+box.w/2,box.y+box.h-15]];
      return points.map(([x,y])=>Array.from(ctx.getImageData(Math.round(x*2),Math.round(y*2),1,1).data));
    },{encoded:bytes.toString('base64'),box:restored});
    expect(colors[0][0]-colors[0][1]).toBeGreaterThan(70); // left red edge present
    expect(colors[1][2]-colors[1][0]).toBeGreaterThan(70); // right blue edge present
    expect(colors[2][1]-colors[2][0]).toBeGreaterThan(70); // top green edge present
    expect(colors[3][0]-colors[3][1]).toBeGreaterThan(70); // bottom purple edge present
    await png.saveAs(`artifacts/photo-fit-${kind}-${browserName}.png`);
    await page.getByRole('button',{name:'完成',exact:true}).click();
    await expect(page.getByText('已保存至本地',{exact:true})).toBeVisible();await page.reload();
    await page.getByRole('button',{name:'选中照片 1',exact:true}).click();
    expect((await geometry(page)).h).toBeCloseTo(short.h,5);
  });
}
