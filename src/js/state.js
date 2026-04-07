/**
 * FNAF Game — State & Constants
 */

var game = {
    running: false,
    currentNight: 1,
    time: 0,
    hour: 0,
    minute: 0,
    power: 100,
    doorLeft: false,
    doorRight: false,
    lightLeft: false,
    lightRight: false,
    currentCam: 'stage',
    lastCam: 'stage',
    powerOutage: false
};

// Base AI values at midnight — sourced from decompiled FNAF1 game code (wiki Night 7 page)
// In-night increments are applied in ai.js: Bonnie +1 at 2/3/4AM, Chica+Foxy +1 at 3/4AM, Freddy fixed
var NIGHT_AI = {
    1: { freddy: 0, bonnie: 1, chica: 1, foxy: 2 },
    2: { freddy: 0, bonnie: 3, chica: 2, foxy: 3 },
    3: { freddy: 1, bonnie: 2, chica: 5, foxy: 4 },
    4: { freddy: 1, bonnie: 4, chica: 6, foxy: 8 }, // wiki: freddy is 1 or 2 randomized
    5: { freddy: 3, bonnie: 7, chica: 9, foxy: 8 },
    6: { freddy: 4, bonnie: 10, chica: 12, foxy: 10 },
    7: { freddy: 0, bonnie: 0, chica: 0, foxy: 0 } // Custom Night — overridden by sliders
};

var animatronics = {
    freddy: {
        name: 'Freddy',
        color: '#c8843a',
        pos: 0,
        path: ['stage', 'dining', 'stage_right', 'kitchen', 'hallE', 'hallE_corner', 'doorE', 'office'],
        ai: 0,
        moveTick: 0
    },
    bonnie: {
        name: 'Bonnie',
        color: '#9b59b6',
        pos: 0,
        path: ['stage', 'backstage', 'dining', 'stage_left', 'hallW', 'hallW_corner', 'doorW', 'office'],
        ai: 0,
        moveTick: 0
    },
    chica: {
        name: 'Chica',
        color: '#f1c40f',
        pos: 0,
        path: ['stage', 'dining', 'stage_right', 'kitchen', 'hallE', 'hallE_corner', 'doorE', 'office'],
        ai: 0,
        moveTick: 0
    },
    foxy: {
        name: 'Foxy',
        color: '#e74c3c',
        pos: 0,
        // Stages 0-2 = pirate cove phases, 3 = West Hall sprint, 4 = doorway, 5 = office
        path: ['pirate', 'pirate', 'pirate', 'hallW', 'doorW', 'office'],
        ai: 0,
        ignoreTicks: 0,
        preventionTimer: 0, // grace ticks after monitor lowered (50-1050 ticks)
        wasWatchingCam1c: false, // tracks cam-1c view edge for pushback
        wasMonitorOpen: false // tracks monitor edge for prevention timer reset
    }
};

var unlockedNights = [1];
var gameLoop = null;
var monitorOpen = false;
var mouseNormX = 0.5;
var lastAiTick = 0;
var cameraRafId = null;
var office3dInited = false;
var goldenFreddyActive = false; // Golden Freddy easter egg state
var goldenFreddyTimer = 0; // ticks until jumpscare if not dismissed
var customNightAI = { freddy: 0, bonnie: 0, chica: 0, foxy: 0 }; // Custom Night sliders
var hallucinationCooldown = 0; // ticks until next hallucination can fire
var phoneGuyTimer = 0; // ticks until phone guy message disappears

// ─────────────────────────────────────────────
//  PROGRESS PERSISTENCE
// ─────────────────────────────────────────────

function loadProgress() {
    try {
        var raw = localStorage.getItem('fnafProgress');
        if (raw) {
            var arr = JSON.parse(raw);
            if (Array.isArray(arr) && arr.length) {
                unlockedNights = arr.filter(function(n) { return n >= 1 && n <= 7; });
                if (!unlockedNights.length) unlockedNights = [1];
                return;
            }
        }
    } catch (e) {}
    unlockedNights = [1];
}

function saveProgress() {
    try { localStorage.setItem('fnafProgress', JSON.stringify(unlockedNights)); } catch (e) {}
}

window.gameState = game;
window.animatronics = animatronics;