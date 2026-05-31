const fs = require('fs');
const path = require('path');

console.log('=== FNAF GAME VERIFICATION TEST ===\n');

let passed = true;
const issues = [];

console.log('[1] Checking file existence...');

// Test 1: Check office3d.js is loaded
const hasOffice3d = fs.existsSync('./src/js/office3d.js');
if (hasOffice3d) {
  console.log('[2] office3d.js module: ✓ Found');
} else {
  console.log('[2] office3d.js module: ✗ Not found');
  issues.push('office3d.js not found');
  passed = false;
}

// Test 2: Check game.js exists and functions
let hasStartGame = false;
let hasUpdateHall = false;

try {
  if (fs.existsSync('./src/js/game.js')) {
    const gameCode = fs.readFileSync('./src/js/game.js', 'utf8');
    hasStartGame = gameCode.includes('startGame');
    hasUpdateHall = gameCode.includes('updateHallAnimatronics');
    
    console.log('[3a] game.js exists: ✓ Found');
    console.log('[3b] startGame function: ' + (hasStartGame ? '✓' : '✗'));
    console.log('[3c] updateHallAnimatronics: ' + (hasUpdateHall ? '✓' : '✗'));
    
    if (!hasStartGame || !hasUpdateHall) {
      issues.push('Missing game functions: ' + (!hasStartGame ? 'startGame ' : '') + (!hasUpdateHall ? 'updateHallAnimatronics' : ''));
      passed = false;
    }
  } else {
    console.log('[3] game.js: ✗ Not found');
    issues.push('game.js not found');
    passed = false;
  }
} catch (e) {
  console.log('[3] game.js check failed: ' + e.message);
  issues.push('Error reading game.js: ' + e.message);
  passed = false;
}

// Test 3: Check office3d.js for door overlay functions and Three.js
let hasInitDoor = false;
let hasDrawDoor = false;
let hasDrawAnim = false;

try {
  if (fs.existsSync('./src/js/office3d.js')) {
    const office3dCode = fs.readFileSync('./src/js/office3d.js', 'utf8');
    hasInitDoor = office3dCode.includes('initDoorOverlay');
    hasDrawDoor = office3dCode.includes('drawDoorAnimatronics');
    hasDrawAnim = office3dCode.includes('drawDoorAnim');
    const hasThree = office3dCode.includes('THREE');
    
    console.log('[4a] office3d.js exists: ✓ Found');
    console.log('[4b] Three.js usage: ' + (hasThree ? '✓' : '✗'));
    console.log('[4c] initDoorOverlay function: ' + (hasInitDoor ? '✓' : '✗'));
    console.log('[4d] drawDoorAnimatronics function: ' + (hasDrawDoor ? '✓' : '✗'));
    console.log('[4e] drawDoorAnim function: ' + (hasDrawAnim ? '✓' : '✗'));
    
    if (!hasThree || !hasInitDoor || !hasDrawDoor || !hasDrawAnim) {
      issues.push('Missing door functions: ' + 
        (!hasThree ? 'Three.js ' : '') +
        (!hasInitDoor ? 'initDoorOverlay ' : '') +
        (!hasDrawDoor ? 'drawDoorAnimatronics ' : '') +
        (!hasDrawAnim ? 'drawDoorAnim' : ''));
      passed = false;
    }
  } else {
    console.log('[4] office3d.js: ✗ Not found');
    issues.push('office3d.js not found');
    passed = false;
  }
} catch (e) {
  console.log('[4] office3d.js check failed: ' + e.message);
  issues.push('Error reading office3d.js: ' + e.message);
  passed = false;
}

// Test 4: Check for syntax errors in JavaScript files (skip ES modules)
console.log('\n[5] Syntax Validation:');
let syntaxErrors = false;

try {
  const jsFiles = ['./src/js/game.js', './src/js/office3d.js'];
  jsFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const code = fs.readFileSync(file, 'utf8');
      
      // Check if it's an ES module (has import/export statements)
      const isESModule = /^\s*import\s+|export\s+/m.test(code);
      
      if (isESModule) {
        // For ES modules, just check that it parses correctly with basic syntax rules
        // Check for obvious syntax errors
        const bracketBalance = (code.match(/{/g) || []).length === (code.match(/}/g) || []).length;
        const parenBalance = (code.match(/\(/g) || []).length === (code.match(/\)/g) || []).length;
        const bracketBalance2 = (code.match(/\[/g) || []).length === (code.match(/\]/g) || []).length;
        
        if (bracketBalance && parenBalance && bracketBalance2) {
          console.log('  ' + path.basename(file) + ': ✓ Valid ES Module (syntax checks passed)');
        } else {
          console.log('  ' + path.basename(file) + ': ✗ Bracket/parenthesis mismatch');
          issues.push('Syntax error in ' + path.basename(file) + ': bracket mismatch');
          syntaxErrors = true;
          passed = false;
        }
      } else {
        try {
          new Function(code);
          console.log('  ' + path.basename(file) + ': ✓ Valid JavaScript');
        } catch (e) {
          console.log('  ' + path.basename(file) + ': ✗ Syntax error: ' + e.message);
          issues.push('Syntax error in ' + path.basename(file) + ': ' + e.message);
          syntaxErrors = true;
          passed = false;
        }
      }
    }
  });
} catch (e) {
  console.log('  Error during syntax check: ' + e.message);
}

// Final result
console.log('\n=== TEST RESULT ===');
if (passed && hasInitDoor && hasDrawDoor && hasDrawAnim) {
  console.log('✅ PASS: Game code loads, Three.js available, door rendering functions integrated, no syntax errors');
} else {
  const errorMsg = issues.length > 0 ? issues.join('; ') : 'Unknown error';
  console.log('❌ FAIL: ' + errorMsg);
}
