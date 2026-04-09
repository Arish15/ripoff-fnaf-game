/**
 * FNAF Game — Main Controller
 */

function tickGame() {
    if (!game.running) return;

    if (window.office3d) window.office3d.setMouse(mouseNormX);

    game.time += 0.1;
    var hrs = game.time / 90;
    game.hour = Math.floor(hrs);
    game.minute = (hrs % 1) * 60;

    var drain = 0.01;
    if (game.lightLeft) drain += 0.01;
    if (game.lightRight) drain += 0.01;
    if (game.doorLeft) drain += 0.018;
    if (game.doorRight) drain += 0.018;
    if (monitorOpen) drain += 0.013;
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
        game.lightLeft = game.lightRight = false;
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
            window.office3d.setLightLeft(false);
            window.office3d.setLightRight(false);
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
    }

    // Freddy power outage sequence: screen goes dark, then jumpscare after ~1s
    if (game.powerOutage && game.powerOutageTime) {
        var elapsed = game.time - game.powerOutageTime;
        if (!game.powerOutageDelay) {
            game.powerOutageDelay = 0.8 + Math.random() * 0.5;
        }
        // Jumpscare after short delay
        if (elapsed >= game.powerOutageDelay) {
            triggerGameOver('FREDDY_POWER');
            return;
        }
    }

    var ai = NIGHT_AI[game.currentNight] || NIGHT_AI[1];

    // Golden Freddy: counts down when active in office, opening camera dismisses
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

function startGame(night) {
    if (unlockedNights.indexOf(night) < 0) return;

    game.running = true;
    gameOverTriggered = false;
    if (gameOverTimeout) { clearTimeout(gameOverTimeout);
        gameOverTimeout = null; }
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
    hidePhoneGuy();

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
        if (a.timer !== undefined) a.timer = 0;
        // Reset Foxy-specific fields
        a.ignoreTicks = 0;
        a.preventionTimer = 0;
        a.wasWatchingCam1c = false;
        a.wasMonitorOpen = false;
    });

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
    if (officeEl) officeEl.style.display = 'flex';
    if (window.office3d) {
        setTimeout(function() {
            if (!office3dInited) {
                window.office3d.init();
                office3dInited = true;
            } else {
                window.office3d.resize();
            }
            window.office3d.setDoorLeft(false);
            window.office3d.setDoorRight(false);
            window.office3d.setLightLeft(false);
            window.office3d.setLightRight(false);
            window.office3d.setHallLeft(null);
            window.office3d.setHallRight(null);
        }, 50);
    }

    var nd = document.getElementById('nightDisplay');
    if (nd) nd.textContent = night === 7 ? 'CUSTOM NIGHT' : 'NIGHT ' + night;

    // Night intro overlay — "Night X" title card with brief delay
    var intro = document.getElementById('nightIntro');
    var introText = document.getElementById('nightIntroText');
    if (intro && introText) {
        introText.textContent = night === 7 ? 'Custom Night' : 'Night ' + night;
        intro.classList.add('show');
        setTimeout(function() {
            intro.classList.remove('show');
            // Phone Guy message after intro fades
            showPhoneGuy(night);
        }, 2200);
    }

    // Hide Freddy power-out overlay from previous game
    var fpo = document.getElementById('freddyPowerOut');
    if (fpo) fpo.classList.remove('show');
    var gfo = document.getElementById('goldenFreddyOverlay');
    if (gfo) gfo.classList.remove('show');
    var jingle = document.getElementById('freddyJingleAudio');
    if (jingle) {
        jingle.pause();
        jingle.currentTime = 0;
    }

    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(tickGame, 100);

    // Start ambient audio
    var ambient = document.getElementById('ambientAudio');
    if (ambient) {
        ambient.volume = 0.3;
        ambient.play().catch(function() {});
    }

    updateHUD();
}

