// engine/dev-tools.js
// Dev mode globals and night selector UI

var devModePresses = 0;
var devModeTimeout = null;
var devModeUnlocked = false;
var devModeActive = false;

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
    var closeHandler = function(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', closeHandler);
        }
    };
    document.addEventListener('keydown', closeHandler);
}

function initDevTools() {
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
                devModeTimeout = setTimeout(function() { devModePresses = 0; }, 1000);
            }
            return;
        }
    });
}
