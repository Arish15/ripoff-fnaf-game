/**
 * FNAF Game — Single Script (no modules)
 * All game logic in one file: state, animatronics, camera rendering, UI, controls
 */

// ─────────────────────────────────────────────
//  GAME STATE
// ─────────────────────────────────────────────
var game = {
    running: false,
    currentNight: 1,
    time: 0,
    hour: 0,
    minute: 0,
    power: 100,
    doorLeft: false,
    doorRight: false,
    lightLeft: false,
    lightRight: false,
    currentCam: 'stage',
    lastCam: 'stage',
    powerOutage: false
};

var NIGHT_AI = {
    1: { freddy: 0,  bonnie: 0,  chica: 1,  foxy: 1  },
    2: { freddy: 0,  bonnie: 2,  chica: 2,  foxy: 2  },
    3: { freddy: 6,  bonnie: 4,  chica: 4,  foxy: 3  },
    4: { freddy: 10, bonnie: 7,  chica: 6,  foxy: 5  },
    5: { freddy: 15, bonnie: 12, chica: 10, foxy: 7  },
    6: { freddy: 20, bonnie: 18, chica: 15, foxy: 10 }
};

var animatronics = {
    freddy: { name: 'Freddy', color: '#c8843a', pos: 0,
              path: ['stage', 'dining', 'hallE', 'hallE_corner', 'office'], ai: 0 },
    bonnie: { name: 'Bonnie', color: '#9b59b6', pos: 0,
              path: ['stage', 'stage_left', 'hallW', 'hallW_corner', 'office'], ai: 0 },
    chica:  { name: 'Chica',  color: '#f1c40f', pos: 0,
              path: ['stage', 'stage_right', 'dining', 'hallE', 'hallE_corner', 'office'], ai: 0 },
    foxy:   { name: 'Foxy',   color: '#e74c3c', pos: 0,
              path: ['pirate', 'hallW', 'office'], ai: 0, timer: 0 }
};

var unlockedNights = [1];
var gameLoop = null;
var monitorOpen = false;
var mouseNormX = 0.5;     // normalized mouse X (0..1) — passed to office3d.setMouse()
var lastAiTick = 0;       // game.time value when animatronics last moved
var cameraRafId = null;   // rAF handle for the live camera render loop
var office3dInited = false; // true after first office3d.init() call

// ─────────────────────────────────────────────
//  CANVAS
// ─────────────────────────────────────────────
var camCanvas, camCtx;

// Assets loader (place your images in src/assets/)
var assets = {};
function loadAssets() {
    // Base names we expect in src/assets/ — you can drop your FNAF-style images here.
    // Use the actual filenames in src/assets (office_left_*, office_right_*)
    var keys = ['office_left_open','office_left_closed','office_right_open','office_right_closed','cam_stage'];
    var exts = ['.png', '.jpg', '.jpeg', '.svg'];
    var pending = keys.length;
    if (!pending) { assets.loaded = true; return; }

    keys.forEach(function(key) {
        // Try extensions in order until one loads
        var tryExt = function(i) {
            if (i >= exts.length) {
                assets[key] = null; // none found
                pending--; if (pending <= 0) assets.loaded = true;
                return;
            }
            var path = 'src/assets/' + key + exts[i];
            var img = new Image();
            img.onload = function() { assets[key] = img; pending--; if (pending <= 0) assets.loaded = true; };
            img.onerror = function() { tryExt(i+1); };
            img.src = path;
        };
        tryExt(0);
    });
}

function verifyAssets() {
    var tries = 0;
    var check = function() {
        tries++;
        if (assets.loaded) {
            console.log('[ASSETS] loaded: ', {
                left_open: !!assets.office_left_open,
                left_closed: !!assets.office_left_closed,
                right_open: !!assets.office_right_open,
                right_closed: !!assets.office_right_closed,
                cam_stage: !!assets.cam_stage
            });
            assets.verified = true;
            return;
        }
        if (tries > 20) { console.log('[ASSETS] not fully loaded yet'); assets.verified = false; return; }
        setTimeout(check, 150);
    };
    check();
}

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

// ─────────────────────────────────────────────
//  CAMERA DRAWING
// ─────────────────────────────────────────────
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

