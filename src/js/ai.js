/**
 * FNAF Game — Animatronic AI
 *
 * Timing sourced from decompiled FNAF1 game code (Clickteam Fusion 2.5, each engine tick ≈ 10ms):
 *   Foxy/Bonnie/Chica AI tick every ~500 ticks = 5 seconds  →  50 game ticks at 100ms/tick
 *   Freddy AI tick every ~300 ticks = 3 seconds             →  30 game ticks at 100ms/tick
 * In-night AI increments (story nights only, not custom night):
 *   Bonnie: +1 at 2AM, 3AM, 4AM
 *   Chica:  +1 at 3AM, 4AM
 *   Foxy:   +1 at 3AM, 4AM
 *   Freddy: no increments (fixed AI all night)
 */

function tickAnimatronics(ai) {
    // Apply in-night AI increments on top of base values
    // Custom Night (7): no increments — use slider values directly
    var isCustom = (game.currentNight === 7);
    var effectiveAi = {
        // Night 4 Freddy is randomized 1 or 2 per wiki; pick once when night starts
        freddy: isCustom ? (ai.freddy || 0) :
            ((game.currentNight === 4 && !animatronics.freddy._n4roll) ?
                (animatronics.freddy._n4roll = (Math.random() < 0.5 ? 1 : 2)) :
                (game.currentNight === 4 ? animatronics.freddy._n4roll : (ai.freddy || 0))),
        bonnie: isCustom ? (ai.bonnie || 0) : Math.min(20, (ai.bonnie || 0) +
            (game.hour >= 2 ? 1 : 0) + (game.hour >= 3 ? 1 : 0) + (game.hour >= 4 ? 1 : 0)),
        chica: isCustom ? (ai.chica || 0) : Math.min(20, (ai.chica || 0) +
            (game.hour >= 3 ? 1 : 0) + (game.hour >= 4 ? 1 : 0)),
        foxy: isCustom ? (ai.foxy || 0) : Math.min(20, (ai.foxy || 0) +
            (game.hour >= 3 ? 1 : 0) + (game.hour >= 4 ? 1 : 0))
    };

    Object.keys(animatronics).forEach(function(key) {
        var a = animatronics[key];
        a.ai = effectiveAi[key] || 0;

        if (key === 'foxy') {
            tickFoxy(a);
        } else if (key === 'freddy') {
            tickFreddy(a);
        } else {
            tickOther(key, a);
        }
    });
}

// ---------------------------------------------------------------------------
// Foxy — authentic FNAF1 mechanic (sourced from decompiled game code):
//   • Foxy can ONLY advance stages while the monitor is DOWN.
//     Any camera being open freezes his progress entirely.
//   • When the monitor is lowered a random grace timer (50–1050 ticks) must
//     expire before Foxy's 5-second AI window starts counting.
//   • Each 50-tick window: roll rand(0-19) < ai to advance one stage.
//   • Viewing CAM 1C (pirate) on the FIRST frame pushes Foxy back one stage.
//   • 4 stages total: pirate×3 (curtain phases) → hallW (sprint) → office.
// ---------------------------------------------------------------------------
function tickFoxy(a) {
    var watchingCam1c = (monitorOpen && game.currentCam === 'pirate');
    var justStartedWatchingCam1c = watchingCam1c && !a.wasWatchingCam1c;

    // CAM 1C pushback: each time playerflips to pirate, Foxy retreats one stage
    if (justStartedWatchingCam1c && a.pos > 0) {
        a.pos--;
        a.ignoreTicks = 0;
    }

    // Monitor just dropped → start new grace timer preventing movement
    if (!monitorOpen && a.wasMonitorOpen) {
        a.preventionTimer = 50 + Math.floor(Math.random() * 1001); // 50–1050 ticks
        a.ignoreTicks = 0;
    }

    // Foxy only moves when monitor is down, AI > 0, and grace timer has elapsed
    if (!monitorOpen && a.ai > 0) {
        if (a.preventionTimer > 0) {
            a.preventionTimer--;
        } else {
            a.ignoreTicks = (a.ignoreTicks || 0) + 1;
            if (a.ignoreTicks > 0 && a.ignoreTicks % 50 === 0) {
                if (Math.floor(Math.random() * 20) < a.ai) {
                    if (a.pos < a.path.length - 1) a.pos++;
                    // Foxy starts sprinting down the hall
                    if (a.path[a.pos] === 'hallW') {
                        var foxyRun = document.getElementById('foxyRunAudio');
                        if (foxyRun) foxyRun.play().catch(function() {});
                    }
                    if (a.path[a.pos] === 'office') {
                        a.pos = 0;
                        a.preventionTimer = 50 + Math.floor(Math.random() * 1001);
                        a.ignoreTicks = 0;
                        if (!game.doorLeft) triggerGameOver('FOXY');
                        else game.power = Math.max(0, game.power - 12);
                    }
                }
            }
        }
    }

    a.wasWatchingCam1c = watchingCam1c;
    a.wasMonitorOpen = monitorOpen;
}

