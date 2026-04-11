# Copilot Instructions — FNAF Browser Game

## Project Overview
A Five Nights at Freddy's 1 recreation in plain HTML5/CSS/JS with a Three.js 3D office. No unity or things like that — everything runs directly in the browser.

## Running the Game
```
node server.js          # starts http://localhost:8000
```
`server.js` is a minimal Node.js static file server (no Express). Alternatively use `python -m http.server 8000`. Hard-refresh (Ctrl+Shift+R) after any JS/CSS change — Cache-Control headers are set to no-cache.

## Architecture — Two Distinct Rendering Systems

The game has **two separate render layers** that must stay in sync:

| Layer | File | What it renders |
|---|---|---|
| 3D office (WebGL) | `src/js/office3d.js` | Player's first-person office view — walls, doors, desk, fan, lighting |
| 2D camera monitor | `src/js/cameras.js` → `drawCamBg()` | Security camera feeds drawn onto `<canvas id="cameraCanvas">` |

**`#officeArea`** (z-index 60) is full-screen and contains the Three.js canvas. It is shown when `monitorOpen === false` and hidden when the camera monitor is raised.

**`#gameContainer`** holds the 2D camera canvas (`#monitorArea`) and the traditional HTML control panels; z-index below office area.

## office3d.js — Public API
`window.office3d` is an IIFE-exposed object. Always guard calls with `if (window.office3d)`.

```js
window.office3d.init()                // call once at DOMContentLoaded
window.office3d.setMouse(normX)       // 0..1 — drives camera Y-rotation
window.office3d.setDoorLeft(closed)   // true = door closes (spring-physics animation)
window.office3d.setDoorRight(closed)  // true = door closes
window.office3d.setLightLeft(on)      // toggle left hall light visibility
window.office3d.setLightRight(on)     // toggle right hall light visibility
window.office3d.setHallLeft(color)    // animatronic silhouette in left hall (null = clear)
window.office3d.setHallRight(color)   // animatronic silhouette in right hall (null = clear)
window.office3d.getRotation()         // returns current camera Y rotation in radians
window.office3d.show() / .hide()      // toggle office visibility
window.office3d.resize()              // call on window resize
```

Camera head-turn: `mouseNorm` → lerped to `targetRotY = (mouseNorm - 0.5) * 2 * MAX_ROT` (±0.62 rad ≈ ±35°). `camera.rotation.order = 'YXZ'` is required for correct FPS yaw.

Door physics: Spring-based animation (`DOOR_SPRING_K = 0.075`, `DOOR_DAMPING = 0.26`). `DOOR_OPEN_Y = 12.0` (above ceiling), `DOOR_CLOSED_Y = 4.0` (lowered into frame). These constants are at the top of `office3d.js`.

Room coordinate system: X −11…+11, Y 0…+11, Z −9…+9. Camera sits at `(0, 4.0, 7.5)` looking toward `z = −9` (back wall).

## JS Module Responsibilities

| File | Responsibility |
|---|---|
| `state.js` | Global `game` object, `animatronics`, `NIGHT_AI`, `gameOverTriggered` flag, progress persistence |
| `game.js` | `tickGame` loop, power drain, power outage, HUD, `startGame` / `returnToStart` / `endNight` |
| `ai.js` | `tickAnimatronics`, `tickFreddy`, `tickFoxy`, `tickOther`, `checkCollisions` |
| `cameras.js` | `drawCamBg`, `drawCamOverlay`, `CAM_LABELS`, camera RAF loop |
| `extras.js` | Phone Guy, Custom Night, Stars, Hallucinations, Freddy Laugh |
| `assets.js` | Asset preloader — tries `.png → .jpg → .jpeg → .svg` for each image |
| `sounds.js` | Procedural audio — synthesises all SFX via Web Audio API; no external files required |
| `office3d.js` | Three.js 3D office (IIFE); exposes `window.office3d` |
| `office.js` | Legacy 2D office renderer — disabled; kept only for compatibility |

## game.js — Key Patterns

