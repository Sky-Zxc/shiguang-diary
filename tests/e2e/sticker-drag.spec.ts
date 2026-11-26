import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs/promises';

async function position(page:Page) {
  return page.locator('.sticker-selection').evaluate(node=>({x:parseFloat((node as HTMLElement).style.left)*8+55,y:parseFloat((node as HTMLElement).style.top)*10+44}));
}
async function move(page:Page,dx:number,dy:number,touch=false) {
  const target=page.getByRole('button',{name:'拖动选中贴纸',exact:true});await target.scrollIntoViewIfNeeded();
  const box=(await target.boundingBox())!;const x=box.x+box.width/2,y=box.y+box.height/2;
  if(touch){
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  }else{
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:8});await page.mouse.up();
  }
}
test('贴纸拖动、键盘、取消、保存复制、预设及 PNG/PDF',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'记录我的美好时光'}).click();
  await page.getByRole('button',{name:'添加星星',exact:true}).click();
  const original=await position(page);await move(page,-110,150);
  const moved=await position(page);expect(moved.x).toBeLessThan(original.x-150);expect(moved.y).toBeGreaterThan(original.y+200);
  await expect(page.getByLabel('贴纸位置',{exact:true})).toHaveValue('custom');
  await page.getByRole('button',{name:'拖动选中贴纸',exact:true}).focus();await page.keyboard.press('ArrowRight');
  expect((await position(page)).x).toBeCloseTo(moved.x+4,5);
  const saved=await position(page);
  const box=(await page.getByRole('button',{name:'拖动选中贴纸',exact:true}).boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+80,box.y+70,{steps:3});
  await page.keyboard.press('Escape');await page.mouse.up();expect(await position(page)).toEqual(saved);
  await expect(page.getByText('已保存至本地',{exact:true})).toBeVisible();await page.reload();
  await page.getByRole('button',{name:'选中贴纸 1',exact:true}).click();expect(await position(page)).toEqual(saved);
  // Hit-test at the moved location must select the same sticker after selecting a different one.
  await page.getByRole('button',{name:'添加胶带',exact:true}).click();
  const canvas=(await page.locator('.canvas-paper canvas').boundingBox())!;
  await page.mouse.click(canvas.x+saved.x/800*canvas.width,canvas.y+saved.y/1000*canvas.height);expect(await position(page)).toEqual(saved);
  await page.screenshot({path:'artifacts/sticker-free-drag.png',fullPage:true});
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出当前页 PNG',exact:true}).click();
  const png=await download,bytes=await fs.readFile((await png.path())!);
  const color=await page.evaluate(async({encoded,center})=>{
    const image=new Image();image.src=`data:image/png;base64,${encoded}`;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);
    return Array.from(ctx.getImageData(Math.round(center.x*2),Math.round(center.y*2),1,1).data);
  },{encoded:bytes.toString('base64'),center:saved});
  expect(color[0]).toBeGreaterThan(180);expect(color[1]).toBeGreaterThan(120);expect(color[2]).toBeLessThan(150);
  await page.getByRole('button',{name:'完成',exact:true}).click();
  await page.getByRole('button',{name:'复制此页',exact:true}).click();await page.getByRole('button',{name:'选中贴纸 1',exact:true}).click();expect(await position(page)).toEqual(saved);
  await page.getByLabel('贴纸位置',{exact:true}).selectOption('4');expect((await position(page)).y).toBe(866);
  await page.getByRole('tab',{name:'01 第 1 页'}).click();await page.getByRole('button',{name:'选中贴纸 1',exact:true}).click();expect(await position(page)).toEqual(saved);
  await page.getByRole('button',{name:'随机装饰这一页',exact:true}).click();await expect(page.getByLabel('贴纸位置',{exact:true})).not.toHaveValue('custom');
  const pdf=page.waitForEvent('download');await page.getByRole('button',{name:'导出整本 PDF',exact:true}).click();await pdf;await expect(page.getByText('已生成 2 页 PDF')).toBeVisible();
});
test.describe('手机贴纸拖动',()=>{
  test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  test('从装饰进入预览触屏拖动，刷新后位置保留',async({page,browserName})=>{
    await page.goto('/');await page.getByRole('button',{name:'记录我的美好时光'}).tap();
    await page.getByRole('button',{name:'添加星星',exact:true}).tap();await page.getByRole('button',{name:'在预览中拖动',exact:true}).tap();
    const original=await position(page);await move(page,-70,110,browserName==='chromium');
    const moved=await position(page);expect(moved.x).toBeLessThan(original.x-100);expect(moved.y).toBeGreaterThan(original.y+150);
    await expect(page.getByRole('button',{name:'预览',exact:true})).toHaveAttribute('aria-expanded','true');
    await expect(page.getByText('已保存至本地',{exact:true})).toBeVisible();await page.reload();
    await page.getByRole('button',{name:'选中贴纸 1',exact:true}).tap();
    await expect(page.getByLabel('贴纸位置',{exact:true})).toHaveValue('custom');await page.getByRole('button',{name:'在预览中拖动',exact:true}).tap();
    expect(await position(page)).toEqual(moved);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
});
