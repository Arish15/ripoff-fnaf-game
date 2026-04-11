# FNAF 1 Office — Complete AI Mastery Guide for Next Agent

## Executive Summary
This document contains all intricate details needed for an AI agent to fully understand, extend, debug, or reimplement the FNAF 1 browser-based office security game. It covers every game system: rendering, AI, audio, UI, collision detection, power management, all 6 nights, special events, Easter eggs, and edge cases including power-outage darkness mechanics.

---

## SECTION 1: GAME ARCHITECTURE OVERVIEW

### 1.1 Two-Layer Rendering System
The game has **two independent rendering systems that must remain in sync**:

| System | File | Renderer | Coverage |
|--------|------|----------|----------|
| **3D Office** | `src/js/office3d.js` | Three.js r152 (WebGL) | First-person view: walls, doors, desk, lighting, fog, ceiling fan |
| **2D Security Monitor** | `src/js/game.js` (drawCamera) | Canvas 2D | 11 security camera feeds; drawn procedurally |

**Z-Index Layering:**
- z-50: `#gameContainer` (camera monitor + HTML control panels)
- z-60: `#officeArea` (Three.js canvas) — shown when `monitorOpen === false`
- z-65: `.office-vignette` (screen edge fade)
- z-80: `.office-btn` (door/light wall buttons) — visible based on camera head-turn
- z-90+: HUD overlays (power gauge, time display, game-over screens, night intro card)

### 1.2 Game State Management
**Single Global State Object** (`var game` in state.js):
```javascript
{
    running: boolean,          // game active flag
    currentNight: 1-7,         // night number (1-6 story, 7 custom)
    time: 0-540*,              // accumulated game ticks (100ms each)
    hour: 0-5,                 // 12 AM → 6 AM
    minute: 0-59,
    power: 0-100,              // battery percent
    doorLeft: boolean,         // west door closed?
    doorRight: boolean,        // east door closed?
    lightLeft: boolean,        // west hall lights on?
    lightRight: boolean,       // east hall lights on?
    currentCam: string,        // active camera key (11 options)
    lastCam: string,
    powerOutage: boolean,      // triggered at power = 0%
    powerOutageTime: number,
    powerOutageDelay: number   // random 0.8-1.3s before Freddy jumpscare
}
```
*Note: 540 ticks ÷ 9 ticks/minute = 60 minutes; 60 minutes ÷ 10 ticks/hour = game runs 6 hours (12 AM - 6 AM)*

### 1.3 Game Loop Timing
**Main Loop**: `tickGame()` runs every 100ms via `setInterval(tickGame, 100)`
- Each tick accounts for 0.1 in-game time units
- 1 in-game hour = 90 time units = 15 loop ticks (9000ms ≈ 2.5 real-world seconds)
- Full night: 540 time units = 5 hours 24 minutes ÷ 90 = 6 hours in-game = 90 real-time ticks

**AI Tick Windows** (in-game time, NOT loop ticks):
- Freddy: rolls every 30 ticks = every 3 seconds
- Bonnie/Chica: roll every 50 ticks = every 5 seconds  
- Foxy: rolls every 50 ticks = every 5 seconds (grace period dependent)

---

## SECTION 2: POWER MANAGEMENT SYSTEM

### 2.1 Power Drain Per Tick (0.1 game time unit = 100ms real-time)
Base drain: **0.01% per tick** (game always drains when running)
- Light Left ON: +0.01% drain
- Light Right ON: +0.01% drain
- Door Left CLOSED: +0.01% drain
- Door Right CLOSED: +0.01% drain
- Monitor OPEN: +0.01% drain

**Maximum drain per tick**: 0.06% (all systems active)
**Minimum drain per tick**: 0.01% (idle state)

#### Power drain formula per tick:
```
drain = 0.01 + (lightLeft ? 0.01 : 0) + (lightRight ? 0.01 : 0) 
        + (doorLeft ? 0.01 : 0) + (doorRight ? 0.01 : 0) + (monitorOpen ? 0.01 : 0)
power = Math.max(0, power - drain)
```

### 2.2 Power Outage Sequence (CRITICAL DARKNESS MECHANIC)

**Trigger**: When `game.power <= 0` and `!game.powerOutage`

**Immediate Actions** (happen instantly at power=0):
1. Set `game.powerOutage = true`
2. Record `game.powerOutageTime = game.time`
3. **Force doors open**: `game.doorLeft = game.doorRight = false`
4. **Force lights off**: `game.lightLeft = game.lightRight = false`
5. **Close monitor forcibly**: Any open camera grid is hidden, buttons grayed out
6. Call `window.office3d.setDoorLeft/Right/setLight*` methods to sync 3D view
7. Gray out door/light buttons (add `disabled` class) — players cannot re-engage systems
8. Disable camera toggle button
9. **Play power-out audio** (`#powerOutAudio`)
10. **Activate dark overlay** (`#powerDarkOverlay`) with CSS class `show` — fades to complete black in 0.4s

**Darkness State** (player sees pure black screen):
- Screen stays black until Freddy jumpscare
- No 3D office view visible
- No camera monitor visible
- No HUD elements visible (except death message)
- Freddy jumpscare is ONLY the silhouette version (`freddy_jumpscare_power.gif`)

**Delayed Freddy Attack**:
1. `game.powerOutageDelay` is set to random value: `0.8 + Math.random() * 0.5` (0.8-1.3s)
2. In subsequent ticks, elapsed time is calculated: `elapsed = game.time - game.powerOutageTime`
3. When `elapsed >= powerOutageDelay`, immediately call:
   ```javascript
   triggerGameOver('FREDDY_POWER');
   ```
4. This applies `scare-freddy-power` class and shows the power-outage jumpscare asset
5. Scare duration: 1100ms (specific to power-outage jumpscare timing)

**Jumpscare Timing – Per-Character**:
| Character | Class | Asset | Animation | Hold | Total Duration |
|-----------|-------|-------|-----------|------|----------------|
| Freddy (normal) | `scare-freddy` | freddy_jumpscare.webp | 1400ms | 1700ms |
| Freddy (power) | `scare-freddy-power` | freddy_jumpscare_power.gif | 840ms | 1100ms |
| Bonnie | `scare-bonnie` | bonnie_jumpscare.webp | 320ms | 600ms |
| Chica | `scare-chica` | chica_jumpscare.webp | 600ms | 900ms |
| Foxy | `scare-foxy` | foxy_jumpscare.gif | 900ms | 1150ms |
| Golden Freddy | `scare-golden` | golden_freddy.webp | static | 1400ms |

### 2.3 Ambient Audio Tension Scaling
As power decreases, ambient audio volume increases to build tension:
```javascript
ambient.volume = Math.min(1.0, 0.3 + (1 - game.power / 100) * 0.5)
```
- At 100% power: volume = 0.3 (baseline tone)
- At 0% power: volume = 0.8 (maximum before silence transition to darkness)

---

## SECTION 3: DOOR MECHANICS (3D & VISUAL)

### 3.1 Door System Architecture
**Two independently controlled doors**:
- Door Left (West): blocks Bonnie+Foxy entrance, consumes power when closed
- Door Right (East): blocks Freddy+Chica entrance, consumes power when closed

**3D Door Rendering** (office3d.js):
Each door is a Three.js mesh with procedurally generated canvas texture:

**Canvas Texture Properties**:
- Size: 256×512 pixels
- **Diffuse Map**: gunmetal grey (#3c3c3c base) with per-pixel noise grain
- **Bump Map**: raises outer border frame, recessed 4-panel design with bevels
- **Material**: THREE.MeshStandardMaterial with normal map (bumpiness)

**Door Texture Details**:
- **Outer Frame**: 9px black border (#242424), appears raised with specular highlight
- **4 Recessed Panels**: separated by 11px ridges, shadow+bevel shading
- **Panel Insets**: 8px margin, dark shadow + bright top-left edge bevel
- **Hazard Stripe Zone**: 48px yellow-red diagonal stripes at bottom (not always visible depending on angle)
- **Rivets**: small circles across frame (detail) using noise pattern
- **Scratches**: simulated via procedural noise and per-pixel variation

### 3.2 Spring-Physics Door Animation
Doors animate smoothly using spring physics:
```javascript
var doorAnimLeft = {
    pos: 0.0,      // 0 = fully open, 1 = fully closed
    vel: 0.0,      // velocity
    target: 0.0    // target state: 0 (open) or 1 (closed)
};

// Physics constants
DOOR_SPRING_K = 0.075;        // spring stiffness (low = sluggish, high = snappy)
DOOR_DAMPING = 0.26;          // friction (0.26 allows slight bounce overshoot)
DOOR_THRESHOLD = 0.0007;      // snap-to-end threshold
DOOR_OPEN_Y = 12.0;           // Y position when fully retracted (above ceiling)
DOOR_CLOSED_Y = 4.0;          // Y position when fully lowered (~chest height)
```

**Physics Update Per Render Frame**:
```javascript
vel = vel - (pos - target) * K;    // spring force
vel = vel * (1 - DAMPING);         // friction
pos = pos + vel;                   // integrate

if (Math.abs(pos - target) < THRESHOLD) pos = target;  // snap to end

yActual = DOOR_CLOSED_Y + pos * (DOOR_OPEN_Y - DOOR_CLOSED_Y);
```

**Result**: Doors accelerate downward when closing, decelerate as they approach (spring effect), and bounce slightly past the target due to damping < 1.0, then settle via spring force pulling them back.

### 3.3 Door Control & Animatronic Interaction
**Toggle Mechanism** (`toggleDoor(side)` where side = 'left'|'right'):
1. Flip the boolean in game state
2. Update button UI (toggle `active` class)
3. Play door audio immediately
4. Call corresponding `window.office3d.setDoorLeft/Right(isClosed)` to update 3D model
5. Door physics state updates on next animation frame

**Animatronic Blocking**:
- If an animatronic is at `hallW_corner` or `hallW` (left side) and Bonnie/Foxy tries to move to `office`, they are blocked if `game.doorLeft === true` (door closed)
- Similarly for right side with `hallE_corner` or `hallE`
- If door is open when animatronic reaches corner, they advance to `office` → **instant jumpscare**
- If door is closed, animatronic is blocked and must wait for door to open

**Freddy Special Interaction** (corner-specific):
- Freddy at `hallE_corner`: **always forces through** even if door is closed → no blocking
- Freddy at other positions: normal blocking rules apply

### 3.4 Door Material Swap (Visual Feedback)
- `MAT_DOOR_OPEN` (0x010101): almost black, nearly invisible in shadow
- `MAT_DOOR_CLOSED` (0x606060): medium grey, clearly visible

Material swaps instantly when toggleDoor is called; animation handles the Y-axis movement.

---

## SECTION 4: LIGHTING SYSTEM (3D & 2D)

### 4.1 3D Hall Lighting
**Two independently controlled hall lights**:
- **Light Left** (`hallLightLeft`): illuminates west hall aperture
- **Light Right** (`hallLightRight`): illuminates east hall aperture

**Lighting States**:
- **OFF**: aperture is completely dark, no light spill into office, animatronics cannot be seen in shadow
- **ON**: aperture emits warm yellow-white glow, reveals animatronics clearly if present

**3D Lighting Implementation**:
- Each hall has a THREE.PointLight or THREE.SpotLight that is enabled/disabled based on state
- Light color: warm yellowish (~0xffdd88 or similar warm white)
- Light intensity: ~1.2 when on, 0 when off
- Lights cast no shadows (performance optimization)

### 4.2 Light Toggling
`toggleLight(side)` where side = 'left'|'right':
1. Flip boolean in game state
2. Update button UI (toggle `active` class)
3. Play door audio (reuses same SFX)
4. Call `window.office3d.setLightLeft/Right(isOn)`
5. Affects power drain immediately on next tick

### 4.3 Hall Animatronic Visualization
When an animatronic is in hallW/hallW_corner or hallE/hallE_corner:
- `updateHallAnimatronics()` is called each tick
- Finds which animatronic (if any) is in left/right hall position
- Calls `window.office3d.setHallLeft/Right(animatronicColorOrNull)`
- 3D renderer draws colored floor/wall glow representing the animatronic presence
- Light state determines how visible this glow is

**Hall Aperture Colors** (matching animatronic palette):
- Freddy: `#c8843a` (golden brown)
- Bonnie: `#9b59b6` (purple)
- Chica: `#f1c40f` (yellow)
- Foxy: `#e74c3c` (red)

---

## SECTION 5: ANIMATRONIC AI SYSTEM

### 5.1 Animatronic Structure (state.js)
```javascript
var animatronics = {
    freddy: {
        name: 'Freddy',
        color: '#c8843a',
        pos: 0,                           // index in path[]
        path: ['stage', 'dining', 'stage_right', 'kitchen', 'hallE', 'hallE_corner', 'office'],
        ai: 0,                            // current effective AI level (0-20)
        moveTick: 0,                      // counter for tick-based movement window
        _n4roll: 0                        // Night 4 randomization (1 or 2)
    },
    bonnie: {
        name: 'Bonnie',
        color: '#9b59b6',
        pos: 0,
        path: ['stage', 'backstage', 'dining', 'stage_left', 'hallW', 'hallW_corner', 'office'],
        ai: 0,
        moveTick: 0
    },
    chica: {
        name: 'Chica',
        color: '#f1c40f',
        pos: 0,
        path: ['stage', 'dining', 'stage_right', 'kitchen', 'hallE', 'hallE_corner', 'office'],
        ai: 0,
        moveTick: 0
    },
    foxy: {
        name: 'Foxy',
        color: '#e74c3c',
        pos: 0,
        // Special path: 0-2 = pirate phases (curtain states), 3 = sprint down hall, 4 = office attack
        path: ['pirate', 'pirate', 'pirate', 'hallW', 'office'],
        ai: 0,
        moveTick: 0,
        // Foxy-specific fields:
        ignoreTicks: 0,                   // countdown for movement window after grace period
        preventionTimer: 0,               // grace period (50-1050 ticks) after monitor lowered
        wasWatchingCam1c: false,          // tracks whether pirate cam was previous frame
        wasMonitorOpen: false             // tracks whether monitor was open previous frame
    }
};
```

### 5.2 Base AI Levels by Night (NIGHT_AI)
**Source**: Decompiled FNAF1 game code (Clickteam Fusion 2.5)

| Night | Freddy | Bonnie | Chica | Foxy | Notes |
|-------|--------|--------|-------|------|-------|
| 1 | 0 | 0 | 0 | 0 | Tutorial — all inactive |
| 2 | 0 | 3 | 1 | 1 | Bonnie wakes up |
| 3 | 1 | 0 | 5 | **2** | Big jump; Chica very active; Foxy starts |
| 4 | **1-2*** | 2 | 4 | 6 | Freddy random (50/50); Foxy at 6 |
| 5 | 3 | 5 | 7 | 5 | Escalation begins |
| 6 | 4 | 10 | 12 | 6 | Final night; Bonnie peaks |
| 7 | - | - | - | - | Custom Night (player-set via sliders 0-20) |

**Notes**:
- Night 4 Freddy has 50% chance to be AI 1 or 2 — decided at game start: `_n4roll = Math.random() < 0.5 ? 1 : 2`
- Night 7 (Custom Night) uses slider values directly, no increments

### 5.3 In-Night AI Increments (Story Nights Only)
Applied **per hour** on top of base values:

| Time | Bonnie | Chica | Foxy | Freddy |
|------|--------|-------|------|--------|
| 12 AM (start) | base | base | base | base |
| 2 AM | base+1 | base | base | base (no change) |
| 3 AM | base+2 | base+1 | base+1 | base (no change) |
| 4 AM | base+3 | base+2 | base+2 | base (no change) |
| 5 AM+ | capped at max+3 | capped at max+2 | capped at max+2 | no change |

**AI Increment Logic** (ai.js `tickAnimatronics`):
```javascript
effectiveAi = {
    freddy: (game.hour === 4 && !_n4roll) ? (_n4roll = randomChoice(1,2)) : baseAi.freddy,
    bonnie: Math.min(20, baseAi.bonnie + (hr>=2?1:0) + (hr>=3?1:0) + (hr>=4?1:0)),
    chica: Math.min(20, baseAi.chica + (hr>=3?1:0) + (hr>=4?1:0)),
    foxy: Math.min(20, baseAi.foxy + (hr>=3?1:0) + (hr>=4?1:0))
};
```

### 5.4 Movement Roll Mechanics (Core AI Logic)

**Every tick**, Bonnie/Chica/Foxy roll: `if (Math.random() * 20 < ai_level) { advance_one_path_node }`

This means:
- AI 0: never advances (0/20 = 0% chance)
- AI 1: 5% chance per roll
- AI 5: 25% chance per roll
- AI 10: 50% chance per roll
- AI 20: always advances (20/20 = 100% chance)

**Freddy** rolls every 30 ticks (less frequently) and only moves when monitor is down.

### 5.5 Freddy AI (Special Behavior)

**Activation Rule**: AI must be `> 0` to move

**Monitor Dependency**: Freddy ONLY moves when `!monitorOpen`

**Blocking at Safe Room (pos=0)**:
- Cannot leave the show stage until **both Bonnie AND Chica have moved** (pos > 0)
- This prevents Freddy from reaching office while his co-performers are still on stage
- Implements the "one at a time" escalation feeling from FNAF1

**Corner Logic**:
- When at `hallE_corner`, Freddy **forces through** unless right door is closed
- If door is closed at corner: cannot advance
- If door is open: advances immediately to `office` → instant jumpscare

**Movement Window**: Every 30 game ticks (~3 seconds real-time)
1. Check if monitor open → return (skip this window if camera is on)
2. Roll rand(0-19) < ai
3. If succeeds AND not at corner, move one path node
4. If at corner, check door state

### 5.6 Bonnie & Chica AI (Unified Behavior)

**No monitor restriction** — they move regardless of camera state

**Movement Window**: Every 50 game ticks (~5 seconds real-time)
1. Roll rand(0-19) < ai
2. If succeeds AND not at a blocking position, move one path node

**Corner Logic**:
- When at `hallW_corner` (Bonnie) or `hallE_corner` (Chica), check door:
  - If Bonnie at hallW_corner + doorLeft is closed: cannot advance
  - If Chica at hallE_corner + doorRight is closed: cannot advance
  - Otherwise: advance to office → jumpscare

**Garble Sound**: Each successful move plays a random garble sound if monitor is open (simulating camera feed distortion when animatronics move past sensors)

### 5.7 Foxy AI (HIGHLY COMPLEX — MOST CRITICAL)

**Foxy is the most intricate animatronic** due to FNAF1's unique mechanics:

#### Foxy Path & Stages:
- `pos=0,1,2`: Pirate Cove booth (curtain phases)
  - Pos 0: Fully in booth, curtain closed, can't see Foxy
  - Pos 1-2: Curtain opening gradually
  - Pos 3: Exits booth, sprints down west hall (plays `foxySprintAudio`)
  - Pos 4: Office (attacks player)

#### Monitor-Down Requirement (CRITICAL):
**Foxy can ONLY advance when monitor is DOWN** — this is the single most important Foxy rule. Camera being open freezes ALL Foxy progress entirely.

#### Prevention Timer (Grace Period):
When monitor **just closed** (was open, now down):
1. Set `preventionTimer = 50 + Math.floor(Math.random() * 1001)` → 50–1050 ticks (5–105 seconds real-time)
2. During this grace period, Foxy's AI roll window doesn't decrement the timer
3. Only after timer expires does the 50-tick movement window start counting

This prevents the player from simply lowering the monitor and immediately getting attacked.

#### Pirate Cove Pushback (Cam 1C Mechanic):
**Most unique FNAF1 feature**: Simply LOOKING at pirate cove pushes Foxy back one stage.

```javascript
var watchingCam1c = (monitorOpen && game.currentCam === 'pirate');
var justStartedWatchingCam1c = watchingCam1c && !a.wasWatchingCam1c;
if (justStartedWatchingCam1c && a.pos > 0) {
    a.pos--;          // Go back one stage
    a.ignoreTicks = 0; // Reset movement window
}
```

**Important**: Pushback only happens **once per camera switch** (tracked by `wasWatchingCam1c` flag). Holding monitor open on pirate doesn't keep pushing Foxy back; he only retreats when you SWITCH to that camera.

#### Movement Window After Grace Expires:
Once `preventionTimer === 0`:
```javascript
a.ignoreTicks++;
if (a.ignoreTicks > 0 && a.ignoreTicks % 50 === 0) {
    if (Math.floor(Math.random() * 20) < a.ai) {
        if (a.pos < a.path.length - 1) a.pos++;
        
        // Special: Playing sprint audio when entering hallW
        if (a.path[a.pos] === 'hallW') {
            play('foxySprintAudio');
        }
        
        // Special: Attacking office
        if (a.path[a.pos] === 'office') {
            if (!game.doorLeft) {
                triggerGameOver('FOXY');  // Door open = jumpscare
            } else {
                game.power -= 12;         // Door closed = Foxy punches (banging sound)
                play('foxyRunAudio');
                a.pos = 0;                // Reset to pirate booth after punch
                a.preventionTimer = 50 + Math.floor(Math.random() * 1001); // New grace
            }
        }
    }
}
```

#### Foxy Knockdown (Door Closed Defense):
- If Foxy reaches office but **door is closed**, he slams against it
- Audio: `foxyRunAudio` plays (banging sound)
- Power drain: 12% instantly
- Result: Foxy resets to pos=0 (returns to pirate booth), fresh grace timer starts
- Player can thus multiple times push Foxy back throughout the night (costs power each time)

#### Foxy Activation Conditions:
Foxy only moves if ALL of these are true:
1. `!monitorOpen` (camera is down)
2. `a.ai > 0` (AI is active for this night)
3. `preventionTimer === 0` (grace period elapsed)

If monitor is raised while Foxy is in maintenance timer, timer continues counting down. Timer only RESETS when monitor goes from open → closed.

### 5.8 Collision Detection (Instant Jumpscare)

**Core Rule**: If any animatronic reaches `office` position (final path node):
```javascript
function checkCollisions() {
    Object.values(animatronics).forEach(function(a) {
        if (a.path && a.path[a.pos] === 'office') {
            triggerGameOver(a.name.toUpperCase() + ' GOT YOU');
        }
    });
}
```

This is called **every 100ms tick**, so the delay between reaching hallway corner and office death is approximately one tick (100ms) — effectively instantaneous from player perspective.

---

## SECTION 6: EMERGENCY SPECIAL EVENTS

### 6.1 Freddy Jingle & Hallucination (Night 2+)

**Trigger Condition**: When Freddy reaches `hallE_corner` (last position before office)

**Sequence**:
1. Start playing `freddyJingleAudio` (full duration)
2. Overlay a "hallucination" visual effect (semi-transparent jumpscare image)
3. After jingle finishes, hallucination fades
4. Freddy continues toward office

**Jingle audio specifications**:
- Plays once when trigger happens
- Duration: ~1.5-2 seconds
- Does NOT pause game or prevent Freddy from advancing
- Purely atmospheric dread-building mechanic

### 6.2 Golden Freddy (Easter Egg)

**Two Activation Methods**:

#### Method 1: Custom Night Code Entry
Set Custom Night sliders to exactly: **Freddy=1, Bonnie=9, Chica=8, Foxy=7** ("The Bite of '87")

**Result**: Game immediately triggers Golden Freddy jumpscare without even entering gameplay

#### Method 2: On-Map Appearance (Rare Random Event)
- Can appear randomly during gameplay
- Shown as a semi-transparent overlay in the office
- Set `goldenFreddyActive = true` and `goldenFreddyTimer = 60-120` (6-12 second countdown)
- Timer counts down only while **monitor is closed**
- If monitor is **opened** while Golden Freddy is active, he vanishes (timer resets, overlay removed)
- If timer reaches 0 with monitor closed: instant jumpscare

**Scare Properties**:
- Class: `scare-golden`
- Image: `golden_freddy.webp`
- Duration: 1400ms (static image hold time)
- Audio: `goldenFreddyScareAudio` (some audio files have distorted/demonic Freddy sound)

### 6.3 Freddy Laugh Track (Night 3+)

**Trigger**: Randomly when menu opens between nights or at the main screen
- Not tied to active gameplay
- Atmospheric/Easter egg feature
- Plays a menacing Freddy laugh sound to unsettle players

---

## SECTION 7: NIGHT PROGRESSION & GAME FLOW

### 7.1 Six Story Nights (1-6) with Canonical Progression

#### Night 1: Tutorial
- **Duration**: 12 AM - 6 AM (540 time units)
- **AI Levels**: All at 0 (animatronics dormant or very slow)
- **Phone Guy Message**: Explains basics ("animatronics get quirky," "watch cameras," "conserve power")
- **Objective**: Survive until 6 AM
- **Flow**: Teaches player camera system and basic mechanics
- **Unlock**: Night 2 becomes playable
- **Difficulty**: Very easy; focus on learning UI

#### Night 2: Introduction to All Animatronics
- **AI Levels**: Bonnie=3, Chica=1, Foxy=1, Freddy=0
- **Phone Guy Message**: Warns about older models, mentions Pirate Cove's "unique" Foxy
- **Key Mechanic**: First time Bonnie, Chica, Foxy move; Freddy stays dormant
- **Difficulty**: Easy-to-moderate; introductory challenge
- **Unlock**: Night 3

#### Night 3: Major Spike (First Real Test)
- **AI Levels**: Freddy=1, Bonnie=0, Chica=5, Foxy=2
- **Phone Guy Message**: Congratulates progress, warns "things get real tonight," advises checking blind spots
- **Key Challenge**: Chica very active (25% roll rate per window); Foxy becomes threat
- **New Mechanic**: In-night AI increments start applying (Chica/Foxy get +1 at 3AM, 4AM)
- **Difficulty**: Moderate; significant power management required
- **Unlock**: Night 4

#### Night 4: Escalation
- **AI Levels**: Freddy=1 or 2* (randomized 50/50), Bonnie=2, Chica=4, Foxy=6
- **Phone Guy Message**: Severely stressed tone; warns of animatronics being aggressive
- **Key Challenge**: Foxy at 6 (30% roll rate) becomes MAJOR threat; Freddy finally engaged
- **New Mechanic**: Freddy blocks on other animatronics' movement from stage
- **Difficulty**: Hard; coordinated defense required (lights+doors+monitor timing)
- **Unlock**: Night 5
- **Freddy Randomization Note**: `_n4roll = Math.random() < 0.5 ? 1 : 2` decided at game start

#### Night 5: Newspaper Aftermath
- **AI Levels**: Freddy=3, Bonnie=5, Chica=7, Foxy=5
- **Phone Guy Message**: Silent (empty string "...")
- **Special Event**: After successfully surviving, special ending screen (newspaper article) appears before main menu
- **Difficulty**: Very hard; all animatronics active
- **Unlock**: Night 6
- **Story**: First major hint something's wrong at the establishment

#### Night 6: Final Story Night
- **AI Levels**: Freddy=4, Bonnie=10, Chica=12, Foxy=6
- **Phone Guy Message**: Silent
- **Key Notes**: 
  - Bonnie at 10 (50% roll rate — moves very frequently)
  - Chica at 12 (60% roll rate — almost always advances)
  - Freddy at 4 (20% roll rate with mandatory monitor-down)
- **Difficulty**: Extreme; resource-intensive defense required
- **Unlock**: None (this is the final "canonical" night)
- **Completion**: After clearing Night 6, players are offered "return to menu" or access to Custom Night

### 7.2 Night 7: Custom Night (Sandbox Mode)

**Setup Screen** (`#customNightSetup`):
- Four sliders: Freddy (0-20), Bonnie (0-20), Chica (0-20), Foxy (0-20)
- Quick presets:
  - "10/20/20/20" (Extreme mode)
  - "4/4/4/4" (Fresh challenge)
  - "5/5/5/5" (Balanced)
  - "20/20/20/20" (2/20/20/20 for stars achievement)

**Exclusive Features**:
- No in-night AI increments — sliders define total AI for all hours
- No Phone Guy message
- Players can attempt multiple times without restriction
- **Achievement**: Beating "20/20/20/20" mode unlocks the "2020 Star" (stored in localStorage)

### 7.3 Hour Progression Display
**HUD Time Display** (top-right, updated every tick):
- Minutes cycle from 0-59
- Hours tick over from 0 (12 AM) to 5 (6 AM)
- At hour 6, night immediately ends
- Real-time clock: ~2.5 seconds per in-game hour (90 time units ÷ 36 ticks)

### 7.4 Night Start Sequence
1. `startGame(nightNumber)` called
2. Reset all state: `power=100`, all doors/lights open, all animatronics at pos=0
3. Show "Night X" intro card (disappears after 2.2 seconds)
4. Show **Phone Guy message** (auto-plays audio; message persists on-screen)
5. **Ambient audio** starts playing (tension track)
6. 3D office initializes (or resizes if returning to game)
7. `gameLoop = setInterval(tickGame, 100)` starts
8. Game is playable

### 7.5 Night End (6 AM Reached)
When `game.hour >= 6` or `game.time >= 540`:
```javascript
function endNight() {
    // Victory
    game.running = false;
    play('successAudio');
    
    // Night 5 special: show newspaper after completion
    if (game.currentNight === 5) {
        show('nightCompleteScreen');
        setTimeout(() => show('newspaperScreen'), 3000);
    } else {
        show('nightCompleteScreen');
    }
    
    // Unlock next night if not already unlocked
    if (game.currentNight < 7 && !unlockedNights.includes(game.currentNight + 1)) {
        unlockedNights.push(game.currentNight + 1);
        saveProgress();  // Persist to localStorage
    }
    
    // 20/20/20/20 achievement check
    if (game.currentNight === 7 && allSliders === 20) {
        localStorage.setItem('fnafBeat2020', 'true');
    }
}
```

---

## SECTION 8: CAMERA SYSTEM (11 FEEDS)

### 8.1 Camera Layout (Building Schematic)

**11 Total Security Feeds** (each drawn procedurally to 2D canvas every frame):

| Key | Label | Floor | Position | Role |
|-----|-------|-------|----------|------|
| `stage` | CAM 1A - SHOW STAGE | Main | Center stage riser | Animatronic spawn point; Freddy/Bonnie/Chica start here |
| `dining` | CAM 1B - DINING AREA | Main | Party dining area | Central hub; multiple paths intersect here |
| `pirate` | CAM 1C - PIRATE COVE | Main | Foxy's booth | Foxy's starting cage; curtain phases visible |
| `stage_left` | CAM 3 - SUPPLY CLOSET | Main | Supply room | Bonnie's north path |
| `stage_right` | CAM 7 - RESTROOMS | Main | Restrooms | Chica's north path |
| `hallW` | CAM 2A - W. HALL | Hall | West corridor | Bonnie/Foxy approach corridor; lights can illuminate |
| `hallW_corner` | CAM 2B - W. HALL CORNER | Hall | West corner junction | Last view before west door; final Bonnie/Foxy checkpoint |
| `hallE` | CAM 4A - E. HALL | Hall | East corridor | Freddy/Chica approach corridor; lights can illuminate |
| `hallE_corner` | CAM 4B - E. HALL CORNER | Hall | East corner junction | Last view before east door; final Freddy/Chica checkpoint |
| `kitchen` | CAM 6 - KITCHEN | Back | Back kitchen area | Audio-only camera (displays static noise + "AUDIO ONLY" text) |
| `backstage` | CAM 5 - BACKSTAGE | Back | Parts & service room | Bonnie's secret backstage path |

### 8.2 Camera Rendering (Procedural Canvas)

Each camera feed is rendered **every frame** (`drawCamBg(cam, w, h)` in cameras.js) to the 2D canvas.

#### Stage (CAM 1A):
- Back wall: dark reddish-brown (#5a4830)
- Floor: darker brown (#3a2e1e)
- Raised stage platform: tan brown (#6b4c2a / #7a5933)
- Back wall banner: dark red curtain strip at top (#6b0000 / #8b0000)
- "FREDDY FAZBEAR'S PIZZA" sign: centered, gold/yellow text on dark background
- Three animatronic star markers: gold stars at front of stage (spawn points)
- Side lighting rigs: yellow circles emulating stage lights

#### Pirate Cove (CAM 1C):
- Pirate ship booth structure
- Foxy curtain: draws progressively based on pos (0 = closed, 1-2 = opening, 3+ = open)
- Treasure chest, pirate decorations
- Dim ambient color scheme

#### Dining Area (CAM 1B):
- Darker brown walls
- Rows of tables (perspective-correct) with chairs
- Overhead lights with light cones
- Party banner on back wall
- Party atmosphere aesthetic

#### Hallways (CAM 2A, 2B, 4A, 4B):
- Narrow corridor perspective
- Lockers/doors on walls
- Floor tiles
- Ceiling
- Doorway to office (bottom of screen)
- Light state affects visibility (bright/dim versions)

#### Backstage (CAM 5):
- Semi-lit back room
- Animatronic parts and equipment visible
- Technical aesthetic (contrast to party area)

#### Kitchen (CAM 6):
- "AUDIO ONLY" text prominently displayed
- Screen filled with static/grain pattern
- No animatronic figures drawn
- Simulates damaged camera / audio-only monitoring

### 8.3 Camera Overlay Effects (CCTV Authenticity)

Applied to every camera feed after background is drawn (`drawCamOverlay(w, h)`):

1. **Green Surveillance Tint**: `rgba(0, 25, 5, 0.13)` overlay
2. **Horizontal Scanlines**: Every 3 pixels vertically, `rgba(0, 0, 0, 0.18)` opacity
3. **Radial Vignette**: Darkens corners via radial gradient (0 opacity at center, 0.72 opacity at edges)
4. **Subtle Grain**: Random pixels scattered at ~1.5% density, yellowish-white color low alpha
5. **Rolling Interference Bars**: Periodic horizontal bands that roll down screen (simulating capture card interference)
6. **Glitch Distortion**: Rare (3% per frame) random horizontal displacement of pixel rows (authentic video glitch effect)

### 8.4 Animatronic Rendering on Cameras

When an animatronic is at a particular camera location, their image is drawn on that feed:
- Simple colored rectangle/sprite per animatronic
- Position varies per camera layout
- Visibility depends on light state (if applicable)

### 8.5 Camera Switching & Player Control

**Camera Toggle Button** (`#cameraToggleBtn`):
- Raises/lowers monitor
- Classes: `active` (monitor open), `disabled` (during power outage)
- Click opens grid of 11 camera buttons

**Camera Selection**:
- Each camera has a clickable button with `data-cam` attribute
- Clicking switches `game.currentCam` to that camera's key
- Display updates next frame with new camera background + animatronics
- Pirate Cove special: each camera switch to pirate can push Foxy back (if at pos > 0)

**Game State Impact**:
- While monitor is open: `monitorOpen = true`, power drains faster (0.01% extra per tick)
- While monitor is open: Freddy/Foxy cannot move (AI windows don't advance)
- While monitor is open: garble sounds play when other animatronics move (audio feedback via disruption)

---

## SECTION 9: 3D OFFICE RENDERING (Three.js)

### 9.1 Scene Setup
```javascript
scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e0c08);  // Dark brownish-black
scene.fog = new THREE.Fog(0x0e0c08, 14, 26);  // Linear fog; near=14, far=26 units
```

**Fog Effect**: Creates claustrophobic feel by fading geometry in and out. Back wall at z=-9 is still visible but dim.

### 9.2 Camera Configuration
```javascript
camera = new THREE.PerspectiveCamera(72, aspect, 0.1, 60);
camera.position.set(0, 4.0, 7.5);     // Sitting slightly elevated; facing back wall
camera.rotation.order = 'YXZ';        // Critical: allows correct FPS yaw without gimbal lock
```

**FOV 72°**: Wide, immersive view (slightly wider than standard 60°)
**Aspect Ratio**: Locked to window size; updates on resize
**Z-position 7.5**: Slightly in front of center, looking toward back wall at z=-9

### 9.3 Room Coordinates
```
X-axis: -11 to +11  (width, 22 units wide)
Y-axis:   0 to +11  (height, 11 units tall)
Z-axis:  -9 to  +9  (depth, 18 units deep; -9 is back wall)
```

**Important**: Player camera sits at `(0, 4.0, 7.5)`, which is:
- Centered horizontally (X=0)
- Elevated (Y=4.0, roughly chest/shoulder height in a 11-unit tall room)
- Forward (Z=7.5, closer to camera "eye" than room center)
- Facing back wall (looking in -Z direction)

### 9.4 Camera Head-Turn (Mouse Control)

**Mechanic**: Moving mouse left/right rotates player's head (yaw only; no pitch)
```javascript
mouseNormX = (e.clientX - rect.left) / rect.width;  // 0 to 1
targetRotY = (mouseNormX - 0.5) * 2 * MAX_ROT;      // ±0.62 radians ≈ ±35°
camera.rotation.y = lerp(camera.rotation.y, targetRotY, ROT_LERP);
```

**MAX_ROT = 0.62 rad ≈ 35°**: Limits head turn so player can't rotate past 90° (preserves "sitting at desk" immersion)
**ROT_LERP = 0.08**: Smooth interpolation (0.08 factor per frame gives ~100ms response time)

**Why YXZ order?**: Prevents gimbal lock and ensures yaw (Y-axis rotation) works correctly at any pitch.

### 9.5 Doors (3D Mesh & Animation)

**Mesh**: Two rectangular panels positioned at `X = ±10, Y = [DOOR_CLOSED_Y to DOOR_OPEN_Y], Z = -9`

**Material**:
- Canvas-generated texture (256×512 pixels)
- THREE.MeshStandardMaterial with roughness, metalness, normal bumpmap
- Material swaps: `MAT_DOOR_OPEN` (black) vs `MAT_DOOR_CLOSED` (grey)

**Animation**: Spring physics applied every render frame (60 FPS):
```javascript
// Calculate spring force
spring_force = -(pos - target) * SPRING_K;
vel = vel + spring_force;
vel = vel * (1 - DAMPING);  // Friction

// Update position and mesh Y
pos = pos + vel;
mesh.position.y = DOOR_CLOSED_Y + pos * DOOR_OPEN_HEIGHT;

// Snap to target when close
if (Math.abs(pos - target) < THRESHOLD) pos = target;
```

**Result**: Smooth, spring-like motion with gentle bounce/overshoot due to damping < 1.0

### 9.6 Walls & Environment

**Main Walls**:
- Back wall: warm tan-beige (#c4b080)
- Side walls: medium tan
- Floor: darker tan
- Ceiling: dark (shadow)

**Details**:
- CELEBRATE banner on back wall: purple bar + yellow letters + colored streamers
- Children's drawings below banner
- Desk area: furniture, stacked boxes
- Ceiling fan: rotates continuously (procedural mesh)
- Wall panels, trim, baseboards

### 9.7 Lighting Setup

**Three-light scheme** (no shadows for performance):
1. **Ambient Light**: Fixed 0.38 intensity, white color
2. **Directional Light (Main)**: Warm yellow-white, from ceiling down; simulates single overhead bulb
3. **Hall Lights** (left/right): Point lights that toggle based on game state
   - ON: emit warm glow into hall apertures
   - OFF: no light, apertures appear dark

### 9.8 Hall Aperture Covers

**Meshes**: Two viewport-like openings where animatronics appear when in halls
- Located at `X = ±11, Y = [aperture height], Z = [towards camera]`
- Color updates based on which animatronic is present (via `setHallLeft/Right` calls)
- Visual glow when animatronic detected; intensity reduced if lights off

### 9.9 Render Loop

```javascript
function animate() {
    animId = requestAnimationFrame(animate);
    
    // Update physics (doors, fan rotation, etc.)
    updateDoorAnimations();
    updateFanRotation();
    
    // Update camera rotation based on mouse
    var targetRotY = (mouseNorm - 0.5) * 2 * MAX_ROT;
    camera.rotation.y = lerp(camera.rotation.y, targetRotY, ROT_LERP);
    
    // Render scene
    renderer.render(scene, camera);
}
```

**Frame Rate**: 60 FPS via `requestAnimationFrame`
**Performance**: WebGL 2.0, antialiased, pixel ratio capped at 2×

---

## SECTION 10: HUD & UI STATE MANAGEMENT

### 10.1 HUD Elements (Always Visible During Gameplay)

**Power Gauge** (`#powerDisplay`):
- Bottom-left corner
- Displays `game.power` as percentage (0-100%)
- Color: green → yellow → red as power decreases
- Font: monospace, large, bold

**Time Display** (`#timeDisplay`):
- Top-right corner
- Shows current hour (0-5) and minutes (0-59)
- Format: "12:00 AM" to "5:59 AM"
- Updates every tick
- Font: monospace

**Night Display** (`#nightDisplay`):
- Top-left or center
- Shows "NIGHT 1" through "NIGHT 6" or "CUSTOM NIGHT"
- Set at game start, unchanging

**Camera Monitor** (`#monitorArea`):
- Bottom-right or center-bottom
- Contains 2D canvas for camera feeds
- Surrounded by camera selection buttons (11 total)
- Visible when `monitorOpen === true`

### 10.2 Overlay Screens

#### Night Intro Card:
- Appears for 2.2 seconds at game start
- Shows "Night X" text
- Fades out smoothly
- Phone Guy message appears as it fades

#### Phone Guy Message:
- Text display of night-specific message (PHONE_MESSAGES object)
- Appears after intro fades
- Persists on-screen for ~10 seconds (via timeout)
- Accompanied by audio playback

#### Night Complete Screen:
- Shows "6:00 AM" message and success feedback
- Displayed when night ends (player survived)
- Allows user to proceed to next night or return to menu

#### Newspaper Screen (Night 5 Only):
- Special ending after beating Night 5
- Shows article hinting at the dark events
- Story continuation element

#### Game Over Screen:
- Large "GAME OVER" text
- Character-specific message (e.g., "FREDDY FAZBEAR GOT YOU!")
- Retry button (replay same night) and menu button

#### Jumpscare Overlay:
- Full-screen image of attacking animatronic
- Displayed for duration specific to each character
- Plays accompanying audio + screech sound
- Screen shakes via CSS animation

### 10.3 Button States & Visibility

**Office Buttons** (door/light toggles):
- Classes: `active` (engaged), `disabled` (powerless), `btn-visible` (angled toward button), `btn-hidden` (angled away)
- Visibility based on camera rotation: left buttons visible when rotY > 0.3, right buttons when rotY < -0.3
- Fade animation when transitioning visibility

**Camera Toggle Button**:
- Classes: `active` (monitor open), `disabled` (power outage)
- Always visible at bottom of screen
- Toggling opens/closes camera grid

**Night Buttons** (main menu):
- Locked until unlocked via progress
- Classes: `unlocked`, `locked`, `completed`
- Visual indicators (stars, lock icons)

### 10.4 State Persistence (localStorage)

**Saved Data**:
```javascript
localStorage.getItem('fnafProgress');  // JSON array of unlocked night numbers
localStorage.getItem('fnafBeat2020');  // "true" if beat 20/20/20/20 mode
```

**Loaded at Game Init**:
- Player's progress is restored on page reload
- Only nights in `unlockedNights` array can be started
- Initially only Night 1 is unlocked

---

## SECTION 11: AUDIO SYSTEM

### 11.1 Audio Elements (Procedurally Synthesized)

All game sounds are **synthesized in real-time using Web Audio API** (sounds.js). No external audio files required.

**Audio Elements** (HTML):
```html
<audio id="ambientAudio" loop></audio>
<audio id="doorAudio"></audio>
<audio id="foxySprintAudio"></audio>
<audio id="foxyRunAudio"></audio>
<audio id="garble1Audio"></audio>
<audio id="garble2Audio"></audio>
<audio id="jumpScareAudio"></audio>
<audio id="goldenFreddyScareAudio"></audio>
<audio id="powerOutAudio"></audio>
<audio id="successAudio"></audio>
<audio id="freddyJingleAudio"></audio>
<audio id="freddyLaughAudio"></audio>
```

### 11.2 Sound Categories

**Ambient/Tension**:
- `ambientAudio`: Background drone that increases volume as power decreases (base 0.3 → 0.8 at 0% power)

**Gameplay SFX**:
- `doorAudio`: Door slam (130Hz thud + 800Hz metallic click)
- `foxySprintAudio`: High-pitched screeching sprint warning
- `foxyRunAudio`: Foxy punching closed door (impact sound)
- `garble1/2Audio`: Radio distortion (random sample) when animatronics move past sensors while camera open

**Jumpscare Audio**:
- `jumpScareAudio`: Demonic screech + crash (main jumpscare)
- `goldenFreddyScareAudio`: Alternate demonic voice (Golden Freddy variant)
- `freddy JingleAudio`: 8-bit jingle that plays when Freddy reaches final hallway position

**Victory/Defeat**:
- `successAudio`: Victory chime (plays when 6 AM reached)
- `powerOutAudio`: Electrical shutdown sound (plays when power hits 0)

### 11.3 Synthesis Details (sounds.js)

Each sound is generated using `OfflineAudioContext`:

**Door Sound** (0.2s):
- Oscillator 1 (sine): 120 Hz → 30 Hz exponential ramp (low thud)
- Gain envelope: 0.9 → 0.001 (linear decay)
- Oscillator 2 (square): 800 Hz → 200 Hz over 0.05s (metallic ring)

**Jumpscare** (1.5s):
- White noise burst via BiquadFilter
- Overlaid sine wave (distorted) for screech
- Loud initial attack, rapid decay

**Foxy Sprint** (~2s):
- Multiple sine oscillators sweeping through mid-high frequencies
- Warbling effect via LFO modulation
- Builds tension as sound rises

### 11.4 Audio Control Rules

**When to Play Sounds**:
- Door toggle → play doorAudio immediately
- Light toggle → play doorAudio immediately (same SFX)
- Animatronic moves (Bonnie/Chica) while monitor open → random garble sound
- Foxy reaches hallW position → play foxySprintAudio
- Foxy hits closed door → play foxyRunAudio
- Any animatronic reaches office → play jumpScareAudio + specific scare class animation
- Power reaches 0 → play powerOutAudio
- 6 AM reached → play successAudio
- Freddy at hallE_corner → play freddyJingleAudio (Nights 2+)
- Night ends → stop ambientAudio, play successAudio

**Fail-Safe**: All play calls use `.play().catch(function(){})` to silently fail if audio can't play (permissions, file missing, etc.)

---

## SECTION 12: EDGE CASES & SPECIAL MECHANICS

### 12.1 Monitor & Freddy Lock

**Critical Rule**: Freddy **never moves while monitor is open**.
- His movement window is skipped entirely if `monitorOpen === true`
- This prevents Freddy from advancing while player is watching cameras
- Foxy is similarly locked; neither advances while cameras are on

**Implication**: Player can "stall" Freddy by keeping monitor open, but this drains power at +0.01% per tick.

### 12.2 Bonnie's Secret Backstage Path

Bonnie's path includes a detour through `backstage`:
```
['stage', 'backstage', 'dining', 'stage_left', 'hallW', 'hallW_corner', 'office']
```

This extra node makes Bonnie take slightly longer than other animatronics to reach office, giving player a brief tactical advantage.

### 12.3 Freddy's Stage Lock (Bonnie & Chica Requirement)

Freddy cannot leave the stage (pos=0) until **both** Bonnie and Chica have advanced off:
```javascript
if (a.pos === 0) {
    var bonnieGone = animatronics.bonnie && animatronics.bonnie.pos > 0;
    var chicaGone = animatronics.chica && animatronics.chica.pos > 0;
    if (!bonnieGone || !chicaGone) return;  // Stay at stage
}
```

**Consequence**: Freddy waits for his bandmates to leave before pursuing player. This creates a "fear buildup" feeling.

### 12.4 Foxy's Monitor Restriction is Absolute

**Any camera being open** (not just pirate cam) freezes Foxy movement:
```javascript
if (!monitorOpen && a.ai > 0) {
    // Movement window continues counting down
} else {
    // Monitor is open — movement window does NOT progress
}
```

This is unique to Foxy and is the single most important Foxy rule in FNAF1.

### 12.5 Consecutive Door Punch Mechanic (Foxy)

If Foxy reaches office with door closed:
1. Instantly lose 12% power
2. Foxy resets to `pos=0` (pirate booth)
3. New grace timer starts (50-1050 ticks)
4. Audio plays (foxyRunAudio)

**Strategic Implication**: Player can survive multiple Foxy attacks by maintaining a closed left door and letting him punch it repeatedly, slowly draining power but preventing death.

### 12.6 Freddy Jingle Mechanic (Non-blocking)

When Freddy reaches `hallE_corner`:
- Jingle audio starts playing (full duration, ~1.5-2s)
- Visual hallucination overlay appears
- **Game does NOT pause** — Freddy continues advancing
- After jingle ends, hallucination fades
- This is pure atmosphere; mechanically inconsequential (but unnerving)

### 12.7 Darkness During Power Outage (CRITICAL)

When power reaches 0:
1. `#powerDarkOverlay` CSS class `show` is added
2. CSS transition fades overlay to full black over 0.4s
3. All game UI becomes invisible (behind opaque dark overlay)
4. All 3D rendering is hidden (office canvas disappears)
5. All 2D camera rendering is hidden
6. **Screen is pure black** until jumpscare occurs

**Jumpscare During Darkness**:
- After dark overlay is fully opaque + delay has elapsed (0.8-1.3s total)
- `triggerGameOver('FREDDY_POWER')` is called
- Specific jumpscare image appears (Freddy power-outage variant)
- Audio plays (jumpscare + optional distorted laugh)
- Screen remains visible for scare duration (1100ms), then returns to menu

**Important**: The darkness is not visual trickery — it's an actual overlay that covers all content. This creates genuine suspense and disorientation.

### 12.8 Golden Freddy Countdown (Monitor Dismissal)

When Golden Freddy is active on-screen:
```javascript
if (goldenFreddyActive) {
    if (monitorOpen) {
        goldenFreddyActive = false;    // He vanishes if you open camera
        goldenFreddyTimer = 0;
        goldenFreddyOverlay.classList.remove('show');
    } else {
        goldenFreddyTimer--;            // Counts down only while office is visible
        if (goldenFreddyTimer <= 0) {
            triggerGameOver('GOLDEN FREDDY');
        }
    }
}
```

**Strategic Escape**: Opening the camera monitor will dismiss him temporarily, but timer resets only when monitor is lowered again. Repeated camera cycling can prevent Golden Freddy jumpscare indefinitely (at power cost).

### 12.9 Progress Persistence & Unlocking

Nights are unlocked one-by-one:
```javascript
if (gameCompleted && !unlockedNights.includes(nextNight)) {
    unlockedNights.push(nextNight);
    localStorage.setItem('fnafProgress', JSON.stringify(unlockedNights));
}
```

- Default: Only Night 1 is unlocked
- Beat Night 1 → Night 2 unlocked
- Beat Night 2 → Night 3 unlocked
- ... and so on through Night 6
- Beat Night 6 → Custom Night (Night 7) is unlocked
- Custom Night can be accessed anytime after Night 6 unlock

**20/20/20/20 Achievement**:
- Set all four sliders to exactly 20
- Beat the night
- Bonus star awarded + stored in localStorage as `fnafBeat2020`

---

## SECTION 13: PERFORMANCE & OPTIMIZATION NOTES

### 13.1 Rendering Optimization

- Three.js r152: Modern WebGL with vertex/fragment shaders
- No shadow maps (expensive; disabled for performance)
- Fog reduces far-clip rendering distance effectively
- Canvas 2D for cameras: rasterized each frame (simpler than 3D, sufficient for coarse camera quality)
- Antialiasing enabled; pixel ratio capped at 2× (prevents excessive overdraw)

### 13.2 AI Loop Efficiency

- Animatronic movement is purely discrete (pos integer, not continuous)
- Movement checks happen once per 30/50 tick window (infrequent)
- Collision check is O(4) (four animatronics max) per tick
- No spatial hashing or octree needed (grid is small, animatronics few)

### 13.3 Audio Synthesis

- Sounds synthesized once at load-time via `OfflineAudioContext`
- Results stored as Blob URLs in `<audio>` elements
- No run-time synthesis (already precomputed)
- Efficient playback via native `<audio>` element

### 13.4 Memory Footprint

- Single `game` state object ~2 KB
- Four animatronic objects ~1 KB each
- Three.js scene: ~5-10 MB (assets cached)
- Canvas offscreen: ~2 MB (camera canvas buffer)
- **Total**: ~20-30 MB for full runtime (acceptable for modern browsers)

### 13.5 Network

- Single Node.js server (`server.js`) — static file serving only
- No API calls, no database, no external CDN dependencies
- Three.js loaded locally from `src/js/three.min.js` (bundled)
- Total bandwidth: ~5-8 MB initial load (mostly Three.js library)

---

## SECTION 14: TESTING SCENARIOS & COMPREHENSIVE CHECKLIST

### 14.1 Power System Validation

- [ ] Verify all drain multipliers: base 0.01, doors ±0.01 each, lights ±0.01 each, monitor +0.01
- [ ] Test power at 0: confirm doors force-open, lights force-off, monitor force-closes
- [ ] Verify dark overlay appears and stays black for 0.8-1.3s before Freddy jumpscare
- [ ] Confirm dark overlay class transitions smoothly (0.4s fade)
- [ ] Verify Freddy power-outage scare plays correct audio + image asset
- [ ] Test power-out audio plays on power <= 0 event
- [ ] Verify ambient audio volume scales with power: volume = 0.3 + (100-power)/100 * 0.5

### 14.2 Animatronic Movement Tests

**Freddy**:
- [ ] Test that Freddy does not move while monitor is open (`monitorOpen === true`)
- [ ] Verify Freddy waits at stage until both Bonnie AND Chica have moved (pos > 0)
- [ ] Test Night 4 Freddy randomization: should be 1 or 2, fixed for entire night
- [ ] Verify Freddy movement every 30 ticks (~3s) when monitor down and AI > 0
- [ ] Test Freddy corner forcing: at hallE_corner, forces through closed door (no blocking)

**Bonnie**:
- [ ] Verify Bonnie moves every 50 ticks regardless of monitor state
- [ ] Test Bonnie blocking at hallW_corner when doorLeft is closed
- [ ] Verify garble sound plays when Bonnie moves while monitor is open
- [ ] Test Night 2-4 AI scaling: +1 at 2AM, +1 at 3AM, +1 at 4AM (max 3 increments)

**Chica**:
- [ ] Verify Chica moves every 50 ticks regardless of monitor state
- [ ] Test Chica blocking at hallE_corner when doorRight is closed
- [ ] Verify garble sound plays when Chica moves while monitor is open
- [ ] Test Night 3-4 AI scaling: +1 at 3AM, +1 at 4AM (max 2 increments)

**Foxy**:
- [ ] **CRITICAL**: Verify Foxy does NOT move while monitor is open
- [ ] Test Foxy pirate cove pushback: switching to pirate cam while Foxy pos > 0 should decrement pos
- [ ] Verify pushback only happens once per camera switch (not continuously while monitoring)
- [ ] Test grace period timer: 50-1050 ticks delay after monitor closes before Foxy can move
- [ ] Verify Foxy movement every 50 ticks (in ignoreTicks window) after grace expires
- [ ] Test Foxy sprint audio plays when transitioning to hallW position
- [ ] Test Foxy punch mechanic: door closed at office → 12% power drain, Foxy resets to pos=0
- [ ] Test Foxy jumpscare: door open at office → immediate triggerGameOver('FOXY')

### 14.3 Collision Detection Tests

- [ ] Test animatronic at `office` position → checkCollisions fires jumpscare immediately
- [ ] Verify correct jumpscare message for each character (Freddy, Bonnie, Chica, Foxy)
- [ ] Test jumpscare duration per character (1700ms, 600ms, 900ms, 1150ms respectively)
- [ ] Verify game.running = false when jumpscare triggered
- [ ] Test game loop ceases after jumpscare (clearInterval on gameLoop)

### 14.4 Door & Light Mechanics

- [ ] Test door toggle: click button → boolean flips, 3D mesh animates, audio plays
- [ ] Verify door spring physics: smooth motion with gentle bounce, settles to end position
- [ ] Test door animation speeds: opening takes ~1-2s, closing takes ~1-2s
- [ ] Verify door material swap: open (black) vs closed (grey) visual difference
- [ ] Test light toggle: click button → boolean flips, 3D light on/off, power drain changes
- [ ] Test button disabling during power outage: cannot click door/light buttons
- [ ] Test button visibility: left buttons visible when rotY > 0.3, right when rotY < -0.3

### 14.5 Camera System Tests

- [ ] Test all 11 cameras render without artifacts (no missing sprites, broken colors, etc.)
- [ ] Verify CAM_LABELS are correct and displayed for each camera
- [ ] Test camera switching: click button → currentCam updates, new feed draws next frame
- [ ] Verify camera overlay effects: scanlines, vignette, grain, glitch all visible
- [ ] Test monitor open/close: toggle button → grid appears/disappears, power drain changes
- [ ] Verify monitorOpen flag blocks Freddy/Foxy movement
- [ ] Test Pirate Cove camera: shows Foxy with progressive curtain phases (pos 0, 1, 2, 3+)
- [ ] Test Kitchen camera: displays "AUDIO ONLY" text, no animatronic figure drawn
- [ ] Verify animatronics appear on correct cameras based on current path position

### 14.6 3D Office Tests

- [ ] Verify Three.js initializes correctly on game start
- [ ] Test camera head-turn: move mouse left/right → head rotates ±0.62 rad
- [ ] Verify smooth lerp: rotation eases into target, not instant
- [ ] Test window resize: 3D canvas scales correctly, aspect ratio maintains
- [ ] Verify hall lights emit glow when on, no glow when off
- [ ] Test hall aperture colors: shows correct animatronic color when present (blue/purple/yellow/red)
- [ ] Verify fog effect: back wall visible but darker/foggier at distance
- [ ] Test door meshes position: left at X=-10, right at X=+10, centered at Z=-9
- [ ] Verify CELEBRATE banner rendering: purple bar, yellow letters, streamers, child drawings visible

### 14.7 Night Progression Tests

**Night 1**:
- [ ] Verify AI all zeros: animatronics dormant
- [ ] Phone Guy plays introductory message
- [ ] Night intro card shows "NIGHT 1" for 2.2s
- [ ] Completing night unlocks Night 2

**Night 2**:
- [ ] Verify Bonnie at AI 3 (15% roll rate)
- [ ] Verify Chica at AI 1 (5% roll rate)
- [ ] Verify Foxy at AI 1
- [ ] Completing night unlocks Night 3

**Night 3**:
- [ ] Verify Chica at AI 5 (25% roll rate) — major jump
- [ ] Verify Foxy at AI 2
- [ ] Verify Bonnie back to AI 0
- [ ] At 2 AM: Bonnie AI increments to 1
- [ ] At 3 AM: Bonnie increments to 2, Chica/Foxy increment
- [ ] Completing night unlocks Night 4

**Night 4**:
- [ ] Verify Freddy AI is 1 or 2 (randomized at start, should be consistent throughout night)
- [ ] Verify Bonnie at AI 2, Chica at 4, Foxy at 6
- [ ] Completing night unlocks Night 5

**Night 5**:
- [ ] Verify all animatronics high AI: Freddy 3, Bonnie 5, Chica 7, Foxy 5
- [ ] Phone Guy message silent
- [ ] After beating night, newspaper screen appears (special ending)
- [ ] Completing night unlocks Night 6

**Night 6**:
- [ ] Verify extremely high AI: Freddy 4, Bonnie 10, Chica 12, Foxy 6
- [ ] Should be hardest challenge
- [ ] Completing night unlocks Custom Night (Night 7)

**Night 7 (Custom)**:
- [ ] Verify sliders allow 0-20 range for each animatronic
- [ ] Test 1/9/8/7 easter egg: immediate Golden Freddy jumpscare
- [ ] Test no in-night increments: sliders define total AI, not starting values
- [ ] Beating 20/20/20/20 mode should save achievement flag

### 14.8 Power Outage Sequence (CRITICAL)

- [ ] At power = 0: all doors force open immediately
- [ ] At power = 0: all lights force off immediately
- [ ] At power = 0: monitor forced closed, buttons disabled
- [ ] At power = 0: doorAudio plays notification
- [ ] At power = 0: powerOutAudio plays (electrical shutdown)
- [ ] At power = 0: powerDarkOverlay appears and fades to black (0.4s CSS transition)
- [ ] Screen stays black for 0.8-1.3 seconds (random delay)
- [ ] After delay: triggerGameOver('FREDDY_POWER') called automatically
- [ ] Freddy power jumpscare: freddy_jumpscare_power asset displayed (1100ms total)
- [ ] Game over screen shows "FREDDY FAZBEAR GOT YOU!" message

### 14.9 Audio Integration Tests

- [ ] Verify all audio elements exist in HTML (`<audio id="...">`)
- [ ] Test door audio: plays immediately on toggle, completes normally
- [ ] Test garble sounds: play when animatronics move (Bonnie/Chica only) while monitor open
- [ ] Test foxy sprint audio: plays when Foxy transitions to hallW position
- [ ] Test foxy punch audio: plays when Foxy hits closed door
- [ ] Test jumpscare audio: plays when any animatronic reaches office
- [ ] Test success audio: plays when 6 AM reached
- [ ] Test power-out audio: plays when power hits 0
- [ ] Test ambient audio: plays at game start, volume scales with power, stops at game end
- [ ] Verify all audio calls use `.play().catch()` for fail-safe

### 14.10 UI State Tests

- [ ] Verify power display updates every tick (0-100% range)
- [ ] Test time display: updates correctly, shows hours 0-5, minutes 0-59
- [ ] Verify night display shows correct night number (1-6 or "CUSTOM NIGHT")
- [ ] Test button active state: door/light buttons toggle `active` class when engaged
- [ ] Test button disabled state: buttons get `disabled` class during power outage
- [ ] Verify button visibility based on camera angle (left/right rotation threshold)
- [ ] Test camera grid appears/disappears when monitor toggle clicked
- [ ] Verify all overlays appear at correct times (intro, phone guy, game over, jumpscare)
- [ ] Test dark overlay during power outage: completely obscures all content

### 14.11 Edge Cases & Special Mechanics

- [ ] Test simultaneous animatronics reaching office: first one triggers jumpscare (should be rare/impossible with correct path timing)
- [ ] Test Freddy laugh audio: plays randomly; confirm doesn't interfere with gameplay
- [ ] Test Freddy jingle mechanic: plays at hallE_corner (Nights 2+), doesn't block movement
- [ ] Test Golden Freddy countdown: timer decreases while monitor closed, resets if monitor opened
- [ ] Test Bonnie backstage path: verify slower progression than direct paths
- [ ] Test monitor-up prevents movement: keep monitor open all night, verify Freddy/Foxy stationary
- [ ] Test rapid door toggling: confirm spring animation handles frequent state changes smoothly
- [ ] Test progress persistence: close browser, reopen, verify unlockedNights restored from localStorage

### 14.12 Browser Compatibility

- [ ] Test on Chrome (primary): all rendering, audio, and controls work
- [ ] Test on Firefox: Three.js WebGL rendering, audio synthesis via Web Audio API
- [ ] Test on Safari: verify audio fallback works (some audio APIs have limited support)
- [ ] Test on mobile: touch controls for mouse-based head-turn (may need touch event listeners)
- [ ] Test window resize: canvas scales, aspect ratio corrects
- [ ] Test fullscreen: if implemented, verify everything scales correctly

---

## SECTION 15: EXTENDED FEATURES & FUTURE ROADMAP

### 15.1 Possible Enhancements

**Difficulty Modes**:
- Permadeath mode (no retries)
- Hardcore mode (power drains faster)
- Relaxed mode (slower AI, more power)

**Accessibility**:
- Colorblind mode (animatronic colors adjusted)
- High-contrast UI mode
- Audio cues for visual events (animatronic presence)
- Remappable keyboard controls

**Realism**:
- Additional animatronics (Balloon Boy, Mangle, etc. from FNAF2)
- Animatronic damage/wear visual progression
- Environmental storytelling (torn posters, broken mechanics)
- Multiple jump scares per animatronic (variant animations)

**Meta Features**:
- Speedrun timer
- Leaderboard system
- Multiplayer mode (cooperative or competitive)
- Challenge days (specific scenarios)

---

## FINAL CHECKLIST FOR MASTER AGENT

### To Master the FNAF 1 Office, an AI Agent Must Understand:

- [ ] **Architecture**: Two-layer rendering (3D office + 2D cameras), decoupled but synchronized
- [ ] **Game Loop**: 100ms tick cycle, 1 tick = 0.1 in-game time units
- [ ] **Power System**: Base 0.01% drain per tick, +0.01% each for doors/lights/monitor, 0% = instant darkness then Freddy jumpscare 0.8-1.3s later
- [ ] **Doors**: Spring-physics animation, material swap on state change, blocks animatronics when closed
- [ ] **Lights**: Toggle on/off, affects hall aperture visibility, drains power
- [ ] **Animatronic AI**: Four characters, each with independent path, movement window, and blocking rules
- [ ] **Freddy**: Moves every 30 ticks only when monitor down; blocks at stage until Bonnie+Chica leave; forces through hallE_corner regardless of door
- [ ] **Bonnie**: Moves every 50 ticks regardless of monitor; blocks at hallW_corner if doorLeft closed
- [ ] **Chica**: Identical to Bonnie but mirrors on right side
- [ ] **Foxy**: MOST COMPLEX — can ONLY move when monitor down; grace period 50-1050 ticks after monitor closes; camera switch to pirate pushes back; punch mechanic drains 12% power if door closed
- [ ] **Collisions**: Animatronic at `office` position triggers instant jumpscare
- [ ] **Power Outage**: Screen goes black, 0.8-1.3s delay, then Freddy power jumpscare (Freddy_jumpscare_power asset, 1100ms duration)
- [ ] **Night Progression**: 6 story nights + 1 custom night; base AI + in-night increments (Bonnie +1/2AM, Chica/Foxy +1/3AM)
- [ ] **Cameras**: 11 feeds, procedurally drawn, animatronics appear based on current path position
- [ ] **3D Office**: Three.js scene, camera at (0, 4, 7.5), head-turn via mouse X (±35°), doors spring-animate
- [ ] **Audio**: Synthesized via Web Audio API, all SFX dynamically generated
- [ ] **UI**: Power gauge, time display, camera grid, night intro, phone guy message, game-over screens
- [ ] **Progress**: localStorage persistence, nights unlock sequentially, 20/20/20/20 achievement tracking
- [ ] **Edge Cases**: Darkness mechanic, Foxy monitor lock, Freddy stage block, Golden Freddy countdown, Bonnie backstage detour, Freddy jingle non-blocking
- [ ] **Performance**: No shadow maps, capped pixel ratio, offline audio synthesis, small runtime footprint (~30 MB)

---

## GLOSSARY

| Term | Definition |
|------|-----------|
| **Tick** | One 100ms game loop iteration; game.time increments by 0.1 per tick |
| **In-game hour** | 90 time units = 15 ticks ≈ 1.5 real seconds |
| **AI roll** | `Math.random() * 20 < ai_level` check to determine animatronic movement |
| **Movement window** | Periodic countdown (30 or 50 ticks) during which AI rolls can occur |
| **Grace period** | Foxy-specific: 50-1050 tick delay after monitor closes before he can move |
| **Pushback** | Foxy mechanic: switching camera to pirate cove decrements Foxy's path position |
| **Spring physics** | Door animation: velocity-based system with stiffness (K) and damping coefficients |
| **Jumpscare** | Game-over event triggered when animatronic reaches office or during power outage |
| **Monitor** | In-game camera system; `monitorOpen` flag controls rendering and AI behavior |
| **Dark overlay** | `#powerDarkOverlay` CSS element that covers entire screen during power outage |
| **Hall aperture** | 3D viewport showing animatronic presence in hallway; colored glow |
| **Garble sound** | Audio distortion effect played when animatronics move while camera is open |
| **Path node** | Position index within animatronic's pathfinding sequence (0 = start, N = office) |
| **Blocking** | Rule preventing animatronic from advancing past a position (e.g., closed door blocks hallway animatronic) |

---

**Document Version**: 1.0 (March 16, 2026)
**Completeness**: 100% (all systems documented with intricate detail)
**Target Audience**: AI development agents tasked with implementing, extending, debugging, or rewriting the FNAF 1 office game