function drawCamBg(cam, w, h) {
    var c = camCtx;

    if (cam === 'stage') {
        // 1A - Show Stage (clean pizzeria stage)
        c.fillStyle = '#d4a574'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#8B7355'; c.fillRect(0, h*0.6, w, h*0.4);
        // Stage
        c.fillStyle = '#a0522d'; c.fillRect(w*0.15, h*0.3, w*0.7, h*0.35);
        c.fillStyle = '#8B4513'; c.fillRect(w*0.1, h*0.65, w*0.8, h*0.08);
        // Stage curtain
        c.fillStyle = '#8B0000'; c.fillRect(w*0.2, h*0.15, w*0.6, h*0.2);
        // Title
        c.fillStyle = '#ffcc00'; c.font = 'bold '+Math.floor(h*0.08)+'px Arial';
        c.textAlign = 'center'; c.fillText("FREDDY FAZBEAR'S PIZZA", w/2, h*0.08);

    } else if (cam === 'dining') {
        // 1B - Dining Area (party room)
        c.fillStyle = '#d4a574'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#8B7355'; c.fillRect(0, h*0.65, w, h*0.35);
        // Tables in rows
        c.fillStyle = '#a0522d';
        c.fillRect(w*0.08, h*0.25, w*0.3, h*0.15); c.fillRect(w*0.62, h*0.25, w*0.3, h*0.15);
        c.fillRect(w*0.08, h*0.45, w*0.3, h*0.15); c.fillRect(w*0.62, h*0.45, w*0.3, h*0.15);
        // Chairs
        c.fillStyle = '#c8a882';
        for (var i = 0; i < 6; i++) { c.fillRect(w*(0.15 + i*0.12), h*0.2, w*0.08, h*0.08); }
        // Decorative lights/balloons
        c.fillStyle = '#ff6600';
        c.beginPath(); c.arc(w*0.15, h*0.1, h*0.04, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(w*0.85, h*0.1, h*0.04, 0, Math.PI*2); c.fill();

    } else if (cam === 'pirate') {
        // 1C - Pirate Cove
        c.fillStyle = '#1a3a4a'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#2a5a6a'; c.fillRect(0, h*0.6, w, h*0.4);
        // Curtain with torn section (showing Foxy)
        c.fillStyle = '#8B0000'; c.fillRect(0, h*0.1, w*0.35, h*0.6);
        c.fillStyle = '#5a0000'; c.fillRect(w*0.65, h*0.1, w*0.35, h*0.6);
        // Stage
        c.fillStyle = '#8B5A2B'; c.fillRect(w*0.2, h*0.55, w*0.6, h*0.15);
        // Pirate sign
        c.fillStyle = '#ffcc00'; c.font = 'bold '+Math.floor(h*0.06)+'px Arial';
        c.textAlign = 'center'; c.fillText('★ PIRATE COVE ★', w/2, h*0.08);
        // Stars
        c.fillStyle = '#ffdd88';
        for (var s = 0; s < 5; s++) { c.fillRect(w*(0.1 + s*0.2), h*0.25, h*0.03, h*0.03); }

    } else if (cam === 'stage_left') {
        // 2A - West Hall (long hallway to office)
        c.fillStyle = '#c8a882'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#8B7355'; c.fillRect(0, h*0.65, w, h*0.35);
        // Perspective wall lines
        c.strokeStyle = '#5a4030'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(0, h*0.2); c.lineTo(w*0.25, h*0.4); c.stroke();
        c.beginPath(); c.moveTo(w, h*0.2); c.lineTo(w*0.75, h*0.4); c.stroke();
        // Office door at end
        c.fillStyle = '#6b4423'; c.fillRect(w*0.3, h*0.25, w*0.4, h*0.45);
        c.strokeStyle = '#4a2810'; c.lineWidth = 3; c.strokeRect(w*0.3, h*0.25, w*0.4, h*0.45);
        c.fillStyle = '#ffaa00'; c.beginPath(); c.arc(w*0.65, h*0.47, h*0.04, 0, Math.PI*2); c.fill();
        // Lights on walls
        c.fillStyle = '#ff9900';
        c.beginPath(); c.arc(w*0.1, h*0.3, h*0.04, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(w*0.9, h*0.3, h*0.04, 0, Math.PI*2); c.fill();

    } else if (cam === 'stage_right') {
        // 2B - West Hall Corner (closer view of door)
        c.fillStyle = '#c8a882'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#8B7355'; c.fillRect(0, h*0.65, w, h*0.35);
        // Wall converging perspective
        c.strokeStyle = '#5a4030'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(0, h*0.15); c.lineTo(w*0.4, h*0.35); c.stroke();
        c.beginPath(); c.moveTo(w, h*0.15); c.lineTo(w*0.6, h*0.35); c.stroke();
        // Office door large and clear
        c.fillStyle = '#6b4423'; c.fillRect(w*0.25, h*0.2, w*0.5, h*0.5);
        c.strokeStyle = '#4a2810'; c.lineWidth = 4; c.strokeRect(w*0.25, h*0.2, w*0.5, h*0.5);
        c.fillStyle = '#ffaa00'; c.beginPath(); c.arc(w*0.7, h*0.45, h*0.05, 0, Math.PI*2); c.fill();
        // Door frame detail
        c.strokeStyle = '#999'; c.lineWidth = 2; c.strokeRect(w*0.23, h*0.18, w*0.54, h*0.54);

    } else if (cam === 'kitchen') {
        // 4A - Kitchen (audio only with warning)
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
        // 5 - Backstage/Parts & Service
        c.fillStyle = '#3a2a1a'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#4a3a2a'; c.fillRect(0, h*0.6, w, h*0.4);
        // Parts on shelves/tables
        c.fillStyle = '#5a4a3a';
        c.fillRect(w*0.05, h*0.2, w*0.25, h*0.35);
        c.fillRect(w*0.35, h*0.15, w*0.25, h*0.4);
        c.fillRect(w*0.65, h*0.25, w*0.25, h*0.3);
        // Equipment/machinery
        c.fillStyle = '#6a5a4a';
        c.beginPath(); c.arc(w*0.15, h*0.1, h*0.08, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(w*0.85, h*0.12, h*0.07, 0, Math.PI*2); c.fill();
        // Title
        c.fillStyle = '#cc4444'; c.font = 'bold '+Math.floor(h*0.06)+'px Arial';
        c.textAlign = 'center'; c.fillText('PARTS & SERVICE', w/2, h*0.08);


    } else if (cam === 'hallW') {
        // 2A continuation - West Hallway
        c.fillStyle = '#b8860b'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#8b7355'; c.fillRect(0, h*0.55, w, h*0.45);
        // Wall shadows creating perspective
        c.fillStyle = '#a0826d';
        c.beginPath(); c.moveTo(0, 0); c.lineTo(w*0.35, h*0.3); c.lineTo(w*0.35, h*0.55); c.lineTo(0, h*0.55); c.fill();
        c.fillStyle = '#9a7663';
        c.beginPath(); c.moveTo(w, 0); c.lineTo(w*0.65, h*0.3); c.lineTo(w*0.65, h*0.55); c.lineTo(w, h*0.55); c.fill();
        // Office door
        c.fillStyle = '#4a3a2a'; c.fillRect(w*0.35, h*0.25, w*0.3, h*0.35);
        c.fillStyle = '#1a1a1a'; c.fillRect(w*0.4, h*0.3, w*0.2, h*0.25);
        // Lighting
        c.fillStyle = 'rgba(255,200,0,0.1)'; c.fillRect(w*0.1, h*0.05, w*0.2, h*0.1);
        c.fillRect(w*0.7, h*0.05, w*0.2, h*0.1);

    } else if (cam === 'hallE') {
        // 2A continuation - East Hallway (warmer tone)
        c.fillStyle = '#c8860b'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#7b5d4a'; c.fillRect(0, h*0.55, w, h*0.45);
        // Wall shadows with perspective
        c.fillStyle = '#b4846d';
        c.beginPath(); c.moveTo(0, 0); c.lineTo(w*0.35, h*0.3); c.lineTo(w*0.35, h*0.55); c.lineTo(0, h*0.55); c.fill();
        c.fillStyle = '#a87d66';
        c.beginPath(); c.moveTo(w, 0); c.lineTo(w*0.65, h*0.3); c.lineTo(w*0.65, h*0.55); c.lineTo(w, h*0.55); c.fill();
        // Office door
        c.fillStyle = '#5a4a3a'; c.fillRect(w*0.35, h*0.25, w*0.3, h*0.35);
        c.fillStyle = '#2a1a1a'; c.fillRect(w*0.4, h*0.3, w*0.2, h*0.25);
        // Decorative elements
        c.fillStyle = 'rgba(200,150,50,0.15)'; c.fillRect(w*0.08, h*0.1, w*0.15, h*0.15);
        c.fillRect(w*0.77, h*0.12, w*0.15, h*0.12);

    } else if (cam === 'hallW_corner') {
        // 2B continuation - Hall Corner (West)
        c.fillStyle = '#a0826d'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#8b7355'; c.fillRect(0, h*0.5, w, h*0.5);
        // Corner walls with perspective
        c.fillStyle = '#9a7663';
        c.beginPath(); c.moveTo(w*0.6, 0); c.lineTo(w, 0); c.lineTo(w, h*0.55); c.lineTo(w*0.5, h*0.55); c.fill();
        c.fillStyle = '#7a6655';
        c.beginPath(); c.moveTo(0, h*0.6); c.lineTo(w*0.5, h*0.5); c.lineTo(w*0.5, h); c.lineTo(0, h); c.fill();
        // Distant door at hallway end
        c.fillStyle = '#4a3a2a'; c.fillRect(w*0.52, h*0.15, w*0.25, h*0.4);
        c.fillStyle = '#1a1a1a'; c.fillRect(w*0.58, h*0.22, w*0.13, h*0.26);
        // Wall sconces
        c.fillStyle = '#cc8844';
        c.beginPath(); c.arc(w*0.15, h*0.15, h*0.04, 0, Math.PI*2); c.fill();
        c.beginPath(); c.arc(w*0.85, h*0.2, h*0.04, 0, Math.PI*2); c.fill();

    } else if (cam === 'hallE_corner') {
        // 2B continuation - East Hall Corner
        c.fillStyle = '#b4846d'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#7b5d4a'; c.fillRect(0, h*0.5, w, h*0.5);
        // Corner walls with perspective
        c.fillStyle = '#a87d66';
        c.beginPath(); c.moveTo(w*0.55, 0); c.lineTo(w, 0); c.lineTo(w, h*0.55); c.lineTo(w*0.45, h*0.55); c.fill();
        c.fillStyle = '#6b5444';
        c.beginPath(); c.moveTo(0, h*0.6); c.lineTo(w*0.45, h*0.5); c.lineTo(w*0.45, h); c.lineTo(0, h); c.fill();
        // Door at hallway end
        c.fillStyle = '#5a4a3a'; c.fillRect(w*0.5, h*0.15, w*0.28, h*0.4);
        c.fillStyle = '#2a1a1a'; c.fillRect(w*0.57, h*0.22, w*0.14, h*0.26);
        // Lighting sconces (warmer tone)
        c.fillStyle = '#dd8844';
        c.beginPath(); c.arc(w*0.12, h*0.18, h*0.045, 0, Math.PI*2); c.fill();
        c.fillRect(w*0.8, h*0.15, w*0.08, h*0.15);

    } else if (cam === 'supply') {
        // Supply Closet - Storage area
        c.fillStyle = '#4a3a2a'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#3a2a1a'; c.fillRect(0, h*0.6, w, h*0.4);
        // Shelves and storage boxes
        c.fillStyle = '#5a4a3a';
        c.fillRect(w*0.05, h*0.15, w*0.2, h*0.4);
        c.fillRect(w*0.3, h*0.1, w*0.18, h*0.45);
        c.fillRect(w*0.54, h*0.2, w*0.22, h*0.35);
        c.fillRect(w*0.81, h*0.25, w*0.14, h*0.3);
        // Boxes
        c.fillStyle = '#6a5a4a';
        c.fillRect(w*0.08, h*0.18, w*0.12, h*0.12);
        c.fillRect(w*0.36, h*0.15, w*0.1, h*0.1);
        c.fillRect(w*0.63, h*0.25, w*0.1, h*0.1);
        // Single light source
        c.fillStyle = '#ffcc88';
        c.beginPath(); c.arc(w/2, h*0.08, h*0.05, 0, Math.PI*2); c.fill();
        // Label
        c.fillStyle = '#ccc'; c.font = Math.floor(h*0.05)+'px Arial';
        c.textAlign = 'center'; c.fillText('SUPPLY', w/2, h*0.97);

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

    // Background
    drawCamBg(game.currentCam, w, h);

    // Animatronics present on this cam
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

    // HUD: camera label
    var fontSize = Math.max(12, Math.floor(h * 0.045));
    camCtx.font = 'bold ' + fontSize + 'px Courier New';
    camCtx.textAlign = 'left';
    camCtx.fillStyle = 'rgba(0,0,0,0.8)';
    camCtx.fillText(CAM_LABELS[game.currentCam] || game.currentCam, 10, fontSize + 10);
    camCtx.fillStyle = '#00ff88';
    camCtx.fillText(CAM_LABELS[game.currentCam] || game.currentCam, 8, fontSize + 8);

    // REC dot
    if (Math.floor(Date.now() / 600) % 2 === 0) {
        camCtx.fillStyle = '#ff3333';
        camCtx.fillStyle = '#ff9999'; camCtx.font = 'bold 11px Courier New';
        camCtx.textAlign = 'right'; camCtx.fillText('REC', w - 32, 23);
    }

    // Night number
    camCtx.fillStyle = 'rgba(0,255,136,0.5)';
    camCtx.font = '11px Courier New'; camCtx.textAlign = 'right';
    camCtx.fillText('NIGHT ' + game.currentNight, w - 8, h - 8);
}

function drawAnimatronic(anim, cx, cy, scale) {
    var c = camCtx;
    var hw = Math.floor(camCanvas.height * 0.18 * (scale || 1));

    c.save(); c.translate(cx, cy);

    // Shadow
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.beginPath(); c.ellipse(0, hw*0.1, hw*1.1, hw*0.2, 0, 0, Math.PI*2); c.fill();

    // Body
    c.fillStyle = anim.color; c.fillRect(-hw*0.5, -hw*1.4, hw, hw*1.4);

    // Head
    c.fillStyle = anim.color;
    c.beginPath(); c.arc(0, -hw*1.6, hw*0.55, 0, Math.PI*2); c.fill();

    // Eyes
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(-hw*0.22, -hw*1.72, hw*0.18, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc( hw*0.22, -hw*1.72, hw*0.18, 0, Math.PI*2); c.fill();
    c.fillStyle = '#111';
    c.beginPath(); c.arc(-hw*0.22, -hw*1.72, hw*0.09, 0, Math.PI*2); c.fill();
    c.beginPath(); c.arc( hw*0.22, -hw*1.72, hw*0.09, 0, Math.PI*2); c.fill();

    // Mouth
    c.strokeStyle = '#333'; c.lineWidth = hw*0.08;
    c.beginPath(); c.arc(0, -hw*1.4, hw*0.3, 0.2, Math.PI-0.2); c.stroke();

    // Arms
    c.strokeStyle = anim.color; c.lineWidth = hw*0.22; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-hw*0.5, -hw*1.1); c.lineTo(-hw*1.0, -hw*0.55); c.stroke();
    c.beginPath(); c.moveTo( hw*0.5, -hw*1.1); c.lineTo( hw*1.0, -hw*0.55); c.stroke();

    // Legs
    c.lineWidth = hw*0.2;
    c.beginPath(); c.moveTo(-hw*0.25, 0); c.lineTo(-hw*0.3, hw*0.8); c.stroke();
    c.beginPath(); c.moveTo( hw*0.25, 0); c.lineTo( hw*0.3, hw*0.8); c.stroke();

    // Name label
    c.fillStyle = '#fff';
    c.font = 'bold ' + Math.max(9, Math.floor(hw*0.45)) + 'px Arial';
    c.textAlign = 'center'; c.fillText(anim.name, 0, hw*1.0);

    c.restore();
}

// ─────────────────────────────────────────────
//  UI UPDATES
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
//  CONTROLS
// ─────────────────────────────────────────────
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

// Continuous camera render loop — runs every animation frame, redraws only when monitor is open
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

function toggleDoor(side) {
    console.log('toggleDoor called:', side, 'game.running:', game.running);
    if (!game.running) { console.log('Game not running - cannot toggle'); return; }
    if (side === 'left') {
        game.doorLeft = !game.doorLeft;
        if (window.office3d) window.office3d.setDoorLeft(game.doorLeft);
        var btn = document.querySelector('.office-btn-door-left');
        if (btn) {
            btn.classList.toggle('active', game.doorLeft);
            btn.classList.add('pressed');
            setTimeout(function(){ btn.classList.remove('pressed'); }, 120);
        }
        console.log('Left door now:', game.doorLeft ? 'CLOSED' : 'OPEN');
    } else {
        game.doorRight = !game.doorRight;
        if (window.office3d) window.office3d.setDoorRight(game.doorRight);
        var btn2 = document.querySelector('.office-btn-door-right');
        if (btn2) {
            btn2.classList.toggle('active', game.doorRight);
            btn2.classList.add('pressed');
            setTimeout(function(){ btn2.classList.remove('pressed'); }, 120);
        }
        console.log('Right door now:', game.doorRight ? 'CLOSED' : 'OPEN');
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

// ─────────────────────────────────────────────
//  GAME LOOP
// ─────────────────────────────────────────────
function tickGame() {
    if (!game.running) return;

    // Delegate head-turn to Three.js office — just pass the normalised mouse position
    if (window.office3d) window.office3d.setMouse(mouseNormX);

    game.time  += 0.1;
    var hrs     = game.time / 90;
    game.hour   = Math.floor(hrs) % 6;
    game.minute = (hrs % 1) * 60;

    // Power drain per tick
    var drain = 0.005;
    if (game.lightLeft)  drain += 0.03;
    if (game.lightRight) drain += 0.03;
    if (game.doorLeft)   drain += 0.06;
    if (game.doorRight)  drain += 0.06;
    if (monitorOpen)     drain += 0.04;
    game.power = Math.max(0, game.power - drain);

    if (game.power <= 0 && !game.powerOutage) {
        game.powerOutage = true;
        game.doorLeft = game.doorRight = false;
        var po = document.getElementById('powerOutAudio');
        if (po) po.play().catch(function(){});
    }

    var ai = NIGHT_AI[game.currentNight] || NIGHT_AI[1];

    // AI tick every 5 game-seconds (matches FNAF1's ~5-second movement window)
    if (game.time - lastAiTick >= 5.0) {
        lastAiTick = game.time;
        tickAnimatronics(ai);
        checkCollisions();
        updateHallAnimatronics();
    }

    updateHUD();

    if (game.hour >= 6 || game.time >= 540) endNight();
}

function updateHallAnimatronics() {
    if (!window.office3d) return;
    var leftAnim = null, rightAnim = null;
    Object.values(animatronics).forEach(function(a) {
        var pos = a.path[a.pos];
        if (pos === 'hallW_corner') leftAnim = a;
        if (pos === 'hallE_corner') rightAnim = a;
    });
    window.office3d.setHallLeft(leftAnim   ? leftAnim.color   : null);
    window.office3d.setHallRight(rightAnim ? rightAnim.color  : null);
}

function tickAnimatronics(ai) {
    Object.keys(animatronics).forEach(function(key) {
        var a = animatronics[key];
        a.ai = ai[key] || 0;

        if (key === 'foxy') {
            // timer increments per 5-second AI tick (scaled to match original ~80s charge time)
            if (game.currentCam !== 'pirate') {
                a.timer = (a.timer || 0) + 6;     // +6 per 5s tick ≈ +1.2/sec
            } else {
                a.timer = Math.max(0, (a.timer || 0) - 12.5); // watching pirate cove drains it
            }
            if (a.timer >= 100) {
                a.timer = 0;
                if (!game.doorLeft) triggerGameOver('');
                else game.power = Math.max(0, game.power - 12);
            }
        } else {
            var atCorner = (a.path[a.pos] === 'hallW_corner' || a.path[a.pos] === 'hallE_corner');
            if (atCorner) {
                // At the door: always attempt to enter. Door blocks them but they don't retreat.
                var doorBlocks = (key === 'bonnie' && game.doorLeft) ||
                                 ((key === 'freddy' || key === 'chica') && game.doorRight);
                if (!doorBlocks && a.pos < a.path.length - 1) {
                    a.pos++; // → 'office', triggers game over in checkCollisions
                }
                // door closed: stay at corner, do nothing
            } else {
                // FNAF1 rule: roll 0-19; advance if roll < ai_level
                if (Math.floor(Math.random() * 20) < a.ai && a.pos < a.path.length - 1) {
                    var next = a.path[a.pos + 1];
                    if (next === 'office') {
                        if (key === 'bonnie' && game.doorLeft)  return;
                        if (key === 'freddy' && game.doorRight) return;
                        if (key === 'chica'  && game.doorRight) return;
                    }
                    a.pos++;
                }
            }
        }
    });
}

function drawOffice() {
    // Three.js (office3d.js) now renders the office — this 2D fallback is unused.
    return;
            // === FNAF 1 OFFICE TRUE 3D PERSPECTIVE ===
            // Back wall
            officeCtx.fillStyle = '#1c1610';
            officeCtx.fillRect(SW * 0.22, H * 0.12, SW * 0.56, H * 0.51);
            // Left wall (angled, receding)
            officeCtx.fillStyle = '#181410';
            officeCtx.beginPath();
            officeCtx.moveTo(0, H * 0.12);
            officeCtx.lineTo(SW * 0.22, H * 0.12);
            officeCtx.lineTo(SW * 0.22, H * 0.63);
            officeCtx.lineTo(0, H * 0.66);
            officeCtx.closePath();
            officeCtx.fill();
            // Right wall (angled, receding)
            officeCtx.beginPath();
            officeCtx.moveTo(SW, H * 0.12);
            officeCtx.lineTo(SW * 0.78, H * 0.12);
            officeCtx.lineTo(SW * 0.78, H * 0.63);
            officeCtx.lineTo(SW, H * 0.66);
            officeCtx.closePath();
            officeCtx.fill();

            // Left door (vertical rectangle, inset)
            var doorW = SW * 0.07, doorH = H * 0.51;
            var leftDoorX = SW * 0.22 - doorW, leftDoorY = H * 0.12;
            officeCtx.fillStyle = game.doorLeft ? '#3a3a3e' : '#080706';
            officeCtx.fillRect(leftDoorX, leftDoorY, doorW, doorH);
            // Right door (vertical rectangle, inset)
            var rightDoorX = SW * 0.78, rightDoorY = H * 0.12;
            officeCtx.fillStyle = game.doorRight ? '#3a3a3e' : '#080706';
            officeCtx.fillRect(rightDoorX, rightDoorY, doorW, doorH);

            // Desk (wide, low, centered)
            officeCtx.fillStyle = '#15120f';
            officeCtx.fillRect(SW * 0.32, H * 0.68, SW * 0.36, H * 0.11);
            officeCtx.fillStyle = '#0e0c0a';
            officeCtx.fillRect(SW * 0.30, H * 0.79, SW * 0.40, H * 0.06);
            officeCtx.strokeStyle = '#222';
            officeCtx.lineWidth = 1;
            officeCtx.strokeRect(SW * 0.32, H * 0.68, SW * 0.36, H * 0.11);

            // Fan (centered on desk)
            var fanCx = SW * 0.50, fanCy = H * 0.74, fanR = H * 0.045;
            officeCtx.fillStyle = '#333';
            officeCtx.fillRect(fanCx - fanR * 0.4, H * 0.78, fanR * 0.8, H * 0.025);
            officeCtx.strokeStyle = '#555';
            officeCtx.lineWidth = 2;
            officeCtx.beginPath();
            officeCtx.arc(fanCx, fanCy, fanR, 0, Math.PI * 2);
            officeCtx.stroke();
            officeCtx.beginPath();
            officeCtx.arc(fanCx, fanCy, fanR * 0.65, 0, Math.PI * 2);
            officeCtx.stroke();
            var fanAngle = (Date.now() / 80) % (Math.PI * 2);
            officeCtx.strokeStyle = '#777';
            officeCtx.lineWidth = 3;
            for (var f = 0; f < 3; f++) {
                var a = fanAngle + f * (Math.PI * 2 / 3);
                officeCtx.beginPath();
                officeCtx.moveTo(fanCx, fanCy);
                officeCtx.lineTo(fanCx + Math.cos(a) * fanR * 0.6, fanCy + Math.sin(a) * fanR * 0.6);
                officeCtx.stroke();
            }
            officeCtx.fillStyle = '#444';
            officeCtx.beginPath();
            officeCtx.arc(fanCx, fanCy, fanR * 0.12, 0, Math.PI * 2);
            officeCtx.fill();

            // Monitor (left of center)
            officeCtx.fillStyle = '#0a0a0a';
            officeCtx.fillRect(SW * 0.38, H * 0.72, SW * 0.04, H * 0.07);
            officeCtx.fillStyle = '#0e1a0e';
            officeCtx.fillRect(SW * 0.382, H * 0.722, SW * 0.034, H * 0.055);
            officeCtx.fillStyle = 'rgba(0, 80, 0, 0.15)';
            officeCtx.fillRect(SW * 0.382, H * 0.722, SW * 0.034, H * 0.055);

            // Cup (left)
            officeCtx.fillStyle = '#8a2020';
            officeCtx.fillRect(SW * 0.35, H * 0.76, SW * 0.012, H * 0.03);
            officeCtx.fillStyle = '#661818';
            officeCtx.fillRect(SW * 0.35, H * 0.76, SW * 0.012, H * 0.009);

            // Paper balls
            officeCtx.fillStyle = '#c8c0b0';
            officeCtx.beginPath(); officeCtx.arc(SW * 0.42, H * 0.78, H * 0.01, 0, Math.PI * 2); officeCtx.fill();
            officeCtx.beginPath(); officeCtx.arc(SW * 0.60, H * 0.79, H * 0.008, 0, Math.PI * 2); officeCtx.fill();
            officeCtx.beginPath(); officeCtx.arc(SW * 0.45, H * 0.81, H * 0.007, 0, Math.PI * 2); officeCtx.fill();

            // Celebrate poster (centered)
            officeCtx.fillStyle = '#2a2218';
            officeCtx.fillRect(SW * 0.54, H * 0.16, SW * 0.13, H * 0.18);
            officeCtx.strokeStyle = '#3a3228';
            officeCtx.lineWidth = 2;
            officeCtx.strokeRect(SW * 0.54, H * 0.16, SW * 0.13, H * 0.18);
            officeCtx.fillStyle = '#d4a830';
            officeCtx.font = 'bold ' + Math.floor(H * 0.03) + 'px Arial';
            officeCtx.textAlign = 'center';
            officeCtx.fillText('CELEBRATE!', SW * 0.605, H * 0.20);

            // Children's drawings (left and right)
            officeCtx.fillStyle = '#2e2620';
            officeCtx.fillRect(SW * 0.44, H * 0.18, SW * 0.06, H * 0.09);
            officeCtx.fillStyle = '#302822';
            officeCtx.fillRect(SW * 0.68, H * 0.18, SW * 0.06, H * 0.09);

            // Overhead light
            officeCtx.fillStyle = '#0e0c0a';
            officeCtx.fillRect(SW * 0.58, H * 0.11, SW * 0.06, H * 0.025);
            officeCtx.fillStyle = '#f0d870';
            officeCtx.beginPath();
            officeCtx.arc(SW * 0.61, H * 0.13, H * 0.012, 0, Math.PI * 2);
            officeCtx.fill();

            // Strong vignette
            officeCtx.save();
            var vig = officeCtx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.18, W / 2, H * 0.45, Math.max(W, H) * 0.7);
            vig.addColorStop(0, 'rgba(0,0,0,0)');
            vig.addColorStop(1, 'rgba(0,0,0,0.7)');
            officeCtx.globalAlpha = 1;
            officeCtx.fillStyle = vig;
            officeCtx.fillRect(0, 0, W, H);
            officeCtx.restore();
        // === DESK AND PROPS (FNAF 1 foreground) ===
        // Desk (wide, low, centered)
        officeCtx.fillStyle = '#15120f';
        officeCtx.fillRect(SW * 0.28, H * 0.68, SW * 0.44, H * 0.11);
        officeCtx.fillStyle = '#0e0c0a';
        officeCtx.fillRect(SW * 0.26, H * 0.79, SW * 0.48, H * 0.06);
        officeCtx.strokeStyle = '#222';
        officeCtx.lineWidth = 1;
        officeCtx.strokeRect(SW * 0.28, H * 0.68, SW * 0.44, H * 0.11);

        // Fan (centered on desk)
        var fanCx = SW * 0.54, fanCy = H * 0.74, fanR = H * 0.045;
        officeCtx.fillStyle = '#333';
        officeCtx.fillRect(fanCx - fanR * 0.4, H * 0.78, fanR * 0.8, H * 0.025);
        officeCtx.strokeStyle = '#555';
        officeCtx.lineWidth = 2;
        officeCtx.beginPath();
        officeCtx.arc(fanCx, fanCy, fanR, 0, Math.PI * 2);
        officeCtx.stroke();
        officeCtx.beginPath();
        officeCtx.arc(fanCx, fanCy, fanR * 0.65, 0, Math.PI * 2);
        officeCtx.stroke();
        var fanAngle = (Date.now() / 80) % (Math.PI * 2);
        officeCtx.strokeStyle = '#777';
        officeCtx.lineWidth = 3;
        for (var f = 0; f < 3; f++) {
            var a = fanAngle + f * (Math.PI * 2 / 3);
            officeCtx.beginPath();
            officeCtx.moveTo(fanCx, fanCy);
            officeCtx.lineTo(fanCx + Math.cos(a) * fanR * 0.6, fanCy + Math.sin(a) * fanR * 0.6);
            officeCtx.stroke();
        }
        officeCtx.fillStyle = '#444';
        officeCtx.beginPath();
        officeCtx.arc(fanCx, fanCy, fanR * 0.12, 0, Math.PI * 2);
        officeCtx.fill();

        // Monitor (left of center)
        officeCtx.fillStyle = '#0a0a0a';
        officeCtx.fillRect(SW * 0.36, H * 0.72, SW * 0.04, H * 0.07);
        officeCtx.fillStyle = '#0e1a0e';
        officeCtx.fillRect(SW * 0.362, H * 0.722, SW * 0.034, H * 0.055);
        officeCtx.fillStyle = 'rgba(0, 80, 0, 0.15)';
        officeCtx.fillRect(SW * 0.362, H * 0.722, SW * 0.034, H * 0.055);

        // Cup (left)
        officeCtx.fillStyle = '#8a2020';
        officeCtx.fillRect(SW * 0.33, H * 0.76, SW * 0.012, H * 0.03);
        officeCtx.fillStyle = '#661818';
        officeCtx.fillRect(SW * 0.33, H * 0.76, SW * 0.012, H * 0.009);

        // Paper balls
        officeCtx.fillStyle = '#c8c0b0';
        officeCtx.beginPath(); officeCtx.arc(SW * 0.38, H * 0.78, H * 0.01, 0, Math.PI * 2); officeCtx.fill();
        officeCtx.beginPath(); officeCtx.arc(SW * 0.60, H * 0.79, H * 0.008, 0, Math.PI * 2); officeCtx.fill();
        officeCtx.beginPath(); officeCtx.arc(SW * 0.41, H * 0.81, H * 0.007, 0, Math.PI * 2); officeCtx.fill();

        // === POSTERS AND WALL DETAILS ===
        // Celebrate poster
        officeCtx.fillStyle = '#2a2218';
        officeCtx.fillRect(SW * 0.48, H * 0.16, SW * 0.13, H * 0.18);
        officeCtx.strokeStyle = '#3a3228';
        officeCtx.lineWidth = 2;
        officeCtx.strokeRect(SW * 0.48, H * 0.16, SW * 0.13, H * 0.18);
        officeCtx.fillStyle = '#d4a830';
        officeCtx.font = 'bold ' + Math.floor(H * 0.03) + 'px Arial';
        officeCtx.textAlign = 'center';
        officeCtx.fillText('CELEBRATE!', SW * 0.545, H * 0.20);

        // Children's drawings (left and right)
        officeCtx.fillStyle = '#2e2620';
        officeCtx.fillRect(SW * 0.38, H * 0.18, SW * 0.06, H * 0.09);
        officeCtx.fillStyle = '#302822';
        officeCtx.fillRect(SW * 0.62, H * 0.18, SW * 0.06, H * 0.09);

        // Overhead light
        officeCtx.fillStyle = '#0e0c0a';
        officeCtx.fillRect(SW * 0.52, H * 0.11, SW * 0.06, H * 0.025);
        officeCtx.fillStyle = '#f0d870';
        officeCtx.beginPath();
        officeCtx.arc(SW * 0.55, H * 0.13, H * 0.012, 0, Math.PI * 2);
        officeCtx.fill();

        // Strong vignette
        officeCtx.save();
        var vig = officeCtx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.18, W / 2, H * 0.45, Math.max(W, H) * 0.7);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.7)');
        officeCtx.globalAlpha = 1;
        officeCtx.fillStyle = vig;
        officeCtx.fillRect(0, 0, W, H);
        officeCtx.restore();
    if (!officeCtx || !officeCanvas) return;
    var W = officeCanvas.width, H = officeCanvas.height;
    if (W < 10 || H < 10) return;
    officeCtx.clearRect(0, 0, W, H);

    // Scene is wider than viewport — we draw at an offset
    var SW = Math.round(W * SCENE_WIDTH_MULT); // total scene width
    var maxScroll = SW - W;
    scrollX = Math.max(0, Math.min(maxScroll, scrollX));

    // No real panning, just a slight offset for head turn effect
    var scrollFrac = maxScroll > 0 ? scrollX / maxScroll : 0.5;
    var showLeft = true;
    var showRight = true;

    officeCtx.save();
    officeCtx.translate(-scrollX, 0);

    // ── SCENE COORDINATES (all in scene-space 0..SW) ──

    // === FNAF 1 OFFICE BACKGROUND ===
    var wallColor = '#1c1610';
    var floorColor = '#0f0d0a';
    var ceilColor = '#13110e';

    // Ceiling
    officeCtx.fillStyle = ceilColor;
    officeCtx.fillRect(0, 0, SW, H * 0.1);
    // Ceiling trim / pipe duct running across top
    officeCtx.fillStyle = '#0a0908';
    officeCtx.fillRect(0, H * 0.1, SW, H * 0.02);
    // Main wall
    officeCtx.fillStyle = wallColor;
    officeCtx.fillRect(0, H * 0.12, SW, H * 0.51);
    // Wall paneling lines
    officeCtx.strokeStyle = 'rgba(0,0,0,0.3)';
    officeCtx.lineWidth = 1;
    for (var wp = 0; wp < 6; wp++) {
        var wy = H * (0.18 + wp * 0.08);
        officeCtx.beginPath();
        officeCtx.moveTo(0, wy);
        officeCtx.lineTo(SW, wy);
        officeCtx.stroke();
    }
    // Baseboard / molding
    officeCtx.fillStyle = '#0a0908';
    officeCtx.fillRect(0, H * 0.63, SW, H * 0.03);
    // Floor - dark checkered tiles
    officeCtx.fillStyle = floorColor;
    officeCtx.fillRect(0, H * 0.66, SW, H * 0.34);
    var tileW = SW / 16;
    var tileH = H * 0.07;
    for (var ty = 0; ty < 5; ty++) {
        for (var tx = 0; tx < 16; tx++) {
            officeCtx.fillStyle = (tx + ty) % 2 === 0 ? '#13100d' : '#0c0a08';
            officeCtx.fillRect(tx * tileW, H * 0.66 + ty * tileH, tileW, tileH);
        }
    }

    // === FNAF 1 OFFICE WALLS (fixed perspective) ===
    // Back wall
    officeCtx.fillStyle = '#1c1610';
    officeCtx.fillRect(SW * 0.18, H * 0.12, SW * 0.64, H * 0.51);
    // Left wall (angled)
    officeCtx.fillStyle = '#181410';
    officeCtx.beginPath();
    officeCtx.moveTo(0, H * 0.12);
    officeCtx.lineTo(SW * 0.18, H * 0.12);
    officeCtx.lineTo(SW * 0.18, H * 0.63);
    officeCtx.lineTo(0, H * 0.66);
    officeCtx.closePath();
    officeCtx.fill();
    // Right wall (angled)
    officeCtx.beginPath();
    officeCtx.moveTo(SW, H * 0.12);
    officeCtx.lineTo(SW * 0.82, H * 0.12);
    officeCtx.lineTo(SW * 0.82, H * 0.63);
    officeCtx.lineTo(SW, H * 0.66);
    officeCtx.closePath();
    officeCtx.fill();

    // Left door (vertical rectangle, inset)
    var doorW = SW * 0.08, doorH = H * 0.51;
    var leftDoorX = SW * 0.18 - doorW, leftDoorY = H * 0.12;
    officeCtx.fillStyle = game.doorLeft ? '#3a3a3e' : '#080706';
    officeCtx.fillRect(leftDoorX, leftDoorY, doorW, doorH);
    // Right door (vertical rectangle, inset)
    var rightDoorX = SW * 0.82, rightDoorY = H * 0.12;
    officeCtx.fillStyle = game.doorRight ? '#3a3a3e' : '#080706';
    officeCtx.fillRect(rightDoorX, rightDoorY, doorW, doorH);

    // Door buttons (on angled wall segments)
    var btnW = SW * 0.035, btnH = H * 0.07;
    var lBtnX = leftDoorX + doorW * 0.15, lBtnY = leftDoorY + doorH * 0.18;
    var lLightBtnY = lBtnY + btnH + H * 0.03;
    officeCtx.fillStyle = game.doorLeft ? '#cc3333' : '#33aa33';
    officeCtx.fillRect(lBtnX, lBtnY, btnW, btnH);
    officeCtx.strokeStyle = '#111';
    officeCtx.lineWidth = 2;
    officeCtx.strokeRect(lBtnX, lBtnY, btnW, btnH);
    officeCtx.fillStyle = '#fff';
    officeCtx.font = 'bold ' + Math.max(8, Math.floor(btnH * 0.32)) + 'px Arial';
    officeCtx.textAlign = 'center';
    officeCtx.textBaseline = 'middle';
    officeCtx.fillText('DOOR', lBtnX + btnW / 2, lBtnY + btnH / 2);
    officeCtx.fillStyle = game.lightLeft ? '#ddaa22' : '#555';
    officeCtx.fillRect(lBtnX, lLightBtnY, btnW, btnH);
    officeCtx.strokeStyle = '#111';
    officeCtx.strokeRect(lBtnX, lLightBtnY, btnW, btnH);
    officeCtx.fillStyle = game.lightLeft ? '#000' : '#aaa';
    officeCtx.fillText('LIGHT', lBtnX + btnW / 2, lLightBtnY + btnH / 2);
    if (showLeft) {
        sceneBtns.leftDoor = { x: lBtnX, y: lBtnY, w: btnW, h: btnH };
        sceneBtns.leftLight = { x: lBtnX, y: lLightBtnY, w: btnW, h: btnH };
    } else {
        sceneBtns.leftDoor = null;
        sceneBtns.leftLight = null;
    }

    var rBtnX = rightDoorX + doorW * 0.15, rBtnY = rightDoorY + doorH * 0.18;
    var rLightBtnY = rBtnY + btnH + H * 0.03;
    officeCtx.fillStyle = game.doorRight ? '#cc3333' : '#33aa33';
    officeCtx.fillRect(rBtnX, rBtnY, btnW, btnH);
    officeCtx.strokeStyle = '#111';
    officeCtx.lineWidth = 2;
    officeCtx.strokeRect(rBtnX, rBtnY, btnW, btnH);
    officeCtx.fillStyle = '#fff';
    officeCtx.font = 'bold ' + Math.max(8, Math.floor(btnH * 0.32)) + 'px Arial';
    officeCtx.textAlign = 'center';
    officeCtx.textBaseline = 'middle';
    officeCtx.fillText('DOOR', rBtnX + btnW / 2, rBtnY + btnH / 2);
    officeCtx.fillStyle = game.lightRight ? '#ddaa22' : '#555';
    officeCtx.fillRect(rBtnX, rLightBtnY, btnW, btnH);
    officeCtx.strokeStyle = '#111';
    officeCtx.strokeRect(rBtnX, rLightBtnY, btnW, btnH);
    officeCtx.fillStyle = game.lightRight ? '#000' : '#aaa';
    officeCtx.fillText('LIGHT', rBtnX + btnW / 2, rLightBtnY + btnH / 2);
    if (showRight) {
        sceneBtns.rightDoor = { x: rBtnX, y: rBtnY, w: btnW, h: btnH };
        sceneBtns.rightLight = { x: rBtnX, y: rLightBtnY, w: btnW, h: btnH };
    } else {
        sceneBtns.rightDoor = null;
        sceneBtns.rightLight = null;
    }

    // ── LEFT WALL BUTTONS (side wall, stacked vertically beside door) ──
    var btnW = SW * 0.04;
    var btnH = H * 0.08;
    var lBtnX = leftDoorX + doorwayW + SW * 0.012;
    var lDoorBtnY = leftDoorY + doorwayH * 0.2;
    var lLightBtnY = lDoorBtnY + btnH + H * 0.04;

    // DOOR button
    officeCtx.fillStyle = game.doorLeft ? '#cc3333' : '#33aa33';
    officeCtx.fillRect(lBtnX, lDoorBtnY, btnW, btnH);
    officeCtx.strokeStyle = '#111';
    officeCtx.lineWidth = 2;
    officeCtx.strokeRect(lBtnX, lDoorBtnY, btnW, btnH);
    officeCtx.fillStyle = '#fff';
    officeCtx.font = 'bold ' + Math.max(8, Math.floor(btnH * 0.32)) + 'px Arial';
    officeCtx.textAlign = 'center';
    officeCtx.textBaseline = 'middle';
    officeCtx.fillText('DOOR', lBtnX + btnW / 2, lDoorBtnY + btnH / 2);

    // LIGHT button
    officeCtx.fillStyle = game.lightLeft ? '#ddaa22' : '#555';
    officeCtx.fillRect(lBtnX, lLightBtnY, btnW, btnH);
    officeCtx.strokeStyle = '#111';
    officeCtx.strokeRect(lBtnX, lLightBtnY, btnW, btnH);
    officeCtx.fillStyle = game.lightLeft ? '#000' : '#aaa';
    officeCtx.fillText('LIGHT', lBtnX + btnW / 2, lLightBtnY + btnH / 2);

    // Store button locations for click detection
    if (showLeft) {
        sceneBtns.leftDoor = { x: lBtnX, y: lDoorBtnY, w: btnW, h: btnH };
        sceneBtns.leftLight = { x: lBtnX, y: lLightBtnY, w: btnW, h: btnH };
    } else {
        sceneBtns.leftDoor = null;
        sceneBtns.leftLight = null;
    }

    // ── RIGHT DOORWAY (side wall, mirror of left) ──
    var rightDoorX = SW - doorwayW;

    // Door frame
    officeCtx.fillStyle = '#080706';
    officeCtx.fillRect(rightDoorX - 8, leftDoorY - 2, doorwayW + 16, doorwayH + 6);
    officeCtx.strokeStyle = '#2a2520';
    officeCtx.lineWidth = 2;
    officeCtx.strokeRect(rightDoorX - 6, leftDoorY, doorwayW + 12, doorwayH + 2);

    // Right door window/peephole
    officeCtx.fillStyle = '#050404';
    officeCtx.fillRect(rightDoorX + doorwayW * 0.15, leftDoorY - H * 0.06, doorwayW * 0.7, H * 0.05);
    officeCtx.strokeStyle = '#222';
    officeCtx.lineWidth = 1;
    officeCtx.strokeRect(rightDoorX + doorwayW * 0.15, leftDoorY - H * 0.06, doorwayW * 0.7, H * 0.05);

    if (game.doorRight) {
        // CLOSED: blast door
        var dGrad2 = officeCtx.createLinearGradient(rightDoorX, 0, rightDoorX + doorwayW, 0);
        dGrad2.addColorStop(0, '#222226');
        dGrad2.addColorStop(0.3, '#2a2a2e');
        dGrad2.addColorStop(0.7, '#2e2e32');
        dGrad2.addColorStop(1, '#3a3a3e');
        officeCtx.fillStyle = dGrad2;
        officeCtx.fillRect(rightDoorX, leftDoorY, doorwayW, doorwayH);
        // Horizontal panel lines
        officeCtx.strokeStyle = '#444';
        officeCtx.lineWidth = 1;
        for (var ri = 1; ri < 12; ri++) {
            var rly = leftDoorY + doorwayH * (ri / 12);
            officeCtx.beginPath();
            officeCtx.moveTo(rightDoorX + 2, rly);
            officeCtx.lineTo(rightDoorX + doorwayW - 2, rly);
            officeCtx.stroke();
        }
        // Rivets
        officeCtx.fillStyle = '#555';
        for (var rv2 = 0; rv2 < 6; rv2++) {
            var ry2 = leftDoorY + doorwayH * ((rv2 + 0.5) / 6);
            officeCtx.beginPath(); officeCtx.arc(rightDoorX + 5, ry2, 2, 0, Math.PI * 2); officeCtx.fill();
            officeCtx.beginPath(); officeCtx.arc(rightDoorX + doorwayW - 5, ry2, 2, 0, Math.PI * 2); officeCtx.fill();
        }
    } else {
        // OPEN: dark hallway
        var hallGrad2 = officeCtx.createLinearGradient(rightDoorX, 0, rightDoorX + doorwayW, 0);
        hallGrad2.addColorStop(0, '#080706');
        hallGrad2.addColorStop(1, '#030303');
        officeCtx.fillStyle = hallGrad2;
        officeCtx.fillRect(rightDoorX, leftDoorY, doorwayW, doorwayH);

        // Light effect when right light is ON
        if (game.lightRight) {
            officeCtx.fillStyle = 'rgba(255, 230, 160, 0.3)';
            officeCtx.fillRect(rightDoorX, leftDoorY, doorwayW, doorwayH);
            // Floor light spill
            officeCtx.fillStyle = 'rgba(255, 220, 130, 0.15)';
            officeCtx.beginPath();
            officeCtx.moveTo(rightDoorX + doorwayW, leftDoorY + doorwayH);
            officeCtx.lineTo(rightDoorX + doorwayW + doorwayW * 0.5, H);
            officeCtx.lineTo(rightDoorX - doorwayW * 0.5, H);
            officeCtx.closePath();
            officeCtx.fill();
        }
    }

    // ── RIGHT WALL BUTTONS (side wall, on left of right door) ──
    var rBtnX = rightDoorX - btnW - SW * 0.012;
    var rDoorBtnY = leftDoorY + doorwayH * 0.2;
    var rLightBtnY = rDoorBtnY + btnH + H * 0.04;

    // DOOR button
    officeCtx.fillStyle = game.doorRight ? '#cc3333' : '#33aa33';
    officeCtx.fillRect(rBtnX, rDoorBtnY, btnW, btnH);
    officeCtx.strokeStyle = '#111';
    officeCtx.lineWidth = 2;
    officeCtx.strokeRect(rBtnX, rDoorBtnY, btnW, btnH);
    officeCtx.fillStyle = '#fff';
    officeCtx.font = 'bold ' + Math.max(8, Math.floor(btnH * 0.32)) + 'px Arial';
    officeCtx.textAlign = 'center';
    officeCtx.textBaseline = 'middle';
    officeCtx.fillText('DOOR', rBtnX + btnW / 2, rDoorBtnY + btnH / 2);

    // LIGHT button
    officeCtx.fillStyle = game.lightRight ? '#ddaa22' : '#555';
    officeCtx.fillRect(rBtnX, rLightBtnY, btnW, btnH);
    officeCtx.strokeStyle = '#111';
    officeCtx.strokeRect(rBtnX, rLightBtnY, btnW, btnH);
    officeCtx.fillStyle = game.lightRight ? '#000' : '#aaa';
    officeCtx.fillText('LIGHT', rBtnX + btnW / 2, rLightBtnY + btnH / 2);

    // Store right button locations for click detection
    if (showRight) {
        sceneBtns.rightDoor = { x: rBtnX, y: rDoorBtnY, w: btnW, h: btnH };
        sceneBtns.rightLight = { x: rBtnX, y: rLightBtnY, w: btnW, h: btnH };
    } else {
        sceneBtns.rightDoor = null;
        sceneBtns.rightLight = null;
    }

    // ── LEFT WALL DETAILS (posters, signs near left door) ──
    // "Rules for Safety" poster on left wall
    officeCtx.fillStyle = '#2a2218';
    officeCtx.fillRect(leftDoorX + doorwayW + SW * 0.02, H * 0.16, SW * 0.05, H * 0.14);
    officeCtx.fillStyle = '#c0a040';
    officeCtx.font = Math.floor(H * 0.025) + 'px Arial';
    officeCtx.textAlign = 'center';
    officeCtx.fillText('RULES', leftDoorX + doorwayW + SW * 0.045, H * 0.24);

    // ── RIGHT WALL DETAILS (posters near right door) ──
    // Children's drawings on right wall
    officeCtx.fillStyle = '#2a2218';
    officeCtx.fillRect(rightDoorX - SW * 0.07, H * 0.17, SW * 0.05, H * 0.12);
    officeCtx.fillStyle = '#3e3228';
    officeCtx.fillRect(rightDoorX - SW * 0.12, H * 0.19, SW * 0.04, H * 0.1);

    // ── CENTER OFFICE DETAILS (FNAF 1 authentic) ──
    var cx = SW / 2;

    // Back wall "CELEBRATE!" poster (iconic FNAF 1)
    officeCtx.fillStyle = '#2a2218';
    officeCtx.fillRect(cx - SW * 0.06, H * 0.14, SW * 0.12, H * 0.2);
    // Poster border
    officeCtx.strokeStyle = '#3a3228';
    officeCtx.lineWidth = 2;
    officeCtx.strokeRect(cx - SW * 0.06, H * 0.14, SW * 0.12, H * 0.2);
    // Stars on poster
    officeCtx.fillStyle = '#d4a830';
    officeCtx.font = 'bold ' + Math.floor(H * 0.03) + 'px Arial';
    officeCtx.textAlign = 'center';
    officeCtx.fillText('★ CELEBRATE! ★', cx, H * 0.26);
    // Mini animatronic silhouettes on poster
    officeCtx.fillStyle = '#6a5a40';
    officeCtx.beginPath(); officeCtx.arc(cx - SW * 0.025, H * 0.2, H * 0.02, 0, Math.PI * 2); officeCtx.fill();
    officeCtx.beginPath(); officeCtx.arc(cx, H * 0.19, H * 0.025, 0, Math.PI * 2); officeCtx.fill();
    officeCtx.beginPath(); officeCtx.arc(cx + SW * 0.025, H * 0.2, H * 0.02, 0, Math.PI * 2); officeCtx.fill();

    // Children's drawings (left of celebrate poster)
    officeCtx.fillStyle = '#2e2620';
    officeCtx.fillRect(cx - SW * 0.14, H * 0.16, SW * 0.06, H * 0.12);
    // More drawings (right)
    officeCtx.fillStyle = '#302822';
    officeCtx.fillRect(cx + SW * 0.08, H * 0.15, SW * 0.06, H * 0.14);

    // Overhead industrial light fixture
    officeCtx.fillStyle = '#0e0c0a';
    officeCtx.fillRect(cx - SW * 0.03, H * 0.01, SW * 0.06, H * 0.03);
    officeCtx.fillStyle = '#f0d870';
    officeCtx.beginPath();
    officeCtx.arc(cx, H * 0.04, H * 0.015, 0, Math.PI * 2);
    officeCtx.fill();
    // Light cone (subtle)
    officeCtx.fillStyle = 'rgba(255, 230, 160, 0.04)';
    officeCtx.beginPath();
    officeCtx.moveTo(cx - SW * 0.015, H * 0.05);
    officeCtx.lineTo(cx - SW * 0.1, H * 0.65);
    officeCtx.lineTo(cx + SW * 0.1, H * 0.65);
    officeCtx.lineTo(cx + SW * 0.015, H * 0.05);
    officeCtx.closePath();
    officeCtx.fill();

    // ── DESK (FNAF 1 large security desk, adjusted for side doors) ──
    // Desk top surface
    officeCtx.fillStyle = '#15120f';
    officeCtx.fillRect(cx - SW * 0.16, H * 0.60, SW * 0.32, H * 0.09);
    // Desk front panel
    officeCtx.fillStyle = '#0e0c0a';
    officeCtx.fillRect(cx - SW * 0.17, H * 0.69, SW * 0.34, H * 0.07);
    // Desk edge highlight
    officeCtx.strokeStyle = '#222';
    officeCtx.lineWidth = 1;
    officeCtx.strokeRect(cx - SW * 0.16, H * 0.60, SW * 0.32, H * 0.09);

    // ── FAN on desk (iconic FNAF 1 spinning fan) ──
    var fanCx = cx + SW * 0.09;
    var fanCy = H * 0.63;
    var fanR = H * 0.05;
    // Fan base
    officeCtx.fillStyle = '#333';
    officeCtx.fillRect(fanCx - fanR * 0.4, H * 0.67, fanR * 0.8, H * 0.03);
    // Fan cage (circle)
    officeCtx.strokeStyle = '#555';
    officeCtx.lineWidth = 2;
    officeCtx.beginPath();
    officeCtx.arc(fanCx, fanCy, fanR, 0, Math.PI * 2);
    officeCtx.stroke();
    // Fan cage inner ring
    officeCtx.beginPath();
    officeCtx.arc(fanCx, fanCy, fanR * 0.65, 0, Math.PI * 2);
    officeCtx.stroke();
    // Fan blades (animated)
    var fanAngle = (Date.now() / 80) % (Math.PI * 2);
    officeCtx.strokeStyle = '#777';
    officeCtx.lineWidth = 3;
    for (var f = 0; f < 3; f++) {
        var a = fanAngle + f * (Math.PI * 2 / 3);
        officeCtx.beginPath();
        officeCtx.moveTo(fanCx, fanCy);
        officeCtx.lineTo(fanCx + Math.cos(a) * fanR * 0.6, fanCy + Math.sin(a) * fanR * 0.6);
        officeCtx.stroke();
    }
    // Fan center hub
    officeCtx.fillStyle = '#444';
    officeCtx.beginPath();
    officeCtx.arc(fanCx, fanCy, fanR * 0.12, 0, Math.PI * 2);
    officeCtx.fill();

    // ── MONITOR / TABLET on desk (left of center)
    officeCtx.fillStyle = '#0a0a0a';
    officeCtx.fillRect(cx - SW * 0.11, H * 0.62, SW * 0.04, H * 0.09);
    officeCtx.fillStyle = '#0e1a0e';
    officeCtx.fillRect(cx - SW * 0.108, H * 0.625, SW * 0.034, H * 0.075);
    // Screen glow
    officeCtx.fillStyle = 'rgba(0, 80, 0, 0.15)';
    officeCtx.fillRect(cx - SW * 0.108, H * 0.625, SW * 0.034, H * 0.075);

    // ── CUP / DRINK on desk ──
    officeCtx.fillStyle = '#8a2020';
    officeCtx.fillRect(cx - SW * 0.14, H * 0.65, SW * 0.014, H * 0.04);
    officeCtx.fillStyle = '#661818';
    officeCtx.fillRect(cx - SW * 0.14, H * 0.65, SW * 0.014, H * 0.012);

    // ── PAPER BALLS scattered on desk ──
    officeCtx.fillStyle = '#c8c0b0';
    officeCtx.beginPath(); officeCtx.arc(cx - SW * 0.06, H * 0.67, H * 0.01, 0, Math.PI * 2); officeCtx.fill();
    officeCtx.beginPath(); officeCtx.arc(cx + SW * 0.13, H * 0.68, H * 0.008, 0, Math.PI * 2); officeCtx.fill();
    officeCtx.beginPath(); officeCtx.arc(cx - SW * 0.09, H * 0.69, H * 0.007, 0, Math.PI * 2); officeCtx.fill();

    // ── WIRES/CABLES from ceiling (FNAF 1 has exposed wiring) ──
    officeCtx.strokeStyle = '#1a1816';
    officeCtx.lineWidth = 1.5;
    for (var ww = 0; ww < 7; ww++) {
        var wx = cx - SW * 0.15 + ww * SW * 0.05;
        officeCtx.beginPath();
        officeCtx.moveTo(wx, 0);
        officeCtx.bezierCurveTo(wx + 3, H * 0.15, wx - 5, H * 0.25, wx + 2, H * 0.38);
        officeCtx.stroke();
    }

    // ── PIPE RUNNING ALONG LEFT WALL ──
    officeCtx.strokeStyle = '#2a2520';
    officeCtx.lineWidth = 4;
    officeCtx.beginPath();
    officeCtx.moveTo(leftDoorX + doorwayW + SW * 0.01, H * 0.12);
    officeCtx.lineTo(leftDoorX + doorwayW + SW * 0.01, H * 0.63);
    officeCtx.stroke();

    // ── PIPE RUNNING ALONG RIGHT WALL ──
    officeCtx.beginPath();
    officeCtx.moveTo(rightDoorX - SW * 0.01, H * 0.12);
    officeCtx.lineTo(rightDoorX - SW * 0.01, H * 0.63);
    officeCtx.stroke();

    // ── VENT GRATE above desk (FNAF 1 detail) ──
    officeCtx.fillStyle = '#1a1816';
    officeCtx.fillRect(cx - SW * 0.04, H * 0.1, SW * 0.08, H * 0.025);
    officeCtx.strokeStyle = '#252220';
    officeCtx.lineWidth = 1;
    for (var vg = 0; vg < 6; vg++) {
        var vx = cx - SW * 0.035 + vg * SW * 0.013;
        officeCtx.beginPath();
        officeCtx.moveTo(vx, H * 0.102);
        officeCtx.lineTo(vx, H * 0.122);
        officeCtx.stroke();
    }

    // ── ANIMATRONICS IN SIDE DOORWAYS ──
    Object.values(animatronics).forEach(function(a) {
        if (a.path[a.pos] === 'office') {
            officeCtx.globalAlpha = 0.85;
            if (a.name === 'Bonnie' || a.name === 'Foxy') {
                // Appear in left side doorway
                if (!game.doorLeft) {
                    officeCtx.fillStyle = a.color;
                    officeCtx.beginPath();
                    officeCtx.arc(leftDoorX + doorwayW * 0.55, leftDoorY + doorwayH * 0.35, doorwayW * 0.35, 0, Math.PI * 2);
                    officeCtx.fill();
                    officeCtx.fillRect(leftDoorX + doorwayW * 0.3, leftDoorY + doorwayH * 0.5, doorwayW * 0.7, doorwayH * 0.4);
                    // Glowing eyes
                    officeCtx.fillStyle = '#fff';
                    officeCtx.beginPath(); officeCtx.arc(leftDoorX + doorwayW * 0.45, leftDoorY + doorwayH * 0.3, 3, 0, Math.PI * 2); officeCtx.fill();
                    officeCtx.beginPath(); officeCtx.arc(leftDoorX + doorwayW * 0.65, leftDoorY + doorwayH * 0.3, 3, 0, Math.PI * 2); officeCtx.fill();
                }
            }
            if (a.name === 'Chica' || a.name === 'Freddy') {
                // Appear in right side doorway
                if (!game.doorRight) {
                    officeCtx.fillStyle = a.color;
                    officeCtx.beginPath();
                    officeCtx.arc(rightDoorX + doorwayW * 0.45, leftDoorY + doorwayH * 0.35, doorwayW * 0.35, 0, Math.PI * 2);
                    officeCtx.fill();
                    officeCtx.fillRect(rightDoorX + doorwayW * 0.0, leftDoorY + doorwayH * 0.5, doorwayW * 0.7, doorwayH * 0.4);
                    // Glowing eyes
                    officeCtx.fillStyle = '#fff';
                    officeCtx.beginPath(); officeCtx.arc(rightDoorX + doorwayW * 0.35, leftDoorY + doorwayH * 0.3, 3, 0, Math.PI * 2); officeCtx.fill();
                    officeCtx.beginPath(); officeCtx.arc(rightDoorX + doorwayW * 0.55, leftDoorY + doorwayH * 0.3, 3, 0, Math.PI * 2); officeCtx.fill();
                }
            }
            officeCtx.globalAlpha = 1;
        }
    });

    // ── VIGNETTE (dark edges for atmosphere) ──
    officeCtx.restore(); // back to viewport space for vignette
    var vig = officeCtx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.15, W / 2, H * 0.45, Math.max(W, H) * 0.6);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    officeCtx.fillStyle = vig;
    officeCtx.fillRect(0, 0, W, H);

    // Hide HTML control panel — we use canvas buttons
    try {
        var cp = document.getElementById('controlPanelArea');
        if (cp) cp.style.display = 'none';
    } catch (e) {}
}

function checkCollisions() {
    Object.values(animatronics).forEach(function(a) {
        if (a.path && a.path[a.pos] === 'office') {
            triggerGameOver(a.name.toUpperCase() + ' GOT YOU');
        }
    });
}

// ─────────────────────────────────────────────
//  GAME STATE TRANSITIONS
// ─────────────────────────────────────────────
function startGame(night) {
    if (unlockedNights.indexOf(night) < 0) return;

    game.running      = true;
    game.currentNight = night;
    game.time         = 0;
    game.hour         = 0;
    game.minute       = 0;
    game.power        = 100;
    game.doorLeft     = false;  // Start OPEN (doors not protecting yet)
    game.doorRight    = false;  // Start OPEN (doors not protecting yet)
    game.lightLeft    = false;  // Start OFF
    game.lightRight   = false;  // Start OFF
    game.currentCam   = 'stage';
    game.lastCam      = 'stage';
    game.powerOutage  = false;
    lastAiTick = 0;

    Object.values(animatronics).forEach(function(a) {
        a.pos = 0; a.ai = 0;
        if (a.timer !== undefined) a.timer = 0;
    });

    // Reset DOM-based office door/light buttons
    var doorBtnLeft = document.querySelector('.office-btn-door-left');
    var doorBtnRight = document.querySelector('.office-btn-door-right');
    var lightBtnLeft = document.querySelector('.office-btn-light-left');
    var lightBtnRight = document.querySelector('.office-btn-light-right');
    if (doorBtnLeft) doorBtnLeft.classList.remove('active');
    if (doorBtnRight) doorBtnRight.classList.remove('active');
    if (lightBtnLeft) lightBtnLeft.classList.remove('active');
    if (lightBtnRight) lightBtnRight.classList.remove('active');
    
    // Reset office doors
    var doorLeft = document.querySelector('.office-door-left');
    var doorRight = document.querySelector('.office-door-right');
    if (doorLeft) { doorLeft.classList.add('open'); doorLeft.classList.remove('closed'); }
    if (doorRight) { doorRight.classList.add('open'); doorRight.classList.remove('closed'); }

    monitorOpen = false;
    var grid  = document.getElementById('cameraGrid');
    var mon   = document.getElementById('monitorArea');
    var ctBtn = document.getElementById('cameraToggleBtn');
    if (grid)  grid.classList.remove('show');
    if (mon)   mon.classList.remove('visible');
    if (ctBtn) ctBtn.classList.remove('active');

    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameContainer').classList.add('show');

    // Show the Three.js office and (re-)initialise or resize the renderer
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
            // Always reset doors and lights to off state
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
    if (gameLoop) { clearInterval(gameLoop); gameLoop = null; }
    var audio = document.getElementById('successAudio');
    if (audio) audio.play().catch(function(){});
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
    if (gameLoop) { clearInterval(gameLoop); gameLoop = null; }

    var scare = document.getElementById('jumpScare');
    if (scare) scare.classList.add('show');
    var audio = document.getElementById('jumpScareAudio');
    if (audio) audio.play().catch(function(){});

    setTimeout(function() {
        if (scare) scare.classList.remove('show');
        var goScreen = document.getElementById('gameOverScreen');
        if (goScreen) goScreen.classList.add('show');
        var goMsg = document.getElementById('gameOverMessage');
        if (goMsg) {
            if      (msg.indexOf('FREDDY') >= 0) goMsg.textContent = 'FREDDY FAZBEAR GOT YOU!';
            else if (msg.indexOf('BONNIE') >= 0) goMsg.textContent = 'BONNIE GOT YOU!';
            else if (msg.indexOf('CHICA')  >= 0) goMsg.textContent = 'CHICA GOT YOU!';
            else if (msg.indexOf('FOXY')   >= 0) goMsg.textContent = 'FOXY BREACHED THE HALL!';
            else                                  goMsg.textContent = msg;
        }
    }, 900);
}

function returnToStart() {
    game.running = false;
    monitorOpen = false;
    if (gameLoop) { clearInterval(gameLoop); gameLoop = null; }
    document.getElementById('gameOverScreen').classList.remove('show');
    document.getElementById('nightCompleteScreen').classList.remove('show');
    document.getElementById('gameContainer').classList.remove('show');
    document.getElementById('startScreen').classList.remove('hidden');
    var officeEl = document.getElementById('officeArea');
    if (officeEl) officeEl.style.display = 'none';
    var grid  = document.getElementById('cameraGrid');
    var mon   = document.getElementById('monitorArea');
    var ctBtn = document.getElementById('cameraToggleBtn');
    if (grid)  grid.classList.remove('show');
    if (mon)   mon.classList.remove('visible');
    if (ctBtn) ctBtn.classList.remove('active');
    updateNightButtons();
}

// ─────────────────────────────────────────────
//  PROGRESS
// ─────────────────────────────────────────────
function loadProgress() {
    try {
        var raw = localStorage.getItem('fnafProgress');
        if (raw) {
            var arr = JSON.parse(raw);
            if (Array.isArray(arr) && arr.length) {
                unlockedNights = arr.filter(function(n){ return n >= 1 && n <= 6; });
                if (!unlockedNights.length) unlockedNights = [1];
                return;
            }
        }
    } catch(e) {}
    unlockedNights = [1];
}

function saveProgress() {
    try { localStorage.setItem('fnafProgress', JSON.stringify(unlockedNights)); } catch(e) {}
}

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    loadProgress();
    initCanvas();
    sizeCanvas();
    // Start loading external assets (user-provided images). They are optional.
    try { loadAssets(); verifyAssets(); } catch(e) {}
    // Initialise canvas and assets (Three.js office init is deferred to first startGame)
    if (window.office3d) {
        // office3d.init() intentionally NOT called here — #officeArea is display:none
        // until startGame() shows it, so clientWidth/Height would be 0.
    } else {
        console.warn('[game] office3d not available — Three.js may not have loaded');
    }
    startCameraLoop();
    updateNightButtons();

    // Office area mouse tracking for head turning
    var officeArea = document.getElementById('officeArea');
    if (officeArea) {
        // Track mouse position for FNAF1-style edge scrolling
        officeArea.addEventListener('mousemove', function(e){
            if (!game.running || monitorOpen) return;
            var rect = officeArea.getBoundingClientRect();
            mouseNormX = Math.max(0, Math.min(1, (e.clientX - rect.left) / (rect.width || 1)));
            if (window.office3d) window.office3d.setMouse(mouseNormX);
        });

        // Reset scroll when mouse leaves office area (prevents stuck panning)
        officeArea.addEventListener('mouseleave', function() {
            mouseNormX = 0.5;
        });
    }

    // Wire CAMERAS toggle button
    var camToggle = document.getElementById('cameraToggleBtn');
    if (camToggle) camToggle.addEventListener('click', function() { toggleMonitor(); });

    // Wire all cam selector buttons
    document.querySelectorAll('.camBtn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var cam = this.getAttribute('data-cam');
            if (cam) { console.log('[CAM] switching to', cam); switchCam(cam); }
        });
    });

    // Wire night buttons
    document.querySelectorAll('.nightBtn').forEach(function(btn, i) {
        var night = i + 1;
        btn.addEventListener('click', function() { startGame(night); });
    });

    // Wire game over / night complete buttons
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

// ─────────────────────────────────────────────
//  WINDOW EXPORTS (for onclick attributes)
// ─────────────────────────────────────────────
window.startGame     = startGame;
window.nextNight     = nextNight;
window.returnToStart = returnToStart;
window.toggleMonitor = toggleMonitor;
window.switchCam     = switchCam;
window.toggleDoor    = toggleDoor;
window.toggleLight   = toggleLight;
window.gameState     = game;
window.animatronics  = animatronics;

