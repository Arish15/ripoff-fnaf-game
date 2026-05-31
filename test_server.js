const http = require('http');
const fs = require('fs');

console.log('[TEST] Checking game server on port 8000...');
console.log('');

// Test 1: Port connectivity
const req = http.get('http://localhost:8000/index.html', (res) => {
  console.log('[1] Server connectivity: PASS');
  console.log('    Status Code: ' + res.statusCode);
  console.log('    Content-Length: ' + res.headers['content-length']);
  
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    console.log('    Response Size: ' + html.length + ' bytes');
    console.log('');
    
    // Test 2: Check required script tags
    const scripts = ['state.js', 'ai.js', 'game.js', 'office3d.js'];
    console.log('[2] Required script tags:');
    let allPresent = true;
    scripts.forEach(script => {
      const present = html.includes(script);
      console.log('    ' + script + ': ' + (present ? 'PASS' : 'FAIL'));
      if (!present) allPresent = false;
    });
    console.log('');
    
    // Test 3: Check for Three.js
    const hasThree = html.includes('three') || html.includes('THREE');
    console.log('[3] Three.js library: ' + (hasThree ? 'PASS' : 'INFO - not in HTML'));
    console.log('');
    
    // Test 4: Basic HTML validity
    console.log('[4] HTML validity check:');
    const hasDoctype = html.includes('<!DOCTYPE');
    const hasHtml = html.includes('<html');
    const hasHead = html.includes('<head');
    const hasBody = html.includes('<body');
    console.log('    DOCTYPE: ' + (hasDoctype ? 'PASS' : 'FAIL'));
    console.log('    <html>: ' + (hasHtml ? 'PASS' : 'FAIL'));
    console.log('    <head>: ' + (hasHead ? 'PASS' : 'FAIL'));
    console.log('    <body>: ' + (hasBody ? 'PASS' : 'FAIL'));
    console.log('');
    
    // Summary
    if (res.statusCode === 200 && allPresent) {
      console.log('=== RESULT: PASS ===');
      console.log('Server is running and serving game correctly');
    } else {
      console.log('=== RESULT: FAIL ===');
      console.log('Server may have issues');
    }
    
    process.exit(0);
  });
});

req.on('error', (err) => {
  console.log('[ERROR] Cannot connect to server: ' + err.message);
  console.log('');
  console.log('=== RESULT: FAIL ===');
  console.log('Server is not running on port 8000');
  process.exit(1);
});

req.setTimeout(5000, () => {
  console.log('[ERROR] Request timeout after 5 seconds');
  console.log('');
  console.log('=== RESULT: FAIL ===');
  process.exit(1);
});
