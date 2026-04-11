---
description: "Game development and debugging guidance for Three.js/browser game features. Use when implementing features, debugging render issues, fixing gameplay logic, or profiling performance."
applyTo: ["src/js/**/*.js", "index.html", "src/css/**/*.css"]
---

# Game Development Best Practices — FNAF Browser Edition

## Before You Code

1. **Understand the current state** — read `state.js` to see what global vars exist
2. **Check the target module** — is this a Three.js change (office3d.js), game logic change (game.js), or AI logic (ai.js)?
3. **Identify entry points** — does this feature get triggered from HTML (`onclick`), from game loop (`tickGame`), or from event listeners?
4. **Guard against re-init** — the `office3dInited` flag prevents double-initialization; respect it

## Code Quality Rules

### Three.js Specific
- **Use `window.office3d.method()` not direct scene access** — office3d.js is an IIFE; its internals are private
- **Always check for null** — materials, geometries, and meshes can be null; guard with `if (!variable) return;`
- **Dispose old geometry before reassigning** — memory leaks come from unreleased WebGL resources
- **Use MeshLambertMaterial or MeshPhongMaterial for lighting** — MeshBasicMaterial ignores lights
- **Camera rotation order must be 'YXZ'** — this is FPS-correct; don't change it

### Game Loop Patterns
- **State changes in game.js only** — don't modify `game.*` vars from other modules; use functions
- **Always check `if (!game.running)` at start of critical functions** — prevent bugs during game over
- **Use `clearInterval(gameLoop)` before `setInterval(tickGame, 100)`** — prevents multiple loops
- **AI roll: `Math.random() * 20 < ai`** — standard difficulty scale 0–20

### Asset Loading
- **SVG/PNG assets tried in order: .svg → .png → .jpg → .jpeg** — check src/assets/ for actual files
- **Images must have matching keys in assets object** — assets.js lists the 5 keys it loads
- **No missing file errors expected for audio** — sounds.js overrides most; phone guy files gracefully fall back to TTS

