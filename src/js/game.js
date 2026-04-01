/**
 * FNAF Game — Main Controller
 */

function tickGame() {
    if (!game.running) return;

    if (window.office3d) window.office3d.setMouse(mouseNormX);

    // Button visibility based on camera rotation
    if (window.office3d && !monitorOpen) {
        var rotY = window.office3d.getRotation();
        var BTN_THRESHOLD = 0.3;
        var leftBtns = document.querySelectorAll('.office-btn-door-left, .office-btn-light-left');
        var rightBtns = document.querySelectorAll('.office-btn-door-right, .office-btn-light-right');
        leftBtns.forEach(function(b) {
            if (rotY > BTN_THRESHOLD) {
                b.classList.add('btn-visible');
                b.classList.remove('btn-hidden');
            } else {
                b.classList.add('btn-hidden');
                b.classList.remove('btn-visible');
            }
        });
        rightBtns.forEach(function(b) {
            if (rotY < -BTN_THRESHOLD) {
                b.classList.add('btn-visible');
                b.classList.remove('btn-hidden');
            } else {
                b.classList.add('btn-hidden');
                b.classList.remove('btn-visible');
            }
        });
    }

    game.time += 0.1;
    var hrs = game.time / 90;
    game.hour = Math.floor(hrs) % 6;
    game.minute = (hrs % 1) * 60;

    var drain = 0.01;
    if (game.lightLeft) drain += 0.01;
    if (game.lightRight) drain += 0.01;
    if (game.doorLeft) drain += 0.01;
    if (game.doorRight) drain += 0.01;
    if (monitorOpen) drain += 0.01;
    game.power = Math.max(0, game.power - drain);

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
            var oArea = document.getElementById('officeArea');
            if (grid) grid.classList.remove('show');
            if (mon) mon.classList.remove('visible');
            if (ctBtn) ctBtn.classList.remove('active');
            if (oArea) oArea.style.display = 'flex';
        }
        if (window.office3d) {
            window.office3d.setDoorLeft(false);
            window.office3d.setDoorRight(false);
            window.office3d.setLightLeft(false);
            window.office3d.setLightRight(false);
        }
        var po = document.getElementById('powerOutAudio');
        if (po) po.play().catch(function() {});
    }

    // Freddy jumpscares ~20 seconds after power outage (random 15-25s)
    if (game.powerOutage && game.powerOutageTime) {
        var elapsed = game.time - game.powerOutageTime;
        if (!game.powerOutageDelay) {
            game.powerOutageDelay = 15 + Math.random() * 10;
        }
        if (elapsed >= game.powerOutageDelay) {
            triggerGameOver('FREDDY');
            return;
        }
    }

    var ai = NIGHT_AI[game.currentNight] || NIGHT_AI[1];

    if (game.time - lastAiTick >= 5.0) {
        lastAiTick = game.time;
        tickAnimatronics(ai);
        checkCollisions();
        updateHallAnimatronics();
    }

    updateHUD();

    if (game.hour >= 6 || game.time >= 540) endNight();
}

function startGame(night) {
    if (unlockedNights.indexOf(night) < 0) return;

    game.running = true;
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
    lastAiTick = 0;

    Object.values(animatronics).forEach(function(a) {
        a.pos = 0;
        a.ai = 0;
        if (a.timer !== undefined) a.timer = 0;
    });

    var doorBtnLeft = document.querySelector('.office-btn-door-left');
    var doorBtnRight = document.querySelector('.office-btn-door-right');
    var lightBtnLeft = document.querySelector('.office-btn-light-left');
    var lightBtnRight = document.querySelector('.office-btn-light-right');
    if (doorBtnLeft) doorBtnLeft.classList.remove('active');
    if (doorBtnRight) doorBtnRight.classList.remove('active');
    if (lightBtnLeft) lightBtnLeft.classList.remove('active');
    if (lightBtnRight) lightBtnRight.classList.remove('active');

    monitorOpen = false;
    var grid = document.getElementById('cameraGrid');
    var mon = document.getElementById('monitorArea');
    var ctBtn = document.getElementById('cameraToggleBtn');
    if (grid) grid.classList.remove('show');
    if (mon) mon.classList.remove('visible');
    if (ctBtn) ctBtn.classList.remove('active');

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
    if (nd) nd.textContent = 'NIGHT ' + night;

    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(tickGame, 100);

    updateHUD();
}

function endNight() {
    game.running = false;
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    var audio = document.getElementById('successAudio');
    if (audio) audio.play().catch(function() {});
    document.getElementById('nightCompleteScreen').classList.add('show');
    if (game.currentNight < 6 && unlockedNights.indexOf(game.currentNight + 1) < 0) {
        unlockedNights.push(game.currentNight + 1);
        saveProgress();
    }
}

function nextNight() {
    document.getElementById('nightCompleteScreen').classList.remove('show');
    if (game.currentNight >= 6) returnToStart();
    else startGame(game.currentNight + 1);
}

function triggerGameOver(msg) {
    if (!game.running) return;
    game.running = false;
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }

    var scare = document.getElementById('jumpScare');
    if (scare) scare.classList.add('show');
    var audio = document.getElementById('jumpScareAudio');
    if (audio) audio.play().catch(function() {});

    setTimeout(function() {
        if (scare) scare.classList.remove('show');
        var goScreen = document.getElementById('gameOverScreen');
        if (goScreen) goScreen.classList.add('show');
        var goMsg = document.getElementById('gameOverMessage');
        if (goMsg) {
            if (msg.indexOf('FREDDY') >= 0) goMsg.textContent = 'FREDDY FAZBEAR GOT YOU!';
            else if (msg.indexOf('BONNIE') >= 0) goMsg.textContent = 'BONNIE GOT YOU!';
            else if (msg.indexOf('CHICA') >= 0) goMsg.textContent = 'CHICA GOT YOU!';
            else if (msg.indexOf('FOXY') >= 0) goMsg.textContent = 'FOXY BREACHED THE HALL!';
            else goMsg.textContent = msg;
        }
    }, 900);
}

function returnToStart() {
    game.running = false;
    monitorOpen = false;
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    document.getElementById('gameOverScreen').classList.remove('show');
    document.getElementById('nightCompleteScreen').classList.remove('show');
    document.getElementById('gameContainer').classList.remove('show');
    document.getElementById('startScreen').classList.remove('hidden');
    var officeEl = document.getElementById('officeArea');
    if (officeEl) officeEl.style.display = 'none';
    var grid = document.getElementById('cameraGrid');
    var mon = document.getElementById('monitorArea');
    var ctBtn = document.getElementById('cameraToggleBtn');
    if (grid) grid.classList.remove('show');
    if (mon) mon.classList.remove('visible');
    if (ctBtn) ctBtn.classList.remove('active');
    updateNightButtons();
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
    });
});

window.startGame = startGame;
window.nextNight = nextNight;
window.returnToStart = returnToStart;
window.triggerGameOver = triggerGameOver;