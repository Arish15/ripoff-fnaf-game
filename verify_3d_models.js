// Verification script for 3D animatronic models
const fs = require('fs');

console.log('=== 3D Animatronic Model Verification ===\n');

const office3d = fs.readFileSync('src/js/office3d.js', 'utf8');
const ai = fs.readFileSync('src/js/ai.js', 'utf8');
const game = fs.readFileSync('src/js/game.js', 'utf8');

let passCount = 0;
let failCount = 0;

function check(name, condition) {
    if (condition) {
        console.log('✓ ' + name);
        passCount++;
    } else {
        console.log('✗ ' + name);
        failCount++;
    }
}

// 1. Verify all animatronic builder functions exist
check('Bonnie 3D builder function exists', /function makeBonnie\(\)/.test(office3d));
check('Freddy 3D builder function exists', /function makeFreddy\(\)/.test(office3d));
check('Chica 3D builder function exists', /function makeChica\(\)/.test(office3d));
check('Foxy 3D builder function exists', /function makeFoxy\(\)/.test(office3d));

// 2. Verify proper geometry types used
check('SphereGeometry for heads', /new THREE\.SphereGeometry/.test(office3d));
check('ConeGeometry for features', /new THREE\.ConeGeometry/.test(office3d));
check('BoxGeometry for bodies', /new THREE\.BoxGeometry/.test(office3d));

// 3. Verify color assignments are distinct
check('Bonnie purple color', /makeBonnie[\s\S]*0x4a2880/.test(office3d));
check('Freddy brown color', /makeFreddy[\s\S]*0x7a501e/.test(office3d));
check('Chica yellow color', /makeChica[\s\S]*0xd4a800/.test(office3d));
check('Foxy red color', /makeFoxy[\s\S]*0xe74c3c/.test(office3d));

// 4. Verify MeshBasicMaterial for visibility
check('MeshBasicMaterial used (always visible)', /new THREE\.MeshBasicMaterial/.test(office3d));

// 5. Verify updateHallVis properly switches models
check('updateHallVis function exists', /function updateHallVis\(side\)/.test(office3d));
check('updateHallVis clears old children', /while \(group\.children\.length > 0\)/.test(office3d));
check('updateHallVis creates new models', /group\._bonnie\(\)/.test(office3d));
check('updateHallVis handles visibility', /group\.visible = (true|false)/.test(office3d));

// 6. Verify canvas overlay is completely removed
check('No canvas creation code', !/doorOverlayCanvas = document\.createElement/.test(office3d));
check('No canvas drawing code', !/drawDoorAnimatronics\(\)/.test(office3d));
check('No initDoorOverlay call', !/initDoorOverlay\(\)/.test(office3d));

// 7. Verify light functions still call updateHallVis
check('setLightLeft updates hall visibility', /setLightLeft[\s\S]*updateHallVis\('left'\)/.test(office3d));
check('setLightRight updates hall visibility', /setLightRight[\s\S]*updateHallVis\('right'\)/.test(office3d));

// 8. Verify AI integration
check('AI calls setHallLeft/Right', /setHallLeft|setHallRight/.test(ai));
check('Animatronics passed to 3D system', /window\.office3d\.setHall/.test(ai));

// 9. Verify no lingering canvas variables
check('doorOverlayCanvas variable removed from declarations', !/var.*doorOverlayCanvas/.test(office3d));
check('doorOverlayCtx variable removed from declarations', !/var.*doorOverlayCtx/.test(office3d));

console.log('\n=== SUMMARY ===');
console.log('Passed: ' + passCount);
console.log('Failed: ' + failCount);
console.log('Total: ' + (passCount + failCount));

if (failCount === 0) {
    console.log('\n✓✓✓ ALL CHECKS PASSED - 3D MODEL SYSTEM COMPLETE ✓✓✓');
    process.exit(0);
} else {
    console.log('\n✗✗✗ SOME CHECKS FAILED ✗✗✗');
    process.exit(1);
}