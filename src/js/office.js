/**
 * FNAF Game — Office Interactions & HUD
 */

// ── Window scare: plays when animatronic visible at door with light on ──
function _checkWindowScare(side) {
    if (!window.office3d) return;
    var animAtDoor = false;
    Object.values(animatronics).forEach(function(a) {
        var pos = a.path[a.pos];
        if (side === 'left' && (pos === 'doorW' || pos === 'hallW_corner' || pos === 'hallW')) animAtDoor = true;
        if (side === 'right' && (pos === 'doorE' || pos === 'hallE_corner' || pos === 'hallE')) animAtDoor = true;
    });
    if (animAtDoor) {
        var ws = document.getElementById('windowScareAudio');
        if (ws) {
            ws.currentTime = 0;
            ws.play().catch(function() {});
        }
    }
}

function toggleDoor(side) {
    if (!game.running || game.powerOutage) return;
    if (side === 'left') {
        game.doorLeft = !game.doorLeft;
        if (window.office3d) window.office3d.setDoorLeft(game.doorLeft);
    } else {
        game.doorRight = !game.doorRight;
        if (window.office3d) window.office3d.setDoorRight(game.doorRight);
    }
    var audio = document.getElementById('doorAudio');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(function() {});
    }
}

function toggleLight(side) {
    if (!game.running || game.powerOutage) return;
    if (side === 'left') {
        game.lightLeft = !game.lightLeft;
        if (window.office3d) window.office3d.setLightLeft(game.lightLeft);
    } else {
        game.lightRight = !game.lightRight;
        if (window.office3d) window.office3d.setLightRight(game.lightRight);
    }
    // Check for window scare (animatronic at door)
    if (side === 'left' && game.lightLeft) _checkWindowScare('left');
    if (side === 'right' && game.lightRight) _checkWindowScare('right');
    var lightAudio = document.getElementById('lightAudio');
    if (lightAudio) {
        lightAudio.currentTime = 0;
        lightAudio.play().catch(function() {});
    }
    var lightOn = (side === 'left') ? game.lightLeft : game.lightRight;
    var lightHum = document.getElementById('lightHumAudio');
    if (lightHum) {
        if (lightOn) {
            lightHum.currentTime = 0;
            lightHum.play().catch(function() {});
        } else {
            lightHum.pause();
            lightHum.currentTime = 0;
        }
    }
}

function updateHUD() {
    var HOURS = ['12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM'];
    var td = document.getElementById('timeDisplay');
    var pd = document.getElementById('powerDisplay');
    if (td) td.textContent = HOURS[game.hour] !== undefined ? HOURS[game.hour] : '6 AM';
    if (pd) pd.textContent = Math.floor(game.power);

    // FNAF1 usage bars: 1 base + 1 per active system (doors, lights, camera)
    var usage = 1;
    if (game.doorLeft) usage++;
    if (game.doorRight) usage++;
    if (game.lightLeft) usage++;
    if (game.lightRight) usage++;
    if (monitorOpen) usage++;

    for (var i = 1; i <= 5; i++) {
        var block = document.getElementById('usageBlock' + i);
        if (block) block.classList.toggle('active', i <= usage);
    }

    // Low power warning: flash the power display when below 15%
    var powerArea = document.getElementById('powerArea');
    if (powerArea) {
        if (game.power > 0 && game.power < 15) {
            powerArea.classList.add('power-critical');
        } else {
            powerArea.classList.remove('power-critical');
        }
    }
}

function updateNightButtons() {
    document.querySelectorAll('.nightBtn:not(.deathModeBtn)').forEach(function(btn, i) {
        var night = i + 1;
        if (unlockedNights.indexOf(night) >= 0) {
            btn.classList.remove('locked');
        } else {
            btn.classList.add('locked');
        }
    });
}

window.toggleDoor = toggleDoor;
window.toggleLight = toggleLight;