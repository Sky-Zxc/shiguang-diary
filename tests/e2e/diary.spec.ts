import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';

const image=path.resolve('public/images/lake.jpg');
async function ready(page:Page){await expect(page.locator('.canvas-loading')).toHaveCount(0);await expect(page.locator('.canvas-error')).toHaveCount(0);}
async function saved(page:Page){await expect(page.getByText('已保存至本地',{exact:true})).toBeVisible();}
async function closeExport(page:Page){await page.getByRole('button',{name:'完成',exact:true}).click();}
test('首页、三页编辑、样式独立、刷新恢复、PNG 和 PDF',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await expect(page.getByRole('heading',{name:'你的故事，从这一页开始'})).toBeVisible();
  await fs.mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/home-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'使用示例：把周末交给山野'}).click();
  await page.getByRole('textbox',{name:'日记本标题'}).fill('三页小日子');await ready(page);
  await page.getByRole('button',{name:'牛皮纸',exact:true}).click();await page.getByRole('button',{name:'添加星星',exact:true}).click();
  await page.screenshot({path:'artifacts/editor-desktop.png',fullPage:true});
  await page.getByRole('button',{name:/添加页/}).click();await expect(page.getByLabel('给今天起个名字')).toHaveValue('');
  await expect(page.getByRole('button',{name:'米白',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByLabel('给今天起个名字').fill('第二天的风');await page.getByLabel('日记正文').fill('每一页，都有自己的样子。');
  await page.getByRole('button',{name:'横线',exact:true}).click();await page.getByRole('button',{name:'复制此页'}).click();
  await expect(page.getByRole('button',{name:/添加页/})).toBeDisabled();await expect(page.getByRole('button',{name:'复制此页'})).toBeDisabled();
  await page.getByLabel('给今天起个名字').fill('副本不会改变原页');await page.getByRole('tab',{name:'02 第 2 页'}).click();await expect(page.getByLabel('给今天起个名字')).toHaveValue('第二天的风');
  await page.getByRole('tab',{name:'01 第 1 页'}).click();await expect(page.getByRole('button',{name:'牛皮纸',exact:true})).toHaveAttribute('aria-pressed','true');await saved(page);
  await page.reload();await ready(page);await expect(page.getByRole('textbox',{name:'日记本标题'})).toHaveValue('三页小日子');await expect(page.getByLabel('给今天起个名字')).toHaveValue('把周末交给山野');
  const pngPromise=page.waitForEvent('download');await page.getByRole('button',{name:'导出当前页 PNG',exact:true}).click();const png=await pngPromise;
  expect(png.suggestedFilename()).toMatch(/手绘日记_\d{4}-\d{2}-\d{2}_第1页.png/);
  const pngPath=await png.path();const pngBytes=await fs.readFile(pngPath!);expect(pngBytes.subarray(1,4).toString()).toBe('PNG');expect(pngBytes.readUInt32BE(16)).toBe(1600);expect(pngBytes.readUInt32BE(20)).toBe(2000);await png.saveAs('artifacts/export-page.png');await closeExport(page);
  const pdfPromise=page.waitForEvent('download');await page.getByRole('button',{name:'导出整本 PDF',exact:true}).click();const pdf=await pdfPromise;const bytes=await fs.readFile((await pdf.path())!);const pdfText=bytes.toString('latin1');expect(pdfText.startsWith('%PDF-')).toBe(true);expect(pdfText.match(/\/Type \/Page\b/g)).toHaveLength(3);await pdf.saveAs('artifacts/export-book.pdf');await expect(page.getByText('已生成 3 页 PDF')).toBeVisible();await closeExport(page);
  await expect(page.getByRole('tab',{name:'01 第 1 页'})).toHaveAttribute('aria-selected','true');await page.getByRole('button',{name:'返回首页',exact:true}).click();await expect(page.getByRole('button',{name:'打开 三页小日子'})).toBeVisible();
  expect(errors).toEqual([]);
});
test('六张照片、替换与排序、复制后删原页仍可导出、空白页规则',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'开始我的第一篇'}).click();await page.getByLabel('上传照片',{exact:true}).setInputFiles(Array(6).fill(image));await expect(page.locator('.photo-thumb')).toHaveCount(6);await expect(page.getByRole('button',{name:'这一页的照片已满'})).toBeDisabled();
  for(const label of ['拍立得','双图并排','错落拼贴','四宫格','胶带贴图']){await page.getByRole('button',{name:label,exact:true}).click();await ready(page);await expect(page.locator('.photo-thumb')).toHaveCount(6);}
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'替换照片 1',exact:true}).click();await (await chooser).setFiles(path.resolve('public/images/forest.jpg'));await expect(page.locator('.photo-thumb').first().locator('img')).toHaveAttribute('alt','forest.jpg');
  await page.getByRole('button',{name:'后移照片 1',exact:true}).click();await expect(page.locator('.photo-thumb').nth(1).locator('img')).toHaveAttribute('alt','forest.jpg');
  await page.getByRole('button',{name:'复制此页'}).click();await page.getByRole('tab',{name:'01 第 1 页'}).click();await page.getByRole('button',{name:'删除此页'}).click();await page.getByRole('button',{name:'确认操作'}).click();await expect(page.locator('.photo-thumb')).toHaveCount(6);await saved(page);await page.reload();await ready(page);await expect(page.locator('.photo-thumb img')).toHaveCount(6);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出当前页 PNG',exact:true}).click();await download;await closeExport(page);
  await page.getByRole('button',{name:/添加页/}).click();await ready(page);await expect(page.getByRole('button',{name:'删除此页'})).toBeEnabled();
  const blank=page.waitForEvent('download');await page.getByRole('button',{name:'导出当前页 PNG',exact:true}).click();await blank;await closeExport(page);
});
test('非法照片和文字溢出有恢复入口，手机与平板布局可用',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'开始我的第一篇'}).click();await ready(page);
  await page.getByLabel('上传照片',{exact:true}).setInputFiles({name:'fake.png',mimeType:'image/png',buffer:Buffer.from('not an image')});await expect(page.getByText(/格式不支持/)).toBeVisible();await expect(page.locator('.photo-thumb')).toHaveCount(0);
  await page.getByLabel('日记正文').fill('有些回忆很长，需要慢慢写。'.repeat(100));await expect(page.getByText(/内容较多，建议精简/)).toBeVisible();await ready(page);await expect(page.getByText('文字超出当前版式，请精简内容或调小字号后再导出。')).toBeVisible();await page.getByRole('button',{name:'导出当前页 PNG',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'第 1 页文字超出版式'})).toBeVisible();await page.getByRole('button',{name:'返回编辑'}).click();await page.getByLabel('日记正文').fill('今天，值得记住。');await saved(page);
  await page.setViewportSize({width:900,height:1000});await page.getByRole('button',{name:'纸张与装饰'}).click();await expect(page.locator('.style-panel')).toBeVisible();await page.getByRole('button',{name:'关闭样式面板'}).click();await expect(page.locator('.style-panel')).not.toBeVisible();
  await page.setViewportSize({width:390,height:844});await expect(page.getByRole('button',{name:'内容',exact:true})).toBeVisible();await expect(page.locator('.content-panel')).toBeVisible();await page.getByRole('button',{name:'预览',exact:true}).click();await expect(page.locator('.content-panel')).not.toBeVisible();await expect(page.getByRole('button',{name:'导出整本 PDF',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:'artifacts/editor-mobile.png',fullPage:true});
  const pdf=page.waitForEvent('download');await page.getByRole('button',{name:'导出整本 PDF',exact:true}).click();await pdf;await closeExport(page);await page.getByRole('button',{name:'返回首页',exact:true}).click();await page.screenshot({path:'artifacts/home-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('保存失败可重试，历史删除需确认',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'开始我的第一篇'}).click();await saved(page);
  await page.evaluate(()=>{const original=IDBObjectStore.prototype.put;(window as unknown as {restorePut:()=>void}).restorePut=()=>{IDBObjectStore.prototype.put=original;};IDBObjectStore.prototype.put=function(){throw new DOMException('浏览器存储空间不足，请清理历史记录。','QuotaExceededError');};});
  await page.getByLabel('给今天起个名字').fill('保存失败也不能丢失');await expect(page.getByText('保存失败',{exact:true})).toBeVisible();await expect(page.getByRole('alert')).toContainText('存储空间不足');
  await page.evaluate(()=>(window as unknown as {restorePut:()=>void}).restorePut());await page.getByRole('button',{name:'重试保存',exact:true}).click();await saved(page);await page.reload();await expect(page.getByLabel('给今天起个名字')).toHaveValue('保存失败也不能丢失');await page.getByRole('button',{name:'返回首页',exact:true}).click();await page.getByRole('button',{name:'删除 我的日记本',exact:true}).click();await page.getByRole('button',{name:'取消',exact:true}).click();await expect(page.getByRole('button',{name:'打开 我的日记本'})).toBeVisible();await page.getByRole('button',{name:'删除 我的日记本',exact:true}).click();await page.getByRole('button',{name:'确认操作',exact:true}).click();await expect(page.getByRole('heading',{name:'你的故事，从这一页开始'})).toBeVisible();
});
test('整本导出会检查非当前页的失效照片，并支持修复后重试',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'使用示例：把周末交给山野'}).click();await ready(page);
  await page.getByRole('button',{name:/添加页/}).click();await page.getByLabel('给今天起个名字').fill('第二页');await saved(page);
  await page.evaluate(async()=>{
    await new Promise<void>((resolve,reject)=>{const request=indexedDB.open('shiguang-diary');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result;const tx=db.transaction('images','readwrite');tx.objectStore('images').clear();tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
  });
  await page.reload();await ready(page);await expect(page.getByRole('tab',{name:'02 第 2 页'})).toHaveAttribute('aria-selected','true');
  await page.getByRole('button',{name:'导出整本 PDF',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'照片文件缺失'})).toBeVisible();await page.getByRole('button',{name:'返回编辑'}).click();
  await page.getByRole('tab',{name:'01 第 1 页'}).click();await page.getByRole('button',{name:'删除照片 1',exact:true}).click();await saved(page);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出整本 PDF',exact:true}).click();await download;await expect(page.getByText('已生成 2 页 PDF')).toBeVisible();await closeExport(page);
});
