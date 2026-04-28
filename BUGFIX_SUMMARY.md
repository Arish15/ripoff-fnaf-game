# Three.js Office Canvas Rendering Fix

## Problem Statement
Three.js office canvas failed to render reliably when entering night mode due to race conditions in initialization, improper DOM layout timing, and missing safeguards against visibility state changes.

## Root Causes Identified

1. **Race Condition in startGame()**: Office3d init was called in a 50ms setTimeout without verifying container dimensions were calculated.
2. **No Layout Reflow Before Init**: Display was set but no forced reflow occurred before Three.js tried to access clientWidth/clientHeight (could be 0x0).
3. **Missing Container Dimension Validation**: office3d.init() didn't validate container was actually visible or properly sized.
4. **No Animation Loop Safeguard**: animate() could fail partway through initialization without proper error handling.
5. **Incomplete State Check on Monitor Toggle**: toggleMonitor() didn't verify game state before revealing office after monitor close.
6. **Canvas Size Enforcement Missing**: Canvas wasn't forced to fill its container with CSS styling.
7. **Incomplete Cleanup on Return to Start**: returnToStart() didn't explicitly hide the office or reset its state.

## Solutions Applied

### 1. src/js/game.js - startGame() Function (Lines 205-232)

**Changes:**
- Added explicit DOM reflow trigger: `void officeEl.offsetHeight;` to force layout calculation
- Increased setTimeout delay from 50ms to 100ms to allow proper layout
- Added guard condition: checks `!monitorOpen` before init to avoid race with monitor toggle
- Added explicit show() call after init to start rendering immediately
- Added safety check: returns early if game.running becomes false (player restarted during init)

**Impact:** Ensures container is properly laid out before Three.js reads dimensions.

### 2. src/js/game.js - returnToStart() Function (Lines 480-497)

**Changes:**
- Added explicit office3d.hide() call before hiding officeArea element
- Properly sequenced: hide renderer → hide container → reset monitor state

**Impact:** Ensures clean teardown and prevents rendering race conditions.

### 3. src/js/office3d.js - init() Function (Lines 83-135)

**Changes:**
- **Early container dimension check** (lines 95-104): Gets dimensions and validates they're ≥10px; if not, reschedules init and returns
- **Canvas styling enforcement** (lines 124-126): Forces canvas to display:block and fill container 100%x100%
- **Moved animation cancel to start** (lines 89-91): Ensures no stale RAF callbacks are running before reinit
- **Better logging**: Added console.warn with dimensions for debugging

**Impact:** Prevents Three.js from attempting to render to zero-sized canvas; gracefully retries if layout isn't ready.

### 4. src/js/office3d.js - animate() Function (Lines 1530-1559)

**Changes:**
- **Early exit guard** (line 1531): Checks renderer/scene/camera existence before scheduling next RAF frame
- **RAF scheduling order** (line 1532): Schedules next frame BEFORE attempting render (prevents lost frames if render fails)
- **Render try-catch** (lines 1554-1558): Wraps renderer.render() to catch and log WebGL errors without crashing loop

**Impact:** Prevents infinite loops or frozen states if rendering fails; provides diagnostic logging.

### 5. src/js/office3d.js - show() Function (Lines 1638-1649)

**Changes:**
- **Forced reflow** (line 1643): `void c.offsetHeight;` triggers layout recalculation
- **Animation loop check** (lines 1646-1648): Only starts animate() if not already running AND renderer is ready
- **Null safety**: Checks for officeScene element existence

**Impact:** Ensures rendering resumes after returning from monitor or visibility changes.

### 6. src/js/office3d.js - onResize() Function (Lines 1656-1679)

**Changes:**
- **Zero-size safeguard** (lines 1664-1667): Logs warning and skips resize if container too small
- **Aspect ratio epsilon** (line 1673): Only updates if aspect changes >1% to prevent redundant updates
- **Size mismatch detection** (line 1673): Checks actual canvas size vs container, not just aspect ratio
- **Console logging** (line 1677): Provides dimension feedback for debugging resize issues

**Impact:** Prevents invalid camera updates; validates resize requests before applying.

### 7. src/js/cameras.js - toggleMonitor() Function (Lines 1330-1387)

**Changes:**
- **Monitor open path** (lines 1354-1360): Clears any pending close timeout before hiding office
- **Monitor close path** (lines 1372-1385):
  - Clears pending timeout to avoid race
  - Adds game state check: `if (game.running && !monitorOpen)` before revealing office
  - Calls `window.office3d.show()` to resume rendering explicitly
  - Increased delay documentation (250ms matches CSS transition)

**Impact:** Prevents office from flickering in/out during rapid monitor toggling; ensures proper render resume timing.

## Files Changed

1. **src/js/game.js**
   - startGame(): Lines 205-232 (28 lines modified)
   - returnToStart(): Lines 480-497 (18 lines modified)

2. **src/js/office3d.js**
   - init(): Lines 83-135 (53 lines modified, mostly reordered with new validation)
   - animate(): Lines 1530-1559 (30 lines modified)
   - show(): Lines 1638-1649 (12 lines modified)
   - onResize(): Lines 1656-1679 (24 lines modified)

3. **src/js/cameras.js**
   - toggleMonitor(): Lines 1330-1387 (58 lines modified)

## Test Scenarios Covered

✓ **First night start**: Canvas initializes on night entry
✓ **Restart/Return to menu**: Office cleans up, next start reinitializes
✓ **Monitor toggle** (open/close): Office hides/shows with proper timing
✓ **Rapid monitor toggles**: No race conditions or flickering
✓ **Window resize after start**: Camera aspect and canvas size update correctly
✓ **Resize to very small window**: Gracefully skips updates instead of crashing
✓ **Power outage sequence**: Office properly hidden during Freddy scene
✓ **Game over sequence**: Office teardown doesn't interfere with jumpscare

## Assumptions

1. Three.js and window.THREE are loaded before game.js
2. DOM elements (#officeScene, #officeArea, #cameraGrid, #monitorArea, #cameraToggleBtn) exist in HTML
3. CSS transitions on #monitorArea take ~250ms (matches .visible toggle animation)
4. Browser supports requestAnimationFrame and offsetHeight access
5. Office3d uses global scope for renderer/scene/camera/animId (closure preserved)

## Performance Impact

- **Minimal**: All changes are guards/checks, not new heavy operations
- **Benefit**: Prevents WebGL context loss and infinite loop states that would crash rendering entirely
- **No regression**: All existing gameplay logic unchanged; only initialization and state synchronization improved

## Rollback Path

Each change is independent and can be reverted:
- game.js startGame: Revert to original 50ms setTimeout without reflow checks
- game.js returnToStart: Remove office3d.hide() call
- office3d.js init: Remove container size validation, revert to original order
- office3d.js animate/show/onResize: Remove guards and logging
- cameras.js toggleMonitor: Remove game state checks on monitor close

No database migrations or persistence changes required.
