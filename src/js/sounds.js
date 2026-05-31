/**
 * FNAF Game — Procedural Sound Generator
 * Synthesizes all game SFX using the Web Audio API so no external files are needed.
 * Each sound is rendered offline, encoded to a WAV blob, and assigned to the
 * existing <audio> elements. All existing .play() calls continue to work as-is.
 */

// sounds.js has been split into audio/synthesiser.js and audio/loader.js
// This file is kept for backward compatibility. All sound globals are still available.
// For new code, use window.build*Sound, window.initSounds, etc.
// (Spec 05-audio-system)
//
// No-op: all logic moved to audio/loader.js and audio/synthesiser.js


    // ── WAV encoder ──────────────────────────────────────────

    /**
     * Encode Float32Array samples to WAV blob (44.1kHz, 16-bit mono)
     * @param {Float32Array} samples - Audio sample data (-1 to 1 range)
     * @param {number} sampleRate - Sample rate (Hz)
     * @returns {Blob} WAV blob ready for playback
     * @private
     */
    function encodeWAV(samples, sampleRate) {
        var numCh = 1;
        var bitsPerSample = 16;
        var byteRate = sampleRate * numCh * bitsPerSample / 8;
        var blockAlign = numCh * bitsPerSample / 8;
        var dataSize = samples.length * 2;
        var buffer = new ArrayBuffer(44 + dataSize);
        var view = new DataView(buffer);

        function writeStr(offset, str) {
            for (var i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        }
        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, numCh, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        writeStr(36, 'data');
        view.setUint32(40, dataSize, true);

        for (var i = 0; i < samples.length; i++) {
            var s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return new Blob([view], { type: 'audio/wav' });
    }

    // ── Render helper: runs an OfflineAudioContext and returns Float32Array ──

    /**
     * Render audio offline using Web Audio API
     * @param {number} duration - Duration in seconds
     * @param {number} sampleRate - Sample rate (Hz, typically 44100)
     * @param {function} buildGraph - Callback(ctx, destination, duration) to build audio graph
     * @returns {Promise<Float32Array>} Promise resolving to rendered audio samples
     * @private
     */
    function renderSound(duration, sampleRate, buildGraph) {
        var len = Math.ceil(duration * sampleRate);
        var ctx = new OfflineAudioContext(1, len, sampleRate);
        buildGraph(ctx, ctx.destination, duration);
        return ctx.startRendering().then(function(buf) {
            return buf.getChannelData(0);
        });
    }

    // ── Assign WAV blob to an <audio> element ──
    function assignToAudio(id, blob) {
        var el = document.getElementById(id);
        if (!el) return;
        // Remove old source children so the blob URL takes precedence
        while (el.firstChild) el.removeChild(el.firstChild);
        el.src = URL.createObjectURL(blob);
        el.load();
    }

    // =====================================================================
    //  SOUND DEFINITIONS
    // =====================================================================

    var SR = 22050; // sample rate (low is fine for SFX)

    // ── 1. Door slam: short low-freq thud + metallic ring ──
    function buildDoor(ctx, dest, dur) {
        // Thud
        var osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, 0);
        osc.frequency.exponentialRampToValueAtTime(30, dur);
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.9, 0);
        gain.gain.exponentialRampToValueAtTime(0.001, dur);
        osc.connect(gain).connect(dest);
        osc.start(0);
        osc.stop(dur);

        // Metallic click
        var osc2 = ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(800, 0);
        osc2.frequency.exponentialRampToValueAtTime(200, 0.05);
        var g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.4, 0);
        g2.gain.exponentialRampToValueAtTime(0.001, 0.06);
        osc2.connect(g2).connect(dest);
        osc2.start(0);
        osc2.stop(0.06);
    }

    // ── 2. Jumpscare: harsh noise burst + distorted screech ──
    function buildJumpscare(ctx, dest, dur) {
        // White noise burst
        var bufLen = Math.ceil(dur * ctx.sampleRate);
        var noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        var data = noiseBuf.getChannelData(0);
        for (var i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
        var noise = ctx.createBufferSource();
        noise.buffer = noiseBuf;
        var ng = ctx.createGain();
        ng.gain.setValueAtTime(0.6, 0);
        ng.gain.linearRampToValueAtTime(0.3, dur * 0.5);
        ng.gain.linearRampToValueAtTime(0, dur);
        noise.connect(ng).connect(dest);
        noise.start(0);
        noise.stop(dur);

        // Screech oscillators
        [620, 880, 1320].forEach(function(f) {
            var osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, 0);
            osc.frequency.linearRampToValueAtTime(f * 1.5, dur * 0.3);
            osc.frequency.linearRampToValueAtTime(f * 0.7, dur);
            var g = ctx.createGain();
            g.gain.setValueAtTime(0.25, 0);
            g.gain.exponentialRampToValueAtTime(0.001, dur);
            osc.connect(g).connect(dest);
            osc.start(0);
            osc.stop(dur);
        });
    }

    // ── 3. Power out: descending hum that fades to silence ──
    function buildPowerOut(ctx, dest, dur) {
        var osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, 0);
        osc.frequency.exponentialRampToValueAtTime(20, dur);
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.5, 0);
        g.gain.linearRampToValueAtTime(0.4, dur * 0.3);
        g.gain.exponentialRampToValueAtTime(0.001, dur);
        osc.connect(g).connect(dest);
        osc.start(0);
        osc.stop(dur);

        // Electrical flicker clicks
        for (var t = 0; t < dur * 0.6; t += 0.15 + Math.random() * 0.2) {
            var click = ctx.createOscillator();
            click.type = 'square';
            click.frequency.setValueAtTime(40 + Math.random() * 60, t);
            var cg = ctx.createGain();
            cg.gain.setValueAtTime(0.3, t);
            cg.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
            click.connect(cg).connect(dest);
            click.start(t);
            click.stop(t + 0.04);
        }
    }

    // ── 4. Freddy's Toreador March (music box) ──
    function buildFreddyJingle(ctx, dest, dur) {
        // Simplified Toreador March melody (music box timbre)
        // Notes: C5 D5 E5 C5 E5 C5 E5 | F5 E5 D5 F5 E5 D5 | C5 D5 E5 C5 ...
        var C5 = 523.25,
            D5 = 587.33,
            E5 = 659.25,
            F5 = 698.46,
            G5 = 783.99,
            A5 = 880.00;
        var melody = [
            // Toreador march opening bars
            [C5, 0.3],
            [D5, 0.15],
            [E5, 0.3],
            [C5, 0.15],
            [E5, 0.3],
            [C5, 0.15],
            [E5, 0.45],
            [F5, 0.15],
            [E5, 0.15],
            [D5, 0.15],
            [F5, 0.3],
            [E5, 0.15],
            [D5, 0.45],
            [C5, 0.3],
            [D5, 0.15],
            [E5, 0.3],
            [C5, 0.15],
            [G5, 0.3],
            [F5, 0.15],
            [E5, 0.3],
            [D5, 0.15],
            [C5, 0.6],
            // Repeat with variation
            [E5, 0.3],
            [D5, 0.15],
            [C5, 0.3],
            [D5, 0.15],
            [E5, 0.45],
            [C5, 0.3],
            [E5, 0.15],
            [G5, 0.3],
            [F5, 0.15],
            [E5, 0.3],
            [D5, 0.15],
            [C5, 0.6],
            [A5, 0.3],
            [G5, 0.15],
            [F5, 0.3],
            [E5, 0.15],
            [D5, 0.3],
            [C5, 0.15],
            [D5, 0.6]
        ];

        var t = 0;
        melody.forEach(function(note) {
            if (t >= dur) return;
            var freq = note[0],
                noteDur = note[1] * 0.9;
            // Music box: sine + quiet harmonic at 3x freq
            var osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            var g = ctx.createGain();
            g.gain.setValueAtTime(0.3, t);
            g.gain.setValueAtTime(0.3, t + noteDur * 0.7);
            g.gain.exponentialRampToValueAtTime(0.001, t + noteDur);
            osc.connect(g).connect(dest);
            osc.start(t);
            osc.stop(t + noteDur + 0.01);

            // Harmonic
            var osc2 = ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 3, t);
            var g2 = ctx.createGain();
            g2.gain.setValueAtTime(0.08, t);
            g2.gain.exponentialRampToValueAtTime(0.001, t + noteDur);
            osc2.connect(g2).connect(dest);
            osc2.start(t);
            osc2.stop(t + noteDur + 0.01);

            t += note[1];
        });
    }

    // ── 5. Success: ascending chime ──
    function buildSuccess(ctx, dest, dur) {
        var notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
        notes.forEach(function(f, i) {
            var t = i * 0.25;
            var osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, t);
            var g = ctx.createGain();
            g.gain.setValueAtTime(0, Math.max(0, t - 0.001));
            g.gain.linearRampToValueAtTime(0.4, t + 0.02);
            g.gain.setValueAtTime(0.4, t + 0.15);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
            osc.connect(g).connect(dest);
            osc.start(t);
            osc.stop(t + 0.85);

            // Shimmer harmonic
            var osc2 = ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(f * 2, t);
            var g2 = ctx.createGain();
            g2.gain.setValueAtTime(0, Math.max(0, t - 0.001));
            g2.gain.linearRampToValueAtTime(0.1, t + 0.02);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
            osc2.connect(g2).connect(dest);
            osc2.start(t);
            osc2.stop(t + 0.65);
        });
    }

    // ── 6. Ambient: low industrial hum + fan drone (long loop) ──
    function buildAmbient(ctx, dest, dur) {
        // Deep electrical hum (60Hz + harmonics)
        [60, 120, 180].forEach(function(f, i) {
            var osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, 0);
            // Slight detune for unease
            osc.detune.setValueAtTime(i * 7 - 5, 0);
            var g = ctx.createGain();
            var vol = [0.15, 0.08, 0.04][i];
            g.gain.setValueAtTime(vol, 0);
            // Subtle pulse
            for (var t = 0; t < dur; t += 2) {
                g.gain.linearRampToValueAtTime(vol * 0.7, t + 1);
                g.gain.linearRampToValueAtTime(vol, t + 2);
            }
            osc.connect(g).connect(dest);
            osc.start(0);
            osc.stop(dur);
        });

        // Fan whoosh: filtered noise
        var bufLen = Math.ceil(dur * ctx.sampleRate);
        var noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        var nd = noiseBuf.getChannelData(0);
        for (var i = 0; i < bufLen; i++) nd[i] = Math.random() * 2 - 1;
        var noise = ctx.createBufferSource();
        noise.buffer = noiseBuf;
        var bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(200, 0);
        bp.Q.setValueAtTime(1.5, 0);
        var ng = ctx.createGain();
        ng.gain.setValueAtTime(0.06, 0);
        noise.connect(bp).connect(ng).connect(dest);
        noise.start(0);
        noise.stop(dur);

        // Occasional distant metallic creak
        for (var t = 1.5; t < dur - 1; t += 3 + Math.random() * 5) {
            var creak = ctx.createOscillator();
            creak.type = 'sawtooth';
            creak.frequency.setValueAtTime(40 + Math.random() * 30, t);
            creak.frequency.exponentialRampToValueAtTime(20, t + 0.4);
            var cg = ctx.createGain();
            cg.gain.setValueAtTime(0.04, t);
            cg.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            creak.connect(cg).connect(dest);
            creak.start(t);
            creak.stop(t + 0.45);
        }
    }

    // ── 7. Foxy run: rapid footsteps + metallic clanking ──
    function buildFoxyRun(ctx, dest, dur) {
        for (var t = 0; t < dur; t += 0.12) {
            // Footstep thud
            var osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(80 + Math.random() * 40, t);
            osc.frequency.exponentialRampToValueAtTime(20, t + 0.08);
            var g = ctx.createGain();
            g.gain.setValueAtTime(0.5, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
            osc.connect(g).connect(dest);
            osc.start(t);
            osc.stop(t + 0.09);

            // Metal clank
            var clank = ctx.createOscillator();
            clank.type = 'square';
            clank.frequency.setValueAtTime(600 + Math.random() * 400, t);
            clank.frequency.exponentialRampToValueAtTime(100, t + 0.04);
            var cg = ctx.createGain();
            cg.gain.setValueAtTime(0.15, t);
            cg.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
            clank.connect(cg).connect(dest);
            clank.start(t);
            clank.stop(t + 0.05);
        }
    }

    // ── 8. Freddy laugh: deep distorted chuckle ──
    function buildFreddyLaugh(ctx, dest, dur) {
        // "Ha ha ha" — 3 pulses of low freq with harmonic distortion feel
        var laughTimes = [0, 0.35, 0.65];
        laughTimes.forEach(function(t) {
            if (t >= dur) return;

            // Fundamental "voice"
            var osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(90, t);
            osc.frequency.linearRampToValueAtTime(75, t + 0.08);
            osc.frequency.linearRampToValueAtTime(95, t + 0.15);
            osc.frequency.exponentialRampToValueAtTime(60, t + 0.28);
            var g = ctx.createGain();
            g.gain.setValueAtTime(0, Math.max(0, t - 0.001));
            g.gain.linearRampToValueAtTime(0.35, t + 0.02);
            g.gain.setValueAtTime(0.35, t + 0.1);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
            osc.connect(g).connect(dest);
            osc.start(t);
            osc.stop(t + 0.3);

            // Harmonics for that "evil" timbre
            var osc2 = ctx.createOscillator();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(180, t);
            osc2.frequency.exponentialRampToValueAtTime(120, t + 0.25);
            var g2 = ctx.createGain();
            g2.gain.setValueAtTime(0, Math.max(0, t - 0.001));
            g2.gain.linearRampToValueAtTime(0.12, t + 0.02);
            g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            osc2.connect(g2).connect(dest);
            osc2.start(t);
            osc2.stop(t + 0.27);

            // Breath noise
            var bufLen = Math.ceil(0.2 * ctx.sampleRate);
            var noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
            var nd = noiseBuf.getChannelData(0);
            for (var i = 0; i < bufLen; i++) nd[i] = Math.random() * 2 - 1;
            var noise = ctx.createBufferSource();
            noise.buffer = noiseBuf;
            var bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(500, t);
            bp.Q.setValueAtTime(2, t);
            var ng = ctx.createGain();
            ng.gain.setValueAtTime(0, Math.max(0, t - 0.001));
            ng.gain.linearRampToValueAtTime(0.08, t + 0.02);
            ng.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            noise.connect(bp).connect(ng).connect(dest);
            noise.start(t);
            noise.stop(t + 0.22);
        });
    }

    // ── 9. Camera static: burst of white noise ──
    function buildCamStatic(ctx, dest, dur) {
        var bufLen = Math.ceil(dur * ctx.sampleRate);
        var noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        var nd = noiseBuf.getChannelData(0);
        for (var i = 0; i < bufLen; i++) nd[i] = (Math.random() * 2 - 1) * 0.8;
        var noise = ctx.createBufferSource();
        noise.buffer = noiseBuf;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.5, 0);
        g.gain.setValueAtTime(0.5, dur * 0.6);
        g.gain.exponentialRampToValueAtTime(0.01, dur);
        noise.connect(g).connect(dest);
        noise.start(0);
        noise.stop(dur);

        // Add some digital "crackle" — rapid square pops
        for (var t = 0; t < dur * 0.7; t += 0.02 + Math.random() * 0.03) {
            var pop = ctx.createOscillator();
            pop.type = 'square';
            pop.frequency.setValueAtTime(1000 + Math.random() * 3000, t);
            var pg = ctx.createGain();
            pg.gain.setValueAtTime(0.15, t);
            pg.gain.exponentialRampToValueAtTime(0.001, t + 0.01);
            pop.connect(pg).connect(dest);
            pop.start(t);
            pop.stop(t + 0.012);
        }
    }

    // =====================================================================
    //  GENERATE & ASSIGN ALL SOUNDS
    // =====================================================================

    var sounds = [
        { id: 'doorAudio', dur: 0.4, sr: SR, build: buildDoor },
        { id: 'jumpScareAudio', dur: 1.5, sr: SR, build: buildJumpscare },
        { id: 'powerOutAudio', dur: 3.0, sr: SR, build: buildPowerOut },
        { id: 'freddyJingleAudio', dur: 12.0, sr: SR, build: buildFreddyJingle },
        { id: 'successAudio', dur: 2.0, sr: SR, build: buildSuccess },
        { id: 'ambientAudio', dur: 15.0, sr: SR, build: buildAmbient },
        { id: 'foxyRunAudio', dur: 1.2, sr: SR, build: buildFoxyRun },
        { id: 'freddyLaughAudio', dur: 1.0, sr: SR, build: buildFreddyLaugh },
        { id: 'camStaticAudio', dur: 0.5, sr: SR, build: buildCamStatic }
    ];

    // Try loading the real audio file first; only generate procedural fallback
    // if the real file (from <source> tags in HTML) fails to load.
    function tryRealOrFallback(s) {
        var el = document.getElementById(s.id);
        if (!el) return;

        // If the element already has <source> children, try loading them first
        var sources = el.querySelectorAll('source');
        if (sources.length > 0) {
            el.load();
            var loaded = false;
            el.addEventListener('canplaythrough', function handler() {
                loaded = true;
                el.removeEventListener('canplaythrough', handler);
                console.log('[SOUNDS] Real file loaded for ' + s.id);
            }, { once: true });
            el.addEventListener('error', function handler() {
                if (loaded) return;
                el.removeEventListener('error', handler);
                console.warn('[SOUNDS] Real file failed for ' + s.id + ', generating fallback');
                generateFallback(s);
            }, { once: true });
            // Timeout: if nothing happens after 3s, generate fallback
            setTimeout(function() {
                if (!loaded && el.readyState < 2) {
                    console.warn('[SOUNDS] Timeout loading ' + s.id + ', generating fallback');
                    generateFallback(s);
                }
            }, 3000);
        } else {
            generateFallback(s);
        }
    }

    function generateFallback(s) {
        renderSound(s.dur, s.sr, s.build).then(function(samples) {
            var blob = encodeWAV(samples, s.sr);
            assignToAudio(s.id, blob);
        }).catch(function(err) {
            console.warn('[SOUNDS] Failed to generate ' + s.id + ':', err);
        });
    }

    function initSounds() {
        sounds.forEach(function(s) {
            tryRealOrFallback(s);
        });
    }

    // Init after a small delay so the page finishes loading first
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(initSounds, 100);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initSounds, 100);
        });
    }
})();