import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const saved = async (page: import('@playwright/test').Page) => expect(page.getByText('已保存至本地', { exact: true })).toBeVisible();
const ready = async (page: import('@playwright/test').Page) => { await expect(page.locator('.canvas-paper canvas')).toBeAttached(); await expect(page.locator('.canvas-loading')).toHaveCount(0); };

test('手机可直接新建，窄屏三种编辑面板均无横向溢出', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('note')).toContainText('手机也能编辑与导出');
  await page.getByRole('button', { name: '开始我的第一篇' }).tap();
  await expect(page.locator('.content-panel')).toBeVisible();
  await expect(page.getByLabel('日记本标题')).toBeEditable();
  for (const width of [320, 390, 430, 740]) {
    await page.setViewportSize({ width, height: width === 740 ? 390 : 844 });
    for (const label of ['内容', '预览', '装饰']) {
      await page.getByRole('button', { name: label, exact: true }).tap();
      await expect(page.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});

test('手机上传、编辑、装饰、背景调整、保存恢复及多页导出', async ({ page, browserName }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始我的第一篇' }).tap();
  await page.getByLabel('日记本标题').fill('手机里的小日子');
  await page.getByLabel('上传照片', { exact: true }).setInputFiles(path.resolve('public/images/forest.jpg'));
  await expect(page.locator('.photo-thumb')).toHaveCount(1);
  await page.getByLabel('给今天起个名字').fill('手机写下的第一篇');
  await page.getByLabel('日记正文').fill('用手机留住今天的光。');
  await page.getByLabel('在哪里').fill('山间');
  await page.getByRole('button', { name: '选中照片 1', exact: true }).tap();
  await page.locator('#photo-frame').selectOption('rounded');
  await page.getByRole('button', { name: '装饰', exact: true }).tap();
  await expect(page.locator('.content-panel')).not.toBeVisible();
  await page.getByRole('button', { name: '格纹', exact: true }).tap();
  await page.getByRole('button', { name: '雾蓝', exact: true }).tap();
  await page.getByRole('button', { name: '添加星星', exact: true }).tap();
  await expect(page.getByLabel('贴纸位置', { exact: true })).toBeVisible();
  await page.getByLabel('贴纸位置', { exact: true }).selectOption('4');
  await page.getByRole('button', { name: '内容', exact: true }).tap();
  await page.getByRole('button', { name: '选中照片 1', exact: true }).tap();
  await page.getByRole('button', { name: '预览', exact: true }).tap();
  await ready(page);
  const handle = page.getByRole('button', { name: '调整照片背景右下角大小', exact: true });
  await expect(handle).toBeVisible(); await handle.scrollIntoViewIfNeeded();
  const before = await page.locator('.photo-selection').boundingBox();
  const box = (await handle.boundingBox())!; const x=box.x+box.width/2,y=box.y+box.height/2;
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{x,y}] });
    for(let step=1;step<=6;step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{x:x+step*3,y:y+step*2}] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+18,y+12,{steps:6});await page.mouse.up();
  }
  await expect.poll(async () => (await page.locator('.photo-selection').boundingBox())!.width).toBeGreaterThan(before!.width+8);
  const resizedWidth=(await page.locator('.photo-selection').boundingBox())!.width;
  await saved(page);
  await page.screenshot({path:`artifacts/mobile-edit-preview-${browserName}.png`,fullPage:true});
  await page.reload(); await ready(page);
  // Existing diaries open in preview; select the photo to inspect its persisted bounds.
  const canvas=(await page.locator('.canvas-paper canvas').boundingBox())!;
  await page.touchscreen.tap(canvas.x+canvas.width/2,canvas.y+canvas.height*.3);
  await expect(page.locator('.photo-selection')).toBeVisible();
  expect((await page.locator('.photo-selection').boundingBox())!.width).toBeCloseTo(resizedWidth,0);
  await page.getByRole('button', { name: '内容', exact: true }).tap();
  await expect(page.getByLabel('给今天起个名字')).toHaveValue('手机写下的第一篇');
  await expect(page.getByLabel('日记正文')).toHaveValue('用手机留住今天的光。');
  await expect(page.locator('#photo-frame')).toHaveValue('rounded');
  await expect(page.getByRole('button',{name:'恢复自动背景大小'})).toBeEnabled();
  await page.getByRole('button', { name: '装饰', exact: true }).tap();
  await expect(page.getByRole('button', { name: '格纹', exact: true })).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('button', { name: '雾蓝', exact: true })).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.added-stickers>button')).toHaveCount(1);
  await page.getByRole('button', { name: '预览', exact: true }).tap();
  await page.getByRole('button', { name: '复制此页', exact: true }).tap();
  await expect(page.getByRole('tab', { name: /第 2 页$/ })).toHaveAttribute('aria-selected','true');
  await page.getByRole('button', { name: /添加页/ }).tap();
  await expect(page.getByRole('tab', { name: /第 3 页$/ })).toHaveAttribute('aria-selected','true');
  await expect(page.getByRole('button', { name: /添加页/ })).toBeDisabled();
  await page.getByRole('button', { name: '删除此页', exact: true }).tap();
  await page.getByRole('button', { name: '确认操作', exact: true }).tap();
  await page.getByRole('tab', { name: /第 1 页$/ }).tap();await ready(page);await saved(page);
  const pngPromise=page.waitForEvent('download');await page.getByRole('button',{name:'导出当前页 PNG',exact:true}).tap();
  const png=await pngPromise, pngBytes=await fs.readFile((await png.path())!);
  expect(pngBytes.readUInt32BE(16)).toBe(1600);expect(pngBytes.readUInt32BE(20)).toBe(2000);
  await page.getByRole('button',{name:'完成',exact:true}).tap();
  const pdfPromise=page.waitForEvent('download');await page.getByRole('button',{name:'导出整本 PDF',exact:true}).tap();
  const pdf=await pdfPromise,pdfBytes=await fs.readFile((await pdf.path())!);
  expect(pdfBytes.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(2);
  await page.getByRole('button',{name:'完成',exact:true}).tap();
  await page.getByRole('button',{name:'返回首页',exact:true}).tap();
  await expect(page.getByRole('button',{name:'继续编辑',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'删除 手机里的小日子',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'继续编辑',exact:true}).tap();await ready(page);
  await expect(page.getByLabel('日记本标题')).toHaveValue('手机里的小日子');
});