### Audio
- **Procedural audio via `sounds.js`** — most SFX are synthesized, not external files
- **Missing audio files fail silently** — `.play().catch(function(){})` handles it
- **Light audio redirected to lightswitch.mp3** — fixed in index.html (was light.mp3 which didn't exist)

## Testing Checklist

Run through this before marking any feature complete:

- [ ] **No console errors** — DevTools Console must be clean
- [ ] **FPS ≥30** (target 60) — record 15s with Perf tab in DevTools
- [ ] **Memory stable** — DevTools Memory tab shouldn't show unbounded growth
- [ ] **All core systems work** — doors, lights, camera, AI, power system
- [ ] **Feature works as intended** — reproduce exact requirement, not just "seems to work"
- [ ] **No side effects** — changing one system didn't break another

## Common Debugging Paths

### Canvas is black
1. Check DevTools Console for errors
2. Confirm `office3dInited` was set to `true`
3. Verify `init()` was called in the 50ms timeout in `startGame()`
4. Check Three.js r152 is loaded (look for `THREE.Scene` in console)

### Doors don't animate
1. Search game.js for `setDoorLeft` / `setDoorRight` calls
2. Verify they're being called with true/false values
3. Check office3d.js `animate()` is running (should see FPS in Perf tab)
4. Confirm doorLeftPanel / doorRightPanel meshes exist in buildRoom()

### AI not progressing
1. Open DevTools Console, check `game.animatronics[name].pos` changes over time
2. Verify `tickAnimatronics()` is called from `tickGame()`
3. Check the animatronic's `path[]` array exists in state.js
4. Ensure `Math.random() * 20 < ai` logic is correct (not inverted)

### Performance drops
1. Open DevTools Perf tab, record 10-15s of gameplay
2. Look for long tasks (>16ms = drops below 60 FPS)
3. Check WebGL draw calls count (should be <100 typically)
4. Profile GPU (GPU profile, WebGL calls) — may need to reduce geometry or lights
5. Check memory (can cause GC pauses if heap is filling up)

### Animatronic stuck at a location
1. Check state.js for that animatronic's `path[]` definition
2. Verify path indices are valid (0 to path.length-1)
3. Check `tickAnimatronic(name)` in ai.js for that animatronic type
4. Look for edge cases: door blocking, linger timer, etc.

## File Structure for Reference

```
C:\code\fnaf\
├── index.html                    ← Game markup (audio, buttons, overlays)
├── server.js                     ← Dev server
├── src/
│   ├── js/
│   │   ├── three.min.js          ← Three.js r152 (local copy)
│   │   ├── state.js              ← Global game state
│   │   ├── game.js               ← Game controller
│   │   ├── office3d.js           ← Three.js 3D office (IIFE)
│   │   ├── ai.js                 ← Animatronic AI
│   │   ├── cameras.js            ← Camera feeds
│   │   ├── extras.js             ← Phone Guy, Custom Night, etc
│   │   ├── sounds.js             ← Procedural audio
│   │   ├── assets.js             ← Asset loader
│   │   └── office.js             ← Legacy 2D renderer (disabled)
│   ├── css/
│   │   ├── styles.css            ← Game UI styles
│   │   └── office.css            ← 3D office overlay styles
│   └── assets/                   ← Images, audio (SVG, MP3, OGG, WEBP, GIF)
└── .github/
    ├── copilot-instructions.md   ← Main workspace instructions
    ├── agents/
    │   └── Game Dev Master.agent.md  ← Your specialized agent
    └── (more files as needed)
```

## Key Variables & APIs

### Global Game State (state.js)
```js
game.running                    // true = gameplay active
game.time                       // Elapsed time in 0.1s ticks
game.hour                       // Hour of the night (0-5 = 12 AM - 5 AM)
game.power                      // 0-100 (%)
game.doorLeft / game.doorRight  // true = closed
game.lightLeft / game.lightRight // true = on
game.powerOutage                // true = lights out, Freddy incoming
game.currentNight               // 1-7 (night selected)
gameOverTriggered               // DON'T REMOVE — prevents double jumpscare

animatronics[name]              // { pos, ai, path[], ... }
```

### Three.js Public API (window.office3d)
```js
window.office3d.init()                // Call once
window.office3d.setDoorLeft(closed)   // true/false
window.office3d.setDoorRight(closed)  // true/false
window.office3d.setLightLeft(on)      // true/false
window.office3d.setLightRight(on)     // true/false
window.office3d.setHallLeft(color)    // '#ff0000' or null
window.office3d.setHallRight(color)   // '#ff0000' or null
window.office3d.setMouse(normX)       // 0..1
window.office3d.show() / .hide()      // Visibility
```

### Room Coordinates (office3d.js)
```
X: -11 to +11  (width, center = 0)
Y:   0 to +11  (height, floor = 0)
Z:  -9 to  +9  (depth, camera = 7.5)
Camera at (0, 4, 7.5) looking toward back wall
```

## Quick Reference: Common Tasks

### Add a new animatronic
1. Add to `animatronics` object in state.js: `animatronic_name: { pos: 0, path: [cam1, cam2, ...], ... }`
2. Add AI levels to `NIGHT_AI[night]` in state.js
3. Create `tickAnimatronic_name()` in ai.js
4. Handle jumpscare in `triggerGameOver()` in game.js
5. Test: run game, watch it move through path

### Add a new camera feed
1. Add to `CAM_LABELS` in cameras.js: `feed_key: 'CAM X - LABEL'`
2. Add case in `drawCamBg()` switch in cameras.js
3. Add button in `#cameraGrid` in index.html: `<button class="camBtn" data-cam="feed_key">...</button>`
4. Add to animatronic's `path[]` array in state.js

### Fix a Three.js visual bug
1. Start `node server.js`, open DevTools
2. Check Console for errors
3. Check Perf tab for frame drops
4. Check Elements tab for CSS (z-index, display)
5. If scene issue, check office3d.js buildRoom/buildLighting/etc
6. If material issue, verify it's MeshLambertMaterial or responsive

### Profile performance
1. DevTools Perf tab → Record → play ~10-15s → Stop
2. Look for red bars (dropped frames)
3. Check GPU tab for draw call spikes
4. Check memory growth over time
5. Profile WebGL state if needed (browser-specific)

---

**Next**: When you're ready to implement a feature, invoke the **Game Dev Master** agent to guide you through the full debug-build-test cycle.
