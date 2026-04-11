/**
 * FNAF Game — Extra Features
 * Custom Night, Stars, Phone Guy, Hallucinations, Freddy Laugh, Camera Map Indicators
 */

// ─────────────────────────────────────────────
//  PHONE GUY MESSAGES (full canonical scripts)
// ─────────────────────────────────────────────

/** @type {Object<number, string>} Phone Guy messages for each night (1-6) */
var PHONE_MESSAGES = {
    1: "Uh, hello? Hello, hello? Uh, I wanted to record a message for you to help you get settled in on your first night. Um, I actually worked in that office before you. I'm finishing up my last week now, as a matter of fact. So, I know it can be a bit overwhelming, but I'm here to tell you there's nothing to worry about. Uh, you'll do fine! So, let's just focus on getting you through your first week. Okay?\n\nUh, let's see, first there's an introductory greeting from the company that I'm supposed to read. Uh, it's kind of a legal thing, you know. Um, 'Welcome to Freddy Fazbear's Pizza. A magical place for kids and grown-ups alike, where fantasy and fun come to life. Fazbear Entertainment is not responsible for damage to property or person. Upon discovering that damage or death has occurred, a missing persons report will not be filed within 90 days, and a general safety and security report will not be issued.'\n\nUh, that's — that's all. So, um, let's move on! Uh, so the animatronic characters here do get a bit quirky at night. But do I blame them? No! If I were forced to sing those same stupid songs for twenty years and I never got a bath? I'd probably be a bit irritable at night too. So, remember, these characters hold a special place in the hearts of children and we need to show them a little respect, right? Okay.\n\nSo just be aware, the characters do tend to wander a bit. Uh, they're left in some kind of free-roaming mode at night. Uh, something about their servos locking up if they get turned off for too long. Uh, we can't get the parts to fix 'em. Uh, they used to be allowed to walk around during the day too. But then there was The Bite of '87. Yeah. I-It's amazing that the human body can live without the frontal lobe, you know?\n\nUh, now concerning your safety — the only real risk to you as a night watchman here, if you were to allow yourself to be seen by the animatronics in their free-roaming mode, is being stuffed into a Freddy Fazbear suit. Um, now that wouldn't be so bad if the suits were in good condition, but they're not. So, just avoid being seen or make sure that the characters don't walk into your office, okay?\n\nUm, the doors are to your left and to your right. You have two lights, uh, one for each door. There's also a fan in your office — helps with the, uh, smell in there. Um, just hang tight. I'll talk to you again tomorrow night. Okay? Bye-bye.",

    2: "Uh, hello? Hello? Uh, well, if you're hearing this then, uh, congratulations on completing Night One! Um, I knew you could do it. Uh, just to let you know, uh, we do have one more chair in the back room — the one with the yellow suit. Uh, we don't use it anymore. If you see it, um... just leave it alone.\n\nUh, I wanted to clarify a few things. The older models, uh — they're not quite retired. We still have them in the establishment. They spend most of their time wandering the halls, but they've been given a very specific directive. Uh, they're essentially looking for any endoskeletal unit not enclosed in a suit. That means you, unfortunately. So, uh, just make sure they don't see you.\n\nAlso, uh, keep an eye on Pirate Cove — Cam 1C. The character there, Foxy, he's... a bit unique. He doesn't move like the others. He gets restless the longer he's observed, but also the longer he's ignored. Um, just... check in on him periodically. You'll figure out the balance.\n\nUh, as for power — use it wisely. Every door, every light, every camera check drains a little. Try to keep the doors closed only when necessary. You'll be fine. Hang in there! Good night.",

    3: "Hello, hello! Hey, you're doing great! Most people don't last this long. I mean, uh — I don't mean to scare you — they quit. Um, I wanted to tell you something though. Um, the animatronics have some kind of facial recognition built in. Originally it was used to, uh, identify criminal activity and the like. But now... well, you see, after the restaurant had some... issues, they reprogrammed the units to identify any endoskeletal element not fully enclosed in a suit. And then, of course, they... well, they try to put you in one.\n\nSo the mask idea — don't try it. They can tell. The suits are the real solution. But obviously you can't put on a suit, so just keep the doors closed when they get close.\n\nAlso — Foxy. He gets jumpier the more you stare at him, but also the more you ignore him. It's about balance. Check Cam 1C regularly but don't linger.\n\nUm, I should mention — if things get really intense tonight, don't panic. Panicking wastes power. Stay calm, be systematic. You've got this! Okay, I'll let you go. Have a good night, and I'll see you on the flipside!",

    4: "Hello? Hello? Hey! Glad you made it. Uh, hey, look — I don't know if I'll be able to send you a message tomorrow night. Um — I just — I don't think I'll be able to. Uh — it's been a bit of a rough night here for me. Um, I got a bit turned around.\n\nUh, I want to remind you — if the power runs out before 6AM, do not — I repeat, do not — make any noise. Don't move. Freddy himself will come to your office. He will stand in the doorway and just... watch you. If you stay completely still — don't even move the camera — he will eventually leave. Or he won't. Uh — it's kind of a coin flip at that point.\n\nUm. Just... keep the power up if you can. Check the cameras. Close the doors when you see someone at the end of the hall. Don't waste the lights. Um.\n\nOkay. I — I gotta go. Uh, good luck. Bye-bye.",

    5: "...I-I-I'm still here. I'm okay. Um. [static] ...I... they — I... [long static burst] ...Hello-o? Is any— [thud, faint music playing] ...St-stay back. Hey — st— NO— [loud crash] [Toreador March plays faintly in the background] ...[click]",

    6: "[Faint static. Silence. A single dial tone. No message.]"
};

