# FNAF 1 Game Polish & Compliance - TODO List

## PHASE 1: GATHER REFERENCES

- [ ] 1.1: YouTube search "FNAF 1 camera gameplay" → capture all 11 cameras
- [ ] 1.2: Find official FNAF 1 game files / assets online
- [ ] 1.3: Screenshot CAM 1A–1C (stage, dining, pirate cove)
- [ ] 1.4: Screenshot CAM 2A, 2B (halls west)
- [ ] 1.5: Screenshot CAM 3, 4A, 4B (halls east)
- [ ] 1.6: Screenshot CAM 5, 6, 7 (backstage, kitchen, restrooms)
- [ ] 1.7: Screenshot FNAF 1 HUD (power meter, time display, camera grid)
- [ ] 1.8: Screenshot FNAF 1 office view (lighting, darkness, door appearance)
- [ ] 1.9: Document official AI difficulty progression (nights 1–6)
- [ ] 1.10: Document official power drain rate & light/door costs
- [ ] 1.11: Document official animatronic paths & behavior

## PHASE 2: VALIDATE AGAINST OFFICIAL

- [ ] 2.1: CAM 1A comparison → identify differences
- [ ] 2.2: CAM 1B comparison → identify differences
- [ ] 2.3: CAM 1C comparison → identify differences
- [ ] 2.4: CAM 2A comparison → identify differences
- [ ] 2.5: CAM 2B comparison → identify differences
- [ ] 2.6: CAM 3 comparison → identify differences
- [ ] 2.7: CAM 4A comparison → identify differences
- [ ] 2.8: CAM 4B comparison → identify differences
- [ ] 2.9: CAM 5 comparison → identify differences
- [ ] 2.10: CAM 6 comparison → identify differences
- [ ] 2.11: CAM 7 comparison → identify differences
- [ ] 2.12: 3D office lighting comparison → darkness level needed
- [ ] 2.13: AI progression review → gaps in difficulty scaling
- [ ] 2.14: Power/cost mechanics review → verify accuracy
- [ ] 2.15: Jumpscare mechanics review → verify accuracy

## PHASE 3A: FIX POWER METER VISIBILITY

- [x] 3A.1: Measure current camera grid size & position (styles.css)
- [x] 3A.2: Measure current power meter position (index.html)
- [x] 3A.3: Calculate overlap and required grid width reduction
- [x] 3A.4: Update #cameraGrid CSS width in styles.css
- [x] 3A.5: Adjust camera button positions in index.html to fit new grid
- [x] 3A.6: Update SVG connector lines to match new grid
- [ ] 3A.7: Test power visible on 320px phone screen
- [ ] 3A.8: Test power visible on 1920px desktop
- [ ] 3A.9: Test power visible on 4K (3840px) screen
- [ ] 3A.10: Verify no button hovers obscure power text

## PHASE 3B: BUTTON VISIBILITY TOGGLE

- [x] 3B.1: Add office3d.getRotation() method in office3d.js
- [x] 3B.2: Define rotation threshold constant (~0.3 rad for ±17°)
- [x] 3B.3: Add button visibility logic in game.js tickGame()
- [x] 3B.4: Add CSS classes .office-btn.hidden / .visible in office.css
- [x] 3B.5: Add transition: opacity 0.2s ease to buttons
- [ ] 3B.6: Test button visibility when rotating left (camera.rotY > threshold)
- [ ] 3B.7: Test button visibility when rotating right (camera.rotY < -threshold)
- [ ] 3B.8: Test button visibility when looking forward (|rotY| < threshold)
- [ ] 3B.9: Test buttons are clickable when visible
- [ ] 3B.10: Test buttons are non-clickable when hidden
- [ ] 3B.11: Test smooth opacity transition (no jarring snaps)

## PHASE 4A: DARKEN 3D OFFICE LIGHTING

- [x] 4A.1: Document current ambient light intensity (was 0.65, now 0.38)
- [x] 4A.2: Document current directional light intensity (was 1.1 main, 1.0 sides)
- [x] 4A.3: Calculate new ambient intensity from Phase 2 reference (0.38 applied)
- [x] 4A.4: Calculate new directional intensity from Phase 2 reference (0.75 main, 0.7 sides)
- [x] 4A.5: Update ambient light in office3d.js buildLights()
- [x] 4A.6: Update directional light in office3d.js buildLights()
- [x] 4A.7: Verify fog color (0x1a1208) is appropriate for new darkness
- [ ] 4A.8: Test office looks "night-like" vs. Phase 2 screenshot
- [ ] 4A.9: Test doors are still readable (not total black)
- [ ] 4A.10: Test desk/controls still visible with lights on
- [ ] 4A.11: Test vignette pairs well with lower ambient light

