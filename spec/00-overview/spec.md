# Refactoring Overview — FNAF Browser Game

## Executive Summary

The codebase works correctly but has accumulated significant structural debt from rapid agent-driven
development. All JS runs as **globally-scoped scripts with no module system**, every file reads and
writes a shared `game` object, and three files (`office3d.js` 2209 LOC, `cameras.js` 1394 LOC,
`game.js` 778 LOC) are doing the work of 10–15 focused modules each.

The refactors below are **independent tracks** — each can be done and shipped without the others.
Ordering is by risk/reward ratio.

---

## Problem Inventory

| # | File | LOC | Primary Problem |
|---|------|-----|-----------------|
| 1 | `src/js/office3d.js` | 2209 | Monolith — scene, doors, lights, materials, hit-test, RAF loop all in one IIFE |
| 2 | `src/js/cameras.js` | 1394 | Monolith — canvas art, monitor UI state, cam switching, RAF loop all mixed |
| 3 | `src/js/game.js` | 778 | God controller — game loop, night manager, power system, game-over, dev tools |
| 4 | `src/js/sounds.js` | 538 | Mixed concerns — procedural synthesis + asset loading in one file |
| 5 | `src/css/styles.css` | 1365 | Single stylesheet with no scoping, heavy duplication |
| 6 | All JS | — | Global-variable coupling — every file writes to `window.game`, `window.animatronics`, etc. |
| 7 | `src/js/extras.js` | ? | Catch-all module — Golden Freddy, hallucinations, Phone Guy, stars crammed together |
| 8 | `src/js/ai.js` | 319 | Magic numbers, hidden mutable fields on animatronic objects, hard to test |
| 9 | `index.html` | 322 | All UI in one file; inline `onclick` everywhere; duplicate audio `<source>` tags |
| 10 | Dead code | — | `src/html/header.html` stale, `src/js/office.js` legacy 2D renderer body never runs |

---

## Refactoring Tracks

| Spec | Name | Impact | Risk | Effort |
|------|------|--------|------|--------|
| [01](../01-module-system/spec.md) | ES Module system | Fixes root cause of all coupling | High — load order changes | Large |
| [02](../02-game-controller/spec.md) | Split game.js | Readability, testability | Medium — many globals touched | Medium |
| [03](../03-office3d-renderer/spec.md) | Split office3d.js | Maintainability of 3D layer | Low — well-isolated IIFE | Large |
| [04](../04-camera-system/spec.md) | Split cameras.js | Maintainability of 2D layer | Low — contained | Large |
| [05](../05-audio-system/spec.md) | Separate audio concerns | Clean asset vs. synthesis paths | Low | Small |
| [06](../06-css-cleanup/spec.md) | CSS consolidation | Easier styling | Very low | Small |
| [07](../07-dead-code/spec.md) | Remove dead code | Reduce confusion | Zero | Tiny |

---

## Recommended Execution Order

```
Phase 1 (no-brainer, zero risk):
  07 → dead code removal  (clean the noise first)
  06 → CSS deduplicate    (mechanical, safe)

Phase 2 (split the monoliths, still within global-script model):
  02 → split game.js      (most-read file, highest daily pain)
  05 → split sounds.js    (self-contained, no gameplay risk)

Phase 3 (big structural wins):
  03 → split office3d.js  (3D renderer modularisation)
  04 → split cameras.js   (2D renderer modularisation)

Phase 4 (root-cause fix, do last when rest is clean):
  01 → ES modules          (convert everything, update index.html)
```

Phase 4 is deliberately last — converting to ES modules is easiest when each module is already
small and well-scoped from Phases 2–3.
