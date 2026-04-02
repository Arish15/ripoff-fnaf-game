# FNAF Browser Game — TODO & Fix Plan

Organised by severity. Fix Critical bugs first or the game is essentially non-functional.

---

## ✨ FEATURES TO ADD

Things that don't exist yet and need to be built.

### F1. Foxy Hall Sprint Animation in 3D Office
**File:** `src/js/office3d.js`, `src/js/ai.js`

When Foxy's position is `hallW` (stage 3 of his path, sprinting), the 3D left-hall view should show Foxy running toward the camera. Currently `updateHallAnimatronics()` sets a coloured block for any animatronic in `hallW` — expand this to show a distinct Foxy sprite/mesh moving toward the player when he's mid-sprint.

---

### F2. Jumpscare Animations Per Animatronic
**File:** `src/js/game.js`, `index.html`

Currently `triggerGameOver()` shows one generic flash (`#jumpScare`). Each animatronic should trigger a distinct jumpscare image or animation. Minimum: different coloured overlay per character. Full: individual jumpscare images in `src/assets/` named `jumpscare_bonnie.png`, `jumpscare_chica.png`, etc.

---

### F3. Monitor Raise / Lower Animation
**File:** `src/css/styles.css`, `src/js/game.js`

Toggling the camera monitor instantly snaps it open/closed. Add a CSS transform animation (slide up from bottom) so it feels like lifting a physical tablet, matching the feel of the original game.

---

### F4. Clock / Time Display with AM/PM
**File:** `src/js/game.js` — `updateHUD()`

The HUD shows hour/minute but not clearly as `12 AM`, `1 AM`, `2 AM` … `6 AM`. Add proper 12-hour format. Midnight should display `12 AM`, not `0:00`.

---

### F5. Door / Light Button Sounds
**File:** `src/js/game.js`, `src/assets/`

The door open/close and light toggle should play short click sounds. Already wired to `doorAudio` — just need `door.mp3` / `door.ogg` placed in `src/assets/`. Add a separate `light.mp3` for light toggle if desired.

---

### F6. Breathing / Tension Audio Loop
**File:** `src/js/game.js`, `src/assets/`

Add a looping ambient track (`ambient.mp3`) that starts with `startGame()` and stops on game over / night complete. Pitch or volume can increase as power drops for tension.

---

### F7. Power Outage — Freddy Toreador Jingle + Doorway Appearance
**File:** `src/js/game.js`

After power hits 0, Freddy should:
1. Appear as a silhouette in the doorway (right side) — add a DOM overlay or 3D mesh
2. Play his `freddyjingle.mp3` Toreador song
3. After the song ends (or ~20s), trigger the jumpscare

Currently the game just waits a random 15–25s then jumpscares — the jingle sequence is missing entirely.

---

### F8. Night Intro Overlay ("Night X" Text)
**File:** `src/js/game.js`, `index.html`

At the start of each night, show a full-screen "Night X" title card (white text on black, with TV static effect) that fades away after ~2 seconds before gameplay begins. Matches the original game's night start.

---

### F9. Phone Guy Voice Lines (Night 1–3)
**File:** `src/js/game.js`, `src/assets/`

Nights 1–3 should auto-play a `phonecall_night1.mp3` etc. at the start. The player can still interact while it plays. Just needs audio files and a call to `.play()` in `startGame()` for nights 1–3.

---

### F10. Camera Static / Interference Effect
**File:** `src/js/cameras.js`

Currently cameras draw clean images. Add a periodic scanline / noise overlay drawn on the canvas (fast random pixels) to simulate CCTV static. Could intensify when viewing the Kitchen (which is audio-only in FNAF1).

---

### F11. Office Poster Easter Eggs
**File:** `src/js/office3d.js`

