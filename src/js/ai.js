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

// ── Garble sound: plays when an animatronic moves while camera is open ──

/**
 * Play a random garble sound (static/distortion) when animatronic moves on camera
 * Only plays if monitorOpen === true
 * @private
 */
function _playGarble() {
    if (!monitorOpen) return;
    var id = Math.random() < 0.5 ? 'garble1Audio' : 'garble2Audio';
    var audio = document.getElementById(id);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(function() {});
    }
}

/**
 * Main AI tick for all animatronics each game loop
 * Applies in-night AI increments, then ticks each animatronic
 * @param {AILevel} ai - Base AI levels for the current night (from NIGHT_AI)
 */
function tickAnimatronics(ai) {
    // Apply in-night AI increments on top of base values
    // Custom Night (7): no increments — use slider values directly
    // Death Mode: all animatronics at max AI (20)
    var isCustom = (game.currentNight === 7);
    var deathMode = game.deathMode;
    
    var effectiveAi = {
        // Night 4 Freddy is randomized 1 or 2 per wiki; pick once when night starts
        freddy: deathMode ? 20 : (isCustom ? (ai.freddy || 0) :
            ((game.currentNight === 4 && !animatronics.freddy._n4roll) ?
                (animatronics.freddy._n4roll = (Math.random() < 0.5 ? 1 : 2)) :
                (game.currentNight === 4 ? animatronics.freddy._n4roll : (ai.freddy || 0)))),
        bonnie: deathMode ? 20 : (isCustom ? (ai.bonnie || 0) : Math.min(20, (ai.bonnie || 0) +
            (game.hour >= 2 ? 1 : 0) + (game.hour >= 3 ? 1 : 0) + (game.hour >= 4 ? 1 : 0))),
        chica: deathMode ? 20 : (isCustom ? (ai.chica || 0) : Math.min(20, (ai.chica || 0) +
            (game.hour >= 3 ? 1 : 0) + (game.hour >= 4 ? 1 : 0))),
        foxy: deathMode ? 20 : (isCustom ? (ai.foxy || 0) : Math.min(20, (ai.foxy || 0) +
            (game.hour >= 3 ? 1 : 0) + (game.hour >= 4 ? 1 : 0)))
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

/**
 * Foxy AI tick — unique mechanics (monitor-dependent progression)
 * @param {Animatronic} a - Foxy animatronic state object
 */
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
                        var foxySprint = document.getElementById('foxySprintAudio');
                        if (foxySprint) {
                            foxySprint.currentTime = 0;
                            foxySprint.play().catch(function() {});
                        }
                    }
                    if (a.path[a.pos] === 'doorW') {
                        a.pos = 0;
                        a.preventionTimer = 50 + Math.floor(Math.random() * 1001);
                        a.ignoreTicks = 0;
                        if (!game.doorLeft) triggerGameOver('FOXY');
                        else {
                            game.power = Math.max(0, game.power - 12);
                            // Foxy punch: banging on the closed door
                            var foxyPunch = document.getElementById('foxyRunAudio');
                            if (foxyPunch) {
                                foxyPunch.currentTime = 0;
                                foxyPunch.play().catch(function() {});
                            }
                        }
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
// ---------------------------------------------------------------------------
// Door-linger formula (moveTick cycles, reflects real FNAF1 behavior):
//   AI 1–3  → 0–3 extra cycles → up to 20 s (Bonnie/Chica) / 12 s (Freddy)
//   AI 4–7  → 0–2 extra cycles → up to 15 s / 9 s
//   AI 8–11 → 0–1 extra cycle  → up to 10 s / 6 s
//   AI 12+  → 0 extra           → exactly 1 cycle (5 s / 3 s)
//   Death (>20) → 0 extra, faster tick
// ---------------------------------------------------------------------------
function _doorLingerCycles(ai) {
    if (ai > 20) return 1; // death mode: 1 extra cycle (~3 s Freddy, ~2.5 s Bonnie/Chica)
    return Math.floor(Math.random() * Math.max(1, 4 - Math.floor(ai / 4)));
}

function tickFreddy(a) {
    if (a.ai <= 0) return;

    // Death mode (ai > 20): move twice as fast
    var speedThreshold = a.ai > 20 ? 15 : 30;

    a.moveTick = (a.moveTick || 0) + 1;
    if (a.moveTick < speedThreshold) return;
    a.moveTick = 0;

    var atDoor = (a.path[a.pos] === 'doorE');

    if (atDoor) {
        // Initialise linger on first arrival at door
        if (a.doorLinger === undefined) {
            a.doorLinger = _doorLingerCycles(a.ai);
            a.lingerCount = 0;
            a.doorOpenGrace = 0;
            a.prevDoorRight = game.doorRight;
        }

        // Door just opened → give player one full cycle grace
        if (!game.doorRight && a.prevDoorRight) {
            a.doorOpenGrace = 1;
        }
        a.prevDoorRight = game.doorRight;

        if (a.doorOpenGrace > 0) { a.doorOpenGrace--; return; }

        // Still lingering?
        if (a.lingerCount < a.doorLinger) { a.lingerCount++; return; }

        // Linger over — attempt entry or begin retreat
        if (game.doorRight) {
            a.cornerTicks = (a.cornerTicks || 0) + 1;
            if (a.cornerTicks >= 2) {
                a.cornerTicks = 0;
                a.pos = Math.max(0, a.pos - (1 + Math.floor(Math.random() * 2))); // retreat 1-2 steps
                a.doorLinger = undefined;
            }
        } else {
            if (a.pos < a.path.length - 1) {
                a.pos++;
                a.doorLinger = undefined;
            }
        }
    } else {
        a.doorLinger = undefined;
        a.cornerTicks = 0;

        // General movement — only when monitor is down
        if (monitorOpen) return;
        if (a.pos === 0) {
            var bonnieGone = animatronics.bonnie && animatronics.bonnie.pos > 0;
            var chicaGone = animatronics.chica && animatronics.chica.pos > 0;
            if (!bonnieGone || !chicaGone) return;
        }
        if (Math.floor(Math.random() * 20) < a.ai && a.pos < a.path.length - 1) {
            a.pos++;
        }
    }
}

// ---------------------------------------------------------------------------
// Bonnie / Chica — roll every 50 ticks (~5 s). No monitor restriction.
// ---------------------------------------------------------------------------
function tickOther(key, a) {
    if (a.ai <= 0) return;

    // Death mode (ai > 20): move twice as fast
    var speedThreshold = a.ai > 20 ? 25 : 50;

    a.moveTick = (a.moveTick || 0) + 1;
    if (a.moveTick < speedThreshold) return;
    a.moveTick = 0;

    var atDoor = (a.path[a.pos] === 'doorW' || a.path[a.pos] === 'doorE');

    if (atDoor) {
        // Initialise linger on first arrival at door
        if (a.doorLinger === undefined) {
            a.doorLinger = _doorLingerCycles(a.ai);
            a.lingerCount = 0;
            a.doorOpenGrace = 0;
            var doorIsLeft = (a.path[a.pos] === 'doorW');
            a.prevDoorBlocked = doorIsLeft ? game.doorLeft : game.doorRight;
        }

        var doorBlocks = (key === 'bonnie' && game.doorLeft) ||
            (key === 'chica' && game.doorRight);
        var prevBlocked = a.prevDoorBlocked;
        a.prevDoorBlocked = doorBlocks;

        // Door just opened → one full cycle grace
        if (!doorBlocks && prevBlocked) { a.doorOpenGrace = 1; }

        if (a.doorOpenGrace > 0) { a.doorOpenGrace--; return; }

        // Still lingering?
        if (a.lingerCount < a.doorLinger) { a.lingerCount++; return; }

        // Linger over — attempt entry or begin retreat
        if (doorBlocks) {
            a.cornerTicks = (a.cornerTicks || 0) + 1;
            if (a.cornerTicks >= 2) {
                a.cornerTicks = 0;
                a.pos = Math.max(0, a.pos - (1 + Math.floor(Math.random() * 2))); // retreat 1-2 steps
                a.doorLinger = undefined;
            }
        } else {
            if (a.pos < a.path.length - 1) {
                a.pos++;
                a.doorLinger = undefined;
                _playGarble();
            }
        }
    } else {
        a.doorLinger = undefined;
        a.cornerTicks = 0;

        if (Math.floor(Math.random() * 20) < a.ai && a.pos < a.path.length - 1) {
            a.pos++;
            _playGarble();
        }
    }
}

var _prevLeftHallAnim = null,
    _prevRightHallAnim = null;

function updateHallAnimatronics() {
    if (!window.office3d) return;
    var leftAnim = null,
        rightAnim = null;
    Object.values(animatronics).forEach(function(a) {
        var pos = a.path[a.pos];
        if (pos === 'doorW' || pos === 'hallW_corner' || pos === 'hallW') leftAnim = a;
        if (pos === 'doorE' || pos === 'hallE_corner' || pos === 'hallE') rightAnim = a;
    });
    // Window scare: animatronic just arrived at the door while light is already on
    if (leftAnim !== _prevLeftHallAnim && leftAnim && game.lightLeft) _checkWindowScare('left');
    if (rightAnim !== _prevRightHallAnim && rightAnim && game.lightRight) _checkWindowScare('right');
    _prevLeftHallAnim = leftAnim;
    _prevRightHallAnim = rightAnim;
    window.office3d.setHallLeft(leftAnim || null);
    window.office3d.setHallRight(rightAnim || null);
}

function checkCollisions() {
    Object.values(animatronics).forEach(function(a) {
        var isNowAtOffice = a.path && a.path[a.pos] === 'office';
        var wasAtOffice = a._prevPosOffice;
        a._prevPosOffice = isNowAtOffice;
        
        // Only trigger if animatronic just entered office (transition from not-office → office)
        if (isNowAtOffice && !wasAtOffice) {
            triggerGameOver(a.name.toUpperCase() + ' GOT YOU');
        }
    });
}