// ─────────────────────────────────────────────
//  CUSTOM NIGHT
// ─────────────────────────────────────────────

/**
 * Display Custom Night difficulty setup screen
 */
function showCustomNight() {
    var setup = document.getElementById('customNightSetup');
    if (setup) setup.classList.add('show');
}

/**
 * Hide Custom Night difficulty setup screen
 */
function hideCustomNight() {
    var setup = document.getElementById('customNightSetup');
    if (setup) setup.classList.remove('show');
}

/**
 * Set all sliders to a preset difficulty
 * @param {number} f - Freddy AI (0-20)
 * @param {number} b - Bonnie AI (0-20)
 * @param {number} c - Chica AI (0-20)
 * @param {number} fx - Foxy AI (0-20)
 */
function setCustomPreset(f, b, c, fx) {
    var sf = document.getElementById('aiFreddy');
    var sb = document.getElementById('aiBonnie');
    var sc = document.getElementById('aiChica');
    var sfx = document.getElementById('aiFoxy');
    if (sf) {
        sf.value = f;
        document.getElementById('aiFreddyVal').textContent = f;
    }
    if (sb) {
        sb.value = b;
        document.getElementById('aiBonnieVal').textContent = b;
    }
    if (sc) {
        sc.value = c;
        document.getElementById('aiChicaVal').textContent = c;
    }
    if (sfx) {
        sfx.value = fx;
        document.getElementById('aiFoxyVal').textContent = fx;
    }
}

function startCustomNight() {
    customNightAI.freddy = parseInt(document.getElementById('aiFreddy').value) || 0;
    customNightAI.bonnie = parseInt(document.getElementById('aiBonnie').value) || 0;
    customNightAI.chica = parseInt(document.getElementById('aiChica').value) || 0;
    customNightAI.foxy = parseInt(document.getElementById('aiFoxy').value) || 0;

    // Easter egg: 1/9/8/7 = "The Bite of '87" → instant Golden Freddy jumpscare
    if (customNightAI.freddy === 1 && customNightAI.bonnie === 9 &&
        customNightAI.chica === 8 && customNightAI.foxy === 7) {
        hideCustomNight();
        document.getElementById('startScreen').classList.add('hidden');
        game.running = true;
        triggerGameOver('GOLDEN FREDDY');
        return;
    }

    // Override Night 7 AI with custom values
    NIGHT_AI[7] = {
        freddy: customNightAI.freddy,
        bonnie: customNightAI.bonnie,
        chica: customNightAI.chica,
        foxy: customNightAI.foxy
    };

    hideCustomNight();
    // Custom Night always unlocked — force-add 7 temporarily
    if (unlockedNights.indexOf(7) < 0) unlockedNights.push(7);
    startGame(7);
}

