/**
 * FNAF Game — Camera System Monitor UI
 * Handles monitor toggle, camera switching, and UI state management
 */

/** @type {number|null} */
var monitorCloseTimeout = null;

/**
 * Toggle the camera monitor on/off
 * Handles CSS transitions, static effect, and office visibility
 */
function toggleMonitor() {
    if (!game.running) return;
    if (game.powerOutage) return; // cameras disabled during power outage
    monitorOpen = !monitorOpen;
    var grid = document.getElementById('cameraGrid');
    var mon = document.getElementById('monitorArea');
    var btn = document.getElementById('cameraToggleBtn');
    if (grid) grid.classList.toggle('show', monitorOpen);
    if (mon) mon.classList.toggle('visible', monitorOpen);
    if (btn) btn.classList.toggle('active', monitorOpen);

    if (monitorOpen) {
        game.currentCam = game.lastCam || 'stage';
        camStaticTimer = 2; // brief static on monitor open
        document.querySelectorAll('.camBtn').forEach(function(b) {
            b.classList.toggle('active', b.getAttribute('data-cam') === game.currentCam);
        });
        // Delay canvas sizing until after CSS transition completes (0.25s)
        setTimeout(function() {
            sizeCanvas();
            drawCamera();
        }, 260);
        var camSfx = document.getElementById('camStaticAudio');
        if (camSfx) {
            camSfx.currentTime = 0;
            camSfx.play().catch(function() {});
        }
        // Canon FNAF1 behavior: raising the monitor instantly kills hall lights.
        if (window.forceOfficeLightsOff) {
            window.forceOfficeLightsOff();
        } else {
            game.lightLeft = false;
            game.lightRight = false;
            if (window.office3d) {
                window.office3d.setLightLeft(false);
                window.office3d.setLightRight(false);
            }
        }
        // Hide office behind monitor immediately
        if (monitorCloseTimeout) {
            clearTimeout(monitorCloseTimeout);
            monitorCloseTimeout = null;
        }
        var officeEl = document.getElementById('officeArea');
        if (officeEl) officeEl.style.display = 'none';
    } else {
        game.currentCam = 'office';
        if (camCtx && camCanvas) camCtx.clearRect(0, 0, camCanvas.width, camCanvas.height);
        // Stop the camera static audio immediately when monitor closes
        var camSfxStop = document.getElementById('camStaticAudio');
        if (camSfxStop && !camSfxStop.paused) {
            camSfxStop.pause();
            camSfxStop.currentTime = 0;
        }
        // Reveal office with slight delay to match monitor slide-down CSS transition (~250ms)
        // Use setInterval check to ensure game is still running before showing
        if (monitorCloseTimeout) clearTimeout(monitorCloseTimeout);
        monitorCloseTimeout = setTimeout(function() {
            monitorCloseTimeout = null;
            if (game.running && !monitorOpen) {
                var officeEl2 = document.getElementById('officeArea');
                if (officeEl2) {
                    officeEl2.style.display = 'flex';
                    // Trigger any pending renders
                    if (window.office3d && window.office3d.show) {
                        window.office3d.show();
                    }
                }
            }
        }, 250);
    }
}

/**
 * Switch to a specific camera feed
 * @param {string} cam - Camera key (e.g., 'stage', 'dining', 'pirate')
 */
function switchCam(cam) {
    if (!game.running) return;
    if (window.forceOfficeLightsOff) window.forceOfficeLightsOff();
    game.currentCam = cam;
    game.lastCam = cam;
    monitorOpen = true;
    camStaticTimer = 2; // ~2 frames of static on switch
    var grid = document.getElementById('cameraGrid');
    var btn = document.getElementById('cameraToggleBtn');
    if (grid) grid.classList.add('show');
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.camBtn').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-cam') === cam);
    });
    // Delay canvas sizing until after CSS transition completes (0.25s)
    setTimeout(function() {
        sizeCanvas();
        drawCamera();
    }, 260);
    var camBlip = document.getElementById('camChangeAudio');
    if (camBlip) {
        camBlip.currentTime = 0;
        camBlip.play().catch(function() {});
    }
}

// Global exports
window.toggleMonitor = toggleMonitor;
window.switchCam = switchCam;