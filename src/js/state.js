/**
 * FNAF Game — State & Constants
 * @typedef {Object} GameState
 * @property {boolean} running - Is the game currently active?
 * @property {number} currentNight - Current night (1-7, where 7 is Custom Night)
 * @property {number} time - Game time in ticks (0-540; 100ms per tick at 100ms tickGame)
 * @property {number} hour - Parsed hour (0-5 for 12AM-5AM)
 * @property {number} minute - Parsed minute (0-59)
 * @property {number} power - Remaining power percentage (0-100)
 * @property {boolean} doorLeft - Left hall door closed?
 * @property {boolean} doorRight - Right hall door closed?
 * @property {boolean} lightLeft - Left hall light on?
 * @property {boolean} lightRight - Right hall light on?
 * @property {string} currentCam - Current camera key (one of CAM_LABELS keys)
 * @property {string} lastCam - Previous camera key for UI updates
 * @property {boolean} powerOutage - Power cut out (6 AM sequence active)?
 */

/** @type {GameState} */
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

/**
 * @typedef {Object} AILevel
 * @property {number} freddy - Freddy AI difficulty (0-20)
 * @property {number} bonnie - Bonnie AI difficulty (0-20)
 * @property {number} chica - Chica AI difficulty (0-20)
 * @property {number} foxy - Foxy AI difficulty (0-20)
 */

/** @type {Object<number, AILevel>} */
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
    /**
     * @typedef {Object} Animatronic
     * @property {string} name - Display name ('Freddy', 'Bonnie', 'Chica', 'Foxy')
     * @property {string} color - Hex color for 3D silhouette (#c8843a, #9b59b6, #f1c40f, #e74c3c)
     * @property {number} pos - Current position index in path[] (0 = start, path.length-1 = office)
     * @property {string[]} path - Array of camera keys representing progression route
     * @property {number} ai - Current effective AI level after in-night increments (0-20)
     * @property {number} moveTick - Counter for 50-tick AI windows (0 = ready to roll)
     */
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
var gameOverTimeout = null;
var gameOverTriggered = false;
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
//  Primary:  localStorage  (device storage, NOT browser cache)
//  Backup:   cookie with 1-year expiry
//  On load:  tries localStorage first → falls back to cookie
//  On save:  always writes BOTH so either source survives a clear
// ─────────────────────────────────────────────

/**
 * Get a cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null if not found
 * @private
 */
function _cookieGet(name) {
    var match = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
    return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Set a cookie with 1-year expiry
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @private
 */
function _cookieSet(name, value) {
    var expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = name + '=' + encodeURIComponent(value) +
        '; expires=' + expires.toUTCString() + '; path=/; SameSite=Strict';
}

/**
 * Load unlocked nights from localStorage (primary) or cookie (fallback)
 * Sets unlockedNights = [1] if neither source has valid data
 */
function loadProgress() {
    var raw = null;

    // 1. Try localStorage (primary — device storage, not cache)
    try { raw = localStorage.getItem('fnafProgress'); } catch (e) {}

    // 2. Fall back to cookie if localStorage is empty or unavailable
    if (!raw) {
        try { raw = _cookieGet('fnafProgress'); } catch (e) {}
    }

    if (raw) {
        try {
            var arr = JSON.parse(raw);
            if (Array.isArray(arr) && arr.length) {
                unlockedNights = arr.filter(function(n) { return n >= 1 && n <= 7; });
                if (unlockedNights.length) return;
            }
        } catch (e) {}
    }
    unlockedNights = [1];
}

/**
 * Save unlocked nights to BOTH localStorage and cookie
 * This ensures progress survives clearing either storage independently
 */
function saveProgress() {
    var data = JSON.stringify(unlockedNights);
    // Write to BOTH so progress survives clearing either one independently
    try { localStorage.setItem('fnafProgress', data); } catch (e) {}
    try { _cookieSet('fnafProgress', data); } catch (e) {}
}

window.gameState = game;
window.animatronics = animatronics;