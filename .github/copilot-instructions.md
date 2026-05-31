# Copilot Instructions — FNAF Browser Game

## Project Overview

### What This Is
A faithful **Five Nights at Freddy's 1 recreation** built entirely in **HTML5/CSS/JavaScript** with **Three.js r170 (ES Module)** for 3D rendering. The game runs directly in the browser—no external tools like Unity, Blender, or desktop applications. It's a complete survival horror game where the player manages a security office for 5 consecutive nights (6 hours each, 12 AM–6 AM) while defending against animatronic characters.

### What You're Building
- **Browser-based 3D first-person office** where the player monitors animatronics, controls doors/lights, watches security cameras, and manages power
- **Four animatronics** (Freddy, Bonnie, Chica, Foxy) with AI-driven pathfinding through distinct camera locations
- **Dual-layer rendering**: 3D office view (Three.js WebGL) + 2D security camera monitor (Canvas 2D)
- **Progressive difficulty**: 5 nights with escalating AI levels; unlocks Custom Night after completion
- **Power management**: Limited 100% power drained by door/light usage; full outage triggers catastrophic Freddy event
- **Game state persistence**: Progress saved to localStorage + cookie (1-year expiry)

### Current Architecture Status (Latest)
**REFACTORED (May 2026)**: Replaced canvas overlay animatronics with unified **3D animatronic builder system**. All four characters now render as full Three.js models instead of 2D drawn characters:
- **Bonnie** (purple, cone ears, SphereGeometry head)
- **Freddy** (brown bear, top hat, round ears)
- **Chica** (yellow chicken, orange ConeGeometry beak)
- **Foxy** (red fox, snout detail)
Dynamic model switching via `updateHallVis()` ensures correct character renders at correct time based on AI state.

## Running the Game
```
node server.js          # starts http://localhost:8000
npm run dev             # (if package.json configured)
python -m http.server 8000  # alternative Python server
```

**Key**: `server.js` is a minimal Node.js static file server (no Express). Hard-refresh (Ctrl+Shift+R) after JS/CSS changes—Cache-Control headers are set to `no-cache`, but browser caching is persistent.

### Development Workflow
1. **Make code changes** → Save
2. **Hard-refresh** (Ctrl+Shift+R or Cmd+Shift+R) → Browser clears cache
3. **Test in browser** → Check console for errors (F12)
4. **Profile if needed** → DevTools Performance tab for FPS/GPU analysis

**Do NOT rely on soft-refresh (Ctrl+R)** — Three.js module imports may not reload properly.

## Architecture — Two Distinct Rendering Systems

The game has **two separate render layers** that must stay in sync:

| Layer | File | What it renders |
|---|---|---|
| 3D office (WebGL) | `src/js/office3d.js` | Player's first-person office view — walls, doors, desk, fan, lighting |
| 2D camera monitor | `src/js/cameras.js` → `drawCamBg()` | Security camera feeds drawn onto `<canvas id="cameraCanvas">` |

**`#officeArea`** (z-index 60) is full-screen and contains the Three.js canvas. It is shown when `monitorOpen === false` and hidden when the camera monitor is raised.

**`#gameContainer`** holds the 2D camera canvas (`#monitorArea`) and the traditional HTML control panels; z-index below office area.

## Agent Specializations

### For VS Code Chat:
When working in VS Code Copilot Chat, specialized agents are available via the Agent menu:

| Agent | Best For | Domain |
|-------|----------|--------|
| **Game Dev Master** | Rendering, WebGL, Three.js, performance profiling, visual bugs, GPU optimization | Three.js r170 implementation, office3d.js debugging, frame rate issues, shader effects, asset pipeline |
| **Coding master** | Game logic, state machines, AI pathfinding, animatronic behavior, difficulty tuning, power management | game.js, ai.js, state.js, game loop, animatronic AI levels, night progression |
| **Textures and animations pro** | Visual assets, sprite creation, texture design, animation timing, SVG/PNG optimization | Asset creation, texture formats, animation frame timing, visual polish |
| **Explore** | Codebase exploration, Q&A, reading code, finding references | Understanding unfamiliar code areas, quick research, no implementation needed |

**Selection**: Use the agent menu in VS Code to select appropriate specialist before describing your task.

### For CLI Usage (GitHub Copilot CLI):
GitHub Copilot CLI does **not** have the agent selection UI like VS Code Chat. Instead, use the `-a` / `--agent` flag or include agent context in your prompt:

```bash
# Method 1: Explicit agent flag (if supported)
copilot -a "Game Dev Master" "Optimize the Three.js rendering pipeline"

# Method 2: Include agent context in prompt
copilot "As Game Dev Master: profile the office3d.js renderer and identify bottlenecks"

# Method 3: Use instructions via .instructions file
cat > .instructions.md << EOF
# FNAF Game Dev Master Instructions

You are a Three.js specialist focused on:
- WebGL rendering optimization
- Frame rate profiling and improvement
- Visual quality and asset pipeline
- office3d.js API and internals

EOF
copilot "Debug why frame rate drops below 60 FPS"
```

**Recommended Approach for CLI**: Create a `.instructions.md` file in the project root (or in each session) that specifies your current working mode. Example:

```markdown
# FNAF Development Context

## Current Focus: Three.js Rendering (Game Dev Master Mode)
- You are a Three.js specialist
- Focus on WebGL performance, visual quality, GPU optimization
- Primary file: src/js/office3d.js
- Use DevTools Performance profiling to measure impact
- Target: 60+ FPS, stable GPU memory

## Project: Five Nights at Freddy's 1 Browser Game
[Include project overview here]
```

