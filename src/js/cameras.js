/**
 * FNAF Game — Camera System
 */

var camCanvas, camCtx;
var camStaticTimer = 0;

var CAM_LABELS = {
    stage: 'CAM 1A - SHOW STAGE',
    dining: 'CAM 1B - DINING AREA',
    pirate: 'CAM 1C - PIRATE COVE',
    hallW: 'CAM 2A - W. HALL',
    hallW_corner: 'CAM 2B - W. HALL CORNER',
    stage_left: 'CAM 3 - SUPPLY CLOSET',
    hallE: 'CAM 4A - E. HALL',
    hallE_corner: 'CAM 4B - E. HALL CORNER',
    backstage: 'CAM 5 - BACKSTAGE',
    kitchen: 'CAM 6 - KITCHEN',
    stage_right: 'CAM 7 - RESTROOMS'
};

// ---------------------------------------------------------------------------
// CCTV overlay — applied after every camera background.
// Adds scanlines, radial vignette, green tint, and subtle grain.
// ---------------------------------------------------------------------------
function drawCamOverlay(w, h) {
    var c = camCtx;

    // Green surveillance tint
    c.fillStyle = 'rgba(0, 25, 5, 0.13)';
    c.fillRect(0, 0, w, h);

    // Horizontal scanlines every 3 px
    c.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (var y = 0; y < h; y += 3) {
        c.fillRect(0, y, w, 1);
    }

    // Radial vignette — darker at corners
    var vgd = c.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.82);
    vgd.addColorStop(0, 'rgba(0,0,0,0)');
    vgd.addColorStop(1, 'rgba(0,0,0,0.72)');
    c.fillStyle = vgd;
    c.fillRect(0, 0, w, h);

    // Subtle grain
    var grainCount = Math.floor(w * h * 0.015);
    for (var i = 0; i < grainCount; i++) {
        var gx = Math.random() * w;
        var gy = Math.random() * h;
        c.fillStyle = 'rgba(255,255,220,' + (Math.random() * 0.055) + ')';
        c.fillRect(gx, gy, 1, 1);
    }

    // Periodic horizontal interference bars (rolling distortion)
    var t = Date.now() * 0.001;
    if (Math.sin(t * 1.7) > 0.85) {
        var barY = (t * 80) % h;
        c.fillStyle = 'rgba(255,255,255,0.06)';
        c.fillRect(0, barY, w, 3);
        c.fillRect(0, barY + 8, w, 2);
    }
    // Random glitch bar — rare horizontal displacement
    if (Math.random() < 0.03) {
        var glitchY = Math.random() * h;
        var glitchH = 2 + Math.random() * 6;
        var shift = (Math.random() - 0.5) * 20;
        var imgSlice = c.getImageData(0, Math.floor(glitchY), w, Math.floor(glitchH));
        c.putImageData(imgSlice, Math.floor(shift), Math.floor(glitchY));
    }
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
        camCanvas.width = stand.clientWidth - 20;
        camCanvas.height = stand.clientHeight - 20;
    } else {
        camCanvas.width = 640;
        camCanvas.height = 480;
    }
}

