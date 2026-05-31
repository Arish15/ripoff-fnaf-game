/**
 * FNAF Game — Office Interactions & HUD
 */

// ── Window scare: plays once when animatronic first appears AT the door with light on ──
// Flags reset only when the animatronic leaves the door position entirely.
var _leftScaredPlayed = false, _rightScaredPlayed = false;

function _checkWindowScare(side) {
    if (!window.office3d) return;
    // Only trigger at the actual door positions, not further down the hall
    var atDoor = false;
    Object.values(animatronics).forEach(function(a) {
        var pos = a.path[a.pos];
        if (side === 'left'  && pos === 'doorW') atDoor = true;
        if (side === 'right' && pos === 'doorE') atDoor = true;
    });
    if (!atDoor) return;
    // Don't replay while same animatronic is still at the door
    if (side === 'left'  && _leftScaredPlayed)  return;
    if (side === 'right' && _rightScaredPlayed) return;
    if (side === 'left')  _leftScaredPlayed  = true;
    else                  _rightScaredPlayed = true;
    var ws = document.getElementById('windowScareAudio');
    if (ws) { ws.currentTime = 0; ws.play().catch(function() {}); }
}

// Called by updateHallAnimatronics when the animatronic leaves the door — rearms the scare.
function _resetWindowScare(side) {
    if (side === 'left')  _leftScaredPlayed  = false;
    else                  _rightScaredPlayed = false;
}


function _syncLightHum(anyLightOn) {
    var lightHum = document.getElementById('lightHumAudio');
    var lightOne = document.getElementById('lightAudio');
    if (!lightHum) return;

    if (anyLightOn) {
        if (lightHum.paused) {
            lightHum.currentTime = 0;
            lightHum.play().catch(function() {});
        }
    } else {
        if (!lightHum.paused) lightHum.pause();
        lightHum.currentTime = 0;
        // Stop the one-shot click immediately too — don't let it play through
        if (lightOne && !lightOne.paused) { lightOne.pause(); lightOne.currentTime = 0; }
    }
}

function _applyLightState() {
    if (window.office3d) {
        window.office3d.setLightLeft(!!game.lightLeft);
        window.office3d.setLightRight(!!game.lightRight);
    }
    _syncLightHum(!!game.lightLeft || !!game.lightRight);
}

function forceOfficeLightsOff() {
    game.lightLeft = false;
    game.lightRight = false;
    _applyLightState();
}


function toggleDoor(side) {
    if (!game.running || game.powerOutage || monitorOpen) return;
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

/**
 * Toggles the hall light on the given side and triggers window-scare check.
 * @param {'left'|'right'} side
 */
function toggleLight(side) {
    if (!game.running || game.powerOutage || monitorOpen) return;
    var turnedOn = false;
    if (side === 'left') {
        game.lightLeft = !game.lightLeft;
        if (game.lightLeft) game.lightRight = false; // FNAF1: only one hall light channel at a time
        turnedOn = game.lightLeft;
    } else {
        game.lightRight = !game.lightRight;
        if (game.lightRight) game.lightLeft = false;
        turnedOn = game.lightRight;
    }
    _applyLightState();
    // Check for window scare (animatronic at door)
    if (side === 'left' && turnedOn) _checkWindowScare('left');
    if (side === 'right' && turnedOn) _checkWindowScare('right');
    if (turnedOn) {
        var lightAudio = document.getElementById('lightAudio');
        if (lightAudio) {
            lightAudio.currentTime = 0;
            lightAudio.play().catch(function() {});
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
window.forceOfficeLightsOff = forceOfficeLightsOff;
