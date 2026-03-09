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

var NIGHT_AI = {
    1: { freddy: 0,  bonnie: 0,  chica: 1,  foxy: 1  },
    2: { freddy: 0,  bonnie: 2,  chica: 2,  foxy: 2  },
    3: { freddy: 6,  bonnie: 4,  chica: 4,  foxy: 3  },
    4: { freddy: 10, bonnie: 7,  chica: 6,  foxy: 5  },
    5: { freddy: 15, bonnie: 12, chica: 10, foxy: 7  },
    6: { freddy: 20, bonnie: 18, chica: 15, foxy: 10 }
};

var animatronics = {
    freddy: { name: 'Freddy', color: '#c8843a', pos: 0,
              path: ['stage', 'dining', 'hallE', 'hallE_corner', 'office'], ai: 0 },
    bonnie: { name: 'Bonnie', color: '#9b59b6', pos: 0,
              path: ['stage', 'stage_left', 'hallW', 'hallW_corner', 'office'], ai: 0 },
    chica:  { name: 'Chica',  color: '#f1c40f', pos: 0,
              path: ['stage', 'stage_right', 'dining', 'hallE', 'hallE_corner', 'office'], ai: 0 },
    foxy:   { name: 'Foxy',   color: '#e74c3c', pos: 0,
              path: ['pirate', 'hallW', 'office'], ai: 0, timer: 0 }
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
                unlockedNights = arr.filter(function(n){ return n >= 1 && n <= 6; });
                if (!unlockedNights.length) unlockedNights = [1];
                return;
            }
        }
    } catch(e) {}
    unlockedNights = [1];
}

function saveProgress() {
    try { localStorage.setItem('fnafProgress', JSON.stringify(unlockedNights)); } catch(e) {}
}

window.gameState = game;
window.animatronics = animatronics;