// ─────────────────────────────────────────────
//  STARS DISPLAY
// ─────────────────────────────────────────────
function updateStars() {
    var container = document.getElementById('starDisplay');
    if (!container) return;
    container.innerHTML = '';
    // Star 1: beat Night 5, Star 2: beat Night 6, Star 3: beat 20/20/20/20
    var stars = 0;
    if (unlockedNights.indexOf(6) >= 0) stars++; // Beat Night 5 → unlocked 6
    if (unlockedNights.indexOf(7) >= 0) stars++; // Beat Night 6 → unlocked 7
    try {
        var raw = localStorage.getItem('fnafBeat2020');
        if (raw === 'true') stars++;
    } catch (e) {}
    for (var i = 0; i < stars; i++) {
        var s = document.createElement('span');
        s.className = 'star';
        s.textContent = '\u2605';
        container.appendChild(s);
    }
}

// ─────────────────────────────────────────────
//  PHONE GUY
//  Audio source priority:
//    1. HTML <audio> element if file is actually loaded (readyState >= 2)
//    2. Web Speech API (browser TTS) as a copyright-free fallback
//  A subtle phone-line static hiss is always layered underneath via
//  Web Audio API for atmosphere.
// ─────────────────────────────────────────────
var _pgTypewriter = null; // setInterval handle for typewriter
var _pgAudio = null; // currently playing HTML <audio> element
var _pgEndHandler = null; // 'ended' listener so we can remove it cleanly
var _pgUtterance = null; // SpeechSynthesisUtterance (TTS path)
var _pgStaticNode = null; // Web Audio noise source for phone hiss
var _pgStaticCtx = null; // Web Audio context for the static

// ── TTS-friendly versions of the Night 5 (dying call) & Night 6 (silence) messages ──
// Stage directions like [static] are stripped so the synthesiser doesn't read them aloud.
var PHONE_TTS = {
    5: "I'm still here. I'm okay. Um. I... they... Hello? Is anyone there? Stay back. Hey... stay... NO!",
    6: null // Night 6 is dead air — no TTS, just static + fallback timer
};

function _startPhoneStatic() {
    _stopPhoneStatic();
    try {
        _pgStaticCtx = new(window.AudioContext || window.webkitAudioContext)();
        // One-second noise buffer, looped
        var sr = _pgStaticCtx.sampleRate;
        var buf = _pgStaticCtx.createBuffer(1, sr, sr);
        var data = buf.getChannelData(0);
        for (var i = 0; i < sr; i++) data[i] = Math.random() * 2 - 1;

        _pgStaticNode = _pgStaticCtx.createBufferSource();
        _pgStaticNode.buffer = buf;
        _pgStaticNode.loop = true;

        // Bandpass 300–3400 Hz — classic telephone frequency response
        var bp = _pgStaticCtx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1600;
        bp.Q.value = 0.6;

        var gain = _pgStaticCtx.createGain();
        gain.gain.value = 0.035; // barely audible hiss underneath voice

        _pgStaticNode.connect(bp);
        bp.connect(gain);
        gain.connect(_pgStaticCtx.destination);
        _pgStaticNode.start();
    } catch (e) { /* Web Audio not available — safe to ignore */ }
}

function _stopPhoneStatic() {
    if (_pgStaticNode) {
        try { _pgStaticNode.stop(); } catch (e) {}
        _pgStaticNode = null;
    }
    if (_pgStaticCtx) {
        try { _pgStaticCtx.close(); } catch (e) {}
        _pgStaticCtx = null;
    }
}

