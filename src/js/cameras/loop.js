/**
 * FNAF Game — Camera System Loop
 * RAF loop orchestration, canvas initialization, and drawCamera orchestrator
 */

/** @type {CanvasRenderingContext2D} */
var camCanvas, camCtx;
var camStaticTimer = 0;

/**
 * Initialize canvas references
 * Should be called once at game start
 */
function initCanvas() {
    camCanvas = document.getElementById('cameraCanvas');
    if (camCanvas) camCtx = camCanvas.getContext('2d');
}

/**
 * Resize canvas to fit monitor stand dimensions
 * Called after CSS transitions or window resize
 */
function sizeCanvas() {
    if (!camCanvas) initCanvas();
    if (!camCanvas) return;
    var stand = document.getElementById('monitorStand');
    if (stand && stand.clientWidth > 10) {
        camCanvas.width = stand.clientWidth - 20;
        camCanvas.height = stand.clientHeight - 20;
    } else {
        camCanvas.width = 640;
        camCanvas.height = 480;
    }
}

/**
 * Main camera rendering function
 * Orchestrates static, background, overlay, animatronics, and HUD
 */
function drawCamera() {
    if (!camCanvas || !camCtx) initCanvas();
    if (!camCanvas || !camCtx) return;

    var w = camCanvas.width;
    var h = camCanvas.height;

    if (w < 10 || h < 10) {
        sizeCanvas();
        w = camCanvas.width;
        h = camCanvas.height;
    }
    if (w < 10 || h < 10) {
        w = 640;
        h = 480;
        camCanvas.width = w;
        camCanvas.height = h;
    }

    if (!monitorOpen) {
        camCtx.clearRect(0, 0, w, h);
        return;
    }

    // Camera static effect on switch
    if (camStaticTimer > 0) {
        camStaticTimer--;
        var imgd = camCtx.createImageData(w, h);
        for (var si = 0; si < imgd.data.length; si += 4) {
            var sv = Math.floor(Math.random() * 60);
            imgd.data[si] = imgd.data[si + 1] = imgd.data[si + 2] = sv;
            imgd.data[si + 3] = 255;
        }
        camCtx.putImageData(imgd, 0, 0);
        // Draw scanlines over static
        camCtx.fillStyle = 'rgba(0,0,0,0.3)';
        for (var sl = 0; sl < h; sl += 3) {
            camCtx.fillRect(0, sl, w, 1);
        }
        return;
    }

    drawCamBg(game.currentCam, w, h);

    // CCTV post-processing: scanlines, vignette, green tint, grain
    drawCamOverlay(w, h);

    var slots = [
        { x: w * 0.25, y: h * 0.65, scale: 1.0 },
        { x: w * 0.75, y: h * 0.65, scale: 1.0 },
        { x: w * 0.50, y: h * 0.55, scale: 0.75 }
    ];
    // Stage cam: fixed positions — Bonnie left, Freddy centre, Chica right
    if (game.currentCam === 'stage') {
        var stageSlots = [
            { key: 'bonnie', x: w * 0.22 },
            { key: 'freddy', x: w * 0.50 },
            { key: 'chica', x: w * 0.78 }
        ];
        stageSlots.forEach(function(sp) {
            var a = animatronics[sp.key];
            if (a && a.path[a.pos] === 'stage') {
                drawAnimatronic(a, sp.x, h * 0.65, 1.0);
            }
        });
    } else {
        var slotIdx = 0;
        Object.values(animatronics).forEach(function(anim) {
            // Skip Foxy on pirate cove — drawn by the special curtain-stage code in drawCamBg
            if (anim.name === 'Foxy' && game.currentCam === 'pirate') return;
            // Skip drawing on Kitchen — audio-only cam in FNAF1, always static noise
            if (game.currentCam === 'kitchen') return;
            if (anim.path && anim.path[anim.pos] === game.currentCam && slotIdx < slots.length) {
                drawAnimatronic(anim, slots[slotIdx].x, slots[slotIdx].y, slots[slotIdx].scale);
                slotIdx++;
            }
        });
    }

    var fontSize = Math.max(12, Math.floor(h * 0.045));
    camCtx.font = 'bold ' + fontSize + 'px Courier New';
    camCtx.textAlign = 'left';
    camCtx.fillStyle = 'rgba(0,0,0,0.8)';
    camCtx.fillText(CAM_LABELS[game.currentCam] || game.currentCam, 10, fontSize + 10);
    camCtx.fillStyle = '#00ff88';
    camCtx.fillText(CAM_LABELS[game.currentCam] || game.currentCam, 8, fontSize + 8);

    if (Math.floor(Date.now() / 200) % 2 === 0) {
        camCtx.fillStyle = '#ff9999';
        camCtx.font = 'bold 11px Courier New';
        camCtx.textAlign = 'right';
        camCtx.fillText('REC', w - 32, 23);
    }

    // Recording dot beside REC
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        camCtx.fillStyle = '#ff3333';
        camCtx.beginPath();
        camCtx.arc(w - 18, 19, 4, 0, Math.PI * 2);
        camCtx.fill();
    }

    // In-game timestamp on camera feed (top-right, below REC)
    var HOURS_CAM = ['12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM'];
    var timeStr = (HOURS_CAM[game.hour] || '6 AM');
    camCtx.fillStyle = 'rgba(0,0,0,0.5)';
    camCtx.font = '10px Courier New';
    camCtx.textAlign = 'right';
    camCtx.fillText(timeStr, w - 10, 38);
    camCtx.fillStyle = '#aaddaa';
    camCtx.fillText(timeStr, w - 11, 37);

    // Golden Freddy easter egg: rare poster on Show Stage triggers appearance
    if (game.currentCam === 'stage' && !goldenFreddyActive && Math.random() < 0.0005) {
        // Draw eerie golden poster over the stage sign
        camCtx.fillStyle = '#ffd700';
        camCtx.globalAlpha = 0.35;
        camCtx.fillRect(w * 0.15, h * 0.2, w * 0.7, h * 0.5);
        camCtx.globalAlpha = 1.0;
        camCtx.fillStyle = '#000';
        camCtx.font = 'bold ' + Math.floor(h * 0.09) + 'px Arial';
        camCtx.textAlign = 'center';
        camCtx.fillText('IT\'S ME', w / 2, h * 0.48);
        goldenFreddyActive = true;
        goldenFreddyTimer = 100; // 10 seconds to pull up camera or get scared
    }
}

/**
 * Start the camera RAF loop
 * Continuously redraws when monitor is open
 */
function startCameraLoop() {
    function loop() {
        if (monitorOpen && game.running) drawCamera();
        cameraRafId = requestAnimationFrame(loop);
    }
    if (!cameraRafId) cameraRafId = requestAnimationFrame(loop);
}