## office3d.js — Public API
`window.office3d` is an IIFE-exposed object. Always guard calls with `if (window.office3d)`.

```js
window.office3d.init()                // call once at DOMContentLoaded
window.office3d.setMouse(normX)       // 0..1 — drives camera Y-rotation
window.office3d.setDoorLeft(closed)   // true = door closes (spring-physics animation)
window.office3d.setDoorRight(closed)  // true = door closes
window.office3d.setLightLeft(on)      // toggle left hall light visibility
window.office3d.setLightRight(on)     // toggle right hall light visibility
window.office3d.setHallLeft(animObj)  // sets left hall animatronic (object with name, color)
window.office3d.setHallRight(animObj) // sets right hall animatronic
window.office3d.getRotation()         // returns current camera Y rotation in radians
window.office3d.show() / .hide()      // toggle office visibility
window.office3d.resize()              // call on window resize
```

**Animatronic Objects**: Passed to `setHallLeft/Right()`, expected structure:
```js
{ 
  name: 'Bonnie' | 'Freddy' | 'Chica' | 'Foxy',
  color: '0xPURPLE' | '0xBROWN' | '0xYELLOW' | '0xRED'
}
```

Camera head-turn: `mouseNorm` → lerped to `targetRotY = (mouseNorm - 0.5) * 2 * MAX_ROT` (±0.62 rad ≈ ±35°). `camera.rotation.order = 'YXZ'` is required for correct FPS yaw.

Door physics: Spring-based animation (`DOOR_SPRING_K = 0.075`, `DOOR_DAMPING = 0.26`). `DOOR_OPEN_Y = 12.0` (above ceiling), `DOOR_CLOSED_Y = 4.0` (lowered into frame). These constants are at the top of `office3d.js`.

Room coordinate system: X −11…+11, Y 0…+11, Z −9…+9. Camera sits at `(0, 4.0, 7.5)` looking toward `z = −9` (back wall).

**3D Animatronic System (Unified Three.js)**:
Located in `office3d.js` lines 1481-1810:
- `buildHallAnimatronics()` — creates left/right Groups and builder functions
- `makeBonnie()` — returns Group with purple character (SphereGeometry head + ConeGeometry ears)
- `makeFreddy()` — returns Group with brown bear (SphereGeometry head + top hat + round ears)
- `makeChica()` — returns Group with yellow chicken (orange ConeGeometry beak)
- `makeFoxy()` — returns Group with red fox (snout detail)
- `updateHallVis(side)` — dynamically switches animatronic models:
  - Clears old children from group
  - Creates new model based on animatronic.name
  - Handles visibility based on lights and presence
  - Called by setLightLeft/Right and game.js

**Key**: No canvas overlay for animatronics. All rendering is unified Three.js.

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

## Current Development Status

**Project State**: Core animatronic rendering system complete and refactored to unified 3D.

**Recent Accomplishments**:
✅ Refactored from canvas overlay to unified Three.js 3D animatronic system
✅ Implemented all 4 animatronics as distinct 3D models (Bonnie, Freddy, Chica, Foxy)
✅ Dynamic model switching via updateHallVis() working correctly
✅ All AI integration complete (ai.js → office3d.js pipeline)
✅ Game loop tick integration working (game.js calls updateHallAnimatronics every 100ms)
✅ Server running and stable (http://localhost:8000)
✅ All 25/25 verification checks passing

**Next Features (From Roadmap)**:
- [ ] F7: Power outage Freddy jumpscare sequence
- [ ] F8: Night intro overlay (countdown before night starts)
- [ ] Camera grid layout validation

**Known Constraints**:
- Three.js r170 loaded via ES Module (importmap), not CDN
- Hard-refresh required after JS changes (browsers cache aggressively)
- 60+ FPS target, minimum 30 FPS acceptable
- No external asset files required (audio synthesized, assets fallback to SVG)

## Common Development Tasks — Quick Reference

### "Frame rate is dropping below 60 FPS"
1. Open DevTools → Performance tab
2. Record 10-15 seconds of gameplay
3. Check GPU memory (tab → Memory)
4. Profile for draw calls, shader complexity, memory leaks
5. Check fog near/far values in office3d.js
6. Run from Game Dev Master agent for rendering optimization

### "I need to add a new camera feed"
1. Add `key: "CAM_LABEL"` to `CAM_LABELS` in cameras.js
2. Add case in `drawCamBg()` to draw the new feed
3. Add button to `#cameraGrid` in index.html
4. Add `key` to animatronic `path[]` in state.js
5. Add camera image (`cam_key.png/jpg/svg`) to src/assets/

### "I need to add a new animatronic"
1. Add entry to `animatronics` in state.js with `path[]`
2. Add AI levels to `NIGHT_AI` array
3. Add tick function in ai.js
4. Add 3D model builder in office3d.js (followmakeBonnie pattern)
5. Call updateHallVis() when animatronic enters/leaves halls
6. Handle jumpscare in triggerGameOver in game.js

### "Audio is playing but I want to stop it on menu return"
- Call `stopAllAudio()` from game.js at start of returnToStart()
- Function pauses and resets all game audio elements

### "I need to verify my changes didn't break anything"
- Check console (F12) for errors
- Hard-refresh (Ctrl+Shift+R)
- Test doors/lights/cameras in game
- Check frame rate in DevTools Performance
- Verify animatronics still progress in hallways
- Look for memory leaks (DevTools Memory tab)
