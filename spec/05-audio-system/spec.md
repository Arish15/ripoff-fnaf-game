# Spec 05 — Audio System Separation

**Risk:** Low  
**Effort:** Small (~2–3 hours)  
**Prerequisite:** None

---

## Problem

`sounds.js` (538 lines) conflates two entirely different responsibilities:

| Concern | Description |
|---------|-------------|
| **Procedural synthesis** | Builds SFX waveforms from scratch using `OfflineAudioContext`, `OscillatorNode`, `GainNode`, etc. |
| **Asset loading** | `tryRealOrFallback()` — tries real `.mp3` first, falls back to synthesised WAV blob |

These have opposite failure modes. Synthesis fails silently and degrades gracefully. Asset loading
involves network fetches with `onload`/`onerror`. Mixing them makes both harder to debug and harder
to replace (e.g., swapping in Howler.js would require excavating synthesis code).

There is also heavy duplication in the oscillator/gain graph patterns — every sound uses
`ctx.createOscillator()` → `ctx.createGain()` → `source.connect(gain)` → `gain.connect(ctx.destination)`
with minor parameter variation.

---

## Target Split

```
src/js/audio/
  synthesiser.js    ← all OfflineAudioContext / oscillator code; exports build* functions
  loader.js         ← tryRealOrFallback(), assignToAudio(), initSounds() orchestrator
  sounds.js         ← thin entry (kept for compat); just calls initSounds() on DOMContentLoaded
```

---

## synthesiser.js

Owns all Web Audio graph construction. Exports named builder functions.

```js
// Internal helper — eliminates oscillator/gain boilerplate
function _synth(sampleRate, duration, fn) {
    var ctx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);
    fn(ctx);
    return ctx.startRendering(); // returns Promise<AudioBuffer>
}

// Public builders — each returns a Promise<Blob> (WAV)
function buildDoorSound()       { return _synth(22050, 0.4, function(ctx) { ... }); }
function buildJumpScareSound()  { return _synth(44100, 1.2, function(ctx) { ... }); }
function buildGarbleSound()     { return _synth(22050, 0.3, function(ctx) { ... }); }
function buildAmbientLoop()     { return _synth(44100, 8.0, function(ctx) { ... }); }
// ... one function per sound ...
```

**Deduplication win:** Currently each sound has 15–25 lines of near-identical graph code.
The `_synth` helper reduces that to ~8 lines per sound — roughly 40% size reduction.

---

## loader.js

Owns all asset-loading logic. Calls synthesiser only as fallback.

```js
/**
 * Try to load a real audio asset; fall back to procedural WAV on error.
 * @param {string} elementId  - DOM audio element ID
 * @param {string} assetPath  - e.g. 'src/assets/door.mp3'
 * @param {Function} buildFn  - synthesiser builder function (called only if asset missing)
 */
function tryRealOrFallback(elementId, assetPath, buildFn) {
    var el = document.getElementById(elementId);
    if (!el) return;
    var probe = new Audio();
    probe.onerror = function() {
        buildFn().then(function(buffer) {
            el.src = _bufferToObjectURL(buffer);
        });
    };
    probe.src = assetPath;
}

function initSounds() {
    tryRealOrFallback('doorAudio',      'src/assets/door.mp3',      buildDoorSound);
    tryRealOrFallback('jumpScareAudio', 'src/assets/jumpscare.mp3', buildJumpScareSound);
    // ... one line per sound element ...
}
```

---

## Duplication Patterns to Fix in synthesiser.js

Current code repeats this pattern for nearly every sound (copy-pasted ~20×):
```js
var osc = ctx.createOscillator();
var gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);
osc.frequency.setValueAtTime(freq, 0);
gain.gain.setValueAtTime(vol, 0);
gain.gain.linearRampToValueAtTime(0, duration);
osc.start(0);
osc.stop(duration);
```

Replace with a helper:
```js
function _osc(ctx, type, freq, startVol, endVol, start, end) {
    var osc  = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(startVol, start);
    gain.gain.linearRampToValueAtTime(endVol, end);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(end);
}
```

---

## index.html Load Order
```html
<script src="src/js/audio/synthesiser.js?v=..."></script>
<script src="src/js/audio/loader.js?v=..."></script>
<!-- remove old: <script src="src/js/sounds.js"> -->
```

---

## Verification
- All SFX play (at minimum via fallback) with no real `.mp3` files present.
- All SFX play the real asset when `.mp3` files are present in `src/assets/`.
- No audio elements show `MediaError` in console.
- Ambient loop starts on night start, stops on game-over/return.
