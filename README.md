# FNAF1 Browser Recreation

A faithful, feature-rich recreation of Five Nights at Freddy's 1 in plain HTML5/CSS/JavaScript with Three.js 3D graphics, procedural door textures, smooth physics animations, and full FNAF1 game mechanics.

---

## ⚡ Quick Start

```bash
node server.js              # starts http://localhost:8000
# OR
python -m http.server 8000  # Python alternative
```

Then open **http://localhost:8000** in your browser. Hard-refresh (Ctrl+Shift+R) after code changes to bypass cache.

---

## 🎮 Features

### Rendering
- **3D Office** (Three.js r152) — First-person view with head-turning camera, lighting, and depth fog
- **FNAF1-accurate atmosphere** — Warm tan-beige wall colors, tight dark fog, CELEBRATE party banner with streamers and children's drawings on the back wall
- **Procedurally Generated Door Textures** — Realistic gunmetal blast doors with rivets, hazard stripes, panel insets, and scratches; generated on-the-fly as canvas textures
- **Spring-Physics Door Animations** — Both doors animate smoothly downward when closing (with subtle bounce overshoot), then retract upward into ceiling slots when opening
- **Dynamic Lighting** — Ambient + directional lights illuminate office; hall lights toggle on/off with visual effect
- **Camera Monitor System** — 2D canvas overlay with 11 distinct camera feeds matching FNAF1 building layout

### Gameplay
- **6 Nights** with escalating AI difficulty (Freddy, Bonnie, Chica, Foxy pathfinding)
- **Power Management** — Lights, doors, and monitor drain battery; game over at 0%
- **Power Outage** — Screen goes instantly black, then Freddy jumpscare triggers after ~1 second (no jingle phase)
- **Door & Light Controls** — Wall-mounted buttons in the 3D office (toggleable per side)
- **Animatronic AI** — Random movement along predefined paths; collision detection triggers jump scare
- **Per-character Jumpscares** — Each animatronic has a unique jumpscare animation timed exactly to its asset duration
- **Night Progression** — Survive 6:00 AM to advance (12 AM → 6 AM timer)
- **Audio System** — Door/light SFX, power outage sound, jump scare, and night completion audio

---

## 📁 Project Structure

```
fnaf/
├── index.html              # Main entry point
├── server.js               # Node.js static file server
├── src/
│   ├── js/
│   │   ├── office3d.js     # Three.js 3D office rendering + door physics
│   │   ├── game.js         # Main game loop, AI, collisions, HUD
│   │   ├── cameras.js      # 11-camera feed rendering system
│   │   ├── ai.js           # Animatronic pathfinding & behavior
│   │   ├── state.js        # Game state & constants
│   │   ├── assets.js       # Asset loader
│   │   ├── three.min.js    # Three.js r152 (local, pre-bundled)
│   │   └── office.js       # Fallback 2D office renderer (not used; kept for compatibility)
│   ├── css/
│   │   ├── styles.css      # Game HUD, camera grid, UI styling
│   │   └── office.css      # Office-specific state styles
│   ├── html/
│   │   └── header.html     # Unused template
│   └── assets/             # Audio/image files (optional)
├── README.md               # This file
└── GEMINI.md               # Architecture notes
```

---

## 🎨 Visual Details

### FNAF1 Office Environment
The office is modelled after the original FNAF1 aesthetic:
- **Wall colours:** Warm tan-beige back wall (`#c4b080`) and medium tan side walls — closely matching the reference game
- **CELEBRATE banner:** Purple/lavender bar spanning the back wall with 9 bright yellow letter blocks, coloured hanging streamers, and children's drawings plastered below
- **Fog:** Dark (`#0e0c08`) with tighter range (14–26 units) for a more claustrophobic feel
- **Warm overhead lighting:** Yellow-tinted directional light emulating a single ceiling bulb

### Jumpscares (Per-character Timing)
Each jumpscare is timed to match its asset's exact animation duration:

| Character | Asset | Animation | Screen hold |
|-----------|-------|-----------|-------------|
| Freddy | `freddy_jumpscare.webp` | 1400ms (20 frames) | 1700ms |
| Bonnie | `bonnie_jumpscare.webp` | 320ms (10 frames) | 600ms |
| Chica | `chica_jumpscare.webp` | 600ms (15 frames) | 900ms |
| Foxy | `foxy_jumpscare.gif` | 900ms | 1150ms |
| Freddy (power outage) | `freddy_jumpscare_power.gif` | 840ms | 1100ms |
| Golden Freddy | `golden_freddy.webp` | static | 1400ms |

