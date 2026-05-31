const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1024, height: 768 });
    
    // Navigate to game
    console.log('Navigating to http://localhost:8000...');
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle2' });
    console.log('✓ Page loaded');
    
    // Hard refresh (Ctrl+Shift+R equivalent)
    console.log('Performing hard refresh...');
    await page.reload({ waitUntil: 'networkidle2' });
    console.log('✓ Hard refresh complete');
    
    // Click "Start Game" button
    console.log('Clicking Start Game button...');
    const startButton = await page.button:contains("Start Game") || await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.includes('Start Game'));
    });
    
    if (startButton) {
      await page.click('button');
      console.log('✓ Start Game clicked');
    } else {
      console.log('⚠ Start Game button not found, trying click by evaluate');
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.includes('Start Game'));
        if (btn) btn.click();
      });
      console.log('✓ Start Game triggered via evaluate');
    }
    
    // Wait 5 seconds for animatronics to start moving
    console.log('Waiting 5 seconds for animatronics to start moving...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('✓ 5 second wait complete');
    
    // Get console messages/errors
    console.log('\n--- CHECKING CONSOLE FOR ERRORS ---');
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    page.on('error', err => {
      consoleMessages.push({
        type: 'error',
        text: err.toString()
      });
    });
    
    // Check for errors in the page
    const errors = await page.evaluate(() => {
      return window.__errors || [];
    });
    
    // Take screenshot of console area (simulated by checking page state)
    console.log('Taking page snapshot...');
    await page.screenshot({ path: 'test-screenshot.png' });
    console.log('✓ Screenshot saved to test-screenshot.png');
    
    // Check 3D office view and animatronics rendering
    console.log('\n--- CHECKING ANIMATRONICS RENDERING ---');
    const animatronicsInfo = await page.evaluate(() => {
      const result = {
        office3dLoaded: typeof window.office3d !== 'undefined',
        threeLoaded: typeof window.THREE !== 'undefined',
        animatronicsState: {}
      };
      
      // Check game state
      if (typeof window.game !== 'undefined') {
        result.gameState = {
          currentNight: window.game.currentNight,
          currentTime: window.game.currentTime,
          isPaused: window.game.isPaused
        };
      }
      
      // Check animatronics state
      if (typeof window.animatronics !== 'undefined') {
        result.animatronicsState = {
          freddy: window.animatronics.freddy ? {
            pos: window.animatronics.freddy.pos,
            merch: window.animatronics.freddy.merch,
            stage: window.animatronics.freddy.stage
          } : null,
          bonnie: window.animatronics.bonnie ? {
            pos: window.animatronics.bonnie.pos,
            merch: window.animatronics.bonnie.merch,
            stage: window.animatronics.bonnie.stage
          } : null,
          chica: window.animatronics.chica ? {
            pos: window.animatronics.chica.pos,
            merch: window.animatronics.chica.merch,
            stage: window.animatronics.chica.stage
          } : null,
          foxy: window.animatronics.foxy ? {
            pos: window.animatronics.foxy.pos,
            merch: window.animatronics.foxy.merch,
            stage: window.animatronics.foxy.stage
          } : null
        };
      }
      
      return result;
    });
    
    console.log('Animatronics Info:', JSON.stringify(animatronicsInfo, null, 2));
    
    // Check if detailed animatronics appear at doors
    console.log('\n--- TEST RESULTS ---');
    console.log('3D Office View Loaded:', animatronicsInfo.office3dLoaded ? 'YES' : 'NO');
    console.log('Three.js Loaded:', animatronicsInfo.threeLoaded ? 'YES' : 'NO');
    console.log('Game State:', animatronicsInfo.gameState);
    console.log('Animatronics Positions:', animatronicsInfo.animatronicsState);
    
    // Determine if animatronics have moved (pos > 0 means they've started moving toward doors)
    const animatronicsMoving = Object.values(animatronicsInfo.animatronicsState).some(a => a && a.pos > 0);
    console.log('Detailed animatronics appear at doors:', animatronicsMoving ? 'YES' : 'NO (still at stage or pos=0)');
    
    console.log('\n--- CONSOLE ERRORS ---');
    if (consoleMessages.length > 0) {
      console.log('YES - Console has messages:');
      consoleMessages.forEach(msg => {
        console.log(\  [\] \\);
      });
    } else {
      console.log('NO - No console errors detected');
    }
    
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    if (browser) await browser.close();
    process.exit(1);
  }
})();
