// engine/power.js
// Power drain constants and power outage sequence

var DRAIN_BASE    = 0.01;  // always on
var DRAIN_LIGHT   = 0.01;  // per hall light
var DRAIN_DOOR    = 0.018; // per closed door
var DRAIN_MONITOR = 0.013; // camera monitor

/**
 * Applies per-tick power drain and handles power outage trigger.
 * Mutates game.power, game.powerOutage, game.powerOutageTime.
 * Returns true if power just ran out (caller should start outage sequence).
 */
function tickPower() {
    if (!game.running) return false;
    var drain = DRAIN_BASE;
    if (game.lightLeft)  drain += DRAIN_LIGHT;
    if (game.lightRight) drain += DRAIN_LIGHT;
    if (game.doorLeft)   drain += DRAIN_DOOR;
    if (game.doorRight)  drain += DRAIN_DOOR;
    if (monitorOpen)     drain += DRAIN_MONITOR;
    game.power = Math.max(0, game.power - drain);

    // Ambient audio tension: volume increases as power decreases
    var ambient = document.getElementById('ambientAudio');
    if (ambient && !ambient.paused) {
        ambient.volume = Math.min(1.0, 0.3 + (1 - game.power / 100) * 0.5);
    }

    if (game.power <= 0 && !game.powerOutage) {
        game.powerOutage = true;
        game.powerOutageTime = game.time;
        game.doorLeft = game.doorRight = false;
        if (window.forceOfficeLightsOff) {
            window.forceOfficeLightsOff();
        } else {
            game.lightLeft = game.lightRight = false;
        }
        // Force close monitor — cameras are dead
        if (monitorOpen) {
            monitorOpen = false;
            var grid = document.getElementById('cameraGrid');
            var mon = document.getElementById('monitorArea');
            var ctBtn = document.getElementById('cameraToggleBtn');
            if (grid) grid.classList.remove('show');
            if (mon) mon.classList.remove('visible');
            if (ctBtn) ctBtn.classList.remove('active');
            // Show office back
            var officeEl = document.getElementById('officeArea');
            if (officeEl) officeEl.style.display = 'flex';
        }
        if (window.office3d) {
            window.office3d.setDoorLeft(false);
            window.office3d.setDoorRight(false);
            if (!window.forceOfficeLightsOff) {
                window.office3d.setLightLeft(false);
                window.office3d.setLightRight(false);
            }
        }
        // Dim camera toggle — cameras are dead
        var ctBtnPO = document.getElementById('cameraToggleBtn');
        if (ctBtnPO) ctBtnPO.classList.add('disabled');
        var po = document.getElementById('powerOutAudio');
        if (po) po.play().catch(function() {});
        var lightHumPO = document.getElementById('lightHumAudio');
        if (lightHumPO) {
            lightHumPO.pause();
            lightHumPO.currentTime = 0;
        }
        // Immediately black out the screen
        var darkOverlay = document.getElementById('powerDarkOverlay');
        if (darkOverlay) darkOverlay.classList.add('show');
        // After brief pause: show Freddy's eyes in the doorway + play jingle
        setTimeout(function() {
            if (!game.powerOutage) return; // game may have restarted
            var fpo = document.getElementById('freddyPowerOut');
            if (fpo) fpo.classList.add('show');
            var jingle = document.getElementById('freddyJingleAudio');
            if (jingle) {
                jingle.currentTime = 0;
                jingle.play().catch(function() {});
            }
        }, 500);
        return true;
    }
    return false;
}

/**
 * Handles the countdown after power outage starts (Freddy eyes + jingle, then game over)
 * Returns true if game over was triggered.
 */
function tickPowerOutageSequence() {
    if (game.powerOutage && game.powerOutageTime) {
        var elapsed = game.time - game.powerOutageTime;
        if (!game.powerOutageDelay) {
            game.powerOutageDelay = 5.5 + Math.random() * 1.0;
        }
        if (elapsed >= game.powerOutageDelay) {
            triggerGameOver('FREDDY_POWER');
            return true;
        }
    }
    return false;
}
