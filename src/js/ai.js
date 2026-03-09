/**
 * FNAF Game — Animatronic AI
 */

function tickAnimatronics(ai) {
    Object.keys(animatronics).forEach(function(key) {
        var a = animatronics[key];
        a.ai = ai[key] || 0;

        if (key === 'foxy') {
            if (game.currentCam !== 'pirate') {
                a.timer = (a.timer || 0) + 6;
            } else {
                a.timer = Math.max(0, (a.timer || 0) - 12.5);
            }
            if (a.timer >= 100) {
                a.timer = 0;
                if (!game.doorLeft) triggerGameOver('');
                else game.power = Math.max(0, game.power - 12);
            }
        } else {
            var atCorner = (a.path[a.pos] === 'hallW_corner' || a.path[a.pos] === 'hallE_corner');
            if (atCorner) {
                var doorBlocks = (key === 'bonnie' && game.doorLeft) ||
                                 ((key === 'freddy' || key === 'chica') && game.doorRight);
                if (!doorBlocks && a.pos < a.path.length - 1) {
                    a.pos++;
                }
            } else {
                if (Math.floor(Math.random() * 20) < a.ai && a.pos < a.path.length - 1) {
                    var next = a.path[a.pos + 1];
                    if (next === 'office') {
                        if (key === 'bonnie' && game.doorLeft)  return;
                        if (key === 'freddy' && game.doorRight) return;
                        if (key === 'chica'  && game.doorRight) return;
                    }
                    a.pos++;
                }
            }
        }
    });
}

function updateHallAnimatronics() {
    if (!window.office3d) return;
    var leftAnim = null, rightAnim = null;
    Object.values(animatronics).forEach(function(a) {
        var pos = a.path[a.pos];
        if (pos === 'hallW_corner') leftAnim = a;
        if (pos === 'hallE_corner') rightAnim = a;
    });
    window.office3d.setHallLeft(leftAnim   ? leftAnim.color   : null);
    window.office3d.setHallRight(rightAnim ? rightAnim.color  : null);
}

function checkCollisions() {
    Object.values(animatronics).forEach(function(a) {
        if (a.path && a.path[a.pos] === 'office') {
            triggerGameOver(a.name.toUpperCase() + ' GOT YOU');
        }
    });
}