The CSS shake animation (`0.07s` per cycle) uses a matching iteration count per character so the shake ends naturally when the image finishes.

### Power Outage
1. Power hits 0% → screen fades to black instantly via `#powerDarkOverlay` (0.4s transition)
2. After 0.8–1.3 seconds in total darkness → Freddy power jumpscare triggers
3. No intermediate light-up / jingle phase

### Door Textures (Procedural Canvas)
Each door is rendered using a procedurally generated canvas texture mapped to a `MeshStandardMaterial`:
- **Base colour:** Dark gunmetal with per-pixel noise grain
- **4 recessed panels** with inset shadows and bevel shading
- **Horizontal separator ridges** with centre grooves and specular highlights
- **16 rivets** (4 columns × top/middle/bottom rows) with radial gradients and specular glints
- **Scratch marks** for wear and tear
- **Yellow/black diagonal hazard stripe** at bottom (FNAF-accurate caution marking)
- **Bump map:** Paired grayscale texture for depth shading under directional lights

### Door Animations
Spring-physics system with realistic weight and bounce:
- **Open:** Target position above frame (y=12); door retracts upward into ceiling slot, hidden once fully retracted
- **Closed:** Target position (y=4) filling the doorway; spring pulls downward with slight overshoot (bounce), then dampens
- **Stiffness:** k=0.075 (tuned for realistic heavy-door feel)
- **Damping:** 26% velocity loss per frame (slight oscillation, not too bouncy)

### Camera Grid
Bottom-right overlay showing all 11 cameras in FNAF1 building topology:
- **SVG corridor connection lines** show pathways between rooms
- **Semi-transparent background** (`rgba(10,12,15,0.55)`) so the map floats over gameplay without a solid black block
- **Subtle button borders** visible at all times — no longer invisible until hover
- **YOU marker** indicates office position
- **Active camera highlights green** with glow effect

---

## 🔧 Architecture — Two Rendering Systems

The game maintains **two separate render layers that stay in sync:**

| Layer | File | Renders |
|-------|------|----------|
| **3D Office (WebGL)** | `src/js/office3d.js` | Player's first-person POV — walls, doors, desk, lights, camera feeds (illusion via hall light cutaways) |
| **2D Camera Monitor** | `src/js/game.js` → `drawCam()` | Security camera feeds as 2D canvas overlays |

**Key API:**
```javascript
window.office3d.init()                 // Initialize 3D scene
window.office3d.setMouse(normX)        // 0..1 — drives camera Y-rotation (head-turn)
window.office3d.setDoorLeft(closed)    // Trigger left door animation
window.office3d.setDoorRight(closed)   // Trigger right door animation
window.office3d.setLightLeft(on)       // Toggle left hall light + visibility
window.office3d.setLightRight(on)      // Toggle right hall light + visibility
window.office3d.show() / .hide()       // Toggle office visibility
window.office3d.resize()               // Update on window resize
```

---

## 📡 Audio Assets

Place audio files in `src/assets/` to enable sound:

| Element ID | Expected Files | Triggered By |
|-----------|----------------|----------|
| `doorAudio` | `door.mp3` / `door.ogg` | Door or light toggle |
| `jumpScareAudio` | `jumpscare.mp3` / `jumpscare.ogg` | Game over (most animatronics) |
| `goldenFreddyScareAudio` | `golden_freddy.ogg` | Golden Freddy easter egg |
| `powerOutAudio` | `powerout.mp3` / `powerout.ogg` | Power reaches 0% |
| `successAudio` | `success.mp3` / `success.ogg` | Survive night (6:00 AM) |
| `foxySprintAudio` | `foxy_sprint.mp3` | Foxy running in hallway |

---

## 🎮 Controls

**Office View:**
- **Mouse drag left/right** → Turn head (camera pans smoothly)
- **Wall buttons** → Toggle doors/lights per side (highlighted when active)
- **Monitor button (bottom center)** → Raise/lower security camera map

