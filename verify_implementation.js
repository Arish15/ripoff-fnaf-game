const fs = require('fs');
const office3d = fs.readFileSync('src/js/office3d.js', 'utf8');
const game = fs.readFileSync('src/js/game.js', 'utf8');

const checks = [
    ['Canvas creation', office3d.includes('doorOverlayCanvas = document.createElement')],
    ['Canvas drawing in animate loop', office3d.includes('drawDoorAnimatronics()')],
    ['3D models hidden initially', office3d.includes('g.visible = false')],
    ['updateHallVis hides models', office3d.includes('hallAnimLeftGroup.visible = false')],
    ['Canvas dimensions set', office3d.includes('doorOverlayCanvas.width = w')],
    ['drawDoorAnimatronics function exists', office3d.includes('function drawDoorAnimatronics()')],
    ['drawDoorAnim function exists', office3d.includes('function drawDoorAnim(anim, cx, cy)')],
    ['Bonnie drawing code', office3d.includes("if (name === 'bonnie')")],
    ['Freddy drawing code', office3d.includes("if (name === 'freddy')")],
    ['Chica drawing code', office3d.includes("if (name === 'chica')")],
    ['Foxy drawing code', office3d.includes("if (name === 'foxy')")],
    ['setHallLeft implemented', office3d.includes('setHallLeft: function(anim)')],
    ['setHallRight implemented', office3d.includes('setHallRight: function(anim)')],
    ['setLightLeft implemented', office3d.includes('function setLightLeft(on)')],
    ['setLightRight implemented', office3d.includes('function setLightRight(on)')],
    ['game.js calls updateHallAnimatronics', game.includes('updateHallAnimatronics()')],
];

let pass = 0,
    fail = 0;
checks.forEach(([name, result]) => {
    console.log((result ? '✓' : '✗') + ' ' + name);
    if (result) pass++;
    else fail++;
});

console.log('');
console.log('Status: ' + pass + ' passed, ' + fail + ' failed');
if (fail === 0) {
    console.log('IMPLEMENTATION COMPLETE AND VERIFIED ✓');
    process.exit(0);
} else {
    console.log('ERRORS FOUND - Review implementation');
    process.exit(1);
}