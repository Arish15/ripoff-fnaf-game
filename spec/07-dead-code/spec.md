# Spec 07 — Dead Code Removal

**Risk:** Zero  
**Effort:** ~30 min  
**Prerequisite:** None

---

## What to Remove

### 1. `src/html/header.html`
- A partial HTML fragment with stale `sounds/` asset paths (current path is `src/assets/`).
- References no existing file in the repo.
- Not `<include>`d or referenced anywhere in `index.html` or any JS.
- **Action:** Delete file.

### 2. `src/js/office.js` — `drawOffice()` body
`office.js` contains a `drawOffice()` function that begins with an early `return` statement:
```js
function drawOffice() {
    return; // Three.js handles this now
    // ... 200+ lines of dead 2D canvas code ...
}
```
The entire body after `return` is unreachable and has been superseded by `office3d.js`.
- **Action:** Delete the unreachable body. Keep the function signature as a no-op stub only if
  anything calls it (grep first — if nothing calls it, delete the whole function).

### 3. Duplicate audio `<source>` in `index.html`
`lightAudio` and `lightHumAudio` both point to the same file:
```html
<audio id="lightAudio">
    <source src="src/assets/fnaf-light-sound.mp3" type="audio/mpeg">
</audio>
<audio id="lightHumAudio" loop>
    <source src="src/assets/fnaf-light-sound.mp3" type="audio/mpeg">  ← same file
</audio>
```
These are intentionally separate elements (one-shot click vs. looping hum) so **the elements stay**,
but the duplication should be documented clearly with a comment so future devs don't "fix" it.

### 4. `office.css` — Duplicated Golden Freddy block
The `#goldenFreddyOverlay` rule appears twice in `src/css/office.css`.
- **Action:** Deduplicate — keep the more complete rule, delete the duplicate.

---

## Verification Steps
1. `grep -r "drawOffice" src/` — confirm nothing calls it.
2. `grep -r "header.html" .` — confirm nothing includes it.
3. Run game through Night 1 start → door close → light toggle → camera open → 6AM complete.
4. Confirm no console errors.
