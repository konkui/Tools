async page => {
  const info = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input[type=file]')];
    return {
      count: inputs.length,
      url: location.href,
      hasModal: !!document.querySelector('.modal'),
    };
  });
  console.log('PAGE INFO:', JSON.stringify(info));
  const IMG = 'C:/Users/kaijiguo/AppData/Local/CodeBuddyExtension/Data/24d0e264-bca2-4b68-8a69-ab7354490553/CodeBuddyIDE/24d0e264-bca2-4b68-8a69-ab7354490553/history/e697b1d3e2ce6ac8dc60e41be89d3c6d/77be824eca5342d28fb90cf667d8ae4c/assets/Gemini_Generated_Image_i8o37pi8o37pi8o3.a9fb2e1335.jpg';
  await page.locator('input[type=file]').nth(1).setInputFiles([IMG]);
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({
    hasModal: !!document.querySelector('.modal'),
    modalText: document.querySelector('.modal')?.textContent?.slice(0, 60) ?? null,
  }));
  console.log('AFTER:', JSON.stringify(after));
}
