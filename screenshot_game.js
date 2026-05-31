const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });
    
    console.log('Navigating to game...');
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for game to load
    await page.waitForTimeout(3000);
    
    // Hard refresh equivalent - wait for page reload
    console.log('Waiting for game UI to render...');
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'C:/code/fnaf/game_screenshot.png', fullPage: true });
    console.log('Screenshot saved to game_screenshot.png');
    
    await browser.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