- **Single global state object:** defined in `state.js` as `var game = { running, power, doorLeft, doorRight, lightLeft, lightRight, currentCam, powerOutage, … }`
- **Game loop:** `setInterval(tickGame, 100)` — runs every 100 ms. `tickGame` handles power drain, animatronic AI steps, and calls `window.office3d.setMouse(mouseNormX)`.
- **AI levels:** `NIGHT_AI[night]` in `state.js` maps night → `{ freddy, bonnie, chica, foxy }` 0–20 difficulty values. Each animatronic rolls `Math.random() * 20 < ai` to advance along its `path[]`. In-night increments (Bonnie +1 at 2/3/4AM, Chica/Foxy +1 at 3/4AM) are applied in `ai.js`.
- **No scroll for office:** Three.js handles camera panning via `setMouse()`. Do not reintroduce DOM `translateX` / scroll logic.
- **`drawOffice()`** — a large 2D canvas fallback that still exists in `game.js` but has an early `return` at the top; it is never executed. Three.js is the sole office renderer.
- **Global exports at bottom:** `window.startGame`, `window.toggleDoor`, `window.toggleLight`, `window.nextNight`, `window.returnToStart` — called directly from `index.html` `onclick` attributes.
- **Progress persistence:** `saveProgress()` / `loadProgress()` in `state.js` write to both `localStorage` **and** a cookie (1-year expiry). On load, `localStorage` is tried first; cookie is the fallback. Always call both.

## CSS Layers (z-index)
```
z-50  #gameContainer (camera monitor, control panels)
z-60  #officeArea / #officeScene (Three.js canvas)
z-65  .office-vignette
z-80  .office-btn (door/light wall buttons)
z-90+ HUD overlays (power, time, game-over screens)
```

## Camera Feeds — Key → Label Map
`cameras.js` owns `CAM_LABELS` and `drawCamBg()`:

| Key | Label | Notes |
|---|---|---|
| `stage` | CAM 1A - SHOW STAGE | Starting position for Freddy/Bonnie/Chica |
| `dining` | CAM 1B - DINING AREA | Freddy's path |
| `pirate` | CAM 1C - PIRATE COVE | Foxy's start; curtain drawn |
| `hallW` | CAM 2A - W. HALL | Bonnie/Foxy closer to office |
| `hallW_corner` | CAM 2B - W. HALL CORNER | Last cam before left door |
| `stage_left` | CAM 3 - SUPPLY CLOSET | Bonnie's mid-path |
| `hallE` | CAM 4A - E. HALL | Freddy/Chica approach |
| `hallE_corner` | CAM 4B - E. HALL CORNER | Last cam before right door |
| `backstage` | CAM 5 - BACKSTAGE | Parts & service room |
| `kitchen` | CAM 6 - KITCHEN | Static noise only — audio-only cam |
| `stage_right` | CAM 7 - RESTROOMS | Chica's mid-path |

## Audio System
`sounds.js` synthesises all game SFX procedurally via `OfflineAudioContext` and assigns WAV blobs to the `<audio>` elements at startup — **no external audio files are required**. Drop real `.mp3` files into `src/assets/` to override; they take precedence if present. All calls use `.play().catch(function(){})` so missing files fail silently.

## Adding Features — Integration Points

- **New animatronic:** Add to `animatronics` in `state.js` with `path[]`; add AI levels to `NIGHT_AI` in `state.js`; add a tick function in `ai.js`; handle jumpscare in `triggerGameOver` in `game.js`.
- **New office geometry:** Add meshes inside `buildRoom()` in `office3d.js`. Reuse the `mesh(geo, mat)` helper.
- **Hall light / animatronic silhouette:** Call `window.office3d.setLightLeft/Right(on)` and `setHallLeft/Right(color)` from `game.js`.
- **Camera feed image:** Drop a `.png/.jpg` into `src/assets/` with the expected base name (e.g. `cam_stage`). `assets.js` tries `.png → .jpg → .jpeg → .svg` automatically.
- **New camera feed:** Add key + label to `CAM_LABELS` in `cameras.js`, add a `drawCamBg` case in `cameras.js`, add an overlay button in `#cameraGrid` in `index.html`, and add the key to the animatronic `path[]` in `state.js`.

## What NOT to Do
- Do **not** introduce external native applications — no Blender, Unity, or other desktop tools. Everything must run in the browser or in Node.js/pnpm.
- pnpm (and npm) are acceptable for adding dev dependencies or build tooling if needed.
- Do **not** add DOM elements inside `#officeScene` — Three.js owns that div and clears it on `init()`.
- Three.js r152 is served **locally** from `src/js/three.min.js` (the CDN path for r163 does not exist — `build/three.min.js` was removed from the npm package in newer releases). Do not switch to a CDN URL without verifying the file actually exists at that URL.
- Do **not** remove the `gameOverTriggered` flag in `state.js` — it prevents double-firing when power outage and animatronic collision happen simultaneously.