**Camera Map:**
- **Click any camera button** → View that feed
- **YOU marker** → Current office position (non-interactive)

---

## 🐛 Troubleshooting

**Canvas/graphics not showing?**
- Hard-refresh (Ctrl+Shift+R) — cache issues are common
- Check DevTools F12 → Console for errors

**Three.js error?**
- Ensure `src/js/three.min.js` exists (r152 is bundled locally, not from CDN)
- File is ~600KB; check network tab if missing

**Audio not playing?**
- Drop `.mp3` + `.ogg` files into `src/assets/` with the names above
- Browser autoplay policy may require user gesture first — game starts only after clicking "Night" button

**Jumpscares not showing?**
- `#jumpScare` uses `position: fixed; inset: 0` — if modified, ensure all four edges are anchored
- Asset files (`.webp`, `.gif`) must exist in `src/assets/` with exact filenames

**Door animations look wrong?**
- Check `office3d.js` lines ~32-40 for animation constants:
  - `DOOR_SPRING_K` = stiffness
  - `DOOR_DAMPING` = bounce factor
  - `DOOR_OPEN_Y` / `DOOR_CLOSED_Y` = positions

---

## 🚀 Extending the Game

**Add a new camera feed:**
1. Add key to `CAM_LABELS` in `cameras.js`
2. Implement `drawCamBg(cam, w, h)` case in `cameras.js`
3. Add route to `animatronics[].path[]` in `state.js`
4. Add button to camera grid in `index.html`

**Add new 3D geometry:**
1. Create mesh in `buildRoom()` in `office3d.js`
2. Use `box()` or `new THREE.Mesh()` helper
3. Add material variant (see `mat()` helper)

**Tune door physics:**
- Edit constants at top of `office3d.js` (lines ~32-40)
- Adjust `DOOR_SPRING_K`, `DOOR_DAMPING`, `DOOR_THRESHOLD` for feel

---

## 📝 Notes

- **Three.js r152 is local** — newer releases removed `three.min.js` from npm; we bundle it.
- **No external CDNs used** — fully self-contained (except optional audio files).
- **Performance:** Runs at 60 FPS on modern hardware; animatronic AI updates every 5 seconds to reduce load.

Enjoy!


---

## 📁 Project Structure

```
fnaf/
├── index.html              # Main entry point
├── server.js               # Node.js static file server
├── src/
│   ├── js/
│   │   ├── office3d.js     # Three.js 3D office rendering + door physics
│   │   ├── game.js         # Main game loop, AI, collisions, HUD
│   │   ├── cameras.js      # 11-camera feed rendering system
│   │   ├── ai.js           # Animatronic pathfinding & behavior
│   │   ├── state.js        # Game state & constants
│   │   ├── assets.js       # Asset loader
│   │   ├── three.min.js    # Three.js r152 (local, pre-bundled)
│   │   └── office.js       # Fallback 2D office renderer (not used; kept for compatibility)
│   ├── css/
│   │   ├── styles.css      # Game HUD, camera grid, UI styling
│   │   └── office.css      # Office-specific state styles
│   ├── html/
│   │   └── header.html     # Unused template
│   └── assets/             # Audio/image files (optional)
├── README.md               # This file
└── GEMINI.md               # Architecture notes
```

---

## 🎨 Visual Details

### Door Textures (Procedural Canvas)
Each door is rendered using a procedurally generated canvas texture mapped to a `MeshStandardMaterial`:
- **Base colour:** Dark gunmetal with per-pixel noise grain
- **4 recessed panels** with inset shadows and bevel shading
- **Horizontal separator ridges** with centre grooves and specular highlights
- **16 rivets** (4 columns × top/middle/bottom rows) with radial gradients and specular glints
- **Scratch marks** for wear and tear
- **Yellow/black diagonal hazard stripe** at bottom (FNAF-accurate caution marking)
- **Bump map:** Paired grayscale texture for depth shading under directional lights

### Door Animations
Spring-physics system with realistic weight and bounce:
- **Open:** Target position above frame (y=12); door retracts upward into ceiling slot, hidden once fully retracted
- **Closed:** Target position (y=4) filling the doorway; spring pulls downward with slight overshoot (bounce), then dampens
- **Stiffness:** k=0.075 (tuned for realistic heavy-door feel)
- **Damping:** 26% velocity loss per frame (slight oscillation, not too bouncy)

