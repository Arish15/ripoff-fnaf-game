# FNAF Browser Game — Project Instructions

## Project Overview
A Five Nights at Freddy's 1 recreation in plain HTML5/CSS/JS with a Three.js 3D office. No unity or things like that — everything runs directly in the browser.

## Running the Game
```bash
node server.js          # starts http://localhost:8000
```
`server.js` is a minimal Node.js static file server (no Express). Alternatively use `python -m http.server 8000`. Hard-refresh (Ctrl+Shift+R) after any JS/CSS change — Cache-Control headers are set to no-cache.

## Architecture — Two Distinct Rendering Systems

The game has **two separate render layers** that must stay in sync:

| Layer | File | What it renders |
|---|---|---|
| 3D office (WebGL) | `src/js/office3d.js` | Player's first-person office view — walls, doors, desk, fan, lighting |
| 2D camera monitor | `src/js/game.js` → `drawCamera()` | Security camera feeds drawn onto `<canvas id="cameraCanvas">` |

**`#officeArea`** (z-index 60) is full-screen and contains the Three.js canvas. It is shown when `monitorOpen === false` and hidden when the camera monitor is raised.

**`#gameContainer`** holds the 2D camera canvas (`#monitorArea`) and the traditional HTML control panels; z-index below office area.

## office3d.js — Public API
`window.office3d` is an IIFE-exposed object. Always guard calls with `if (window.office3d)`.

```js
window.office3d.init()                // call once at DOMContentLoaded
window.office3d.setMouse(normX)       // 0..1 — drives camera Y-rotation
window.office3d.setDoorLeft(closed)   // true = door closes (swaps material)
window.office3d.setDoorRight(closed)  // true = door closes
window.office3d.show() / .hide()      // toggle office visibility
window.office3d.resize()              // call on window resize
```

Camera head-turn: `mouseNorm` → lerped to `targetRotY = (mouseNorm - 0.5) * 2 * MAX_ROT` (±0.62 rad ≈ ±35°). `camera.rotation.order = 'YXZ'` is required for correct FPS yaw.

Door material swap: `MAT_DOOR_OPEN` (0x010101 black) ↔ `MAT_DOOR_CLOSED` (0x606060 grey).

Room coordinate system: X −11…+11, Y 0…+11, Z −9…+9. Camera sits at `(0, 4.0, 7.5)` looking toward `z = −9` (back wall).

## game.js — Key Patterns

- **Single global state object:** `var game = { running, power, doorLeft, doorRight, lightLeft, lightRight, currentCam, … }`
- **Game loop:** `setInterval(tickGame, 100)` — runs every 100 ms. `tickGame` handles power drain, animatronic AI steps, and calls `window.office3d.setMouse(mouseNormX)`.
- **AI levels:** `NIGHT_AI[night]` maps night → `{ freddy, bonnie, chica, foxy }` 0–20 difficulty values. Each animatronic rolls `Math.random() * 20 < ai` to advance along its `path[]`.
- **No scroll for office:** Three.js handles camera panning via `setMouse()`. Do not reintroduce DOM `translateX` / scroll logic.
- **`drawOffice()`** — a large 2D canvas fallback that still exists in `game.js` but has an early `return` at the top; it is never executed. Three.js is the sole office renderer.
- **Global exports at bottom:** `window.startGame`, `window.toggleDoor`, `window.toggleLight`, `window.nextNight`, `window.returnToStart` — called directly from `index.html` `onclick` attributes.

## CSS Layers (z-index)
```
z-50  #gameContainer (camera monitor, control panels)
z-60  #officeArea / #officeScene (Three.js canvas)
z-65  .office-vignette
z-80  .office-btn (door/light wall buttons)
z-90+ HUD overlays (power, time, game-over screens)
```

## Camera Feeds — Key → Label Map
`drawCamBg(cam, w, h)` in `game.js` draws each camera view; `CAM_LABELS` maps keys to display names:

| Key | Label | Notes |
|---|---|---|
| `stage` | CAM 1A - SHOW STAGE | Starting position for Freddy/Bonnie/Chica |
| `dining` | CAM 1B - DINING AREA | Freddy's path |
| `pirate` | CAM 1C - PIRATE COVE | Foxy's start; curtain drawn |
| `stage_left` | CAM 2A - W. HALL | Bonnie's approach |
| `stage_right` | CAM 2B - E. HALL | Chica / second stage view |
| `hallW` | CAM 2A - W. HALL | Bonnie/Foxy closer to office |
| `hallW_corner` | CAM 4A - W. HALL CORNER | Last cam before left door |
| `hallE` | CAM 3 - E. HALL | Freddy/Chica approach |
| `hallE_corner` | CAM 4B - E. HALL CORNER | Last cam before right door |
| `kitchen` | CAM 4B - KITCHEN | Static noise only — audio-only cam |
| `backstage` | CAM 5 - BACKSTAGE | Parts & service room |

## Audio Assets
Drop files into `src/assets/` — the `<audio>` elements try `mp3` then `ogg`. All calls use `.play().catch(function(){})` so missing files fail silently.

## Adding Features — Integration Points

- **New animatronic:** Add to `animatronics` object with `path[]`, add AI level to `NIGHT_AI`, handle in `tickGame`'s movement block.
- **New office geometry:** Add meshes inside `buildRoom()` in `office3d.js`. Reuse the `mesh(geo, mat)` helper.
- **Door/light visual effect in 3D:** Modify `setDoorLeft/Right()` or add a new method to `window.office3d` — call it from `toggleDoor()` / `toggleLight()` in `game.js`.
- **Camera feed image:** Drop a `.png/.jpg` into `src/assets/` with the expected base name (e.g. `cam_stage`). The `loadAssets()` function in `game.js` tries `.png → .jpg → .jpeg → .svg` automatically.

## Engineering Standards
- Do **not** introduce external native applications — no Blender, Unity, or other desktop tools. Everything must run in the browser or in Node.js/pnpm.
- pnpm (and npm) are acceptable for adding dev dependencies or build tooling if needed.
- Do **not** add DOM elements inside `#officeScene` — Three.js owns that div and clears it on `init()`.
- Three.js r152 is served **locally** from `src/js/three.min.js`. Do not switch to a CDN URL without verifying the file actually exists at that URL.
