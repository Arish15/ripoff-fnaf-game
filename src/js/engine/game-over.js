// engine/game-over.js
// Game over, jumpscare, and return-to-start logic

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

function triggerGameOver(msg) {
    if (!game.running || gameOverTriggered) return;
    gameOverTriggered = true;
    game.running = false;
    if (gameLoop) { clearInterval(gameLoop); gameLoop = null; }
    var ambient = document.getElementById('ambientAudio');
    if (ambient) { ambient.pause(); ambient.currentTime = 0; }
    var lightHumGO = document.getElementById('lightHumAudio');
    if (lightHumGO) { lightHumGO.pause(); lightHumGO.currentTime = 0; }
    var jingleGO = document.getElementById('freddyJingleAudio');
    if (jingleGO) { jingleGO.pause(); jingleGO.currentTime = 0; }
    var fpoGO = document.getElementById('freddyPowerOut');
    if (fpoGO) fpoGO.classList.remove('show');
    var scare = document.getElementById('jumpScare');
    var res = _resolveAnimatronicType(msg);
    var animatronicType = res.type;
    var scareDuration = res.duration;
    if (scare) {
        scare.className = '';
        if (animatronicType === 'freddy') scare.classList.add('scare-freddy');
        else if (animatronicType === 'golden') scare.classList.add('scare-golden');
        else if (animatronicType === 'bonnie') scare.classList.add('scare-bonnie');
        else if (animatronicType === 'chica') scare.classList.add('scare-chica');
        else if (animatronicType === 'foxy') scare.classList.add('scare-foxy');
        scare.classList.add('show');
    }
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
            if (msg.indexOf('GOLDEN') >= 0) goMsg.textContent = "IT'S ME";
            else if (msg.indexOf('FREDDY_POWER') >= 0) goMsg.textContent = 'FREDDY FAZBEAR GOT YOU!';
            else if (msg.indexOf('FREDDY') >= 0) goMsg.textContent = 'FREDDY FAZBEAR GOT YOU!';
            else if (msg.indexOf('BONNIE') >= 0) goMsg.textContent = 'BONNIE GOT YOU!';
            else if (msg.indexOf('CHICA') >= 0) goMsg.textContent = 'CHICA GOT YOU!';
            else if (msg.indexOf('FOXY') >= 0) goMsg.textContent = 'FOXY BREACHED THE HALL!';
            else goMsg.textContent = msg;
        }
    }, scareDuration);
}

function _resolveAnimatronicType(msg) {
    if (msg.indexOf('GOLDEN') >= 0) return { type: 'golden', duration: 4500 };
    if (msg.indexOf('FREDDY_POWER') >= 0) return { type: 'freddy', duration: 2400 };
    if (msg.indexOf('BONNIE') >= 0) return { type: 'bonnie', duration: 1400 };
    if (msg.indexOf('CHICA') >= 0) return { type: 'chica', duration: 1800 };
    if (msg.indexOf('FOXY') >= 0) return { type: 'foxy', duration: 2000 };
    if (msg.indexOf('FREDDY') >= 0) return { type: 'freddy', duration: 2800 };
    return { type: 'freddy', duration: 2800 };
}

function returnToStart() {
    stopAllAudio();
    game.running = false;
    game.deathMode = false;
    devModeActive = false;
    gameOverTriggered = false;
    if (gameOverTimeout) { clearTimeout(gameOverTimeout); gameOverTimeout = null; }
    monitorOpen = false;
    if (gameLoop) { clearInterval(gameLoop); gameLoop = null; }
    // Clean up overlays
    var fpo = document.getElementById('freddyPowerOut');
    if (fpo) fpo.classList.remove('show');
    var pdo = document.getElementById('powerDarkOverlay');
    if (pdo) pdo.classList.remove('show');
    var gfo = document.getElementById('goldenFreddyOverlay');
    if (gfo) gfo.classList.remove('show');
    goldenFreddyActive = false;
    goldenFreddyTimer = 0;
    hidePhoneGuy();
    if (window.forceOfficeLightsOff) window.forceOfficeLightsOff();
    var halluOverlay = document.getElementById('hallucinationOverlay');
    if (halluOverlay) halluOverlay.classList.remove('show');
    var ambient = document.getElementById('ambientAudio');
    if (ambient) { ambient.pause(); ambient.currentTime = 0; }
    var jingle = document.getElementById('freddyJingleAudio');
    if (jingle) { jingle.pause(); jingle.currentTime = 0; }
    var scareAudio = document.getElementById('jumpScareAudio');
    if (scareAudio) { scareAudio.pause(); scareAudio.currentTime = 0; }
    var intro = document.getElementById('nightIntro');
    if (intro) intro.classList.remove('show');
    var scare = document.getElementById('jumpScare');
    if (scare) { scare.classList.remove('show'); scare.className = ''; }
    document.getElementById('gameOverScreen').classList.remove('show');
    document.getElementById('nightCompleteScreen').classList.remove('show');
    var newspaper = document.getElementById('newspaperScreen');
    if (newspaper) newspaper.classList.remove('show');
    document.getElementById('gameContainer').classList.remove('show');
    document.getElementById('startScreen').classList.remove('hidden');
    hideCustomNight();
    if (window.office3d && window.office3d.hide) { window.office3d.hide(); }
    office3dInited = false;
    var officeEl = document.getElementById('officeArea');
    if (officeEl) officeEl.style.display = 'none';
    var grid = document.getElementById('cameraGrid');
    var mon = document.getElementById('monitorArea');
    var ctBtn = document.getElementById('cameraToggleBtn');
    if (grid) grid.classList.remove('show');
    if (mon) mon.classList.remove('visible');
    if (ctBtn) { ctBtn.classList.remove('active'); ctBtn.classList.remove('disabled'); }
    updateNightButtons();
    updateStars();
}