function _startTTS(msg) {
    if (!window.speechSynthesis) {
        phoneGuyTimer = setTimeout(hidePhoneGuy, 10000);
        return;
    }
    window.speechSynthesis.cancel();

    function speak() {
        var utt = new SpeechSynthesisUtterance(msg);
        utt.rate = 0.88; // deliberate, slightly slower pace
        utt.pitch = 0.82; // lower pitch — male phone-filter effect
        utt.volume = 1.0;

        // Prefer an English male voice when available
        var voices = window.speechSynthesis.getVoices();
        var picked = null;
        for (var i = 0; i < voices.length; i++) {
            var v = voices[i];
            if (!/^en/i.test(v.lang)) continue;
            if (/male|david|mark|james|daniel|alex|google uk english male/i.test(v.name)) {
                picked = v;
                break;
            }
            if (!picked) picked = v; // first English voice as fallback
        }
        if (picked) utt.voice = picked;

        utt.onend = function() { hidePhoneGuy(); };
        utt.onerror = function() { phoneGuyTimer = setTimeout(hidePhoneGuy, 5000); };

        _pgUtterance = utt;
        window.speechSynthesis.speak(utt);
    }

    // Voices may load asynchronously on first call
    var voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        speak();
    } else {
        window.speechSynthesis.onvoiceschanged = function() {
            window.speechSynthesis.onvoiceschanged = null;
            speak();
        };
        // Safety fallback if voiceschanged never fires (some browsers)
        phoneGuyTimer = setTimeout(function() {
            if (!_pgUtterance) speak();
        }, 600);
    }
}

function showPhoneGuy(night) {
    var msg = PHONE_MESSAGES[night];
    if (!msg) return;
    var overlay = document.getElementById('phoneGuyOverlay');
    var textEl = document.getElementById('phoneGuyText');
    if (!overlay || !textEl) return;

    hidePhoneGuy(); // clean up any previous call

    textEl.textContent = '';
    overlay.classList.add('show');

    // Always start the phone-line static hiss
    _startPhoneStatic();

    // Typewriter: ~28 ms per character ≈ 35 chars/sec
    var i = 0;
    _pgTypewriter = setInterval(function() {
        if (i >= msg.length) {
            clearInterval(_pgTypewriter);
            _pgTypewriter = null;
            return;
        }
        textEl.textContent += msg[i];
        i++;
        textEl.scrollTop = textEl.scrollHeight;
    }, 28);

    // ── Audio: attempt file first, fall back to TTS if source missing/unsupported ──
    var audioEl = document.getElementById('phoneGuyAudio' + night);
    if (audioEl && audioEl.querySelector('source')) {
        audioEl.currentTime = 0;
        var playPromise = audioEl.play();
        if (playPromise !== undefined) {
            playPromise.then(function() {
                // File is playing — hide typewriter text (the recording IS the show)
                clearInterval(_pgTypewriter);
                _pgTypewriter = null;
                textEl.textContent = '';
            }).catch(function(err) {
                // NotSupportedError = no valid source file on disk; anything else = autoplay block etc.
                if (err.name === 'NotSupportedError' || err.name === 'NotAllowedError') {
                    _useTTSFallback(night);
                } else {
                    _useTTSFallback(night);
                }
            });
        }
        _pgAudio = audioEl;
        _pgEndHandler = function() { hidePhoneGuy(); };
        audioEl.addEventListener('ended', _pgEndHandler, { once: true });
    } else {
        _useTTSFallback(night);
    }
}

function _useTTSFallback(night) {
    if (night === 6) {
        // Night 6 is dead air — minimal static + 7 s timer
        phoneGuyTimer = setTimeout(hidePhoneGuy, 7000);
        return;
    }
    // Night 5 uses a cleaned script without stage-direction brackets
    var ttsText = PHONE_TTS[night] !== undefined ? PHONE_TTS[night] : PHONE_MESSAGES[night];
    if (!ttsText) {
        phoneGuyTimer = setTimeout(hidePhoneGuy, 8000);
        return;
    }
    _startTTS(ttsText);
}

