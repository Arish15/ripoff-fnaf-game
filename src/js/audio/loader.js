// loader.js — asset loading and fallback orchestration
// Exports: tryRealOrFallback, assignToAudio, initSounds

(function() {
    'use strict';

    // Helper: assign AudioBuffer to <audio> as WAV blob
    function assignToAudio(elementId, buffer) {
        var el = document.getElementById(elementId);
        if (!el) return;
        // Remove old source children so the blob URL takes precedence
        while (el.firstChild) el.removeChild(el.firstChild);
        var wavBlob = window.encodeWAV(buffer, 22050); // All SFX are 22050Hz
        el.src = URL.createObjectURL(wavBlob);
        el.load();
    }

    // Try to load a real asset, fallback to synth
    function tryRealOrFallback(elementId, assetPath, buildFn) {
        var el = document.getElementById(elementId);
        if (!el) return;
        var probe = new Audio();
        probe.onerror = function() {
            buildFn().then(function(buffer) {
                assignToAudio(elementId, buffer);
            });
        };
        probe.oncanplaythrough = function() {
            // Real asset works, assign src
            el.src = assetPath;
            el.load();
        };
        probe.src = assetPath;
        // If assetPath is missing, onerror triggers fallback
    }

    // Map of all SFX
    function initSounds() {
        tryRealOrFallback('doorAudio',      'src/assets/door.mp3',      window.buildDoorSound);
        tryRealOrFallback('jumpScareAudio', 'src/assets/jumpscare.mp3', window.buildJumpScareSound);
        tryRealOrFallback('powerOutAudio',  'src/assets/powerout.mp3',  window.buildPowerOutSound);
        tryRealOrFallback('freddyJingleAudio', 'src/assets/freddyjingle.mp3', window.buildFreddyJingleSound);
        tryRealOrFallback('successAudio',   'src/assets/success.mp3',   window.buildSuccessSound);
        tryRealOrFallback('ambientAudio',   'src/assets/ambient.mp3',   window.buildAmbientSound);
        tryRealOrFallback('foxyRunAudio',   'src/assets/foxyrun.mp3',   window.buildFoxyRunSound);
        tryRealOrFallback('freddyLaughAudio', 'src/assets/freddylaugh.mp3', window.buildFreddyLaughSound);
        tryRealOrFallback('camStaticAudio', 'src/assets/camstatic.mp3', window.buildCamStaticSound);
    }

    // Assign to global for backward compat
    window.assignToAudio = assignToAudio;
    window.tryRealOrFallback = tryRealOrFallback;
    window.initSounds = initSounds;

    // Call immediately (not on DOMContentLoaded) to match original timing
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(initSounds, 100);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initSounds, 100);
        });
    }
})();