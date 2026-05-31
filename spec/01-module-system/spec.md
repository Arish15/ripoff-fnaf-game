# Spec 01 — ES Module System

**Risk:** High (load-order changes, Three.js already ES module, mixed-mode issues)  
**Effort:** Large (~2–3 days)  
**Prerequisite:** All other specs complete (modules are easier to migrate when already small)

---

## Problem

Every JS file is a classic `<script>` tag. All state lives on `window.*`. Files communicate by
mutating globals. This means:
- No encapsulation — any file can corrupt any other file's state.
- Load order is fragile — scripts must be ordered precisely in `index.html`.
- No tree-shaking, no dead code elimination (matters if a bundler is ever added).
- Impossible to unit test without a browser.

---

## Current Load Order (must be preserved during migration)
```
sounds.js          (no deps — synthesises audio, fills DOM)
office3d.js        (ES module already — imports Three.js)
state.js           (defines game, NIGHT_AI, animatronics globals)
assets.js          (depends on nothing, fills window.assets)
office.js          (depends on game, office3d)
cameras.js         (depends on game, monitorOpen, office3d)
ai.js              (depends on game, animatronics, office3d, triggerGameOver)
extras.js          (depends on game, animatronics)
jumpscare.js       (standalone canvas module)
game.js            (depends on everything — must load last)
```

---

## Target Architecture

```
src/js/
  main.js              ← top-level entry, replaces inline DOMContentLoaded in game.js
  state/
    game-state.js      ← exports { game, NIGHT_AI, animatronics, ... }
    persistence.js     ← exports { loadProgress, saveProgress }
  engine/
    game-loop.js       ← exports { startGame, tickGame, endNight, returnToStart }
    power.js           ← exports { tickPower, DRAIN_* constants }
    game-over.js       ← exports { triggerGameOver }
    night-manager.js   ← exports { nextNight, endNight }
  ai/
    tick.js            ← exports { tickAnimatronics }
    foxy.js            ← exports { tickFoxy }
    freddy.js          ← exports { tickFreddy }
    others.js          ← exports { tickOther }
    collisions.js      ← exports { checkCollisions, updateHallAnimatronics }
  office/
    office3d/
      scene.js         ← Three.js scene, camera, renderer
      doors.js         ← door mesh + spring physics
      lights.js        ← hall light toggle
      hall.js          ← animatronic silhouettes in hallways
      index.js         ← re-exports public API as window.office3d
    interactions.js    ← toggleDoor, toggleLight, HUD update
  cameras/
    renderer.js        ← canvas drawing, drawCamBg, drawCamOverlay
    monitor.js         ← toggleMonitor, switchCam
    loop.js            ← startCameraLoop, RAF
  audio/
    synthesiser.js     ← procedural Web Audio generation
    loader.js          ← tryRealOrFallback, asset-to-element binding
  ui/
    hud.js             ← updateHUD, updateNightButtons
    jumpscare.js       ← jumpscare canvas animation
    extras.js          ← hallucinations, phone guy, stars, golden freddy
  assets.js            ← image preloader
```

---

## Migration Strategy

### Step 1 — Add `type="module"` to `index.html` entry only
Keep all existing `<script>` tags as-is. Add a single new `<script type="module" src="src/js/main.js">`.
`main.js` starts empty — just proves module loading works alongside legacy scripts.

### Step 2 — Migrate leaf modules first (no dependencies)
Convert `assets.js`, `sounds.js` (synthesiser only), `jumpscare.js` to ES modules.
These have no imports from other game files — safest to convert first.

### Step 3 — Migrate state
Convert `state.js` → `state/game-state.js` + `state/persistence.js`.
Update all importers. This is the biggest change — every other module imports from here.

### Step 4 — Migrate AI
Convert `ai.js` → `ai/` sub-modules. They only import from state.

### Step 5 — Migrate office, cameras, game engine
Convert in dependency order. By now each is already split (from specs 02–04).

### Step 6 — Remove legacy `<script>` tags
Once all modules import correctly, remove the old `<script src="...">` tags from `index.html`.
Replace with single `<script type="module" src="src/js/main.js">`.

---

## Key Constraints
- `office3d.js` already uses `import` (ES module). It currently lives inside its own `<script type="module">` tag. After migration it becomes an import of scene/doors/lights/hall modules.
- The `window.office3d` public API **must be preserved** for the transition period — other modules import it. Remove the `window.` exposure only at the very end.
- No bundler required — browser-native ES modules work fine for a game of this size.

---

## Breaking Changes to Communicate
- Script load order no longer matters (modules handle their own deps).
- All `window.startGame`, `window.toggleDoor` etc. can eventually be removed from `onclick` attributes and wired via `addEventListener` in `main.js`.
