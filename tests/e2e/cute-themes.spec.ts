import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import { THEMES } from '../../src/themes';
import { STICKER_CATALOG } from '../../src/cuteArt';

async function ready(page:Page){await expect(page.locator('.canvas-loading')).toHaveCount(0);await expect(page.locator('.canvas-error')).toHaveCount(0);}
async function png(page:Page){
  const job=page.waitForEvent('download');await page.getByRole('button',{name:'导出当前页 PNG',exact:true}).click();
  const download=await job,bytes=await fs.readFile((await download.path())!);
  expect(bytes.readUInt32BE(16)).toBe(1600);expect(bytes.readUInt32BE(20)).toBe(2000);
  await page.getByRole('button',{name:'完成',exact:true}).click();return download;
}
test('六款卡通模板保留内容，预览导出和保存恢复一致',async({page,browserName})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await page.getByRole('button',{name:'使用示例：把周末交给山野'}).click();await ready(page);
  await page.getByLabel('给今天起个名字').fill('今天有一点可爱');await page.getByLabel('日记正文').fill('小小的快乐，也想认真收藏。');
  await page.getByRole('button',{name:'添加兔兔',exact:true}).click();
  for(const theme of THEMES.filter(theme=>theme.id!=='classic')){
    await page.getByRole('combobox',{name:'手绘模板',exact:true}).selectOption(theme.id);await ready(page);
    await expect(page.getByRole('combobox',{name:'手绘模板',exact:true})).toHaveValue(theme.id);
    await expect(page.getByLabel('给今天起个名字')).toHaveValue('今天有一点可爱');
    await expect(page.locator('.photo-thumb')).toHaveCount(1);await expect(page.locator('.added-stickers>button')).toHaveCount(3);
    // The paper color must actually reach the canvas, not just its thumbnail.
    const pixel=await page.locator('.canvas-paper canvas').evaluate(canvas=>Array.from((canvas as HTMLCanvasElement).getContext('2d')!.getImageData(8,8,1,1).data));
    expect(pixel[3]).toBe(255);expect(pixel[0]+pixel[1]+pixel[2]).toBeGreaterThan(600);
    const image=await png(page);await image.saveAs(`artifacts/theme-${theme.id}-${browserName}.png`);
  }
  await expect(page.getByText('已保存至本地',{exact:true})).toBeVisible();await page.reload();await ready(page);
  await expect(page.getByRole('combobox',{name:'手绘模板',exact:true})).toHaveValue('kitty');
  await page.getByRole('button',{name:/添加页/}).click();
  await page.getByLabel('给今天起个名字').fill('第二页仍是我');await page.getByRole('button',{name:'添加小熊',exact:true}).click();
  await page.getByRole('tab',{name:'01 第 1 页'}).click();await page.getByRole('button',{name:'将当前页样式应用到其他页',exact:true}).click();
  await page.getByRole('button',{name:'确认',exact:true}).click();await page.getByRole('tab',{name:'02 第 2 页'}).click();
  await expect(page.getByRole('combobox',{name:'手绘模板',exact:true})).toHaveValue('kitty');
  await expect(page.getByLabel('给今天起个名字')).toHaveValue('第二页仍是我');await expect(page.locator('.added-stickers>button')).toHaveCount(1);
  const pdf=page.waitForEvent('download');await page.getByRole('button',{name:'导出整本 PDF',exact:true}).click();await pdf;await expect(page.getByText('已生成 2 页 PDF')).toBeVisible();
  await page.getByRole('button',{name:'完成',exact:true}).click();await page.getByRole('combobox',{name:'手绘模板',exact:true}).selectOption('classic');await ready(page);
  expect(errors).toEqual([]);
});
test('十二种新贴纸可分类、达到上限并完整导出',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'记录我的美好时光'}).click();
  await expect(page.locator('.cute-sticker-options>button')).toHaveCount(17);
  await page.getByRole('button',{name:'小表情',exact:true}).click();await expect(page.locator('.cute-sticker-options>button')).toHaveCount(6);
  await page.getByRole('button',{name:'小装饰',exact:true}).click();await expect(page.locator('.cute-sticker-options>button')).toHaveCount(6);
  await page.getByRole('button',{name:'手绘基础',exact:true}).click();await expect(page.locator('.cute-sticker-options>button')).toHaveCount(5);
  await page.getByRole('button',{name:'全部',exact:true}).click();
  const cute=STICKER_CATALOG.filter(sticker=>sticker.group!=='classic');
  for(const sticker of cute.slice(0,8))await page.getByRole('button',{name:`添加${sticker.label}`,exact:true}).click();
  await expect(page.locator('.added-stickers>button')).toHaveCount(8);
  await expect(page.getByRole('button',{name:'添加彩虹',exact:true})).toBeDisabled();await ready(page);await png(page);
  for(const sticker of cute.slice(8)){
    await page.getByRole('button',{name:'选中贴纸 1',exact:true}).click();await page.getByRole('button',{name:'删除选中贴纸',exact:true}).click();
    await page.getByRole('button',{name:`添加${sticker.label}`,exact:true}).click();await ready(page);
  }
  await expect(page.locator('.added-stickers>button')).toHaveCount(8);
  await expect.poll(()=>page.locator('.added-stickers img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).naturalWidth>0))).toBe(true);
  await png(page);
  await expect(page.getByText('已保存至本地',{exact:true})).toBeVisible();await page.reload();await ready(page);
  await expect(page.locator('.added-stickers>button')).toHaveCount(8);
});
test.describe('手机卡通模板',()=>{
  test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  test('小屏模板切换、新表情拖动与导出',async({page})=>{
    await page.goto('/');await page.getByRole('button',{name:'记录我的美好时光'}).tap();
    await page.getByRole('combobox',{name:'手绘模板',exact:true}).selectOption('bunny');await page.getByRole('button',{name:'小表情',exact:true}).tap();
    await page.getByRole('button',{name:'添加兔兔',exact:true}).tap();await page.getByRole('button',{name:'在预览中拖动',exact:true}).tap();await ready(page);
    const target=page.getByRole('button',{name:'拖动选中贴纸',exact:true});await target.scrollIntoViewIfNeeded();
    const before=await page.locator('.sticker-selection').getAttribute('style'),box=(await target.boundingBox())!;
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x-50,box.y+100,{steps:5});await page.mouse.up();
    await expect(page.locator('.sticker-selection')).not.toHaveAttribute('style',before!);
    await png(page);await page.getByRole('button',{name:'返回编辑',exact:true}).tap();
    for(const width of [320,390,430,740]){await page.setViewportSize({width,height:width===740?390:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
    await page.setViewportSize({width:390,height:844});
    await page.locator('.theme-section').screenshot({path:'artifacts/cute-templates-mobile.png'});
    await page.getByRole('button',{name:'全部',exact:true}).tap();await page.locator('.cute-sticker-options').screenshot({path:'artifacts/cute-stickers-mobile.png'});
  });
});
