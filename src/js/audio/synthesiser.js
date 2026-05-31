// synthesiser.js — all procedural Web Audio SFX builders
// Exports: buildDoorSound, buildJumpScareSound, buildPowerOutSound, buildFreddyJingleSound, buildSuccessSound, buildAmbientSound, buildFoxyRunSound, buildFreddyLaughSound, buildCamStaticSound, encodeWAV, renderSound

(function() {
    'use strict';

    // ── Internal helpers ─────────────────────────────
    function _synth(sampleRate, duration, fn) {
        var ctx = new OfflineAudioContext(1, Math.ceil(sampleRate * duration), sampleRate);
        fn(ctx);
        return ctx.startRendering();
    }

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

    // ── WAV encoder ─────────────────────────────
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

    // ── Render helper ─────────────────────────────
    function renderSound(duration, sampleRate, buildGraph) {
        var len = Math.ceil(duration * sampleRate);
        var ctx = new OfflineAudioContext(1, len, sampleRate);
        buildGraph(ctx, ctx.destination, duration);
        return ctx.startRendering().then(function(buf) {
            return buf.getChannelData(0);
        });
    }

    // ── Sound builder functions (all return Promise<AudioBuffer>) ──
    function buildDoorSound() {
        return _synth(22050, 0.4, function(ctx) {
            // Thud
            _osc(ctx, 'sine', 120, 0.9, 0.001, 0, 0.4);
            // Metallic click
            _osc(ctx, 'square', 800, 0.4, 0.001, 0, 0.06);
        });
    }

    function buildJumpScareSound() {
        return _synth(22050, 1.5, function(ctx) {
            // White noise burst
            var dur = 1.5;
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
            noise.connect(ng).connect(ctx.destination);
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
                osc.connect(g).connect(ctx.destination);
                osc.start(0);
                osc.stop(dur);
            });
        });
    }

    function buildPowerOutSound() {
        return _synth(22050, 3.0, function(ctx) {
            var dur = 3.0;
            _osc(ctx, 'sawtooth', 120, 0.5, 0.001, 0, dur);
            // Electrical flicker clicks
            for (var t = 0; t < dur * 0.6; t += 0.15 + Math.random() * 0.2) {
                _osc(ctx, 'square', 40 + Math.random() * 60, 0.3, 0.001, t, t + 0.04);
            }
        });
    }

    function buildFreddyJingleSound() {
        return _synth(22050, 12.0, function(ctx) {
            var C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880.00;
            var melody = [
                [C5, 0.3],[D5, 0.15],[E5, 0.3],[C5, 0.15],[E5, 0.3],[C5, 0.15],[E5, 0.45],[F5, 0.15],[E5, 0.15],[D5, 0.15],[F5, 0.3],[E5, 0.15],[D5, 0.45],[C5, 0.3],[D5, 0.15],[E5, 0.3],[C5, 0.15],[G5, 0.3],[F5, 0.15],[E5, 0.3],[D5, 0.15],[C5, 0.6],[E5, 0.3],[D5, 0.15],[C5, 0.3],[D5, 0.15],[E5, 0.45],[C5, 0.3],[E5, 0.15],[G5, 0.3],[F5, 0.15],[E5, 0.3],[D5, 0.15],[C5, 0.6],[A5, 0.3],[G5, 0.15],[F5, 0.3],[E5, 0.15],[D5, 0.3],[C5, 0.15],[D5, 0.6]
            ];
            var t = 0;
            melody.forEach(function(note) {
                if (t >= 12.0) return;
                var freq = note[0], noteDur = note[1] * 0.9;
                _osc(ctx, 'sine', freq, 0.3, 0.001, t, t + noteDur);
                _osc(ctx, 'sine', freq * 3, 0.08, 0.001, t, t + noteDur);
                t += note[1];
            });
        });
    }

    function buildSuccessSound() {
        return _synth(22050, 2.0, function(ctx) {
            var notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach(function(f, i) {
                var t = i * 0.25;
                _osc(ctx, 'sine', f, 0.4, 0.001, t, t + 0.8);
                _osc(ctx, 'sine', f * 2, 0.1, 0.001, t, t + 0.6);
            });
        });
    }

    function buildAmbientSound() {
        return _synth(22050, 15.0, function(ctx) {
            var dur = 15.0;
            [60, 120, 180].forEach(function(f, i) {
                var vol = [0.15, 0.08, 0.04][i];
                var osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, 0);
                osc.detune.setValueAtTime(i * 7 - 5, 0);
                var g = ctx.createGain();
                g.gain.setValueAtTime(vol, 0);
                for (var t = 0; t < dur; t += 2) {
                    g.gain.linearRampToValueAtTime(vol * 0.7, t + 1);
                    g.gain.linearRampToValueAtTime(vol, t + 2);
                }
                osc.connect(g).connect(ctx.destination);
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
            noise.connect(bp).connect(ng).connect(ctx.destination);
            noise.start(0);
            noise.stop(dur);
            // Distant metallic creak
            for (var t = 1.5; t < dur - 1; t += 3 + Math.random() * 5) {
                _osc(ctx, 'sawtooth', 40 + Math.random() * 30, 0.04, 0.001, t, t + 0.4);
            }
        });
    }

    function buildFoxyRunSound() {
        return _synth(22050, 1.2, function(ctx) {
            var dur = 1.2;
            for (var t = 0; t < dur; t += 0.12) {
                _osc(ctx, 'sine', 80 + Math.random() * 40, 0.5, 0.001, t, t + 0.08);
                _osc(ctx, 'square', 600 + Math.random() * 400, 0.15, 0.001, t, t + 0.04);
            }
        });
    }

    function buildFreddyLaughSound() {
        return _synth(22050, 1.0, function(ctx) {
            var dur = 1.0;
            var laughTimes = [0, 0.35, 0.65];
            laughTimes.forEach(function(t) {
                if (t >= dur) return;
                _osc(ctx, 'sawtooth', 90, 0.35, 0.001, t, t + 0.28);
                _osc(ctx, 'square', 180, 0.12, 0.001, t, t + 0.25);
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
                ng.gain.setValueAtTime(0.08, t);
                ng.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                noise.connect(bp).connect(ng).connect(ctx.destination);
                noise.start(t);
                noise.stop(t + 0.22);
            });
        });
    }

    function buildCamStaticSound() {
        return _synth(22050, 0.5, function(ctx) {
            var dur = 0.5;
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
            noise.connect(g).connect(ctx.destination);
            noise.start(0);
            noise.stop(dur);
            // Digital crackle
            for (var t = 0; t < dur * 0.7; t += 0.02 + Math.random() * 0.03) {
                _osc(ctx, 'square', 1000 + Math.random() * 3000, 0.15, 0.001, t, t + 0.01);
            }
        });
    }

    // Expose as globals
    window.buildDoorSound = buildDoorSound;
    window.buildJumpScareSound = buildJumpScareSound;
    window.buildPowerOutSound = buildPowerOutSound;
    window.buildFreddyJingleSound = buildFreddyJingleSound;
    window.buildSuccessSound = buildSuccessSound;
    window.buildAmbientSound = buildAmbientSound;
    window.buildFoxyRunSound = buildFoxyRunSound;
    window.buildFreddyLaughSound = buildFreddyLaughSound;
    window.buildCamStaticSound = buildCamStaticSound;
    window.encodeWAV = encodeWAV;
    window.renderSound = renderSound;
})();