// engine/night.js
// Night initialization, end, and progression

function startGame(night) {
    // Dev mode bypasses unlock restrictions
    if (!devModeActive && unlockedNights.indexOf(night) < 0) return;
    _resetGameState(night);
    _resetAnimatronics();
    _resetMonitorUI();
    _bootstrapOffice3D();
    _showNightIntro(night);
    hidePhoneGuy();
    if (window.forceOfficeLightsOff) window.forceOfficeLightsOff();
    // Hide overlays from previous game
    var fpo = document.getElementById('freddyPowerOut');
    if (fpo) fpo.classList.remove('show');
    var gfo = document.getElementById('goldenFreddyOverlay');
    if (gfo) gfo.classList.remove('show');
    var jingle = document.getElementById('freddyJingleAudio');
    if (jingle) { jingle.pause(); jingle.currentTime = 0; }
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(tickGame, 100);
    // Start ambient audio
    var ambient = document.getElementById('ambientAudio');
    if (ambient) { ambient.volume = 0.3; ambient.play().catch(function() {}); }
    updateHUD();
}

function _resetGameState(night) {
    game.running = true;
    gameOverTriggered = false;
    if (gameOverTimeout) { clearTimeout(gameOverTimeout); gameOverTimeout = null; }
    var goScreen0 = document.getElementById('gameOverScreen');
    if (goScreen0) goScreen0.classList.remove('show');
    game.currentNight = night;
    game.time = 0;
    game.hour = 0;
    game.minute = 0;
    game.power = 100;
    game.doorLeft = false;
    game.doorRight = false;
    game.lightLeft = false;
    game.lightRight = false;
    game.currentCam = 'stage';
    game.lastCam = 'stage';
    game.powerOutage = false;
    game.powerOutageTime = 0;
    game.powerOutageDelay = 0;
    game.freddyJingleStarted = false;
    goldenFreddyActive = false;
    goldenFreddyTimer = 0;
    lastAiTick = 0;
    hallucinationCooldown = 0;
    lastFreddyPos = 0;
}

function _resetAnimatronics() {
    Object.values(animatronics).forEach(function(a) {
        a.pos = 0;
        a.ai = 0;
        a.moveTick = 0;
        a._n4roll = 0;
        a.cornerTicks = 0;
        a.doorEntryTimer = 0;
        a.doorLinger = undefined;
        a.lingerCount = 0;
        a.doorOpenGrace = 0;
        a.prevDoorRight = false;
        a.prevDoorBlocked = false;
        a._prevPosOffice = false;
        if (a.timer !== undefined) a.timer = 0;
        a.ignoreTicks = 0;
        a.preventionTimer = 0;
        a.wasWatchingCam1c = false;
        a.wasMonitorOpen = false;
    });
}

function _resetMonitorUI() {
    monitorOpen = false;
    var grid = document.getElementById('cameraGrid');
    var mon = document.getElementById('monitorArea');
    var ctBtn = document.getElementById('cameraToggleBtn');
    if (grid) grid.classList.remove('show');
    if (mon) mon.classList.remove('visible');
    if (ctBtn) {
        ctBtn.classList.remove('active');
        ctBtn.classList.remove('disabled');
    }
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameContainer').classList.add('show');
    var officeEl = document.getElementById('officeArea');
    if (officeEl) { officeEl.style.display = 'flex'; void officeEl.offsetHeight; }
}

function _bootstrapOffice3D() {
    if (window.office3d) {
        var initOffice3D = function() {
            if (!game.running) return;
            if (monitorOpen) { setTimeout(initOffice3D, 100); return; }
            window.office3d.init();
            office3dInited = true;
            if (window.office3d.show) window.office3d.show();
            window.office3d.setDoorLeft(false);
            window.office3d.setDoorRight(false);
            window.office3d.setLightLeft(false);
            window.office3d.setLightRight(false);
            window.office3d.setHallLeft(null);
            window.office3d.setHallRight(null);
        };
        setTimeout(initOffice3D, 100);
    }
}

function _showNightIntro(night) {
    var nd = document.getElementById('nightDisplay');
    if (nd) {
        if (game.deathMode) nd.textContent = 'DEATH MODE';
        else nd.textContent = night === 7 ? 'CUSTOM NIGHT' : 'NIGHT ' + night;
    }
    var intro = document.getElementById('nightIntro');
    var introText = document.getElementById('nightIntroText');
    if (intro && introText) {
        if (game.deathMode) introText.textContent = 'DEATH MODE';
        else introText.textContent = night === 7 ? 'Custom Night' : 'Night ' + night;
        intro.classList.add('show');
        setTimeout(function() {
            intro.classList.remove('show');
            showPhoneGuy(night);
        }, 2200);
    }
}

function endNight() {
    game.running = false;
    if (gameLoop) { clearInterval(gameLoop); gameLoop = null; }
    var ambient = document.getElementById('ambientAudio');
    if (ambient) { ambient.pause(); ambient.currentTime = 0; }
    var audio = document.getElementById('successAudio');
    if (audio) audio.play().catch(function() {});
    if (game.currentNight === 5) {
        document.getElementById('nightCompleteScreen').classList.add('show');
        setTimeout(function() {
            document.getElementById('nightCompleteScreen').classList.remove('show');
            var newspaper = document.getElementById('newspaperScreen');
            if (newspaper) newspaper.classList.add('show');
        }, 3000);
    } else {
        document.getElementById('nightCompleteScreen').classList.add('show');
    }
    if (game.currentNight < 7 && unlockedNights.indexOf(game.currentNight + 1) < 0) {
        unlockedNights.push(game.currentNight + 1);
        saveProgress();
    }
    if (game.currentNight === 7) {
        var ai7 = NIGHT_AI[7];
        if (ai7 && ai7.freddy === 20 && ai7.bonnie === 20 && ai7.chica === 20 && ai7.foxy === 20) {
            try { localStorage.setItem('fnafBeat2020', 'true'); } catch (e) {}
        }
    }
}

function nextNight() {
    document.getElementById('nightCompleteScreen').classList.remove('show');
    if (game.currentNight >= 7) returnToStart();
    else if (game.currentNight >= 6) returnToStart();
    else startGame(game.currentNight + 1);
}
