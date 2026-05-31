# FNAF1 Browser Recreation

A faithful recreation of Five Nights at Freddy's 1 in plain HTML5/CSS/JavaScript with Three.js 3D graphics, procedural door textures, spring-physics animations, and full FNAF1 gameplay mechanics.

---

## ? Quick Start

```bash
node server.js              # starts http://localhost:8000
# OR
python -m http.server 8000  # Python alternative
```

Open **http://localhost:8000** in your browser. Hard-refresh (Ctrl+Shift+R) after any code change � `Cache-Control: no-cache` is set on all responses.

---

## ?? Features

### Rendering
- **3D Office** (Three.js r152)  First-person view with smooth head-turn camera, fog, and dynamic lighting
- **FNAF1-accurate atmosphere**  Warm tan-beige walls, tight dark fog, CELEBRATE party banner with streamers and children's drawings
- **Procedural Door Textures**  Gunmetal blast doors with rivets, hazard stripes, panel insets, and scratches; generated as canvas textures at runtime
- **Spring-Physics Door Animations**  Doors animate downward on close (subtle bounce overshoot) and retract upward on open
- **Hall Animatronics**  Real-time coloured silhouettes in the left/right hallways via `setHallLeft` / `setHallRight`
- **Camera Monitor System** � 2D canvas overlay with 11 distinct camera feeds matching FNAF1 building layout

### Gameplay
- **6 Story Nights** with escalating AI + a **Custom Night** (Night 7) with per-animatronic sliders
- **Power Management** � Lights, doors, and camera monitor each drain power; reaches 0% ? power outage
- **Power Outage Sequence** � Instant blackout via `#powerDarkOverlay`, then Freddy jumpscare triggers after ~1 second
- **Per-character Jumpscares** � Unique animated asset per animatronic, timed to the animation's exact duration (plays once only)
- **Door Linger System** � Animatronics wait at the doorway for random cycles before forcing entry; door blocks entry and sends them back
- **Foxy Mechanic** � Checking Cam 1C too often or too rarely triggers a hallway sprint
- **Golden Freddy Easter Egg** � Enter 1/9/8/7 on Custom Night sliders for an instant jumpscare
- **Night Progression** � Survive to 6:00 AM, unlock the next night; star system tracks 3-star completion
- **Window Scare** � Animatronic arriving at a lit hallway door triggers a brief jump effect
- **Hallucination Overlay** � Random visual hallucination flicker on higher-difficulty nights
- **Phone Guy Messages** � Full canonical voice-over scripts per night (typewriter text display)
- **Audio System** � Ambient tension audio, door/light SFX, garble sounds on animatronic movement, jumpscare audio, night completion jingle

### Custom Night
- Per-animatronic AI sliders (0�20)
- Preset buttons: Cupcake Challenge, Foxy Foxy, New & Improved, Night of Misfits, Golden Freddy
- 20/20/20/20 completion awards third star and saves to `localStorage`

---

## ?? Project Structure

```
fnaf/
+-- index.html              # Main entry point � all HTML, inline button onclick wiring
+-- server.js               # Node.js static file server (no Express)
+-- src/
�   +-- js/
�   �   +-- office3d.js     # Three.js 3D office rendering + door physics + hall animatronics
�   �   +-- game.js         # Main game loop, power, HUD, triggerGameOver, startGame
�   �   +-- cameras.js      # 11-camera feed rendering (2D canvas)
�   �   +-- ai.js           # Animatronic AI: tickFreddy, tickFoxy, tickOther, checkCollisions
�   �   +-- state.js        # Shared game state, animatronic definitions, NIGHT_AI table
�   �   +-- assets.js       # Asset preloader (png ? jpg ? jpeg ? svg fallback)
�   �   +-- extras.js       # Phone Guy, Custom Night, Stars, Hallucinations, Freddy Laugh
�   �   +-- three.min.js    # Three.js r152 (bundled locally � newer releases removed this file)
�   �   +-- office.js       # Legacy 2D office renderer (disabled; kept for compatibility)
�   +-- css/
�   �   +-- styles.css      # Game HUD, camera grid, jumpscare, power outage, night screens
�   �   +-- office.css      # Office-specific overlays (Golden Freddy, hallucination, etc.)
�   +-- html/
�   �   +-- header.html     # Unused template fragment
�   +-- assets/             # Audio + image files (drop-in, game fails silently if missing)
+-- README.md
+-- GEMINI.md               # Architecture reference for AI assistants
```

---

## ?? Visual Details

