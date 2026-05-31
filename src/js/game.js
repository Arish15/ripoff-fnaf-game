/**
 * FNAF Game - Main Loop Orchestrator
 * Delegates to: engine/power.js, engine/night.js, engine/game-over.js, engine/dev-tools.js
 */

/**
 * Main game tick - runs every 100ms via setInterval in engine/night.js startGame().
 */
function tickGame() {
    if (!game.running) return;

    if (window.office3d) window.office3d.setMouse(mouseNormX);

    game.time += 0.1;
    var hrs = game.time / 90;
    game.hour = Math.floor(hrs);
    game.minute = (hrs % 1) * 60;

    if (tickPower()) return;
    if (tickPowerOutageSequence()) return;

    var ai = NIGHT_AI[game.currentNight] || NIGHT_AI[1];

    // Golden Freddy: counts down when active; opening camera dismisses
    if (goldenFreddyActive) {
        if (monitorOpen) {
            goldenFreddyActive = false;
            goldenFreddyTimer = 0;
            var gfOverlay = document.getElementById('goldenFreddyOverlay');
            if (gfOverlay) gfOverlay.classList.remove('show');
        } else {
            goldenFreddyTimer--;
            var gfOverlay2 = document.getElementById('goldenFreddyOverlay');
            if (gfOverlay2 && !gfOverlay2.classList.contains('show')) gfOverlay2.classList.add('show');
            if (goldenFreddyTimer <= 0) {
                goldenFreddyActive = false;
                if (gfOverlay2) gfOverlay2.classList.remove('show');
                triggerGameOver('GOLDEN FREDDY');
                return;
            }
        }
    }

    tickAnimatronics(ai);
    checkCollisions();
    updateHallAnimatronics();
    checkFreddyLaugh();
    tickHallucination();
    updateHUD();

    if (game.hour >= 6 || game.time >= 540) endNight();
}

/**
 * Register custom jumpscare assets with the jumpscare canvas module.
 * @param {Object} assetMap - { name: { type, src, ... } }
 */
function initJumpscares(assetMap) {
    if (!window.jumpScare || !window.jumpScare.setAsset) {
        console.warn('[game] jumpScare module not loaded');
        return;
    }
    Object.keys(assetMap).forEach(function(name) {
        window.jumpScare.setAsset(name, assetMap[name]);
    });
    console.log('[game] Jumpscares initialized: ' + Object.keys(assetMap).join(', '));
}

document.addEventListener('DOMContentLoaded', function() {
    loadProgress();
    initCanvas();
    sizeCanvas();
    try { loadAssets(); verifyAssets(); } catch (e) {}
    startCameraLoop();
    updateNightButtons();
    initExtras();
    initDevTools();

    var officeArea = document.getElementById('officeArea');
    if (officeArea) {
        officeArea.addEventListener('mousemove', function(e) {
            if (!game.running || monitorOpen) return;
            var rect = officeArea.getBoundingClientRect();
            mouseNormX = Math.max(0, Math.min(1, (e.clientX - rect.left) / (rect.width || 1)));
            if (window.office3d) window.office3d.setMouse(mouseNormX);
        });
        officeArea.addEventListener('mouseleave', function() { mouseNormX = 0.5; });
    }

    var camToggle = document.getElementById('cameraToggleBtn');
    if (camToggle) camToggle.addEventListener('click', function() { toggleMonitor(); });

    document.querySelectorAll('.camBtn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var cam = this.getAttribute('data-cam');
            if (cam) switchCam(cam);
        });
    });

    document.querySelectorAll('.retryBtn').forEach(function(btn, i) {
        if (i === 0) btn.addEventListener('click', returnToStart);
        else btn.addEventListener('click', function() { startGame(game.currentNight); });
    });
    document.querySelectorAll('.nextBtn').forEach(function(btn, i) {
        if (i === 0) btn.addEventListener('click', nextNight);
        else btn.addEventListener('click', returnToStart);
    });

    window.addEventListener('resize', function() {
        sizeCanvas();
        if (monitorOpen) drawCamera();
    });
});

window.startGame       = startGame;
window.nextNight       = nextNight;
window.returnToStart   = returnToStart;
window.triggerGameOver = triggerGameOver;
window.initJumpscares  = initJumpscares;
