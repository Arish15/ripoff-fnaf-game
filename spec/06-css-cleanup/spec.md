# Spec 06 — CSS Cleanup & Consolidation

**Risk:** Very low  
**Effort:** Small (~2 hours)  
**Prerequisite:** None

---

## Problem

`src/css/styles.css` is **1365 lines** in a single flat file with no logical grouping. Issues:
- Rules for unrelated components (start screen, HUD, camera grid, game-over screen, custom night) are
  interleaved with no section headers.
- Several selectors are duplicated with conflicting property values (last-write wins — confusing).
- Magic hex colours (`#1a1a1a`, `#2a2a2a`, `#333`, `#444`) repeated 30+ times — changing the dark
  theme requires 30 find-replaces.
- `src/css/office.css` duplicates the `#goldenFreddyOverlay` rule.

---

## Target Structure

```
src/css/
  styles.css       ← keep single file (no build step) but add clear section structure
  office.css       ← deduplicate golden freddy rule
```

No file split needed — a single well-structured file is fine for a game of this size. The goal is
**section headers + CSS custom properties** for theme values.

---

## Section Structure for styles.css

```css
/* ═══════════════════════════════════════════
   1. CSS CUSTOM PROPERTIES (design tokens)
   ═══════════════════════════════════════════ */
:root {
    --bg-dark:       #1a1a1a;
    --bg-mid:        #2a2a2a;
    --bg-panel:      #333;
    --bg-btn:        #444;
    --text-primary:  #ccc;
    --text-dim:      #888;
    --accent-red:    #c0392b;
    --accent-green:  #27ae60;
    --power-critical:#ff4444;
    --door-btn-bg:   #222;
    --overlay-dark:  rgba(0,0,0,0.85);
}

/* ═══════════════════════════════════════════
   2. RESET & BASE
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   3. LAYOUT — #gameContainer, #officeArea, z-index stack
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   4. START SCREEN — #startScreen, .nightBtn, .nightSelector
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   5. CUSTOM NIGHT — #customNightSetup, .ai-slider-group
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   6. HUD — #powerArea, #timeDisplay, #nightDisplay, .usage-block
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   7. CAMERA MONITOR — #monitorArea, #cameraCanvas, #cameraGrid, .camBtn
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   8. OFFICE CONTROLS — #cameraToggleBtn, .office-btn (door/light buttons)
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   9. OVERLAYS — #powerDarkOverlay, #nightIntro, #hallucinationOverlay
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   10. GAME OVER / NIGHT COMPLETE — #gameOverScreen, #nightCompleteScreen
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   11. PHONE GUY — .phone-guy-overlay
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   12. NEWSPAPER ENDING — #newspaperScreen
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   13. ANIMATIONS — @keyframes definitions
   ═══════════════════════════════════════════ */
```

---

## Specific Fixes

### 1. CSS custom properties for repeated values
Replace all occurrences of raw hex theme values with `var(--bg-dark)` etc.
Estimated reduction: ~40 raw colour values → 8 variables.

### 2. Duplicate selectors
Run: `grep -n "^#gameOverScreen\|^\.nightBtn\|^#powerArea" styles.css`
Merge duplicate blocks — keep the last (effective) rule, merge any additive properties from earlier.

### 3. office.css — duplicate `#goldenFreddyOverlay`
```css
/* BEFORE: appears twice */
#goldenFreddyOverlay { ... }   /* line ~40 */
#goldenFreddyOverlay { ... }   /* line ~85 — duplicate */

/* AFTER: one merged rule */
#goldenFreddyOverlay { ... }
```

### 4. `power-critical` animation
Currently the `.power-critical` class toggles are added/removed in JS. Ensure the CSS animation
is defined once under section 13 (`@keyframes powerFlash`) and referenced in section 6 only.

---

## Verification
- Visual regression: start screen, night selector, camera grid, HUD, game-over screen all look
  identical before and after.
- Verify `--power-critical` animation flashes below 15% power.
- Confirm no orphaned class/ID references (grep for each custom property before removing raw values).