function drawCamBg(cam, w, h) {
    var c = camCtx;

    if (cam === 'stage') {
        // Back wall
        c.fillStyle = '#5a4830';
        c.fillRect(0, 0, w, h);
        // Floor
        c.fillStyle = '#3a2e1e';
        c.fillRect(0, h * 0.72, w, h * 0.28);
        // Stage platform (raised)
        c.fillStyle = '#6b4c2a';
        c.fillRect(w * 0.04, h * 0.44, w * 0.92, h * 0.3);
        c.fillStyle = '#7a5933';
        c.fillRect(w * 0.04, h * 0.44, w * 0.92, h * 0.04);
        // Stage front edge shadow
        c.fillStyle = '#2a1a08';
        c.fillRect(w * 0.04, h * 0.73, w * 0.92, h * 0.025);
        // Back wall banner — dark red curtain strip at top
        c.fillStyle = '#6b0000';
        c.fillRect(0, 0, w, h * 0.18);
        c.fillStyle = '#8b0000';
        c.fillRect(0, h * 0.16, w, h * 0.03);
        // Freddy Fazbear's Pizza sign
        c.fillStyle = '#1a0800';
        c.fillRect(w * 0.12, h * 0.2, w * 0.76, h * 0.12);
        c.strokeStyle = '#cc9900';
        c.lineWidth = 2;
        c.strokeRect(w * 0.12, h * 0.2, w * 0.76, h * 0.12);
        c.fillStyle = '#ffcc00';
        c.font = 'bold ' + Math.floor(h * 0.07) + 'px Arial';
        c.textAlign = 'center';
        c.fillText("FREDDY FAZBEAR'S PIZZA", w / 2, h * 0.285);
        // Three animatronic stands — star markers on stage floor
        var stands = [w * 0.22, w * 0.5, w * 0.78];
        stands.forEach(function(sx) {
            c.fillStyle = '#4a3520';
            c.beginPath();
            c.ellipse(sx, h * 0.7, w * 0.07, h * 0.03, 0, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#cc9900';
            c.font = 'bold ' + Math.floor(h * 0.06) + 'px Arial';
            c.textAlign = 'center';
            c.fillText('\u2605', sx, h * 0.72);
        });
        // Side lighting rigs
        c.fillStyle = '#ffee88';
        c.beginPath();
        c.arc(w * 0.08, h * 0.22, h * 0.022, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(w * 0.92, h * 0.22, h * 0.022, 0, Math.PI * 2);
        c.fill();

    } else if (cam === 'dining') {
        // Back wall
        c.fillStyle = '#6a5030';
        c.fillRect(0, 0, w, h);
        // Floor
        c.fillStyle = '#4a3820';
        c.fillRect(0, h * 0.6, w, h * 0.4);
        // Ceiling
        c.fillStyle = '#3a2a14';
        c.fillRect(0, 0, w, h * 0.12);
        // Far wall — slightly lighter
        c.fillStyle = '#7a6040';
        c.fillRect(0, h * 0.12, w, h * 0.5);
        // Tables — perspective rows, back row smaller
        var tableRows = [
            { y: h * 0.32, tw: w * 0.18, th: h * 0.07, gap: w * 0.28, count: 3 },
            { y: h * 0.48, tw: w * 0.22, th: h * 0.09, gap: w * 0.32, count: 3 }
        ];
        tableRows.forEach(function(row) {
            var startX = (w - (row.count * row.tw + (row.count - 1) * (row.gap - row.tw))) / 2;
            for (var ti = 0; ti < row.count; ti++) {
                var tx = startX + ti * row.gap;
                // Table top
                c.fillStyle = '#5c3d1e';
                c.fillRect(tx, row.y, row.tw, row.th);
                c.fillStyle = '#7a5530';
                c.fillRect(tx, row.y, row.tw, row.th * 0.2);
                // Chairs as short rectangles below
                c.fillStyle = '#4a3015';
                c.fillRect(tx - row.tw * 0.1, row.y + row.th, row.tw * 0.35, row.th * 0.6);
                c.fillRect(tx + row.tw * 0.75, row.y + row.th, row.tw * 0.35, row.th * 0.6);
            }
        });
        // Overhead lights
        c.fillStyle = '#ffdd88';
        for (var li = 0; li < 4; li++) {
            c.beginPath();
            c.arc(w * (0.15 + li * 0.24), h * 0.06, h * 0.03, 0, Math.PI * 2);
            c.fill();
            // Light cone
            c.fillStyle = 'rgba(255,220,100,0.07)';
            c.beginPath();
            c.moveTo(w * (0.15 + li * 0.24), h * 0.09);
            c.lineTo(w * (0.05 + li * 0.24), h * 0.55);
            c.lineTo(w * (0.25 + li * 0.24), h * 0.55);
            c.fill();
            c.fillStyle = '#ffdd88';
        }
        // Banner on back wall
        c.fillStyle = '#8b0000';
        c.fillRect(w * 0.25, h * 0.14, w * 0.5, h * 0.1);
        c.fillStyle = '#ffcc00';
        c.font = 'bold ' + Math.floor(h * 0.055) + 'px Arial';
        c.textAlign = 'center';
        c.fillText('PARTY ROOM', w / 2, h * 0.215);

    } else if (cam === 'pirate') {
        // Foxy has 4 curtain stages based on timer (0-100)
        // foxyStage comes from a.pos: 0=curtain closed, 1=peeking, 2=fully visible, 3=gone (in hall)
        var foxyStage = (animatronics && animatronics.foxy) ? Math.min(3, animatronics.foxy.pos) : 0;

        // Background
        c.fillStyle = '#0d1f2a';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#1a3040';
        c.fillRect(0, h * 0.65, w, h * 0.35);

        // Stage banner
        c.fillStyle = '#ffcc00';
        c.font = 'bold ' + Math.floor(h * 0.055) + 'px Arial';
        c.textAlign = 'center';
        c.fillText('\u2605 PIRATE COVE \u2605', w / 2, h * 0.08);

        // Stars
        c.fillStyle = '#ffdd88';
        for (var s = 0; s < 5; s++) { c.fillRect(w * (0.1 + s * 0.2), h * 0.25, h * 0.025, h * 0.025); }

        if (foxyStage === 3) {
            // Empty cove — curtains open, dark and empty
            c.fillStyle = '#5a0000';
            c.fillRect(0, h * 0.1, w * 0.18, h * 0.6);
            c.fillRect(w * 0.82, h * 0.1, w * 0.18, h * 0.6);
            c.fillStyle = '#0a0a0a';
            c.fillRect(w * 0.18, h * 0.1, w * 0.64, h * 0.6);
            c.fillStyle = 'rgba(200,50,50,0.18)';
            c.font = 'bold ' + Math.floor(h * 0.07) + 'px Arial';
            c.fillText('ITS ME', w / 2, h * 0.45);
        } else if (foxyStage === 2) {
            // Curtains wide open, Foxy fully visible standing in cove
            c.fillStyle = '#5a0000';
            c.fillRect(0, h * 0.1, w * 0.14, h * 0.6);
            c.fillRect(w * 0.86, h * 0.1, w * 0.14, h * 0.6);
            // Foxy body (orange-red)
            c.fillStyle = '#c0392b';
            c.fillRect(w * 0.38, h * 0.3, w * 0.24, h * 0.35);
            // Foxy head
            c.fillStyle = '#e74c3c';
            c.beginPath();
            c.arc(w * 0.5, h * 0.3, w * 0.12, 0, Math.PI * 2);
            c.fill();
            // Eyes
            c.fillStyle = '#fff';
            c.beginPath();
            c.arc(w * 0.44, h * 0.27, w * 0.03, 0, Math.PI * 2);
            c.fill();
            c.beginPath();
            c.arc(w * 0.56, h * 0.27, w * 0.03, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#00aaff';
            c.beginPath();
            c.arc(w * 0.44, h * 0.27, w * 0.015, 0, Math.PI * 2);
            c.fill();
            c.beginPath();
            c.arc(w * 0.56, h * 0.27, w * 0.015, 0, Math.PI * 2);
            c.fill();
            // Hook
            c.strokeStyle = '#aaa';
            c.lineWidth = 3;
            c.beginPath();
            c.moveTo(w * 0.62, h * 0.42);
            c.lineTo(w * 0.7, h * 0.5);
            c.arc(w * 0.7, h * 0.54, h * 0.04, -Math.PI / 2, Math.PI / 2);
            c.stroke();
        } else if (foxyStage === 1) {
            // Curtains slightly open — Foxy peeking out from gap
            c.fillStyle = '#8B0000';
            c.fillRect(0, h * 0.1, w * 0.42, h * 0.6);
            c.fillStyle = '#5a0000';
            c.fillRect(w * 0.58, h * 0.1, w * 0.42, h * 0.6);
            // Foxy peeking in the gap
            c.fillStyle = '#e74c3c';
            c.beginPath();
            c.arc(w * 0.5, h * 0.38, w * 0.08, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#fff';
            c.beginPath();
            c.arc(w * 0.47, h * 0.36, w * 0.02, 0, Math.PI * 2);
            c.fill();
            c.beginPath();
            c.arc(w * 0.53, h * 0.36, w * 0.02, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#00aaff';
            c.beginPath();
            c.arc(w * 0.47, h * 0.36, w * 0.01, 0, Math.PI * 2);
            c.fill();
            c.beginPath();
            c.arc(w * 0.53, h * 0.36, w * 0.01, 0, Math.PI * 2);
            c.fill();
        } else {
            // Stage 0 — curtain fully closed
            c.fillStyle = '#8B0000';
            c.fillRect(0, h * 0.1, w * 0.5, h * 0.6);
            c.fillStyle = '#5a0000';
            c.fillRect(w * 0.5, h * 0.1, w * 0.5, h * 0.6);
            // OUT OF ORDER sign
            c.fillStyle = 'rgba(0,0,0,0.5)';
            c.fillRect(w * 0.2, h * 0.38, w * 0.6, h * 0.12);
            c.fillStyle = '#ffcc00';
            c.font = 'bold ' + Math.floor(h * 0.06) + 'px Courier New';
            c.textAlign = 'center';
            c.fillText('OUT OF ORDER', w / 2, h * 0.465);
        }
        // Stage decoration — platform at base
        c.fillStyle = '#8B5A2B';
        c.fillRect(w * 0.15, h * 0.68, w * 0.7, h * 0.06);

    } else if (cam === 'stage_left') {
        c.fillStyle = '#7a6050';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#5a4835';
        c.fillRect(0, h * 0.65, w, h * 0.35);
        c.strokeStyle = '#5a4030';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(0, h * 0.2);
        c.lineTo(w * 0.25, h * 0.4);
        c.stroke();
        c.beginPath();
        c.moveTo(w, h * 0.2);
        c.lineTo(w * 0.75, h * 0.4);
        c.stroke();
        c.fillStyle = '#6b4423';
        c.fillRect(w * 0.3, h * 0.25, w * 0.4, h * 0.45);
        c.strokeStyle = '#4a2810';
        c.lineWidth = 3;
        c.strokeRect(w * 0.3, h * 0.25, w * 0.4, h * 0.45);
        c.fillStyle = '#ffaa00';
        c.beginPath();
        c.arc(w * 0.65, h * 0.47, h * 0.04, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#ff9900';
        c.beginPath();
        c.arc(w * 0.1, h * 0.3, h * 0.04, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(w * 0.9, h * 0.3, h * 0.04, 0, Math.PI * 2);
        c.fill();

    } else if (cam === 'stage_right') {
        c.fillStyle = '#7a6050';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#5a4835';
        c.fillRect(0, h * 0.65, w, h * 0.35);
        c.strokeStyle = '#5a4030';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(0, h * 0.15);
        c.lineTo(w * 0.4, h * 0.35);
        c.stroke();
        c.beginPath();
        c.moveTo(w, h * 0.15);
        c.lineTo(w * 0.6, h * 0.35);
        c.stroke();
        c.fillStyle = '#6b4423';
        c.fillRect(w * 0.25, h * 0.2, w * 0.5, h * 0.5);
        c.strokeStyle = '#4a2810';
        c.lineWidth = 4;
        c.strokeRect(w * 0.25, h * 0.2, w * 0.5, h * 0.5);
        c.fillStyle = '#ffaa00';
        c.beginPath();
        c.arc(w * 0.7, h * 0.45, h * 0.05, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#999';
        c.lineWidth = 2;
        c.strokeRect(w * 0.23, h * 0.18, w * 0.54, h * 0.54);

    } else if (cam === 'kitchen') {
        c.fillStyle = '#2a2a2a';
        c.fillRect(0, 0, w, h);
        var imgd = c.createImageData(w, h);
        for (var i = 0; i < imgd.data.length; i += 4) {
            var v = Math.random() < 0.7 ? Math.floor(Math.random() * 40) : 0;
            imgd.data[i] = imgd.data[i + 1] = imgd.data[i + 2] = v;
            imgd.data[i + 3] = 255;
        }
        c.putImageData(imgd, 0, 0);
        c.fillStyle = 'rgba(0,0,0,0.6)';
        c.fillRect(0, h * 0.3, w, h * 0.4);
        c.fillStyle = '#ff4444';
        c.font = 'bold ' + Math.floor(h * 0.08) + 'px Courier New';
        c.textAlign = 'center';
        c.fillText('AUDIO ONLY', w / 2, h * 0.55);

    } else if (cam === 'backstage') {
        c.fillStyle = '#3a2a1a';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#4a3a2a';
        c.fillRect(0, h * 0.6, w, h * 0.4);
        c.fillStyle = '#5a4a3a';
        c.fillRect(w * 0.05, h * 0.2, w * 0.25, h * 0.35);
        c.fillRect(w * 0.35, h * 0.15, w * 0.25, h * 0.4);
        c.fillRect(w * 0.65, h * 0.25, w * 0.25, h * 0.3);
        c.fillStyle = '#6a5a4a';
        c.beginPath();
        c.arc(w * 0.15, h * 0.1, h * 0.08, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(w * 0.85, h * 0.12, h * 0.07, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#cc4444';
        c.font = 'bold ' + Math.floor(h * 0.06) + 'px Arial';
        c.textAlign = 'center';
        c.fillText('PARTS & SERVICE', w / 2, h * 0.08);

    } else if (cam === 'hallW') {
        // Wide-angle front view down West Hall — vanishing point centre
        // Ceiling
        c.fillStyle = '#3a2e18';
        c.fillRect(0, 0, w, h);
        // Floor (perspective trapezoid)
        c.fillStyle = '#4e3c20';
        c.beginPath();
        c.moveTo(0, h);
        c.lineTo(w, h);
        c.lineTo(w * 0.62, h * 0.5);
        c.lineTo(w * 0.38, h * 0.5);
        c.fill();
        // Left wall (perspective)
        c.fillStyle = '#7a6244';
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(0, h);
        c.lineTo(w * 0.38, h * 0.5);
        c.lineTo(w * 0.38, 0);
        c.fill();
        // Right wall
        c.fillStyle = '#6a5438';
        c.beginPath();
        c.moveTo(w, 0);
        c.lineTo(w, h);
        c.lineTo(w * 0.62, h * 0.5);
        c.lineTo(w * 0.62, 0);
        c.fill();
        // Ceiling strip
        c.fillStyle = '#2e2410';
        c.fillRect(0, 0, w, h * 0.08);
        // Far end wall — dark rectangle at vanishing point
        c.fillStyle = '#2a2010';
        c.fillRect(w * 0.38, 0, w * 0.24, h * 0.5);
        // Vanishing-point glow (faint hall light)
        var hallGlow = c.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, h * 0.22);
        hallGlow.addColorStop(0, 'rgba(220,180,80,0.18)');
        hallGlow.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = hallGlow;
        c.fillRect(0, 0, w, h);
        // Poster on left wall (classic FNAF wall art)
        c.fillStyle = '#3a2808';
        c.fillRect(w * 0.05, h * 0.2, w * 0.14, h * 0.22);
        c.strokeStyle = '#cc9900';
        c.lineWidth = 2;
        c.strokeRect(w * 0.05, h * 0.2, w * 0.14, h * 0.22);
        c.fillStyle = '#cc4400';
        c.font = Math.floor(h * 0.045) + 'px Arial';
        c.textAlign = 'center';
        c.fillText('IT\'S ME', w * 0.12, h * 0.33);
        // Floor baseboards
        c.strokeStyle = '#2a1a08';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(0, h * 0.88);
        c.lineTo(w * 0.38, h * 0.5);
        c.stroke();
        c.beginPath();
        c.moveTo(w, h * 0.88);
        c.lineTo(w * 0.62, h * 0.5);
        c.stroke();

    } else if (cam === 'hallE') {
        // Wide-angle front view down East Hall — slightly warmer tone
        c.fillStyle = '#3e3020';
        c.fillRect(0, 0, w, h);
        // Floor (perspective)
        c.fillStyle = '#524030';
        c.beginPath();
        c.moveTo(0, h);
        c.lineTo(w, h);
        c.lineTo(w * 0.61, h * 0.5);
        c.lineTo(w * 0.39, h * 0.5);
        c.fill();
        // Left wall
        c.fillStyle = '#84684a';
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(0, h);
        c.lineTo(w * 0.39, h * 0.5);
        c.lineTo(w * 0.39, 0);
        c.fill();
        // Right wall
        c.fillStyle = '#74584a';
        c.beginPath();
        c.moveTo(w, 0);
        c.lineTo(w, h);
        c.lineTo(w * 0.61, h * 0.5);
        c.lineTo(w * 0.61, 0);
        c.fill();
        // Ceiling strip
        c.fillStyle = '#30240e';
        c.fillRect(0, 0, w, h * 0.08);
        // Far end wall
        c.fillStyle = '#2e2214';
        c.fillRect(w * 0.39, 0, w * 0.22, h * 0.5);
        // Vanishing glow
        var hallGlowE = c.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, h * 0.22);
        hallGlowE.addColorStop(0, 'rgba(200,160,70,0.15)');
        hallGlowE.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = hallGlowE;
        c.fillRect(0, 0, w, h);
        // Poster on right wall
        c.fillStyle = '#3a2010';
        c.fillRect(w * 0.81, h * 0.18, w * 0.13, h * 0.2);
        c.strokeStyle = '#cc9900';
        c.lineWidth = 2;
        c.strokeRect(w * 0.81, h * 0.18, w * 0.13, h * 0.2);
        // Floor baseboards
        c.strokeStyle = '#2a1808';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(0, h * 0.88);
        c.lineTo(w * 0.39, h * 0.5);
        c.stroke();
        c.beginPath();
        c.moveTo(w, h * 0.88);
        c.lineTo(w * 0.61, h * 0.5);
        c.stroke();

    } else if (cam === 'hallW_corner') {
        // W. Hall Corner — camera looks around corner; left hall continues left,
        // the office left door is visible on the right side
        // Left portion: hall going off to the left
        c.fillStyle = '#4a3820';
        c.fillRect(0, 0, w, h);
        // Left-side hall section (going left, foreshortened)
        c.fillStyle = '#7a6040';
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(w * 0.45, 0);
        c.lineTo(w * 0.45, h * 0.45);
        c.lineTo(0, h * 0.55);
        c.fill();
        // Left wall floor
        c.fillStyle = '#5a4028';
        c.beginPath();
        c.moveTo(0, h);
        c.lineTo(w * 0.45, h);
        c.lineTo(w * 0.45, h * 0.55);
        c.lineTo(0, h * 0.65);
        c.fill();
        // Left-side vanishing point glow
        var lwGlow = c.createRadialGradient(0, h * 0.5, 0, 0, h * 0.5, w * 0.4);
        lwGlow.addColorStop(0, 'rgba(200,160,60,0.1)');
        lwGlow.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = lwGlow;
        c.fillRect(0, 0, w * 0.45, h);
        // Right portion: shows the left door frame (office entrance on left side)
        c.fillStyle = '#6a5030';
        c.fillRect(w * 0.45, 0, w * 0.55, h);
        // Door frame structure on right side
        c.fillStyle = '#2a1a08';
        c.fillRect(w * 0.6, h * 0.05, w * 0.32, h * 0.8);
        // Door opening (dark gap or closed door)
        c.fillStyle = '#1a1208';
        c.fillRect(w * 0.65, h * 0.1, w * 0.22, h * 0.7);
        // Door frame outline
        c.strokeStyle = '#3a2810';
        c.lineWidth = 4;
        c.strokeRect(w * 0.65, h * 0.1, w * 0.22, h * 0.7);
        // Floor line
        c.fillStyle = '#3a2810';
        c.fillRect(w * 0.45, h * 0.75, w * 0.55, h * 0.25);
        // Corner wall divider
        c.fillStyle = '#2a1808';
        c.fillRect(w * 0.43, 0, w * 0.04, h);
        // Overhead light
        c.fillStyle = '#cc8844';
        c.beginPath();
        c.arc(w * 0.2, h * 0.08, h * 0.035, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = 'rgba(200,140,60,0.08)';
        c.beginPath();
        c.moveTo(w * 0.2, h * 0.12);
        c.lineTo(w * 0.05, h * 0.6);
        c.lineTo(w * 0.35, h * 0.6);
        c.fill();

    } else if (cam === 'hallE_corner') {
        // E. Hall Corner — mirror of W. Hall Corner, door on left side
        c.fillStyle = '#4e3c22';
        c.fillRect(0, 0, w, h);
        // Left portion: shows the right door frame
        c.fillStyle = '#6e5232';
        c.fillRect(0, 0, w * 0.55, h);
        // Door frame on left side
        c.fillStyle = '#2e1c0a';
        c.fillRect(w * 0.08, h * 0.05, w * 0.32, h * 0.8);
        c.fillStyle = '#1e1408';
        c.fillRect(w * 0.13, h * 0.1, w * 0.22, h * 0.7);
        c.strokeStyle = '#3e2c12';
        c.lineWidth = 4;
        c.strokeRect(w * 0.13, h * 0.1, w * 0.22, h * 0.7);
        // Floor on door side
        c.fillStyle = '#3e2c10';
        c.fillRect(0, h * 0.75, w * 0.55, h * 0.25);
        // Corner divider
        c.fillStyle = '#2e1a0a';
        c.fillRect(w * 0.53, 0, w * 0.04, h);
        // Right portion: hall going right, foreshortened
        c.fillStyle = '#7e6242';
        c.beginPath();
        c.moveTo(w * 0.57, 0);
        c.lineTo(w, 0);
        c.lineTo(w, h * 0.55);
        c.lineTo(w * 0.57, h * 0.45);
        c.fill();
        c.fillStyle = '#5e4232';
        c.beginPath();
        c.moveTo(w * 0.57, h);
        c.lineTo(w, h);
        c.lineTo(w, h * 0.65);
        c.lineTo(w * 0.57, h * 0.55);
        c.fill();
        // Vanishing glow right side
        var reGlow = c.createRadialGradient(w, h * 0.5, 0, w, h * 0.5, w * 0.4);
        reGlow.addColorStop(0, 'rgba(200,160,60,0.1)');
        reGlow.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = reGlow;
        c.fillRect(w * 0.57, 0, w * 0.43, h);
        // Overhead light
        c.fillStyle = '#dd8844';
        c.beginPath();
        c.arc(w * 0.8, h * 0.08, h * 0.035, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = 'rgba(200,140,60,0.08)';
        c.beginPath();
        c.moveTo(w * 0.8, h * 0.12);
        c.lineTo(w * 0.65, h * 0.6);
        c.lineTo(w * 0.95, h * 0.6);
        c.fill();

    } else {
        c.fillStyle = '#2a2a2a';
        c.fillRect(0, 0, w, h);
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

function drawAnimatronic(anim, cx, cy, scale) {
    var c = camCtx;
    var hw = Math.floor(camCanvas.height * 0.18 * (scale || 1));

    c.save();
    c.translate(cx, cy);

    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.beginPath();
    c.ellipse(0, hw * 0.1, hw * 1.1, hw * 0.2, 0, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = anim.color;
    c.fillRect(-hw * 0.5, -hw * 1.4, hw, hw * 1.4);

    c.fillStyle = anim.color;
    c.beginPath();
    c.arc(0, -hw * 1.6, hw * 0.55, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(-hw * 0.22, -hw * 1.72, hw * 0.18, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(hw * 0.22, -hw * 1.72, hw * 0.18, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#111';
    c.beginPath();
    c.arc(-hw * 0.22, -hw * 1.72, hw * 0.09, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(hw * 0.22, -hw * 1.72, hw * 0.09, 0, Math.PI * 2);
    c.fill();

    c.strokeStyle = '#333';
    c.lineWidth = hw * 0.08;
    c.beginPath();
    c.arc(0, -hw * 1.4, hw * 0.3, 0.2, Math.PI - 0.2);
    c.stroke();

    c.strokeStyle = anim.color;
    c.lineWidth = hw * 0.22;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-hw * 0.5, -hw * 1.1);
    c.lineTo(-hw * 1.0, -hw * 0.55);
    c.stroke();
    c.beginPath();
    c.moveTo(hw * 0.5, -hw * 1.1);
    c.lineTo(hw * 1.0, -hw * 0.55);
    c.stroke();

    c.lineWidth = hw * 0.2;
    c.beginPath();
    c.moveTo(-hw * 0.25, 0);
    c.lineTo(-hw * 0.3, hw * 0.8);
    c.stroke();
    c.beginPath();
    c.moveTo(hw * 0.25, 0);
    c.lineTo(hw * 0.3, hw * 0.8);
    c.stroke();

    c.fillStyle = '#fff';
    c.font = 'bold ' + Math.max(9, Math.floor(hw * 0.45)) + 'px Arial';
    c.textAlign = 'center';
    c.fillText(anim.name, 0, hw * 1.0);

    c.restore();
}

function toggleMonitor() {
    if (!game.running) return;
    if (game.powerOutage) return; // cameras disabled during power outage
    monitorOpen = !monitorOpen;
    var grid = document.getElementById('cameraGrid');
    var mon = document.getElementById('monitorArea');
    var btn = document.getElementById('cameraToggleBtn');
    if (grid) grid.classList.toggle('show', monitorOpen);
    if (mon) mon.classList.toggle('visible', monitorOpen);
    if (btn) btn.classList.toggle('active', monitorOpen);

    if (monitorOpen) {
        game.currentCam = game.lastCam || 'stage';
        camStaticTimer = 2; // brief static on monitor open
        document.querySelectorAll('.camBtn').forEach(function(b) {
            b.classList.toggle('active', b.getAttribute('data-cam') === game.currentCam);
        });
        sizeCanvas();
        drawCamera();
        var camSfx = document.getElementById('camStaticAudio');
        if (camSfx) {
            camSfx.currentTime = 0;
            camSfx.play().catch(function() {});
        }
        // Hide office behind monitor
        var officeEl = document.getElementById('officeArea');
        if (officeEl) officeEl.style.display = 'none';
    } else {
        game.currentCam = 'office';
        if (camCtx && camCanvas) camCtx.clearRect(0, 0, camCanvas.width, camCanvas.height);
        // Show office when monitor closes
        var officeEl2 = document.getElementById('officeArea');
        if (officeEl2) officeEl2.style.display = 'flex';
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
    camStaticTimer = 2; // ~2 frames of static on switch
    var grid = document.getElementById('cameraGrid');
    var btn = document.getElementById('cameraToggleBtn');
    if (grid) grid.classList.add('show');
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.camBtn').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-cam') === cam);
    });
    sizeCanvas();
    drawCamera();
    var camBlip = document.getElementById('camChangeAudio');
    if (camBlip) {
        camBlip.currentTime = 0;
        camBlip.play().catch(function() {});
    }
}

window.toggleMonitor = toggleMonitor;
window.switchCam = switchCam;