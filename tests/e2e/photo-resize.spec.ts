import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs/promises';

async function dragHandle(page: Page, name: string, dx: number, dy: number) {
  const handle = page.getByRole('button', { name, exact: true });
  const box = await handle.boundingBox(); expect(box).not.toBeNull();
  const x = box!.x + box!.width / 2, y = box!.y + box!.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 }); await page.mouse.up();
}
async function frameSize(page: Page) {
  return page.locator('.photo-selection').evaluate(node => ({ width: parseFloat((node as HTMLElement).style.width), height: parseFloat((node as HTMLElement).style.height) }));
}
test('拖动照片背景宽高、键盘微调、刷新复制与导出一致', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '使用示例：把周末交给山野' }).click();
  await expect(page.locator('.canvas-loading')).toHaveCount(0);
  await page.getByRole('button', { name: '选中照片 1', exact: true }).click();
  await expect(page.locator('.resize-handle')).toHaveCount(8);
  const original = await frameSize(page);
  await dragHandle(page, '调整照片背景右边大小', -140, 0);
  const narrow = await frameSize(page);
  expect(narrow.width).toBeLessThan(original.width - 15); expect(narrow.height).toBeCloseTo(original.height, 3);
  await dragHandle(page, '调整照片背景下边大小', 0, 35);
  const taller = await frameSize(page); expect(taller.height).toBeGreaterThan(narrow.height + 3);
  const right = page.getByRole('button', { name: '调整照片背景右边大小', exact: true });
  await right.focus(); await page.keyboard.press('ArrowLeft');
  expect((await frameSize(page)).width).toBeLessThan(taller.width);
  await expect(page.getByText('已保存至本地', { exact: true })).toBeVisible();
  const resized = await frameSize(page);
  await page.reload(); await page.getByRole('button', { name: '选中照片 1', exact: true }).click();
  await expect(page.locator('.canvas-loading')).toHaveCount(0);
  expect((await frameSize(page)).width).toBeCloseTo(resized.width, 5);
  expect((await frameSize(page)).height).toBeCloseTo(resized.height, 5);

  // Escape cancels an in-progress drag without changing the saved geometry.
  const handle = await page.getByRole('button', { name: '调整照片背景右下角大小', exact: true }).boundingBox();
  await page.mouse.move(handle!.x + 13, handle!.y + 13); await page.mouse.down();
  await page.mouse.move(handle!.x + 45, handle!.y + 35, { steps: 3 }); await page.keyboard.press('Escape'); await page.mouse.up();
  expect((await frameSize(page)).width).toBeCloseTo(resized.width, 5);
  await page.screenshot({ path: 'artifacts/photo-background-resize.png', fullPage: true });

  const pngPromise = page.waitForEvent('download'); await page.getByRole('button', { name: '导出当前页 PNG', exact: true }).click();
  const png = await pngPromise; const bytes = await fs.readFile((await png.path())!);
  const color = await page.evaluate(async encoded => {
    const image = new Image(); image.src = `data:image/png;base64,${encoded}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
    return Array.from(context.getImageData(1400, 700, 1, 1).data);
  }, bytes.toString('base64'));
  // This point was inside the original wide mat; after narrowing it must be paper.
  expect(color[0]).toBeGreaterThan(245); expect(color[1]).toBeGreaterThan(239); expect(color[2]).toBeLessThan(235);
  await page.getByRole('button', { name: '完成', exact: true }).click();
  const pdf = page.waitForEvent('download'); await page.getByRole('button', { name: '导出整本 PDF', exact: true }).click(); await pdf;
  await page.getByRole('button', { name: '完成', exact: true }).click();

  await page.getByRole('button', { name: '复制此页' }).click(); await page.getByRole('button', { name: '选中照片 1', exact: true }).click();
  expect((await frameSize(page)).width).toBeCloseTo(resized.width, 5);
  await page.getByRole('button', { name: '恢复自动背景大小' }).click();
  expect((await frameSize(page)).width).toBeCloseTo(original.width, 5);
  await page.getByRole('tab', { name: '01 第 1 页' }).click(); await page.getByRole('button', { name: '选中照片 1', exact: true }).click();
  expect((await frameSize(page)).width).toBeCloseTo(resized.width, 5);
  await page.getByRole('button', { name: '双图并排', exact: true }).click();
  expect((await frameSize(page)).width).toBeCloseTo(original.width, 5);
});