### Camera Grid
Bottom-right overlay showing all 11 cameras in FNAF1 building topology:
- **SVG corridor connection lines** show pathways between rooms
- **Transparent background** so map floats over gameplay
- **YOU marker** indicates office position
- **Active camera highlights green** with glow effect

---

## 🔧 Architecture — Two Rendering Systems

The game maintains **two separate render layers that stay in sync:**

| Layer | File | Renders |
|-------|------|----------|
| **3D Office (WebGL)** | `src/js/office3d.js` | Player's first-person POV — walls, doors, desk, lights, camera feeds (illusion via hall light cutaways) |
| **2D Camera Monitor** | `src/js/game.js` → `drawCam()` | Security camera feeds as 2D canvas overlays |

**Key API:**
```javascript
window.office3d.init()                 // Initialize 3D scene
window.office3d.setMouse(normX)        // 0..1 — drives camera Y-rotation (head-turn)
window.office3d.setDoorLeft(closed)    // Trigger left door animation
window.office3d.setDoorRight(closed)   // Trigger right door animation
window.office3d.setLightLeft(on)       // Toggle left hall light + visibility
window.office3d.setLightRight(on)      // Toggle right hall light + visibility
window.office3d.show() / .hide()       // Toggle office visibility
window.office3d.resize()               // Update on window resize
```

---

## 📡 Audio Assets (Optional)

Place audio files in `src/assets/` to enable sound:

| Element ID | Expected Files | Triggered By |
|-----------|----------------|----------|
| `doorAudio` | `door.mp3` / `door.ogg` | Door or light toggle |
| `jumpScareAudio` | `jumpscare.mp3` / `jumpscare.ogg` | Game over / collision |
| `powerOutAudio` | `powerout.mp3` / `powerout.ogg` | Power reaches 0% |
| `successAudio` | `success.mp3` / `success.ogg` | Survive night (6:00 AM) |

---

## 🎮 Controls

**Office View:**
- **Mouse drag left/right** → Turn head (camera pans smoothly)
- **Wall buttons** → Toggle doors/lights per side (highlighted when active)
- **Monitor button (bottom center)** → Raise/lower security camera map

**Camera Map:**
- **Click any camera button** → View that feed
- **YOU marker** → Current office position (non-interactive)

---

## 🐛 Troubleshooting

**Canvas/graphics not showing?**
- Hard-refresh (Ctrl+Shift+R) — cache issues are common
- Check DevTools F12 → Console for errors

**Three.js error?**
- Ensure `src/js/three.min.js` exists (r152 is bundled locally, not from CDN)
- File is ~600KB; check network tab if missing

**Audio not playing?**
- Drop `.mp3` + `.ogg` files into `src/assets/` with the names above
- Browser autoplay policy may require user gesture first — game starts only after clicking "Night" button

**Door animations look wrong?**
- Check `office3d.js` lines ~32-40 for animation constants:
  - `DOOR_SPRING_K` = stiffness
  - `DOOR_DAMPING` = bounce factor
  - `DOOR_OPEN_Y` / `DOOR_CLOSED_Y` = positions

---

## 🚀 Extending the Game

**Add a new camera feed:**
1. Add key to `CAM_LABELS` in `cameras.js`
2. Implement `drawCamBg(cam, w, h)` case in `cameras.js`
3. Add route to `animatronics[].path[]` in `state.js`
4. Add button to camera grid in `index.html`

**Add new 3D geometry:**
1. Create mesh in `buildRoom()` in `office3d.js`
2. Use `box()` or `new THREE.Mesh()` helper
3. Add material variant (see `mat()` helper)

**Tune door physics:**
- Edit constants at top of `office3d.js` (lines ~32-40)
- Adjust `DOOR_SPRING_K`, `DOOR_DAMPING`, `DOOR_THRESHOLD` for feel

---

## 📝 Notes

- **Three.js r152 is local** — newer releases removed `three.min.js` from npm; we bundle it.
- **No external CDNs used** — fully self-contained (except optional audio files).
- **Performance:** Runs at 60 FPS on modern hardware; animatronic AI updates every 5 seconds to reduce load.

Enjoy!
