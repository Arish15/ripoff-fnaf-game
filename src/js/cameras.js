/**
 * FNAF Game — Camera System
 */

var camCanvas, camCtx;

var CAM_LABELS = {
    stage:        'CAM 1A - SHOW STAGE',
    stage_left:   'CAM 2A - SUPPLY CLOSET',
    stage_right:  'CAM 2B - EAST HALL',
    dining:       'CAM 1B - DINING AREA',
    kitchen:      'CAM 4B - KITCHEN',
    backstage:    'CAM 5  - BACKSTAGE',
    pirate:       'CAM 1C - PIRATE COVE',
    hallW:        'CAM 2A - W. HALL',
    hallW_corner: 'CAM 4A - W. HALL CORNER',
    hallE:        'CAM 3  - E. HALL',
    hallE_corner: 'CAM 4B - E. HALL CORNER'
};

function initCanvas() {
    camCanvas = document.getElementById('cameraCanvas');
    if (camCanvas) camCtx = camCanvas.getContext('2d');
}

function sizeCanvas() {
    if (!camCanvas) initCanvas();
    if (!camCanvas) return;
    var stand = document.getElementById('monitorStand');
    if (stand && stand.clientWidth > 10) {
        camCanvas.width  = stand.clientWidth  - 20;
        camCanvas.height = stand.clientHeight - 20;
    } else {
        camCanvas.width  = 640;
        camCanvas.height = 480;
    }
}

