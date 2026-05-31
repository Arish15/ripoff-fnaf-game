#!/usr/bin/env node
/**
 * Simple syntax validator - checks if JS files have balanced braces/brackets
 */

const fs = require('fs');
const path = require('path');

const files = [
  'src/js/game.js',
  'src/js/office3d.js',
  'src/js/cameras.js'
];

function validateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Count braces and brackets
    let braces = 0, brackets = 0, parens = 0;
    let inString = false, stringChar = '';
    let inComment = false;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];
      
      // Skip comments
      if (!inString && char === '/' && nextChar === '/') {
        i = content.indexOf('\n', i);
        continue;
      }
      if (!inString && char === '/' && nextChar === '*') {
        i = content.indexOf('*/', i) + 1;
        continue;
      }
      
      // Handle strings
      if (!inComment) {
        if ((char === '"' || char === "'" || char === '`') && content[i-1] !== '\\') {
          if (inString && char === stringChar) {
            inString = false;
          } else if (!inString) {
            inString = true;
            stringChar = char;
          }
        }
      }
      
      if (!inString) {
        if (char === '{') braces++;
        if (char === '}') braces--;
        if (char === '[') brackets++;
        if (char === ']') brackets--;
        if (char === '(') parens++;
        if (char === ')') parens--;
      }
    }
    
    const balanced = braces === 0 && brackets === 0 && parens === 0;
    if (balanced) {
      console.log(`✓ ${filePath}: Syntax OK (braces: ${braces}, brackets: ${brackets}, parens: ${parens})`);
      return true;
    } else {
      console.error(`✗ ${filePath}: Unbalanced! braces: ${braces}, brackets: ${brackets}, parens: ${parens}`);
      return false;
    }
  } catch (e) {
    console.error(`✗ ${filePath}: ${e.message}`);
    return false;
  }
}

let allValid = true;
files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (!validateFile(fullPath)) {
    allValid = false;
  }
});

process.exit(allValid ? 0 : 1);