### FNAF1 Office Environment
- **Wall colours:** Warm tan-beige back wall (`#c4b080`) and medium tan side walls
- **CELEBRATE banner:** Purple/lavender bar across the back wall with 9 yellow letter blocks, coloured hanging streamers, and children's drawings below
- **Fog:** Dark (`#0e0c08`), near 14 ? far 26 units for a claustrophobic feel
- **Warm overhead light:** Yellow-tinted directional + ambient emulating a single ceiling bulb

### Jumpscares

Each jumpscare asset plays **once** � animated WebPs have their ANIM loop count set to 1, and the CSS shake iteration count matches the animation duration so the shake ends when the image finishes.

| Character | Asset | Scare duration |
|-----------|-------|---------------|
| Freddy | `freddy_jumpscare.webp` | 2800 ms |
| Bonnie | `bonnie_jumpscare.webp` | 1400 ms |
| Chica | `chica_jumpscare.webp` | 1800 ms |
| Foxy | `foxy_jumpscare.gif` | 2000 ms |
| Freddy (power out) | `freddy_jumpscare_power.gif` | 2400 ms |
| Golden Freddy | `golden_freddy.webp` | 4500 ms |

### Power Outage
1. Power hits 0% ? doors/lights off, monitor forced closed, `#powerDarkOverlay` fades in instantly
2. 0.8�1.3 s of total darkness
3. Freddy power-outage jumpscare triggers; game over screen follows

### Door Textures (Procedural Canvas)
- Dark gunmetal base with per-pixel noise grain
- 4 recessed panels with inset shadows and bevel shading
- Horizontal separator ridges with centre grooves and specular highlights
- 16 rivets (4 columns � 3 rows) with radial gradients and specular glints
- Scratch marks for wear
- Yellow/black diagonal hazard stripe at the bottom
- Paired greyscale bump map for directional-light depth

### Door Animations (Spring Physics)
- **Close:** Spring pulls door downward to `DOOR_CLOSED_Y` with overshoot + damped bounce
- **Open:** Spring retracts door upward past `DOOR_OPEN_Y`; mesh hidden once fully retracted
- Constants at top of `office3d.js`: `DOOR_SPRING_K` (stiffness), `DOOR_DAMPING`, `DOOR_THRESHOLD`

### Camera Map
- SVG floor plan (`src/assets/camera_map.svg`) matches the FNAF1 building topology
- 11 invisible HTML overlay buttons � `border` shows on hover/active
- Active camera highlighted green with glow
- YOU marker shows office location

---

## ?? Architecture � Two Rendering Layers

| Layer | File | Renders |
|-------|------|---------|
| **3D Office (WebGL)** | `office3d.js` | First-person POV � walls, desk, doors, hall lights, animatronic silhouettes |
| **2D Camera Monitor** | `cameras.js` | 11 security camera feeds drawn to `<canvas id="cameraCanvas">` |

`#officeArea` (z-index 60) is full-screen and contains the Three.js canvas. It is shown when `monitorOpen === false` and hidden when the monitor is raised.

### `window.office3d` API
```javascript
window.office3d.init()                 // Call once at DOMContentLoaded (or startGame)
window.office3d.setMouse(normX)        // 0..1 � drives camera Y-rotation (�35�)
window.office3d.setDoorLeft(closed)    // true = close left door
window.office3d.setDoorRight(closed)   // true = close right door
window.office3d.setLightLeft(on)       // Toggle left hall light visibility
window.office3d.setLightRight(on)      // Toggle right hall light visibility
window.office3d.setHallLeft(color)     // Animatronic silhouette in left hall (null = clear)
window.office3d.setHallRight(color)    // Animatronic silhouette in right hall
window.office3d.show() / .hide()       // Toggle office visibility
window.office3d.resize()               // Call on window resize
```

### Game Loop
`setInterval(tickGame, 100)` � 10 ticks/second. Each tick:
1. Advance `game.time`, drain power
2. Check power outage condition
3. Check Golden Freddy timer
4. `tickAnimatronics(ai)` ? `tickFreddy`, `tickFoxy`, `tickOther` per animatronic
5. `checkCollisions()` � any animatronic at `'office'` ? `triggerGameOver`
6. `updateHallAnimatronics()` � sync hall silhouette meshes
7. HUD update; check 6:00 AM win condition

### Game Over Safety
`triggerGameOver` is guarded by both `game.running` and a `gameOverTriggered` boolean flag in `state.js` so simultaneous collision + power-outage events cannot double-fire. Any pending game-over `setTimeout` is cancelled and nulled whenever `startGame` or `returnToStart` is called.

---

## ?? Audio Assets

Drop files into `src/assets/` � `.play().catch()` ensures missing files fail silently.

