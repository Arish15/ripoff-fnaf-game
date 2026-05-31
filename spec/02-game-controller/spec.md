# Spec 02 — Split game.js (God Controller)

**Risk:** Medium  
**Effort:** Medium (~4–6 hours)  
**Prerequisite:** None (works within global-script model)

---

## Problem

`game.js` is 778 lines doing at least 6 distinct jobs:

| Lines | Concern |
|-------|---------|
| 1–26 | Power drain constants + dev-mode vars |
| 27–151 | `tickGame()` — main loop (power, AI, HUD, collisions) |
| 153–310 | `startGame()` — night initialisation + 3D office bootstrap |
| 312–370 | `endNight()` / `nextNight()` — night completion flow |
| 372–488 | `triggerGameOver()` — jumpscare + game-over screen |
| 490–595 | `returnToStart()` / `stopAllAudio()` — cleanup |
| 597–778 | Dev mode UI (`showDevNightSelector`, keyboard handlers) |

A single change to power drain risks breaking the dev-mode keyboard handler because they share the
same 778-line edit surface.

---

## Target File Split

```
src/js/
  game.js               ← keep as thin orchestrator (~100 lines); imports from below
  engine/
    power.js            ← drain constants, tickPower(), power-outage sequence
    night.js            ← startGame(), endNight(), nextNight(), night reset logic
    game-over.js        ← triggerGameOver(), stopAllAudio(), returnToStart()
    dev-tools.js        ← devMode vars, showDevNightSelector(), keyboard shortcuts
```

Until ES modules land (spec 01), these are additional `<script>` tags loaded before `game.js`.
Each file exposes its functions as globals (same pattern as today) — no behaviour change.

---

## Detailed Split

### `engine/power.js`
**Exports (globals):** `DRAIN_BASE`, `DRAIN_LIGHT`, `DRAIN_DOOR`, `DRAIN_MONITOR`, `tickPower()`

```js
var DRAIN_BASE    = 0.01;
var DRAIN_LIGHT   = 0.01;
var DRAIN_DOOR    = 0.018;
var DRAIN_MONITOR = 0.013;

/**
 * Applies per-tick power drain and handles power outage trigger.
 * Mutates game.power, game.powerOutage, game.powerOutageTime.
 * Returns true if power just ran out (caller should start outage sequence).
 */
function tickPower() { ... }
```

Responsibility: all power arithmetic and the outage-start side-effects (close doors, hide monitor,
play powerout audio, show dark overlay).

---

### `engine/night.js`
**Exports (globals):** `startGame(night)`, `endNight()`, `nextNight()`

`startGame` currently does 9 distinct things inline. Extract these as named helpers:

```js
function _resetGameState(night) { ... }    // zeroes game.*
function _resetAnimatronics() { ... }      // zeroes all animatronic fields
function _resetMonitor() { ... }           // hides monitor, clears classes
function _bootstrapOffice3D() { ... }      // init/show/reset office3d
function _startNightIntro(night) { ... }   // intro overlay + phone guy
function _startGameLoop() { ... }          // clearInterval + setInterval(tickGame)
```

`startGame` becomes a sequencer calling these helpers — easy to read, easy to change.

---

### `engine/game-over.js`
**Exports (globals):** `triggerGameOver(msg)`, `stopAllAudio()`, `returnToStart()`

`triggerGameOver` contains the animatronic-type detection switch. Extract it:
```js
function _resolveAnimatronicType(msg) {
    // returns { type: 'freddy'|'bonnie'|'chica'|'foxy'|'golden', duration: number }
}
```

`returnToStart` currently duplicates some audio-stop logic that `stopAllAudio` also covers.
Consolidate: `returnToStart` calls `stopAllAudio` then does only UI cleanup.

---

### `engine/dev-tools.js`
**Exports (globals):** `devModePresses`, `devModeUnlocked`, `devModeActive`, `showDevNightSelector()`

The dev-mode keyboard handler (currently inside `DOMContentLoaded` in `game.js`) moves here.
`showDevNightSelector` builds a programmatic modal — fully self-contained, easy to extend.

---

## `game.js` After Split (~100 lines)
```js
// game.js — orchestrator only
// Depends on: power.js, night.js, game-over.js, dev-tools.js (loaded before this)

function tickGame() {
    if (!game.running) return;
    if (window.office3d) window.office3d.setMouse(mouseNormX);

    game.time += 0.1;
    var hrs = game.time / 90;
    game.hour  = Math.floor(hrs);
    game.minute = (hrs % 1) * 60;

    if (tickPower()) return;            // power.js — returns true if outage just fired
    tickPowerOutageSequence();          // power.js — freddy-eyes countdown

    var ai = NIGHT_AI[game.currentNight] || NIGHT_AI[1];
    tickGoldenFreddy(ai);              // extras.js
    tickAnimatronics(ai);              // ai.js
    checkCollisions();
    updateHallAnimatronics();
    checkFreddyLaugh();
    tickHallucination();
    updateHUD();

    if (game.hour >= 6 || game.time >= 540) endNight();
}
```

---

## index.html Load Order Change
Add before `game.js`:
```html
<script src="src/js/engine/power.js?v=..."></script>
<script src="src/js/engine/night.js?v=..."></script>
<script src="src/js/engine/game-over.js?v=..."></script>
<script src="src/js/engine/dev-tools.js?v=..."></script>
```

---

## Verification
- Night 1–6 complete without error.
- Power outage sequence fires correctly.
- Game over jumpscare fires for each animatronic type.
- Dev mode (press V×5) opens night selector.
- Death mode starts and all animatronics move at AI 20.
