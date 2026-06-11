const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });
    
    console.log('Navigating to game...');
    await page.goto('http://localhost:8000', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for game to load and compile shaders/assets
    console.log('Waiting for game to initialize...');
    await new Promise(r => setTimeout(r, 5000));
    
    // Take screenshot
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'C:/code/fnaf/game_screenshot.png', fullPage: true });
    console.log('Screenshot saved to C:/code/fnaf/game_screenshot.png');
    
    await browser.close();
  } catch (error) {
    console.error('Error:', error);
    if (browser) await browser.close();
    process.exit(1);
  }
})();
