// 用真实绿幕精灵图验证：自动色度键 → 智能识别 → 导入 → 播放无绿底
async page => {
  const IMG = 'C:/Users/kaijiguo/AppData/Local/CodeBuddyExtension/Data/24d0e264-bca2-4b68-8a69-ab7354490553/CodeBuddyIDE/24d0e264-bca2-4b68-8a69-ab7354490553/history/e697b1d3e2ce6ac8dc60e41be89d3c6d/77be824eca5342d28fb90cf667d8ae4c/assets/Gemini_Generated_Image_i8o37pi8o37pi8o3.a9fb2e1335.jpg';
  page.on('dialog', d => d.accept());
  await page.goto('http://127.0.0.1:5173/#/tools/frame-animator');
  await page.waitForTimeout(800);
  // 清空上次持久化的项目
  const clearBtn = page.getByRole('button', { name: '清空项目' });
  if (await clearBtn.count()) await clearBtn.click();
  await page.waitForTimeout(400);
  // 注入精灵表文件（第 2 个文件输入框）
  await page.locator('input[type=file]').nth(1).setInputFiles([IMG]);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: './fk-dialog-auto.png' });
  // 智能识别模式
  await page.getByText('智能识别（透明连通域）').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: './fk-smart.png' });
  // 确认导入
  await page.getByRole('button', { name: '确认导入' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: './fk-imported.png' });
}
