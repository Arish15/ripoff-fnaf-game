/**
 * FNAF Game — Main Controller
 * Handles: game loop, power drain, HUD updates, UI state, game-over triggers
 */

// Dev mode: press V 5 times to unlock night selector
var devModePresses = 0;
var devModeTimeout = null;
var devModeUnlocked = false;
var devModeActive = false;

/**
 * Main game tick — runs every 100ms (10 times per second)
 * Handles: time progression, power drain, AI ticks, collision checks, HUD updates
 * Called by: setInterval(tickGame, 100) in startGame()
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
    }

    // Freddy power outage sequence: eyes in darkness, then jumpscare after jingle (~5-6s)
    if (game.powerOutage && game.powerOutageTime) {
        var elapsed = game.time - game.powerOutageTime;
        if (!game.powerOutageDelay) {
            game.powerOutageDelay = 5.5 + Math.random() * 1.0;
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

/**
 * Initialize and start a night
 * @param {number} night - Night to start (1-7, where 7 is Custom Night)
 * Resets all game state, animatronics, and displays the office
 * Sets up the 100ms game loop and ambient audio
 * Called by: HTML onclick (startGame button), nextNight()
 */
function startGame(night) {
    // Dev mode bypasses unlock restrictions
    if (!devModeActive && unlockedNights.indexOf(night) < 0) return;

    game.running = true;
    gameOverTriggered = false;
    if (gameOverTimeout) {
        clearTimeout(gameOverTimeout);
        gameOverTimeout = null;
    }
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
    if (window.forceOfficeLightsOff) window.forceOfficeLightsOff();

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
    if (officeEl) {
        officeEl.style.display = 'flex';
        // Force reflow to ensure layout is calculated before Three.js init
        void officeEl.offsetHeight;
    }
    if (window.office3d) {
        var initOffice3D = function() {
            if (!game.running) return;
            // If monitor is up, wait until office view is active before initializing.
            if (monitorOpen) {
                setTimeout(initOffice3D, 100);
                return;
            }
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

    var nd = document.getElementById('nightDisplay');
    if (nd) {
        if (game.deathMode) {
            nd.textContent = 'DEATH MODE';
        } else {
            nd.textContent = night === 7 ? 'CUSTOM NIGHT' : 'NIGHT ' + night;
        }
    }

    // Night intro overlay — "Night X" title card with brief delay
    var intro = document.getElementById('nightIntro');
    var introText = document.getElementById('nightIntroText');
    if (intro && introText) {
        if (game.deathMode) {
            introText.textContent = 'DEATH MODE';
        } else {
            introText.textContent = night === 7 ? 'Custom Night' : 'Night ' + night;
        }
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

/**
 * End the current night and display completion screen
 * Unlocks next night if not already unlocked
 * Called by: tickGame() when hour >= 6 (6 AM reached)
 */
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

/**
 * Proceed to next night or return to start screen
 * Called by: HTML onclick (nextNight button after endNight screen)
 */
function nextNight() {
    document.getElementById('nightCompleteScreen').classList.remove('show');
    if (game.currentNight >= 7) returnToStart();
    else if (game.currentNight >= 6) returnToStart();
    else startGame(game.currentNight + 1);
}

/**
 * Update hallway animatronic silhouettes to show visual movement
 * Called every game tick to animate silhouettes as animatronics progress through hallways
 */


/**
 * Trigger game-over sequence (jumpscare + end screen)
 * @param {string} msg - Animatronic name/event triggering jumpscare
 *                      (e.g., 'FREDDY', 'BONNIE', 'FOXY', 'GOLDEN FREDDY', 'FREDDY_POWER')
 * Used for: animatronic collision, power outage, golden freddy timeout
 * Called by: checkCollisions(), tickGame() (power outage), game.js
 */
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
    var jingleGO = document.getElementById('freddyJingleAudio');
    if (jingleGO) {
        jingleGO.pause();
        jingleGO.currentTime = 0;
    }
    var fpoGO = document.getElementById('freddyPowerOut');
    if (fpoGO) fpoGO.classList.remove('show');

    var scare = document.getElementById('jumpScare');

    // Determine animatronic type and duration
    var animatronicType = 'freddy';
    var scareDuration = 2800;
    if (msg.indexOf('GOLDEN') >= 0) {
        animatronicType = 'golden';
        scareDuration = 4500;
    } else if (msg.indexOf('FREDDY_POWER') >= 0) {
        animatronicType = 'freddy';
        scareDuration = 2400;
    } else if (msg.indexOf('BONNIE') >= 0) {
        animatronicType = 'bonnie';
        scareDuration = 1400;
    } else if (msg.indexOf('CHICA') >= 0) {
        animatronicType = 'chica';
        scareDuration = 1800;
    } else if (msg.indexOf('FOXY') >= 0) {
        animatronicType = 'foxy';
        scareDuration = 2000;
    } else if (msg.indexOf('FREDDY') >= 0) {
        animatronicType = 'freddy';
        scareDuration = 2800;
    }

    // CSS fallback for old-style jumpscare display (if jumpScare module unavailable)
    if (scare) {
        scare.className = '';
        if (animatronicType === 'freddy') scare.classList.add('scare-freddy');
        else if (animatronicType === 'golden') scare.classList.add('scare-golden');
        else if (animatronicType === 'bonnie') scare.classList.add('scare-bonnie');
        else if (animatronicType === 'chica') scare.classList.add('scare-chica');
        else if (animatronicType === 'foxy') scare.classList.add('scare-foxy');
        scare.classList.add('show');
    }

    // Trigger procedural animation if available
    if (window.jumpScare && window.jumpScare.animate) {
        window.jumpScare.animate(animatronicType, scareDuration);
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

/**
 * Return to start screen — clean up all game state and overlays
 * Stops game loop, clears animatronics, and resets UI
 * Called by: HTML onclick (restart button), nextNight() on final nights
 */
function stopAllAudio() {
    var ids = [
        'doorAudio', 'jumpScareAudio', 'powerOutAudio', 'freddyJingleAudio', 'successAudio',
        'ambientAudio', 'foxyRunAudio', 'freddyLaughAudio', 'camStaticAudio', 'camChangeAudio',
        'garble1Audio', 'garble2Audio', 'windowScareAudio', 'foxySprintAudio', 'lightAudio',
        'lightHumAudio', 'goldenFreddyScareAudio',
        'phoneGuyAudio1', 'phoneGuyAudio2', 'phoneGuyAudio3', 'phoneGuyAudio4'
    ];
    ids.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            el.pause();
            el.currentTime = 0;
        }
    });
}

function returnToStart() {
    stopAllAudio();
    game.running = false;
    game.deathMode = false;
    devModeActive = false;
    gameOverTriggered = false;
    if (gameOverTimeout) {
        clearTimeout(gameOverTimeout);
        gameOverTimeout = null;
    }
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
    if (window.forceOfficeLightsOff) window.forceOfficeLightsOff();
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

    // Explicitly hide and reset office before hiding office area
    if (window.office3d && window.office3d.hide) {
        window.office3d.hide();
    }
    office3dInited = false;
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
        // Dev mode: Press V 5 times (outside gameplay) to unlock night selector
        if ((e.key === 'v' || e.key === 'V') && !game.running) {
            devModePresses++;
            if (devModeTimeout) clearTimeout(devModeTimeout);
            
            if (devModePresses === 5) {
                devModeUnlocked = true;
                devModePresses = 0;
                showDevNightSelector();
            } else {
                // Reset counter if more than 1 second passes between presses
                devModeTimeout = setTimeout(function() {
                    devModePresses = 0;
                }, 1000);
            }
            return;
        }
        
        if (e.key === 'Escape' && game.running) returnToStart();
        // Space: toggle monitor
        if (e.key === ' ' && game.running) {
            e.preventDefault();
            toggleMonitor();
        }
        // D/F: toggle left/right door
        if ((e.key === 'd' || e.key === 'D') && game.running && !monitorOpen) toggleDoor('left');
        if ((e.key === 'f' || e.key === 'F') && game.running && !monitorOpen) toggleDoor('right');
        // C: toggle left light
        if ((e.key === 'c' || e.key === 'C') && game.running && !monitorOpen) toggleLight('left');
        // V (during gameplay): toggle right light
        if ((e.key === 'v' || e.key === 'V') && game.running && !monitorOpen) toggleLight('right');
    });
});