function endNight() {
    game.running = false;
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    var ambient = document.getElementById('ambientAudio');
    if (ambient) {
        ambient.pause();
        ambient.currentTime = 0;
    }
    var audio = document.getElementById('successAudio');
    if (audio) audio.play().catch(function() {});

    // Night 5 ending: show 6AM screen, then newspaper article
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

    // 20/20/20/20 mode star
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

function triggerGameOver(msg) {
    if (!game.running || gameOverTriggered) return;
    gameOverTriggered = true;
    game.running = false;
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    var ambient = document.getElementById('ambientAudio');
    if (ambient) {
        ambient.pause();
        ambient.currentTime = 0;
    }
    var lightHumGO = document.getElementById('lightHumAudio');
    if (lightHumGO) {
        lightHumGO.pause();
        lightHumGO.currentTime = 0;
    }

    var scare = document.getElementById('jumpScare');
    if (scare) {
        // Remove any previous scare classes
        scare.className = '';
        // Set per-animatronic scare color
        if (msg.indexOf('FREDDY') >= 0 && msg.indexOf('GOLDEN') < 0 && msg.indexOf('POWER') < 0) scare.classList.add('scare-freddy');
        else if (msg.indexOf('FREDDY_POWER') >= 0) scare.classList.add('scare-freddy-power');
        else if (msg.indexOf('BONNIE') >= 0) scare.classList.add('scare-bonnie');
        else if (msg.indexOf('CHICA') >= 0) scare.classList.add('scare-chica');
        else if (msg.indexOf('FOXY') >= 0) scare.classList.add('scare-foxy');
        else if (msg.indexOf('GOLDEN') >= 0) scare.classList.add('scare-golden');
        else scare.classList.add('scare-freddy');
        scare.classList.add('show');
    }
    var audio;
    if (msg.indexOf('GOLDEN') >= 0) {
        audio = document.getElementById('goldenFreddyScareAudio');
    } else {
        audio = document.getElementById('jumpScareAudio');
    }
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(function() {});
    }

    // Duration matched to each asset's animation length + generous hold
    var scareDuration = 2800;
    if (msg.indexOf('GOLDEN') >= 0) scareDuration = 4500;
    else if (msg.indexOf('FREDDY_POWER') >= 0) scareDuration = 2400;
    else if (msg.indexOf('BONNIE') >= 0) scareDuration = 1400;
    else if (msg.indexOf('CHICA') >= 0) scareDuration = 1800;
    else if (msg.indexOf('FOXY') >= 0) scareDuration = 2000;
    else if (msg.indexOf('FREDDY') >= 0) scareDuration = 2800;

    if (gameOverTimeout) { clearTimeout(gameOverTimeout); }
    gameOverTimeout = setTimeout(function() {
        gameOverTimeout = null;
        if (scare) {
            scare.classList.remove('show');
            scare.className = '';
        }
        var goScreen = document.getElementById('gameOverScreen');
        if (goScreen) goScreen.classList.add('show');
        var goMsg = document.getElementById('gameOverMessage');
        if (goMsg) {
            if (msg.indexOf('GOLDEN') >= 0) goMsg.textContent = 'IT\'S ME';
            else if (msg.indexOf('FREDDY_POWER') >= 0) goMsg.textContent = 'FREDDY FAZBEAR GOT YOU!';
            else if (msg.indexOf('FREDDY') >= 0) goMsg.textContent = 'FREDDY FAZBEAR GOT YOU!';
            else if (msg.indexOf('BONNIE') >= 0) goMsg.textContent = 'BONNIE GOT YOU!';
            else if (msg.indexOf('CHICA') >= 0) goMsg.textContent = 'CHICA GOT YOU!';
            else if (msg.indexOf('FOXY') >= 0) goMsg.textContent = 'FOXY BREACHED THE HALL!';
            else goMsg.textContent = msg;
        }
    }, scareDuration);
}