The 3D office walls are bare. Add flat plane meshes with procedurally-drawn or image-textured posters (Freddy's face, "Celebrate!" etc.) on the side walls for atmosphere.

---

### F12. Custom Night Screen (Night 7)
**File:** `index.html`, `src/js/game.js`, `src/js/state.js`

After completing Night 6, unlock a Custom Night where the player sets AI levels 0–20 per animatronic using sliders. Needs a new UI screen and a `startCustomNight(ai)` entry point.

---

### F13. Golden Freddy Easter Egg
**File:** `src/js/cameras.js`, `src/js/game.js`

On Nights 1–2, viewing the Show Stage camera has a ~1-in-2000 chance to show Golden Freddy's face filling the camera. Closing the monitor triggers a special jumpscare. Simple canvas draw + `triggerGameOver('GOLDEN_FREDDY')`.

---

### F14. Newspaper Ending Screen
**File:** `src/js/game.js`, `index.html`

After completing Night 6 (the final story night), show a newspaper clipping overlay (similar to FNAF1's ending) summarizing the pizzeria closure, before the game returns to the menu.

---

---

## 🔴 CRITICAL BUGS

### 1. AI Tick Double-Gating — Animatronics Move Every 250 Seconds
**File:** `src/js/game.js` + `src/js/ai.js`

**Problem:** `tickAnimatronics()` is only called when `game.time - lastAiTick >= 5.0` (once every 5 real-seconds). But **inside** `tickFoxy`, `tickFreddy`, and `tickOther`, the internal counters (`ignoreTicks`, `moveTick`) are designed to be incremented **every 100ms** (each game tick) and tested against thresholds of 50 and 30. Since they're only incremented once every 5 seconds the real intervals become:

| Animatronic | Intended interval | Actual interval |
|---|---|---|
| Bonnie / Chica | ~5 seconds | ~250 seconds |
| Freddy | ~3 seconds | ~150 seconds |
| Foxy `ignoreTicks % 50` | ~5 seconds | ~250 seconds |
| Foxy `preventionTimer` (50–1050) | 5–105 seconds | 250–5250 seconds |

**Fix:** Remove the `if (game.time - lastAiTick >= 5.0)` outer gate from `game.js` and call `tickAnimatronics(ai)` on **every** game tick (i.e., every 100ms). The internal counters already implement the correct authentic timing.

```js
// game.js — change from:
if (game.time - lastAiTick >= 5.0) {
    lastAiTick = game.time;
    tickAnimatronics(ai);
    checkCollisions();
    updateHallAnimatronics();
}

// game.js — change to:
tickAnimatronics(ai);
checkCollisions();
updateHallAnimatronics();
```

Also remove the `lastAiTick` variable entirely once the gate is gone.

---

### 2. Foxy Prevention Timer Also Affected by Double-Gating
**File:** `src/js/ai.js` — `tickFoxy()`

When the outer gate is removed (fix #1), confirm — and if needed fix — that `a.preventionTimer--` decrements at 100ms pace (correct) instead of every 5 seconds. After fix #1 this should be automatically correct.

---

## 🟠 GAMEPLAY BUGS

### 3. Freddy and Chica Share Identical Paths
**File:** `src/js/state.js`

**Problem:** Both `freddy` and `chica` have exactly the same path:
```js
['stage', 'dining', 'stage_right', 'kitchen', 'hallE_corner', 'stage_left', 'office']
```
In FNAF1, Chica does **not** go through the Kitchen — that's Freddy only. Chica's authentic path:
```
Show Stage → Dining Area → Restrooms → E. Hall → E. Hall Corner → Office
```

**Fix in `state.js`:**
```js
chica: {
    path: ['stage', 'dining', 'stage_right', 'hallE', 'hallE_corner', 'office'],
    ...
}
```

---

### 4. Freddy Path Geometry Doesn't Match Map
**File:** `src/js/state.js`

Freddy's current path goes `hallE_corner → stage_left → office`. `stage_left` is named as if it's a stage area but it's actually used as the E. Hall Corner in some code paths. Freddy's authentic route ends at the right door (east side). Verify that the final path nodes route him to `game.doorRight` correctly, not `game.doorLeft`.

In `tickFreddy` the door check uses `game.doorRight` — verify this matches what Chica uses and that the right-side `hallE_corner → office` jump is blocked by `doorRight`.

---

### 5. Bonnie Missing Backstage Visit
**File:** `src/js/state.js`

In FNAF1, Bonnie sometimes visits the Backstage (parts & service room) camera before heading to the west hall. His authentic partial path can include `backstage`. Low priority, but affects camera realism.

---

### 6. In-Night AI Increments Use `game.hour` But Hour Resets Every Night
**File:** `src/js/ai.js` — `tickAnimatronics()`

The increment logic adds bonus AI when `game.hour >= 2`, `>= 3`, etc. But `game.hour` cycles 0–5 across 90 game-time units. Confirm these thresholds are checked against the **current night's** hours (they are, since they fire every tick). This is fine but note that the increments are applied cumulatively **every tick**, not once per hour — so the effective AI at 4AM is `base + 3` for Bonnie every single tick, which is intended.

---

## 🟡 CAMERA SYSTEM

### 7. Wrong Camera Labels (CAM key → display name mismatch)
**File:** `src/js/cameras.js` — `CAM_LABELS`

Current mapping vs. authentic FNAF1 map:

| Code key | Current label | Correct label |
|---|---|---|
| `hallE` | `CAM 3 - SUPPLY CLOSET` | `CAM 3 - E. HALL` (Supply Closet is a distinct room) |
| `hallW` | `CAM 2A - W. HALL` | `CAM 2A - W. HALL` ✓ |
| `hallW_corner` | `CAM 2B - W. HALL CORNER` | `CAM 4A - W. HALL CORNER` |
| `hallE_corner` | `CAM 4A - E. HALL` | `CAM 4B - E. HALL CORNER` |
| `stage_left` | `CAM 4B - E. HALL CORNER` | (see path confusion in bug #4) |
| `kitchen` | `CAM 6 - KITCHEN` | `CAM 4B - KITCHEN` (audio-only in original) |
| `backstage` | `CAM 5 - BACKSTAGE` | `CAM 5 - BACKSTAGE` ✓ |

Authenic FNAF1 camera list:
- 1A Show Stage, 1B Dining Area, 1C Pirate Cove
- 2A W. Hall, 2B W. Hall Corner (left branch)  
- 3 Supply Closet (a small dead-end room; not on main path)
- 4A E. Hall, 4B E. Hall Corner (right branch, Freddy/Chica approach)
- 5 Backstage, 6 Kitchen, 7 Restrooms

---

### 8. Animatronics Not Visible in Most Camera Feeds
**File:** `src/js/cameras.js` — `drawCamBg()`

Only Foxy's pirate cove stages are drawn. All other cameras (stage, dining, hallW, hallE, etc.) show static backgrounds with no animatronic placement. When an animatronic's `path[pos]` matches the camera key, draw a simple silhouette/sprite for that character.

**Implementation pattern:**
```js
// At top of drawCamBg, after drawing background:
function drawAnimatronicOnCam(cam, w, h) {
    Object.keys(animatronics).forEach(function(key) {
        var a = animatronics[key];
        if (key === 'foxy') return; // foxy handled separately
        if (a.path[a.pos] === cam) {
            drawAnimatronicSilhouette(key, a.color, w, h);
        }
    });
}
```

Priority order (most useful):
1. Show Stage (Freddy/Bonnie/Chica all start here)
2. Dining Area
3. Hallway cameras (Bonnie in W. Hall, Freddy in E. Hall)

---

### 9. Kitchen Camera Should Be Static Noise Only
**File:** `src/js/cameras.js`

In FNAF1 the Kitchen camera is audio-only — it shows static but plays a loud clattering sound. Make the kitchen feed be pure noise/static and optionally play an audio cue.

---

## 🟢 POLISH / NICE-TO-HAVE

### 10. No Ambient Audio
**Assets needed in `src/assets/`:**

| Sound | When | Description |
|---|---|---|
| `ambient.mp3` | Continuously during night | Low office hum / ventilation |
| `freddyjingle.mp3` | After power outage | Freddy's "Toreador" music box jingle before attack |
| `foxyrun.mp3` | When Foxy is in `hallW` | Metallic running/thudding footsteps |
| `freddy_laugh.mp3` | Randomly when Freddy advances | Audio cue only — no camera |

---

### 11. No Night-Start Intro Overlay
**File:** `index.html` / `src/js/game.js`

FNAF1 displays a "Night X" text overlay with static when a night begins. Add a brief 2-second fade-in overlay in `startGame()` before the loop starts.

---

### 12. Power Outage — No Freddy Jingle Before Jumpscare
**File:** `src/js/game.js` — power outage block

Currently the game waits `powerOutageDelay` seconds (15–25s) and then immediately calls `triggerGameOver('FREDDY')`. In FNAF1, Freddy first appears in the doorway, plays his jingle, and THEN attacks. Add:
1. ~10s into outage: show Freddy silhouette in door
2. Play jingle audio `freddyjingle` (looping if needed)  
3. After jingle ends or ~20s: trigger jumpscare

---

### 13. No Custom Night (Night 7) Support
Not in FNAF1 itself but if desired: allow player to set 0–20 AI for each animatronic after completing Night 6. Would need a new UI screen.

---

### 14. Golden Freddy Easter Egg
In FNAF1, viewing the Show Stage camera on Night 1/2 has a rare (~0.05%) chance to show Golden Freddy's head and trigger a jumpscare. Not critical but adds authenticity.

---

## 📋 TASK PRIORITY ORDER

1. **Fix #1** — AI tick timing (makes all animatronics functional)
2. **Fix #3** — Chica's path (wrong character shares Freddy's route)
3. **Fix #7** — Camera labels (visual correctness)
4. **Fix #8** — Animatronics in cameras (core gameplay feedback loop)
5. **Fix #9** — Kitchen static (easy win)
6. **Fix #10** — Ambient audio (feel)
7. **Fix #2** — Verify timer after fix #1
8. **Fix #4** — Freddy path geometry (when paths are better understood)
9. **Fix #12** — Power outage Freddy sequence
10. **Rest** — Polish items

---

## Quick Reference — Authentic FNAF1 AI (Ticks at 100ms)

```
Bonnie:  roll every 50 ticks (5s).  No monitor restriction.
Chica:   roll every 50 ticks (5s).  No monitor restriction.
Freddy:  roll every 30 ticks (3s).  Monitor must be DOWN. Waits for Bonnie+Chica to leave stage.
Foxy:    roll every 50 ticks (5s).  Monitor must be DOWN. 50–1050 tick grace after monitor lowered.
         Viewing CAM 1C on first frame pushes Foxy back 1 stage.
```

Night base AI values (from decompiled CF2.5 source on the Night 7 wiki page):
```
Night 1: F=0  B=0  C=0  Fo=0
Night 2: F=0  B=3  C=1  Fo=1   + in-night increments
Night 3: F=1  B=0  C=5  Fo=2
Night 4: F=1  B=2  C=4  Fo=6   (Freddy randomized 1 or 2)
Night 5: F=3  B=5  C=7  Fo=5
Night 6: F=4  B=10 C=12 Fo=6
```

## SMALL BUT IMPORTANT THING!!!!
Research cam layout (things that you click on) and fix it, open up a website and test it, make sure the cam layout is correct, if not fix it, if it is correct, then good job, you can move on to the next task. Use the original game as a reference, and make sure the cam layout matches it exactly. This is important for player immersion and authenticity. also use a side by side comparison to make sure the cam layout is correct, if it is not correct, then fix it, if it is correct then good job, you have finished this task, you can move on to the next one. Remember to test the cam layout on different screen sizes and resolutions to ensure it looks good on all devices. This is a crucial step in the development process, so take your time and make sure it's done right!