| Element ID | Expected File | Triggered By |
|-----------|--------------|-------------|
| `ambientAudio` | `ambient.mp3` | Continuous gameplay; volume rises as power drains |
| `doorAudio` | `door.mp3` | Door toggle |
| `lightSwitchAudio` | `lightswitch.mp3` | Light button press |
| `jumpScareAudio` | `jumpscare.mp3` | Game over (Freddy, Bonnie, Chica, Foxy) |
| `goldenFreddyScareAudio` | `golden_freddy.ogg` | Golden Freddy easter egg |
| `powerOutAudio` | `powerout.mp3` | Power reaches 0% |
| `successAudio` | `success.mp3` | Survive to 6:00 AM |
| `foxyRunAudio` | `foxyrun.mp3` | Foxy sprint phase |
| `foxySprintAudio` | `foxy_sprint.mp3` | Foxy reaching hallway |
| `freddyJingleAudio` | `freddyjingle.mp3` | Freddy hallway jingle |
| `freddyLaughAudio` | `freddylaugh.mp3` | Random Freddy laugh event |
| `garble1Audio` / `garble2Audio` | `garble1.mp3` / `garble2.mp3` | Animatronic moves while monitor is open |
| `windowScareAudio` | `windowscare.mp3` | Animatronic arrives at lit doorway |
| `lightHumAudio` | `ACTUAL_LIGHT_SOUND.mp3` | Hall light active |
| `camStaticAudio` | `camstatic.mp3` | Camera static |

---

## ?? Controls

**Office View:**
- **Mouse drag left/right** � Turn head (camera pans �35�)
- **Left/right wall buttons** � Toggle door and light per side
- **Monitor button (bottom center)** � Raise/lower security camera map

**Camera Map (monitor raised):**
- **Click any camera label** � Switch to that feed
- **YOU marker** � Current office position (non-interactive)

---

## ?? Extending the Game

**Add a new animatronic:**
1. Add entry to `animatronics` in `state.js` with `path[]`, `name`, `color`
2. Add AI levels to `NIGHT_AI` in `state.js`
3. Add a tick function (or reuse `tickOther`) in `ai.js`; call it from `tickAnimatronics`
4. Add a jumpscare asset and handle its `msg` string in `triggerGameOver` in `game.js`

**Add a new camera feed:**
1. Add key + label to `CAM_LABELS` in `cameras.js`
2. Add a `drawCamBg` case in `cameras.js`
3. Add an overlay button inside `#cameraGrid` in `index.html`
4. Add the key to the animatronic `path[]` in `state.js`

**Add new 3D geometry:**
1. Create mesh inside `buildRoom()` in `office3d.js` using the `mesh(geo, mat)` helper
2. Materials defined near the top of the IIFE in `office3d.js`

**Tune door physics:**
- Edit `DOOR_SPRING_K`, `DOOR_DAMPING`, `DOOR_THRESHOLD`, `DOOR_OPEN_Y`, `DOOR_CLOSED_Y` at the top of `office3d.js`

---

## ?? Troubleshooting

**Graphics not showing / blank screen:**
- Hard-refresh (Ctrl+Shift+R) � cache is the most common cause
- F12 ? Console for JS errors; Network tab to confirm `three.min.js` loaded

**Three.js error:**
- `src/js/three.min.js` must exist � it is r152, bundled locally
- Do not replace with a CDN URL without verifying the file path exists for that release

**Audio not playing:**
- Drop `.mp3` files into `src/assets/` with the exact names from the table above
- Browser autoplay requires a user gesture; audio starts after the first button click

**Jumpscares repeating / looping:**
- The animated WebP files (`freddy_jumpscare.webp`, `bonnie_jumpscare.webp`, `chica_jumpscare.webp`) must have ANIM loop count = `1`
- If you replace an asset, patch the loop count via Node: `buf.writeUInt16LE(1, animChunkOffset + 12)`

**Game over fires twice:**
- `triggerGameOver` is guarded by `gameOverTriggered` in `state.js` � do not remove this flag

**Door animations look wrong:**
- Check constants at top of `office3d.js`: `DOOR_SPRING_K`, `DOOR_DAMPING`, `DOOR_OPEN_Y` / `DOOR_CLOSED_Y`

---

## ?? Notes

- **Three.js r152 is local** � newer releases removed `three.min.js` from npm; do not switch to a CDN without verifying the URL.
- **No external CDNs** � fully self-contained; only `node server.js` needed.
- **AI ticks roughly every 3�5 seconds** per animatronic to match original FNAF1 timing.
- **Progress saved to `localStorage`** � unlocked nights and star achievements persist across sessions.
