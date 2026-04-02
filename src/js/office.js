/**
 * FNAF Game — Office Interactions & HUD
 */

function toggleDoor(side) {
    if (!game.running || game.powerOutage) return;
    if (side === 'left') {
        game.doorLeft = !game.doorLeft;
        if (window.office3d) window.office3d.setDoorLeft(game.doorLeft);
        var btn = document.querySelector('.office-btn-door-left');
        if (btn) {
            btn.classList.toggle('active', game.doorLeft);
            btn.classList.add('pressed');
            setTimeout(function() { btn.classList.remove('pressed'); }, 120);
        }
    } else {
        game.doorRight = !game.doorRight;
        if (window.office3d) window.office3d.setDoorRight(game.doorRight);
        var btn2 = document.querySelector('.office-btn-door-right');
        if (btn2) {
            btn2.classList.toggle('active', game.doorRight);
            btn2.classList.add('pressed');
            setTimeout(function() { btn2.classList.remove('pressed'); }, 120);
        }
    }
    var audio = document.getElementById('doorAudio');
    if (audio) audio.play().catch(function() {});
}

function toggleLight(side) {
    if (!game.running || game.powerOutage) return;
    if (side === 'left') {
        game.lightLeft = !game.lightLeft;
        var btn = document.querySelector('.office-btn-light-left');
        if (btn) btn.classList.toggle('active', game.lightLeft);
        if (btn) {
            btn.classList.add('pressed');
            setTimeout(function() { btn.classList.remove('pressed'); }, 120);
        }
        if (window.office3d) window.office3d.setLightLeft(game.lightLeft);
    } else {
        game.lightRight = !game.lightRight;
        var btn2 = document.querySelector('.office-btn-light-right');
        if (btn2) btn2.classList.toggle('active', game.lightRight);
        if (btn2) {
            btn2.classList.add('pressed');
            setTimeout(function() { btn2.classList.remove('pressed'); }, 120);
        }
        if (window.office3d) window.office3d.setLightRight(game.lightRight);
    }
    var audio = document.getElementById('doorAudio');
    if (audio) audio.play().catch(function() {});
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
    document.querySelectorAll('.nightBtn').forEach(function(btn, i) {
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