function drawCamBg(cam, w, h) {
    var c = camCtx;

    if (cam === 'stage') {
        c.fillStyle = '#d4a574'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#8B7355'; c.fillRect(0, h*0.6, w, h*0.4);
        c.fillStyle = '#a0522d'; c.fillRect(w*0.15, h*0.3, w*0.7, h*0.35);
        c.fillStyle = '#8B4513'; c.fillRect(w*0.1, h*0.65, w*0.8, h*0.08);
        c.fillStyle = '#8B0000'; c.fillRect(w*0.2, h*0.15, w*0.6, h*0.2);
        c.fillStyle = '#ffcc00'; c.font = 'bold '+Math.floor(h*0.08)+'px Arial';
        c.textAlign = 'center'; c.fillText("FREDDY FAZBEAR'S PIZZA", w/2, h*0.08);

    } else if (cam === 'dining') {
        c.fillStyle = '#d4a574'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#8B7355'; c.fillRect(0, h*0.65, w, h*0.35);
        c.fillStyle = '#a0522d';
        c.fillRect(w*0.08, h*0.25, w*0.3, h*0.15); c.fillRect(w*0.62, h*0.25, w*0.3, h*0.15);
        c.fillRect(w*0.08, h*0.45, w*0.3, h*0.15); c.fillRect(w*0.62, h*0.45, w*0.3, h*0.15);
        c.fillStyle = '#c8a882';
        for (var i = 0; i < 6; i++) { c.fillRect(w*(0.15 + i*0.12), h*0.2, w*0.08, h*0.08); }
        c.fillStyle = '#ff6600';
        c.beginPath(); c.arc(w*0.15, h*0.1, h*0.04, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(w*0.85, h*0.1, h*0.04, 0, Math.PI*2); c.fill();

    } else if (cam === 'pirate') {
        c.fillStyle = '#1a3a4a'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#2a5a6a'; c.fillRect(0, h*0.6, w, h*0.4);
        c.fillStyle = '#8B0000'; c.fillRect(0, h*0.1, w*0.35, h*0.6);
        c.fillStyle = '#5a0000'; c.fillRect(w*0.65, h*0.1, w*0.35, h*0.6);
        c.fillStyle = '#8B5A2B'; c.fillRect(w*0.2, h*0.55, w*0.6, h*0.15);
        c.fillStyle = '#ffcc00'; c.font = 'bold '+Math.floor(h*0.06)+'px Arial';
        c.textAlign = 'center'; c.fillText('★ PIRATE COVE ★', w/2, h*0.08);
        c.fillStyle = '#ffdd88';
        for (var s = 0; s < 5; s++) { c.fillRect(w*(0.1 + s*0.2), h*0.25, h*0.03, h*0.03); }

    } else if (cam === 'stage_left') {
        c.fillStyle = '#c8a882'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#8B7355'; c.fillRect(0, h*0.65, w, h*0.35);
        c.strokeStyle = '#5a4030'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(0, h*0.2); c.lineTo(w*0.25, h*0.4); c.stroke();
        c.beginPath(); c.moveTo(w, h*0.2); c.lineTo(w*0.75, h*0.4); c.stroke();
        c.fillStyle = '#6b4423'; c.fillRect(w*0.3, h*0.25, w*0.4, h*0.45);
        c.strokeStyle = '#4a2810'; c.lineWidth = 3; c.strokeRect(w*0.3, h*0.25, w*0.4, h*0.45);
        c.fillStyle = '#ffaa00'; c.beginPath(); c.arc(w*0.65, h*0.47, h*0.04, 0, Math.PI*2); c.fill();
        c.fillStyle = '#ff9900';
        c.beginPath(); c.arc(w*0.1, h*0.3, h*0.04, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(w*0.9, h*0.3, h*0.04, 0, Math.PI*2); c.fill();

    } else if (cam === 'stage_right') {
        c.fillStyle = '#c8a882'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#8B7355'; c.fillRect(0, h*0.65, w, h*0.35);
        c.strokeStyle = '#5a4030'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(0, h*0.15); c.lineTo(w*0.4, h*0.35); c.stroke();
        c.beginPath(); c.moveTo(w, h*0.15); c.lineTo(w*0.6, h*0.35); c.stroke();
        c.fillStyle = '#6b4423'; c.fillRect(w*0.25, h*0.2, w*0.5, h*0.5);
        c.strokeStyle = '#4a2810'; c.lineWidth = 4; c.strokeRect(w*0.25, h*0.2, w*0.5, h*0.5);
        c.fillStyle = '#ffaa00'; c.beginPath(); c.arc(w*0.7, h*0.45, h*0.05, 0, Math.PI*2); c.fill();
        c.strokeStyle = '#999'; c.lineWidth = 2; c.strokeRect(w*0.23, h*0.18, w*0.54, h*0.54);

    } else if (cam === 'kitchen') {
        c.fillStyle = '#2a2a2a'; c.fillRect(0, 0, w, h);
        var imgd = c.createImageData(w, h);
        for (var i = 0; i < imgd.data.length; i += 4) {
            var v = Math.random() < 0.7 ? Math.floor(Math.random()*40) : 0;
            imgd.data[i] = imgd.data[i+1] = imgd.data[i+2] = v;
            imgd.data[i+3] = 255;
        }
        c.putImageData(imgd, 0, 0);
        c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, h*0.3, w, h*0.4);
        c.fillStyle = '#ff4444'; c.font = 'bold '+Math.floor(h*0.08)+'px Courier New';
        c.textAlign = 'center'; c.fillText('*** NO AUDIO ***', w/2, h*0.55);

    } else if (cam === 'backstage') {
        c.fillStyle = '#3a2a1a'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#4a3a2a'; c.fillRect(0, h*0.6, w, h*0.4);
        c.fillStyle = '#5a4a3a';
        c.fillRect(w*0.05, h*0.2, w*0.25, h*0.35);
        c.fillRect(w*0.35, h*0.15, w*0.25, h*0.4);
        c.fillRect(w*0.65, h*0.25, w*0.25, h*0.3);
        c.fillStyle = '#6a5a4a';
        c.beginPath(); c.arc(w*0.15, h*0.1, h*0.08, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(w*0.85, h*0.12, h*0.07, 0, Math.PI*2); c.fill();
        c.fillStyle = '#cc4444'; c.font = 'bold '+Math.floor(h*0.06)+'px Arial';
        c.textAlign = 'center'; c.fillText('PARTS & SERVICE', w/2, h*0.08);

    } else if (cam === 'hallW') {
        c.fillStyle = '#b8860b'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#8b7355'; c.fillRect(0, h*0.55, w, h*0.45);
        c.fillStyle = '#a0826d';
        c.beginPath(); c.moveTo(0, 0); c.lineTo(w*0.35, h*0.3); c.lineTo(w*0.35, h*0.55); c.lineTo(0, h*0.55); c.fill();
        c.fillStyle = '#9a7663';
        c.beginPath(); c.moveTo(w, 0); c.lineTo(w*0.65, h*0.3); c.lineTo(w*0.65, h*0.55); c.lineTo(w, h*0.55); c.fill();
        c.fillStyle = '#4a3a2a'; c.fillRect(w*0.35, h*0.25, w*0.3, h*0.35);
        c.fillStyle = '#1a1a1a'; c.fillRect(w*0.4, h*0.3, w*0.2, h*0.25);
        c.fillStyle = 'rgba(255,200,0,0.1)'; c.fillRect(w*0.1, h*0.05, w*0.2, h*0.1);
        c.fillRect(w*0.7, h*0.05, w*0.2, h*0.1);

    } else if (cam === 'hallE') {
        c.fillStyle = '#c8860b'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#7b5d4a'; c.fillRect(0, h*0.55, w, h*0.45);
        c.fillStyle = '#b4846d';
        c.beginPath(); c.moveTo(0, 0); c.lineTo(w*0.35, h*0.3); c.lineTo(w*0.35, h*0.55); c.lineTo(0, h*0.55); c.fill();
        c.fillStyle = '#a87d66';
        c.beginPath(); c.moveTo(w, 0); c.lineTo(w*0.65, h*0.3); c.lineTo(w*0.65, h*0.55); c.lineTo(w, h*0.55); c.fill();
        c.fillStyle = '#5a4a3a'; c.fillRect(w*0.35, h*0.25, w*0.3, h*0.35);
        c.fillStyle = '#2a1a1a'; c.fillRect(w*0.4, h*0.3, w*0.2, h*0.25);
        c.fillStyle = 'rgba(200,150,50,0.15)'; c.fillRect(w*0.08, h*0.1, w*0.15, h*0.15);
        c.fillRect(w*0.77, h*0.12, w*0.15, h*0.12);

    } else if (cam === 'hallW_corner') {
        c.fillStyle = '#a0826d'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#8b7355'; c.fillRect(0, h*0.5, w, h*0.5);
        c.fillStyle = '#9a7663';
        c.beginPath(); c.moveTo(w*0.6, 0); c.lineTo(w, 0); c.lineTo(w, h*0.55); c.lineTo(w*0.5, h*0.55); c.fill();
        c.fillStyle = '#7a6655';
        c.beginPath(); c.moveTo(0, h*0.6); c.lineTo(w*0.5, h*0.5); c.lineTo(w*0.5, h); c.lineTo(0, h); c.fill();
        c.fillStyle = '#4a3a2a'; c.fillRect(w*0.52, h*0.15, w*0.25, h*0.4);
        c.fillStyle = '#1a1a1a'; c.fillRect(w*0.58, h*0.22, w*0.13, h*0.26);
        c.fillStyle = '#cc8844';
        c.beginPath(); c.arc(w*0.15, h*0.15, h*0.04, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(w*0.85, h*0.2, h*0.04, 0, Math.PI*2); c.fill();

    } else if (cam === 'hallE_corner') {
        c.fillStyle = '#b4846d'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#7b5d4a'; c.fillRect(0, h*0.5, w, h*0.5);
        c.fillStyle = '#a87d66';
        c.beginPath(); c.moveTo(w*0.55, 0); c.lineTo(w, 0); c.lineTo(w, h*0.55); c.lineTo(w*0.45, h*0.55); c.fill();
        c.fillStyle = '#6b5444';
        c.beginPath(); c.moveTo(0, h*0.6); c.lineTo(w*0.45, h*0.5); c.lineTo(w*0.45, h); c.lineTo(0, h); c.fill();
        c.fillStyle = '#5a4a3a'; c.fillRect(w*0.5, h*0.15, w*0.28, h*0.4);
        c.fillStyle = '#2a1a1a'; c.fillRect(w*0.57, h*0.22, w*0.14, h*0.26);
        c.fillStyle = '#dd8844';
        c.beginPath(); c.arc(w*0.12, h*0.18, h*0.045, 0, Math.PI*2); c.fill();
        c.fillRect(w*0.8, h*0.15, w*0.08, h*0.15);

    } else {
        c.fillStyle = '#2a2a2a'; c.fillRect(0, 0, w, h);
    }
}

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
    if (w < 10 || h < 10) { w = 640; h = 480; camCanvas.width = w; camCanvas.height = h; }

    if (!monitorOpen) {
        camCtx.clearRect(0, 0, w, h);
        return;
    }

    drawCamBg(game.currentCam, w, h);

    var slots = [
        { x: w*0.25, y: h*0.65, scale: 1.0 },
        { x: w*0.75, y: h*0.65, scale: 1.0 },
        { x: w*0.50, y: h*0.55, scale: 0.75 }
    ];
    var slotIdx = 0;
    Object.values(animatronics).forEach(function(anim) {
        if (anim.path && anim.path[anim.pos] === game.currentCam && slotIdx < slots.length) {
            drawAnimatronic(anim, slots[slotIdx].x, slots[slotIdx].y, slots[slotIdx].scale);
            slotIdx++;
        }
    });

    var fontSize = Math.max(12, Math.floor(h * 0.045));
    camCtx.font = 'bold ' + fontSize + 'px Courier New';
    camCtx.textAlign = 'left';
    camCtx.fillStyle = 'rgba(0,0,0,0.8)';
    camCtx.fillText(CAM_LABELS[game.currentCam] || game.currentCam, 10, fontSize + 10);
    camCtx.fillStyle = '#00ff88';
    camCtx.fillText(CAM_LABELS[game.currentCam] || game.currentCam, 8, fontSize + 8);

    if (Math.floor(Date.now() / 600) % 2 === 0) {
        camCtx.fillStyle = '#ff9999'; camCtx.font = 'bold 11px Courier New';
        camCtx.textAlign = 'right'; camCtx.fillText('REC', w - 32, 23);
    }

    camCtx.fillStyle = 'rgba(0,255,136,0.5)';
    camCtx.font = '11px Courier New'; camCtx.textAlign = 'right';
    camCtx.fillText('NIGHT ' + game.currentNight, w - 8, h - 8);
}

function drawAnimatronic(anim, cx, cy, scale) {
    var c = camCtx;
    var hw = Math.floor(camCanvas.height * 0.18 * (scale || 1));

    c.save(); c.translate(cx, cy);

    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.beginPath(); c.ellipse(0, hw*0.1, hw*1.1, hw*0.2, 0, 0, Math.PI*2); c.fill();

    c.fillStyle = anim.color; c.fillRect(-hw*0.5, -hw*1.4, hw, hw*1.4);

    c.fillStyle = anim.color;
    c.beginPath(); c.arc(0, -hw*1.6, hw*0.55, 0, Math.PI*2); c.fill();

    c.fillStyle = '#fff';
    c.beginPath(); c.arc(-hw*0.22, -hw*1.72, hw*0.18, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc( hw*0.22, -hw*1.72, hw*0.18, 0, Math.PI*2); c.fill();
    c.fillStyle = '#111';
    c.beginPath(); c.arc(-hw*0.22, -hw*1.72, hw*0.09, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc( hw*0.22, -hw*1.72, hw*0.09, 0, Math.PI*2); c.fill();

    c.strokeStyle = '#333'; c.lineWidth = hw*0.08;
    c.beginPath(); c.arc(0, -hw*1.4, hw*0.3, 0.2, Math.PI-0.2); c.stroke();

    c.strokeStyle = anim.color; c.lineWidth = hw*0.22; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-hw*0.5, -hw*1.1); c.lineTo(-hw*1.0, -hw*0.55); c.stroke();
    c.beginPath(); c.moveTo( hw*0.5, -hw*1.1); c.lineTo( hw*1.0, -hw*0.55); c.stroke();

    c.lineWidth = hw*0.2;
    c.beginPath(); c.moveTo(-hw*0.25, 0); c.lineTo(-hw*0.3, hw*0.8); c.stroke();
    c.beginPath(); c.moveTo( hw*0.25, 0); c.lineTo( hw*0.3, hw*0.8); c.stroke();

    c.fillStyle = '#fff';
    c.font = 'bold ' + Math.max(9, Math.floor(hw*0.45)) + 'px Arial';
    c.textAlign = 'center'; c.fillText(anim.name, 0, hw*1.0);

    c.restore();
}

function toggleMonitor() {
    if (!game.running) return;
    monitorOpen = !monitorOpen;
    var grid = document.getElementById('cameraGrid');
    var mon  = document.getElementById('monitorArea');
    var btn  = document.getElementById('cameraToggleBtn');
    var oArea = document.getElementById('officeArea');
    if (grid) grid.classList.toggle('show', monitorOpen);
    if (mon)  mon.classList.toggle('visible', monitorOpen);
    if (btn)  btn.classList.toggle('active', monitorOpen);
    if (oArea) oArea.style.display = monitorOpen ? 'none' : 'flex';

    if (monitorOpen) {
        game.currentCam = game.lastCam || 'stage';
        document.querySelectorAll('.camBtn').forEach(function(b) {
            b.classList.toggle('active', b.getAttribute('data-cam') === game.currentCam);
        });
        sizeCanvas();
        drawCamera();
    } else {
        game.currentCam = 'office';
        if (camCtx && camCanvas) camCtx.clearRect(0, 0, camCanvas.width, camCanvas.height);
    }
}

function startCameraLoop() {
    function loop() {
        if (monitorOpen && game.running) drawCamera();
        cameraRafId = requestAnimationFrame(loop);
    }
    if (!cameraRafId) cameraRafId = requestAnimationFrame(loop);
}

function switchCam(cam) {
    if (!game.running) return;
    game.currentCam = cam;
    game.lastCam = cam;
    monitorOpen = true;
    var grid = document.getElementById('cameraGrid');
    var btn  = document.getElementById('cameraToggleBtn');
    if (grid) grid.classList.add('show');
    if (btn)  btn.classList.add('active');
    document.querySelectorAll('.camBtn').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-cam') === cam);
    });
    sizeCanvas();
    drawCamera();
}

window.toggleMonitor = toggleMonitor;
window.switchCam = switchCam;