## PHASE 4B: DARKEN CAMERA FEEDS & MONITOR

- [x] 4B.1: Review current camera background colors in cameras.js
- [ ] 4B.2: Gather Phase 2 darkness data for each of 11 cameras
- [x] 4B.3: CAM 1A → update background color
- [x] 4B.4: CAM 1B → update background color
- [x] 4B.5: CAM 1C → update background color
- [x] 4B.6: CAM 2A → update background color
- [x] 4B.7: CAM 2B → update background color
- [x] 4B.8: CAM 3 → update background color
- [x] 4B.9: CAM 4A → update background color
- [x] 4B.10: CAM 4B → update background color
- [x] 4B.11: CAM 5 → update background color
- [x] 4B.12: CAM 6 (kitchen) → update background color
- [x] 4B.13: CAM 7 → update background color
- [ ] 4B.14: Verify all camera labels still readable
- [ ] 4B.15: Update monitor stand colors/opacity if needed (styles.css)

## PHASE 5A: FIX ALL 11 CAMERA VIEWS

### CAM 1A (Stage)
- [ ] 5A.1a: Gather reference image
- [ ] 5A.1b: Compare current vs. reference
- [x] 5A.1c: Update drawCamBg() in cameras.js
- [ ] 5A.1d: Test rendering at multiple screen sizes

### CAM 1B (Dining)
- [ ] 5A.2a: Gather reference image
- [ ] 5A.2b: Compare current vs. reference
- [x] 5A.2c: Update drawCamBg() in cameras.js
- [ ] 5A.2d: Test rendering at multiple screen sizes

### CAM 1C (Pirate Cove)
- [ ] 5A.3a: Gather reference image
- [ ] 5A.3b: Compare current vs. reference
- [x] 5A.3c: Update drawCamBg() in cameras.js
- [ ] 5A.3d: Test rendering at multiple screen sizes

### CAM 2A (W. Hall)
- [ ] 5A.4a: Gather reference image
- [ ] 5A.4b: Compare current vs. reference
- [x] 5A.4c: Update drawCamBg() in cameras.js
- [ ] 5A.4d: Test rendering at multiple screen sizes

### CAM 2B (W. Hall Corner)
- [ ] 5A.5a: Gather reference image
- [ ] 5A.5b: Compare current vs. reference
- [x] 5A.5c: Update drawCamBg() in cameras.js
- [ ] 5A.5d: Test rendering at multiple screen sizes

### CAM 3 (E. Hall)
- [ ] 5A.6a: Gather reference image
- [ ] 5A.6b: Compare current vs. reference
- [x] 5A.6c: Update drawCamBg() in cameras.js
- [ ] 5A.6d: Test rendering at multiple screen sizes

### CAM 4A (E. Hall Corner)
- [ ] 5A.7a: Gather reference image
- [ ] 5A.7b: Compare current vs. reference
- [x] 5A.7c: Update drawCamBg() in cameras.js
- [ ] 5A.7d: Test rendering at multiple screen sizes

### CAM 4B (E. Doorway)
- [ ] 5A.8a: Gather reference image
- [ ] 5A.8b: Compare current vs. reference
- [x] 5A.8c: Update drawCamBg() in cameras.js
- [ ] 5A.8d: Test rendering at multiple screen sizes

### CAM 5 (Backstage)
- [ ] 5A.9a: Gather reference image
- [ ] 5A.9b: Compare current vs. reference
- [x] 5A.9c: Update drawCamBg() in cameras.js
- [ ] 5A.9d: Test rendering at multiple screen sizes

### CAM 6 (Kitchen)
- [ ] 5A.10a: Gather reference image
- [ ] 5A.10b: Compare current vs. reference
- [x] 5A.10c: Update drawCamBg() in cameras.js
- [ ] 5A.10d: Test rendering at multiple screen sizes

