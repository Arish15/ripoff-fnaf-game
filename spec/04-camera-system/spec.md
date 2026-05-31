# Spec 04 — Split cameras.js (2D Camera Renderer)

**Risk:** Low (self-contained canvas module)  
**Effort:** Large (~6–8 hours)  
**Prerequisite:** None

---

## Problem

`cameras.js` is **1394 lines** mixing three entirely different concerns:

| Concern | Description |
|---------|-------------|
| Canvas art | `drawCamBg()` — hand-drawn CCTV room art for every camera location |
| Monitor UI | `toggleMonitor()`, `switchCam()`, `startCameraLoop()`, RAF loop |
| Camera state | `monitorOpen`, `game.currentCam`, transition effects |

The canvas art section alone is hundreds of lines of `ctx.fillRect` / `ctx.arc` calls — it's more
like a scene description file than program logic. Mixing it with toggle logic means a UI bug
requires scrolling past 600 lines of art code to find the event handler.

---

## Target File Split

```
src/js/cameras/
  renderer.js      ← drawCamBg(), drawCamOverlay(), all per-room art functions, perspTileFloor()
  monitor.js       ← toggleMonitor(), switchCam(), monitor open/close UI side-effects
  loop.js          ← startCameraLoop(), RAF id management, drawCamera() orchestrator
  cameras.js       ← thin entry: calls init, exposes globals (kept for compat)
```

---

## Detailed Responsibilities

### `renderer.js`
Owns all canvas drawing. Zero game-state side effects — pure input → canvas output.

```js
// Per-room draw functions (called by drawCamBg dispatch)
function _drawStage(ctx, w, h)        { ... }
function _drawDining(ctx, w, h)       { ... }
function _drawPirateCove(ctx, w, h)   { ... }
function _drawHallW(ctx, w, h)        { ... }
function _drawHallWCorner(ctx, w, h)  { ... }
function _drawHallE(ctx, w, h)        { ... }
function _drawHallECorner(ctx, w, h)  { ... }
function _drawBackstage(ctx, w, h)    { ... }
function _drawKitchen(ctx, w, h)      { ... }
function _drawSupplyCloset(ctx, w, h) { ... }
function _drawRestrooms(ctx, w, h)    { ... }

// Shared helpers
function perspTileFloor(ctx, w, h, opts)  { ... }
function _drawStaticNoise(ctx, w, h)      { ... }
function _drawAnimatronicAt(ctx, cam, w, h) { ... }

// Public
function drawCamBg(ctx, camKey, w, h)    { /* dispatch to per-room fn */ }
function drawCamOverlay(ctx, camKey, w, h) { ... }
```

**Key smell fixed:** Each per-room function is currently inlined inside a giant `switch` inside
`drawCamBg`. Extracting to named functions makes each room's art independently editable.

---

### `monitor.js`
Owns the monitor's open/close state and UI side-effects. No canvas drawing.

```js
/**
 * Toggle camera monitor open/closed.
 * Side effects: shows/hides monitorArea, cameraGrid, officeArea; plays camStatic audio.
 */
function toggleMonitor() {
    if (!game.running || game.powerOutage) return;
    monitorOpen = !monitorOpen;
    _applyMonitorState();
}

function switchCam(camKey) {
    if (!monitorOpen || !game.running) return;
    game.lastCam = game.currentCam;
    game.currentCam = camKey;
    _updateCamButtonHighlight(camKey);
    _playCamChangeAudio();
}

// Internal
function _applyMonitorState() { ... }       // show/hide DOM elements
function _updateCamButtonHighlight(key) { ... }
function _playCamChangeAudio() { ... }
```

---

### `loop.js`
Owns the RAF loop and orchestrates renderer calls.

```js
var cameraRafId = null;

function drawCamera() {
    // Get canvas context, call drawCamBg + drawCamOverlay from renderer.js
    // Only draws when monitorOpen
}

function startCameraLoop() {
    if (cameraRafId) cancelAnimationFrame(cameraRafId);
    function loop() {
        if (monitorOpen) drawCamera();
        cameraRafId = requestAnimationFrame(loop);
    }
    cameraRafId = requestAnimationFrame(loop);
}

function initCanvas()  { ... }   // creates canvas element, appends to monitorStand
function sizeCanvas()  { ... }   // resize canvas to container
```

---

### `cameras.js` (thin entry, ~30 lines)
```js
// cameras.js — entry point; loads sub-modules (or re-exports their globals)
// CAM_LABELS stays here as the canonical camera registry
var CAM_LABELS = {
    stage:        'CAM 1A - SHOW STAGE',
    dining:       'CAM 1B - DINING AREA',
    pirate:       'CAM 1C - PIRATE COVE',
    hallW:        'CAM 2A - W. HALL',
    hallW_corner: 'CAM 2B - W. HALL CORNER',
    stage_left:   'CAM 3 - SUPPLY CLOSET',
    hallE:        'CAM 4A - E. HALL',
    hallE_corner: 'CAM 4B - E. HALL CORNER',
    backstage:    'CAM 5 - BACKSTAGE',
    kitchen:      'CAM 6 - KITCHEN',
    stage_right:  'CAM 7 - RESTROOMS'
};
```

---

## Smell: Hardcoded coordinates in art functions

`drawCamBg` uses absolute pixel values (e.g. `ctx.fillRect(120, 80, 240, 160)`) that are then
scaled by canvas size. Extract a normalised drawing convention:

```js
// Instead of magic pixels, use relative coords (0..1) and scale:
function r(ctx, x, y, w, h, cw, ch) {
    ctx.fillRect(x * cw, y * ch, w * cw, h * ch);
}
```

This allows the canvas to resize cleanly without recalculating every coordinate. Apply
progressively — not required for the split itself, but plan for it.

---

## index.html Load Order (until ES modules)
```html
<script src="src/js/cameras/renderer.js?v=..."></script>
<script src="src/js/cameras/monitor.js?v=..."></script>
<script src="src/js/cameras/loop.js?v=..."></script>
<script src="src/js/cameras/cameras.js?v=..."></script>
<!-- remove old: <script src="src/js/cameras.js"> -->
```

---

## Verification
- All 11 camera feeds render correctly.
- Kitchen shows static noise only (no art).
- Monitor raises/lowers with animation.
- Camera switching highlights the correct button.
- Animatronic positions update on camera feeds as they move.
- Canvas resizes correctly on window resize.