// ---------------------------------------------------------------------------
// Freddy — rolls every 30 ticks (~3 s). Only moves when monitor is DOWN.
// Freddy cannot leave the show stage until both Bonnie and Chica have moved.
// ---------------------------------------------------------------------------
function tickFreddy(a) {
    if (a.ai <= 0) return;

    a.moveTick = (a.moveTick || 0) + 1;
    if (a.moveTick < 30) return;
    a.moveTick = 0;

    if (monitorOpen) return;

    // Cannot leave stage until Bonnie and Chica have moved off stage
    if (a.pos === 0) {
        var bonnieGone = animatronics.bonnie && animatronics.bonnie.pos > 0;
        var chicaGone = animatronics.chica && animatronics.chica.pos > 0;
        if (!bonnieGone || !chicaGone) return;
    }

    var atCorner = (a.path[a.pos] === 'hallE_corner');
    if (atCorner) {
        if (!game.doorRight && a.pos < a.path.length - 1) a.pos++;
    } else {
        if (Math.floor(Math.random() * 20) < a.ai && a.pos < a.path.length - 1) {
            var next = a.path[a.pos + 1];
            if (next === 'office' && game.doorRight) return;
            a.pos++;
        }
    }
}

// ---------------------------------------------------------------------------
// Bonnie / Chica — roll every 50 ticks (~5 s). No monitor restriction.
// ---------------------------------------------------------------------------
function tickOther(key, a) {
    if (a.ai <= 0) return;

    a.moveTick = (a.moveTick || 0) + 1;
    if (a.moveTick < 50) return;
    a.moveTick = 0;

    var atCorner = (a.path[a.pos] === 'hallW_corner' ||
        a.path[a.pos] === 'hallE_corner');
    if (atCorner) {
        var doorBlocks = (key === 'bonnie' && game.doorLeft) ||
            (key === 'chica' && game.doorRight);
        if (!doorBlocks && a.pos < a.path.length - 1) a.pos++;
    } else {
        if (Math.floor(Math.random() * 20) < a.ai && a.pos < a.path.length - 1) {
            var next = a.path[a.pos + 1];
            if (next === 'office') {
                if (key === 'bonnie' && game.doorLeft) return;
                if (key === 'chica' && game.doorRight) return;
            }
            a.pos++;
        }
    }
}

function updateHallAnimatronics() {
    if (!window.office3d) return;
    var leftAnim = null,
        rightAnim = null;
    Object.values(animatronics).forEach(function(a) {
        var pos = a.path[a.pos];
        if (pos === 'hallW_corner' || pos === 'hallW') leftAnim = a;
        if (pos === 'hallE_corner' || pos === 'hallE') rightAnim = a;
    });
    window.office3d.setHallLeft(leftAnim ? leftAnim.color : null);
    window.office3d.setHallRight(rightAnim ? rightAnim.color : null);
}

function checkCollisions() {
    Object.values(animatronics).forEach(function(a) {
        if (a.path && a.path[a.pos] === 'office') {
            triggerGameOver(a.name.toUpperCase() + ' GOT YOU');
        }
    });
}