### CAM 7 (Restrooms)
- [ ] 5A.11a: Gather reference image
- [ ] 5A.11b: Compare current vs. reference
- [x] 5A.11c: Update drawCamBg() in cameras.js
- [ ] 5A.11d: Test rendering at multiple screen sizes

### Final verification
- [ ] 5A.12: Octuple-check: side-by-side all 11 cameras vs. reference images
- [ ] 5A.13: Re-verify all 11 cameras match official exactly
- [ ] 5A.14: Final check: all camera details correct

## PHASE 6A: ALIGN AI DIFFICULTY PROGRESSION

- [x] 6A.1: Document current NIGHT_AI object in ai.js
- [ ] 6A.2: Gather Phase 2 official AI difficulties for nights 1–6
- [x] 6A.3: Compare Night 1 AI values vs. official
- [x] 6A.4: Compare Night 2 AI values vs. official
- [x] 6A.5: Compare Night 3 AI values vs. official
- [x] 6A.6: Compare Night 4 AI values vs. official
- [x] 6A.7: Compare Night 5 AI values vs. official
- [x] 6A.8: Compare Night 6 AI values vs. official
- [x] 6A.9: Update NIGHT_AI with official values if differences found
- [ ] 6A.10: Test playing Night 1 → feels appropriately easy
- [ ] 6A.11: Test playing Night 3 → feels moderately hard
- [ ] 6A.12: Test playing Night 6 → feels extremely hard

## PHASE 6B: VERIFY POWER & RESOURCE COSTS

- [x] 6B.1: Document current power drain rate (% per 100ms tick)
- [ ] 6B.2: Gather Phase 2 official power drain rate
- [x] 6B.3: Compare and adjust in game.js if different
- [x] 6B.4: Document current door open/close power cost
- [ ] 6B.5: Gather Phase 2 official door cost
- [x] 6B.6: Compare and adjust in game.js if different
- [x] 6B.7: Document current light on/off power cost
- [ ] 6B.8: Gather Phase 2 official light cost
- [x] 6B.9: Compare and adjust in game.js if different
- [ ] 6B.10: Test playing a full night → power reaches ~0% near 6 AM
- [ ] 6B.11: Test power drain with no door/light usage → verify timing
- [ ] 6B.12: Test power drain with optimal door/light strategy → verify challenge

## PHASE 6C: VERIFY JUMPSCARE & GAME OVER MECHANICS

- [x] 6C.1: Review current jumpscare trigger conditions in game.js
- [ ] 6C.2: Gather Phase 2 official jumpscare triggers
- [ ] 6C.3: Compare jumpscare on "door left open too long"
- [x] 6C.4: Compare jumpscare on "power runs out"
- [ ] 6C.5: Compare jumpscare on "animatronic reaches office"
- [ ] 6C.6: Update jumpscare conditions in game.js if different
- [ ] 6C.7: Verify jumpscare audio plays correctly (jumpscare.mp3)
- [ ] 6C.8: Verify jumpscare visual cue shows (black screen, image, etc.)
- [ ] 6C.9: Test jumpscare triggers at correct time (not too early/late)
- [ ] 6C.10: Test power outage jumpscare behavior
- [ ] 6C.11: Test door jumpscare behavior
- [ ] 6C.12: Verify game over screen matches official style

## VERIFICATION

- [ ] V.1: Phase 3A → power meter visible at all screen sizes
- [ ] V.2: Phase 3B → buttons snap visible/hidden with rotation
- [ ] V.3: Phase 4A → 3D office noticeably darker; matches reference
- [ ] V.4: Phase 4B → all 11 cameras match reference darkness
- [ ] V.5: Phase 5A → all 11 cameras match reference visuals (octuple-checked)
- [ ] V.6: Phase 6A → AI difficulty progression matches official
- [ ] V.7: Phase 6B → power drain timing matches official
- [ ] V.8: Phase 6C → jumpscares match official behavior
- [ ] V.9: Full playthrough Night 1 → all mechanics feel right
- [ ] V.10: Full playthrough Night 2 → progressive difficulty works
- [ ] V.11: Full playthrough Night 3 → challenge level appropriate
- [ ] V.12: Performance check → 60 FPS maintained
- [ ] V.13: Console check → no errors or warnings
- [ ] V.14: Final check → all 6 phases complete, game matches FNAF 1

---

**Total: 182 checkboxes**