function hidePhoneGuy() {
    var overlay = document.getElementById('phoneGuyOverlay');
    if (overlay) overlay.classList.remove('show');

    if (_pgTypewriter) {
        clearInterval(_pgTypewriter);
        _pgTypewriter = null;
    }
    if (phoneGuyTimer) {
        clearTimeout(phoneGuyTimer);
        phoneGuyTimer = 0;
    }

    if (_pgAudio) {
        if (_pgEndHandler) {
            _pgAudio.removeEventListener('ended', _pgEndHandler);
            _pgEndHandler = null;
        }
        _pgAudio.pause();
        _pgAudio.currentTime = 0;
        _pgAudio = null;
    }

    if (_pgUtterance) {
        try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
        _pgUtterance = null;
    }

    _stopPhoneStatic();

    var textEl = document.getElementById('phoneGuyText');
    if (textEl) textEl.textContent = '';
}

// ─────────────────────────────────────────────
//  HALLUCINATIONS — "IT'S ME" random flash
// ─────────────────────────────────────────────
function tickHallucination() {
    if (hallucinationCooldown > 0) { hallucinationCooldown--; return; }
    // Only trigger in office (not camera), past 1AM, nights 3+
    if (monitorOpen || game.hour < 1 || game.currentNight < 3) return;
    // ~0.1% chance per tick (100ms) ≈ once per ~100 seconds on average
    if (Math.random() < 0.001) {
        var overlay = document.getElementById('hallucinationOverlay');
        if (overlay) {
            overlay.classList.add('show');
            setTimeout(function() { overlay.classList.remove('show'); }, 300);
        }
        hallucinationCooldown = 300; // 30 seconds cooldown
    }
}

// ─────────────────────────────────────────────
//  FREDDY LAUGH — plays when Freddy moves
// ─────────────────────────────────────────────
var lastFreddyPos = 0;

function checkFreddyLaugh() {
    var freddy = animatronics.freddy;
    if (!freddy) return;
    if (freddy.pos !== lastFreddyPos && freddy.pos > 0) {
        var laugh = document.getElementById('freddyLaughAudio');
        if (laugh) {
            laugh.currentTime = 0;
            laugh.play().catch(function() {});
        }
    }
    lastFreddyPos = freddy.pos;
}

// ─────────────────────────────────────────────
//  CAMERA MAP ANIMATRONIC INDICATORS (disabled)
// ─────────────────────────────────────────────

function updateMapIndicators() {
    // Disabled — no longer showing animatronic positions on camera map
}

// ─────────────────────────────────────────────
//  SLIDER WIRING (called from DOMContentLoaded)
// ─────────────────────────────────────────────
function initExtras() {
    // Wire up AI sliders
    ['Freddy', 'Bonnie', 'Chica', 'Foxy'].forEach(function(name) {
        var slider = document.getElementById('ai' + name);
        var valEl = document.getElementById('ai' + name + 'Val');
        if (slider && valEl) {
            slider.addEventListener('input', function() {
                valEl.textContent = this.value;
            });
        }
    });

    updateStars();
}

function startDeathMode() {
    // All AIs slammed to 100 — far beyond the normal 20 cap
    customNightAI.freddy = 100;
    customNightAI.bonnie = 100;
    customNightAI.chica = 100;
    customNightAI.foxy = 100;
    NIGHT_AI[7] = { freddy: 100, bonnie: 100, chica: 100, foxy: 100 };
    // Bypass the unlockedNights guard — death mode is always available
    if (unlockedNights.indexOf(7) < 0) unlockedNights.push(7);
    startGame(7);
}

// ─────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────
window.showCustomNight = showCustomNight;
window.hideCustomNight = hideCustomNight;
window.setCustomPreset = setCustomPreset;
window.startCustomNight = startCustomNight;
window.startDeathMode = startDeathMode;
window.hidePhoneGuy = hidePhoneGuy;