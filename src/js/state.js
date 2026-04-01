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
    1: { freddy: 0, bonnie: 0, chica: 0, foxy: 0 },
    2: { freddy: 0, bonnie: 3, chica: 1, foxy: 1 },
    3: { freddy: 1, bonnie: 0, chica: 5, foxy: 2 },
    4: { freddy: (Math.random() < 0.5 ? 1 : 2), bonnie: 2, chica: 4, foxy: 6 },
    5: { freddy: 3, bonnie: 5, chica: 7, foxy: 5 },
    6: { freddy: 4, bonnie: 10, chica: 12, foxy: 6 }
};

var animatronics = {
    freddy: {
        name: 'Freddy',
        color: '#c8843a',
        pos: 0,
        path: ['stage', 'dining', 'stage_right', 'kitchen', 'hallE_corner', 'stage_left', 'office'],
        ai: 0,
        moveTick: 0
    },
    bonnie: {
        name: 'Bonnie',
        color: '#9b59b6',
        pos: 0,
        path: ['stage', 'dining', 'hallW', 'hallW_corner', 'office'],
        ai: 0,
        moveTick: 0
    },
    chica: {
        name: 'Chica',
        color: '#f1c40f',
        pos: 0,
        path: ['stage', 'dining', 'stage_right', 'kitchen', 'hallE_corner', 'stage_left', 'office'],
        ai: 0,
        moveTick: 0
    },
    foxy: {
        name: 'Foxy',
        color: '#e74c3c',
        pos: 0,
        // Stages 0-2 = pirate cove phases, 3 = West Hall sprint, 4 = office attack
        path: ['pirate', 'pirate', 'pirate', 'hallW', 'office'],
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

// ─────────────────────────────────────────────
//  PROGRESS PERSISTENCE
// ─────────────────────────────────────────────

function loadProgress() {
    try {
        var raw = localStorage.getItem('fnafProgress');
        if (raw) {
            var arr = JSON.parse(raw);
            if (Array.isArray(arr) && arr.length) {
                unlockedNights = arr.filter(function(n) { return n >= 1 && n <= 6; });
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