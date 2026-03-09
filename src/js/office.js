/**
 * FNAF Game — Office Interactions & HUD
 */

function toggleDoor(side) {
    if (!game.running) return;
    if (side === 'left') {
        game.doorLeft = !game.doorLeft;
        if (window.office3d) window.office3d.setDoorLeft(game.doorLeft);
        var btn = document.querySelector('.office-btn-door-left');
        if (btn) {
            btn.classList.toggle('active', game.doorLeft);
            btn.classList.add('pressed');
            setTimeout(function(){ btn.classList.remove('pressed'); }, 120);
        }
    } else {
        game.doorRight = !game.doorRight;
        if (window.office3d) window.office3d.setDoorRight(game.doorRight);
        var btn2 = document.querySelector('.office-btn-door-right');
        if (btn2) {
            btn2.classList.toggle('active', game.doorRight);
            btn2.classList.add('pressed');
            setTimeout(function(){ btn2.classList.remove('pressed'); }, 120);
        }
    }
    var audio = document.getElementById('doorAudio');
    if (audio) audio.play().catch(function(){});
}

function toggleLight(side) {
    if (!game.running) return;
    if (side === 'left') {
        game.lightLeft = !game.lightLeft;
        var btn = document.querySelector('.office-btn-light-left');
        if (btn) btn.classList.toggle('active', game.lightLeft);
        if (btn) {
            btn.classList.add('pressed');
            setTimeout(function(){ btn.classList.remove('pressed'); }, 120);
        }
        if (window.office3d) window.office3d.setLightLeft(game.lightLeft);
    } else {
        game.lightRight = !game.lightRight;
        var btn2 = document.querySelector('.office-btn-light-right');
        if (btn2) btn2.classList.toggle('active', game.lightRight);
        if (btn2) {
            btn2.classList.add('pressed');
            setTimeout(function(){ btn2.classList.remove('pressed'); }, 120);
        }
        if (window.office3d) window.office3d.setLightRight(game.lightRight);
    }
    var audio = document.getElementById('doorAudio');
    if (audio) audio.play().catch(function(){});
}

function updateHUD() {
    var h = game.hour === 0 ? 12 : game.hour;
    var m = String(Math.min(59, Math.floor(game.minute))).padStart(2, '0');
    var td = document.getElementById('timeDisplay');
    var pd = document.getElementById('powerDisplay');
    if (td) td.textContent = h + ':' + m + ' AM';
    if (pd) pd.textContent = Math.floor(game.power) + '%';

    var lightsOn  = game.lightLeft || game.lightRight;
    var doorsUsed = game.doorLeft  || game.doorRight;
    var lu = (game.lightLeft ? 50 : 0) + (game.lightRight ? 50 : 0);
    var du = (game.doorLeft  ? 50 : 0) + (game.doorRight  ? 50 : 0);
    var bl = document.getElementById('barLights');
    var bd = document.getElementById('barDoors');
    var bc = document.getElementById('barCamera');
    if (bl) bl.classList.toggle('active', lightsOn);
    if (bd) bd.classList.toggle('active', doorsUsed);
    if (bc) bc.classList.toggle('active', monitorOpen);
    var el;
    el = document.getElementById('usageLights'); if (el) el.style.width = lu + '%';
    el = document.getElementById('usageDoors');  if (el) el.style.width = du + '%';
    el = document.getElementById('usageCamera'); if (el) el.style.width = (monitorOpen ? 100 : 0) + '%';
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
