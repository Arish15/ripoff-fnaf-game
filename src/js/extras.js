/**
 * FNAF Game — Extra Features
 * Custom Night, Stars, Phone Guy, Hallucinations, Freddy Laugh, Camera Map Indicators
 */

// ─────────────────────────────────────────────
//  PHONE GUY MESSAGES (abridged per night)
// ─────────────────────────────────────────────
var PHONE_MESSAGES = {
    1: "Uh, hello? Hello, hello? I wanted to record a message for you to help you get settled in on your first night. The animatronic characters do get a bit quirky at night. Just watch the cameras and close the doors only if absolutely necessary. Conserve power. You'll do fine!",
    2: "Uhh, hello? Hello? Well, if you're hearing this then you made it to day two. Uh, by now I'm sure you've noticed the older models moving around... They were left in some kind of free-roaming mode. Uh, just keep an eye on Pirate Cove. The character in there seems unique.",
    3: "Hello, hello? Hey you're doing great! Most people don't last this long. Uh, I'm not implying that they died, that's not what I meant. Anyway, I'd better not take up too much of your time. Things start getting real tonight. Keep both doors ready.",
    4: "Hello? Hello? Hey, uh, I just wanted to leave a quick message. Uh, it's actually kind of concerning. The animatronics are very active tonight. I-I don't know if they're getting more aggressive or what, but... just be really careful tonight, okay? Check those blind spots.",
    5: "...",
    6: "..."
};

// ─────────────────────────────────────────────
//  CUSTOM NIGHT
// ─────────────────────────────────────────────
function showCustomNight() {
    var setup = document.getElementById('customNightSetup');
    if (setup) setup.classList.add('show');
}

function hideCustomNight() {
    var setup = document.getElementById('customNightSetup');
    if (setup) setup.classList.remove('show');
}

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
        document.getElementById('gameContainer').classList.add('show');
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
// ─────────────────────────────────────────────
function showPhoneGuy(night) {
    var msg = PHONE_MESSAGES[night];
    if (!msg) return;
    var overlay = document.getElementById('phoneGuyOverlay');
    var text = document.getElementById('phoneGuyText');
    if (!overlay || !text) return;
    text.textContent = msg;
    overlay.classList.add('show');
    // Auto-dismiss after reading time (roughly 200ms per word, min 8s, max 25s)
    var words = msg.split(' ').length;
    var duration = Math.max(8000, Math.min(25000, words * 200));
    phoneGuyTimer = setTimeout(function() {
        overlay.classList.remove('show');
    }, duration);
}

function hidePhoneGuy() {
    var overlay = document.getElementById('phoneGuyOverlay');
    if (overlay) overlay.classList.remove('show');
    if (phoneGuyTimer) {
        clearTimeout(phoneGuyTimer);
        phoneGuyTimer = 0;
    }
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

// ─────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────
window.showCustomNight = showCustomNight;
window.hideCustomNight = hideCustomNight;
window.setCustomPreset = setCustomPreset;
window.startCustomNight = startCustomNight;