function returnToStart() {
    game.running = false;
    gameOverTriggered = false;
    if (gameOverTimeout) { clearTimeout(gameOverTimeout);
        gameOverTimeout = null; }
    monitorOpen = false;
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    // Clean up overlays
    var fpo = document.getElementById('freddyPowerOut');
    if (fpo) fpo.classList.remove('show');
    var pdo = document.getElementById('powerDarkOverlay');
    if (pdo) pdo.classList.remove('show');
    var gfo = document.getElementById('goldenFreddyOverlay');
    if (gfo) gfo.classList.remove('show');
    goldenFreddyActive = false;
    goldenFreddyTimer = 0;
    // Stop all game audio
    hidePhoneGuy();
    var halluOverlay = document.getElementById('hallucinationOverlay');
    if (halluOverlay) halluOverlay.classList.remove('show');
    var ambient = document.getElementById('ambientAudio');
    if (ambient) {
        ambient.pause();
        ambient.currentTime = 0;
    }
    var jingle = document.getElementById('freddyJingleAudio');
    if (jingle) {
        jingle.pause();
        jingle.currentTime = 0;
    }
    var scareAudio = document.getElementById('jumpScareAudio');
    if (scareAudio) {
        scareAudio.pause();
        scareAudio.currentTime = 0;
    }
    var intro = document.getElementById('nightIntro');
    if (intro) intro.classList.remove('show');
    var scare = document.getElementById('jumpScare');
    if (scare) {
        scare.classList.remove('show');
        scare.className = '';
    }

    document.getElementById('gameOverScreen').classList.remove('show');
    document.getElementById('nightCompleteScreen').classList.remove('show');
    var newspaper = document.getElementById('newspaperScreen');
    if (newspaper) newspaper.classList.remove('show');
    document.getElementById('gameContainer').classList.remove('show');
    document.getElementById('startScreen').classList.remove('hidden');
    hideCustomNight();
    var officeEl = document.getElementById('officeArea');
    if (officeEl) officeEl.style.display = 'none';
    var grid = document.getElementById('cameraGrid');
    var mon = document.getElementById('monitorArea');
    var ctBtn = document.getElementById('cameraToggleBtn');
    if (grid) grid.classList.remove('show');
    if (mon) mon.classList.remove('visible');
    if (ctBtn) {
        ctBtn.classList.remove('active');
        ctBtn.classList.remove('disabled');
    }
    updateNightButtons();
    updateStars();
}

document.addEventListener('DOMContentLoaded', function() {
    loadProgress();
    initCanvas();
    sizeCanvas();
    try {
        loadAssets();
        verifyAssets();
    } catch (e) {}
    startCameraLoop();
    updateNightButtons();
    initExtras();

    var officeArea = document.getElementById('officeArea');
    if (officeArea) {
        officeArea.addEventListener('mousemove', function(e) {
            if (!game.running || monitorOpen) return;
            var rect = officeArea.getBoundingClientRect();
            mouseNormX = Math.max(0, Math.min(1, (e.clientX - rect.left) / (rect.width || 1)));
            if (window.office3d) window.office3d.setMouse(mouseNormX);
        });
        officeArea.addEventListener('mouseleave', function() {
            mouseNormX = 0.5;
        });
    }

    var camToggle = document.getElementById('cameraToggleBtn');
    if (camToggle) camToggle.addEventListener('click', function() { toggleMonitor(); });

    document.querySelectorAll('.camBtn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var cam = this.getAttribute('data-cam');
            if (cam) switchCam(cam);
        });
    });

    document.querySelectorAll('.nightBtn').forEach(function(btn, i) {
        var night = i + 1;
        btn.addEventListener('click', function() { startGame(night); });
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
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && game.running) returnToStart();
        // Space: toggle monitor
        if (e.key === ' ' && game.running) {
            e.preventDefault();
            toggleMonitor();
        }
        // D/F: toggle left/right door
        if ((e.key === 'd' || e.key === 'D') && game.running && !monitorOpen) toggleDoor('left');
        if ((e.key === 'f' || e.key === 'F') && game.running && !monitorOpen) toggleDoor('right');
        // C/V or Shift+D/Shift+F: toggle left/right light
        if ((e.key === 'c' || e.key === 'C') && game.running && !monitorOpen) toggleLight('left');
        if ((e.key === 'v' || e.key === 'V') && game.running && !monitorOpen) toggleLight('right');
    });
});

window.startGame = startGame;
window.nextNight = nextNight;
window.returnToStart = returnToStart;
window.triggerGameOver = triggerGameOver;