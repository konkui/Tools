// 绿幕图导入流程（页面已在工具页且为空项目）
async page => {
  const IMG = 'C:/Users/kaijiguo/AppData/Local/CodeBuddyExtension/Data/24d0e264-bca2-4b68-8a69-ab7354490553/CodeBuddyIDE/24d0e264-bca2-4b68-8a69-ab7354490553/history/e697b1d3e2ce6ac8dc60e41be89d3c6d/77be824eca5342d28fb90cf667d8ae4c/assets/Gemini_Generated_Image_i8o37pi8o37pi8o3.a9fb2e1335.jpg';
  await page.locator('input[type=file]').nth(1).setInputFiles([IMG]);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: './fk-dialog-auto.png' });
  await page.getByText('智能识别（透明连通域）').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: './fk-smart.png' });
  await page.getByRole('button', { name: '确认导入' }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: './fk-imported.png' });
}
