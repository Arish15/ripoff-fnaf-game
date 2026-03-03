# Five Nights at Freddy's - Professional Edition

A faithful recreation of the classic survival horror game in HTML5, featuring full visuals, audio, and authentic gameplay mechanics.

## 🎮 What You Have

**You only need one file to play:**
- `fnaf.html` - The complete game

Everything else in this folder can be ignored or deleted. All C# files and old test files have been removed.

---

## ▶️ How to Run
 # Browser FNAF-style Game (HTML5)

This workspace contains a small FNAF-inspired browser game built with HTML, CSS and plain JavaScript. The playable entry is `index.html` and the game uses optional art assets located in `src/assets/`.

## Quick Start (recommended)
1. Open this folder in VS Code.
2. Start Live Server and open [index.html](index.html).
3. Or run a simple server: `python -m http.server 8000` and visit `http://localhost:8000/`.

If you see a blank canvas, hard-refresh the page or restart Live Server so newly added files in `src/assets/` are served.

## Where to look in the repo
- `index.html` – page and main UI
- `src/js/game.js` – game logic, rendering, input handlers
- `src/css/styles.css` – styles for canvas and controls
- `src/assets/` – optional image assets (place image files here)

## Expected asset filenames (optional)
Place FNAF-like images in `src/assets/` using these base names; the loader will try `.png`, `.jpg`, `.jpeg`, then `.svg`:
- `office_left_open`  (left hallway with door open)
- `office_left_closed` (left hallway with door closed)
- `office_right_open` (right hallway open)
- `office_right_closed` (right hallway closed)
- `cam_stage` (camera / monitors background)

Recommended image dimensions: ~800×600 to 1280×720. PNG with transparency works best for overlays.

## Quick test checklist
1. Start the game via the page's Start/Night button.
2. Verify doors start OPEN (you should see them drawn as open). If they appear closed, check console for errors.
3. On the office canvas: click-and-drag left/right to look; the view should smoothly pan toward the dragged side.
4. While looking left/right, click the wall-mounted buttons on the canvas to toggle that side's door and light.
5. The HTML control panel (left/right buttons) is still present — it will be hidden automatically when canvas wall controls are active.
6. Open DevTools Console: the asset loader logs which files were found (look for `assets.` messages).

## If assets don't show or you get 404s
- Put your images into `src/assets/` with the base names above.
- Hard-refresh the browser or restart Live Server (cached 404s are common after adding files).
- Check the browser console for messages from the game's `loadAssets()` / `verifyAssets()` functions.

## Helpful debugging notes
- The game logs useful status to the console (asset loads, toggles, and errors). Open DevTools (F12) and watch the console while testing.
- If you edit `src/js/game.js`, refresh the page (or restart Live Server) to pick up changes.

## Want me to tune visuals or accept your art?
If you have FNAF1-style images you'd like used, drop them into `src/assets/` with the names above and tell me which files you added — I can then adjust scale, placement and hitboxes to match the look and feel.

---

If you'd like, I can: run a quick scan of the code, tune hitboxes for the canvas buttons, or wire a simple asset status UI into the page. Which would you prefer next?