// Dev mode night selector
function showDevNightSelector() {
    var existing = document.getElementById('devNightSelector');
    if (existing) existing.remove();
    
    var modal = document.createElement('div');
    modal.id = 'devNightSelector';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000; font-family: Arial, sans-serif;';
    
    var box = document.createElement('div');
    box.style.cssText = 'background: #222; padding: 40px; border: 3px solid #00ff00; border-radius: 10px; text-align: center; color: #00ff00; max-width: 800px;';
    
    var title = document.createElement('h2');
    title.textContent = 'DEV MODE - Select Mode';
    title.style.cssText = 'margin: 0 0 30px 0; font-size: 28px; text-shadow: 0 0 10px #00ff00;';
    box.appendChild(title);
    
    var nightTitle = document.createElement('h3');
    nightTitle.textContent = 'Story Nights';
    nightTitle.style.cssText = 'margin: 20px 0 15px 0; font-size: 18px; color: #00ff00;';
    box.appendChild(nightTitle);
    
    var buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px;';
    
    for (var i = 1; i <= 6; i++) {
        var btn = document.createElement('button');
        btn.textContent = 'Night ' + i;
        btn.style.cssText = 'padding: 15px 20px; background: #111; color: #00ff00; border: 2px solid #00ff00; font-size: 16px; cursor: pointer; border-radius: 5px; font-weight: bold; transition: all 0.2s;';
        btn.onmouseover = function() { this.style.background = '#00ff00'; this.style.color = '#000'; };
        btn.onmouseout = function() { this.style.background = '#111'; this.style.color = '#00ff00'; };
        btn.onclick = (function(night) {
            return function() {
                modal.remove();
                devModeActive = true;
                game.currentNight = night;
                startGame(night);
            };
        })(i);
        buttonContainer.appendChild(btn);
    }
    box.appendChild(buttonContainer);
    
    var customTitle = document.createElement('h3');
    customTitle.textContent = 'Custom Modes';
    customTitle.style.cssText = 'margin: 20px 0 15px 0; font-size: 18px; color: #00ff00;';
    box.appendChild(customTitle);
    
    var customContainer = document.createElement('div');
    customContainer.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px;';
    
    // Custom Night button
    var customBtn = document.createElement('button');
    customBtn.textContent = 'Custom Night';
    customBtn.style.cssText = 'padding: 15px 20px; background: #111; color: #00ff00; border: 2px solid #00ff00; font-size: 16px; cursor: pointer; border-radius: 5px; font-weight: bold; transition: all 0.2s;';
    customBtn.onmouseover = function() { this.style.background = '#00ff00'; this.style.color = '#000'; };
    customBtn.onmouseout = function() { this.style.background = '#111'; this.style.color = '#00ff00'; };
    customBtn.onclick = function() {
        modal.remove();
        devModeActive = true;
        game.currentNight = 7;
        startGame(7);
    };
    customContainer.appendChild(customBtn);
    
    // Death Mode button (all AI at max)
    var deathBtn = document.createElement('button');
    deathBtn.textContent = 'DEATH MODE';
    deathBtn.style.cssText = 'padding: 15px 20px; background: #ff0000; color: #ffff00; border: 2px solid #ff0000; font-size: 16px; cursor: pointer; border-radius: 5px; font-weight: bold; transition: all 0.2s; text-shadow: 0 0 10px #ff0000;';
    deathBtn.onmouseover = function() { this.style.background = '#ffff00'; this.style.color = '#ff0000'; };
    deathBtn.onmouseout = function() { this.style.background = '#ff0000'; this.style.color = '#ffff00'; };
    deathBtn.onclick = function() {
        modal.remove();
        devModeActive = true;
        game.currentNight = 7;
        game.deathMode = true;
        startGame(7);
    };
    customContainer.appendChild(deathBtn);
    box.appendChild(customContainer);
    
    var closeText = document.createElement('p');
    closeText.textContent = 'Click to start or press Escape to close';
    closeText.style.cssText = 'margin: 0; font-size: 14px; color: #00aa00;';
    box.appendChild(closeText);
    
    modal.appendChild(box);
    document.body.appendChild(modal);
    
    // Close on Escape
    var closeHandler = function(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', closeHandler);
        }
    };
    document.addEventListener('keydown', closeHandler);
}

/**
 * ── JUMPSCARE ASSET SETUP ──
 * Call this function to register custom jumpscare animations.
 * Assets display on full-screen canvas with black background (independent of office).
 * 
 * Examples:
 *   initJumpscares({
 *     freddy: { type: 'image', src: 'src/assets/freddy_jumpscare.png' },
 *     bonnie: { type: 'sprite', src: 'src/assets/bonnie_frames.png', frameWidth: 512, frameHeight: 512, frames: 4, fps: 15 },
 *     chica: { type: 'sequence', src: 'src/assets/chica_frame_', ext: '.png', frameCount: 8, fps: 20 }
 *   });
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

window.startGame = startGame;
window.nextNight = nextNight;
window.returnToStart = returnToStart;
window.triggerGameOver = triggerGameOver;
window.initJumpscares = initJumpscares;