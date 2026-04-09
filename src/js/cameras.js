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

// ---------------------------------------------------------------------------
// perspTileFloor — draws a perspective-correct checkerboard on a trapezoid floor.
// x0L/x0R: left and right x at the FAR edge (topY).
// x1L/x1R: left and right x at the NEAR edge (botY).
// numRows/numCols: tile grid density.
// ---------------------------------------------------------------------------
function perspTileFloor(ctx, x0L, x0R, x1L, x1R, topY, botY, numRows, numCols) {
    var fH = botY - topY;
    // Geometric row heights — far rows small (at topY), near rows large (at botY)
    var ratio = 1.75,
        spaces = [],
        rTotal = 0;
    for (var _ri = 0; _ri < numRows; _ri++) {
        var _s = Math.pow(ratio, _ri);
        spaces.push(_s);
        rTotal += _s;
    }
    var yLine = [topY];
    for (var _ri2 = 0; _ri2 < numRows; _ri2++) {
        yLine.push(yLine[_ri2] + spaces[_ri2] / rTotal * fH);
    }
    for (var _row = 0; _row < numRows; _row++) {
        var _y0 = yLine[_row],
            _y1 = yLine[_row + 1];
        var _t0 = (_y0 - topY) / fH,
            _t1 = (_y1 - topY) / fH;
        var _rl0 = x0L + (x1L - x0L) * _t0,
            _rr0 = x0R + (x1R - x0R) * _t0;
        var _rl1 = x0L + (x1L - x0L) * _t1,
            _rr1 = x0R + (x1R - x0R) * _t1;
        for (var _col = 0; _col < numCols; _col++) {
            ctx.fillStyle = (_row + _col) % 2 === 0 ? 'rgba(212,207,196,0.88)' : 'rgba(26,20,13,0.88)';
            var _xl0 = _rl0 + (_rr0 - _rl0) * _col / numCols;
            var _xr0 = _rl0 + (_rr0 - _rl0) * (_col + 1) / numCols;
            var _xl1 = _rl1 + (_rr1 - _rl1) * _col / numCols;
            var _xr1 = _rl1 + (_rr1 - _rl1) * (_col + 1) / numCols;
            ctx.beginPath();
            ctx.moveTo(_xl0, _y0);
            ctx.lineTo(_xr0, _y0);
            ctx.lineTo(_xr1, _y1);
            ctx.lineTo(_xl1, _y1);
            ctx.closePath();
            ctx.fill();
        }
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

    // ── Shared draw helpers ──────────────────────────────────────────────
    // Round ceiling disc-light with warm glow cone
    function ceilLight(lx, ly, r) {
        c.fillStyle = '#72727a';
        c.beginPath();
        c.arc(lx, ly, r * 1.15, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#ddd8c8';
        c.beginPath();
        c.arc(lx, ly, r, 0, Math.PI * 2);
        c.fill();
        var grd = c.createRadialGradient(lx, ly, r, lx, ly, r * 6);
        grd.addColorStop(0, 'rgba(220,195,130,0.22)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = grd;
        c.beginPath();
        c.arc(lx, ly, r * 6, 0, Math.PI * 2);
        c.fill();
    }
    // Wainscoting band: a lighter horizontal stripe low on a wall region
    function wainscot(x, y, ww, hh) {
        c.fillStyle = 'rgba(255,255,255,0.07)';
        c.fillRect(x, y, ww, hh);
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.fillRect(x, y, ww, hh * 0.08);
        c.fillRect(x, y + hh * 0.92, ww, hh * 0.08);
    }

    if (cam === 'stage') {
        // ── CAM 1A: Show Stage ──────────────────────────────────────────
        // Room bg — dark purple walls
        c.fillStyle = '#2c2438';
        c.fillRect(0, 0, w, h);
        // Ceiling
        c.fillStyle = '#14101e';
        c.fillRect(0, 0, w, h * 0.1);
        // Checker floor in front of stage (bottom 22% of view)
        perspTileFloor(c, w * 0.15, w * 0.85, 0, w, h * 0.78, h, 4, 6);
        // Stage platform
        c.fillStyle = '#5c3c1a';
        c.fillRect(w * 0.04, h * 0.42, w * 0.92, h * 0.36);
        c.fillStyle = '#70481e';
        c.fillRect(w * 0.04, h * 0.42, w * 0.92, h * 0.03);
        // Stage-platform shadow at base
        c.fillStyle = '#1a0e08';
        c.fillRect(w * 0.04, h * 0.78, w * 0.92, h * 0.025);
        // Curtain backdrop (deep purple-crimson, vertical folds)
        c.fillStyle = '#50103a';
        c.fillRect(0, h * 0.1, w, h * 0.42);
        for (var fld = 0; fld <= 10; fld++) {
            var fx = w * fld / 10;
            c.fillStyle = fld % 2 === 0 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.04)';
            c.fillRect(fx, h * 0.1, w * 0.05, h * 0.42);
        }
        // Freddy Fazbear's Pizza banner
        c.fillStyle = '#1a0810';
        c.fillRect(w * 0.08, h * 0.11, w * 0.84, h * 0.11);
        c.strokeStyle = '#dd9900';
        c.lineWidth = 2;
        c.strokeRect(w * 0.08, h * 0.11, w * 0.84, h * 0.11);
        c.fillStyle = '#ffcc00';
        c.font = 'bold ' + Math.floor(h * 0.06) + 'px Arial';
        c.textAlign = 'center';
        c.fillText("FREDDY FAZBEAR'S PIZZA", w * 0.5, h * 0.185);
        // ── Animatronics on stage ───────────────────────────────────────
        // Bonnie — left, purple rabbit
        (function() {
            var bx = w * 0.2,
                by = h * 0.45,
                bh = h * 0.34;
            // Body
            c.fillStyle = '#4a2880';
            c.fillRect(bx - bh * 0.22, by + bh * 0.38, bh * 0.44, bh * 0.55);
            // Head
            c.fillStyle = '#5c3494';
            c.beginPath();
            c.arc(bx, by + bh * 0.3, bh * 0.24, 0, Math.PI * 2);
            c.fill();
            // Ears (tall)
            c.fillStyle = '#5c3494';
            c.fillRect(bx - bh * 0.22, by - bh * 0.1, bh * 0.1, bh * 0.38);
            c.fillRect(bx + bh * 0.12, by - bh * 0.1, bh * 0.1, bh * 0.38);
            c.fillStyle = '#c070e0';
            c.fillRect(bx - bh * 0.17, by - bh * 0.06, bh * 0.04, bh * 0.3);
            c.fillRect(bx + bh * 0.14, by - bh * 0.06, bh * 0.04, bh * 0.3);
            // Eyes
            c.fillStyle = '#aa00cc';
            c.beginPath();
            c.arc(bx - bh * 0.09, by + bh * 0.26, bh * 0.04, 0, Math.PI * 2);
            c.fill();
            c.beginPath();
            c.arc(bx + bh * 0.09, by + bh * 0.26, bh * 0.04, 0, Math.PI * 2);
            c.fill();
            // Guitar (simplified rectangle)
            c.fillStyle = '#8b4513';
            c.fillRect(bx + bh * 0.22, by + bh * 0.42, bh * 0.07, bh * 0.4);
            c.beginPath();
            c.ellipse(bx + bh * 0.25, by + bh * 0.55, bh * 0.1, bh * 0.08, 0, 0, Math.PI * 2);
            c.fill();
        })();
        // Freddy — centre, brown bear with top hat
        (function() {
            var fx = w * 0.5,
                fy = h * 0.42,
                fh = h * 0.36;
            // Body
            c.fillStyle = '#7a501e';
            c.fillRect(fx - fh * 0.24, fy + fh * 0.36, fh * 0.48, fh * 0.57);
            // Head
            c.fillStyle = '#8b5c28';
            c.beginPath();
            c.arc(fx, fy + fh * 0.28, fh * 0.26, 0, Math.PI * 2);
            c.fill();
            // Ears (round)
            c.beginPath();
            c.arc(fx - fh * 0.24, fy + fh * 0.08, fh * 0.1, 0, Math.PI * 2);
            c.fill();
            c.beginPath();
            c.arc(fx + fh * 0.24, fy + fh * 0.08, fh * 0.1, 0, Math.PI * 2);
            c.fill();
            // Top hat
            c.fillStyle = '#111018';
            c.fillRect(fx - fh * 0.18, fy - fh * 0.06, fh * 0.36, fh * 0.26);
            c.fillRect(fx - fh * 0.24, fy + fh * 0.19, fh * 0.48, fh * 0.06);
            c.fillStyle = '#8b0000'; // hat band
            c.fillRect(fx - fh * 0.18, fy + fh * 0.14, fh * 0.36, fh * 0.05);
            // Eyes
            c.fillStyle = '#200c00';
            c.beginPath();
            c.arc(fx - fh * 0.1, fy + fh * 0.24, fh * 0.05, 0, Math.PI * 2);
            c.fill();
            c.beginPath();
            c.arc(fx + fh * 0.1, fy + fh * 0.24, fh * 0.05, 0, Math.PI * 2);
            c.fill();
            // Microphone
            c.fillStyle = '#888';
            c.fillRect(fx + fh * 0.22, fy + fh * 0.48, fh * 0.04, fh * 0.35);
            c.beginPath();
            c.ellipse(fx + fh * 0.24, fy + fh * 0.46, fh * 0.08, fh * 0.06, 0, 0, Math.PI * 2);
            c.fill();
        })();
        // Chica — right, yellow chicken
        (function() {
            var cx = w * 0.8,
                cy = h * 0.45,
                ch = h * 0.34;
            // Body
            c.fillStyle = '#d4a800';
            c.fillRect(cx - ch * 0.22, cy + ch * 0.38, ch * 0.44, ch * 0.55);
            // Head
            c.fillStyle = '#e8bc18';
            c.beginPath();
            c.arc(cx, cy + ch * 0.28, ch * 0.24, 0, Math.PI * 2);
            c.fill();
            // Beak
            c.fillStyle = '#e07000';
            c.beginPath();
            c.moveTo(cx - ch * 0.1, cy + ch * 0.3);
            c.lineTo(cx + ch * 0.1, cy + ch * 0.3);
            c.lineTo(cx, cy + ch * 0.42);
            c.closePath();
            c.fill();
            // Eyes
            c.fillStyle = '#201000';
            c.beginPath();
            c.arc(cx - ch * 0.09, cy + ch * 0.23, ch * 0.04, 0, Math.PI * 2);
            c.fill();
            c.beginPath();
            c.arc(cx + ch * 0.09, cy + ch * 0.23, ch * 0.04, 0, Math.PI * 2);
            c.fill();
            // Bibs/chest lighter patch
            c.fillStyle = '#f8e880';
            c.beginPath();
            c.ellipse(cx, cy + ch * 0.52, ch * 0.14, ch * 0.18, 0, 0, Math.PI * 2);
            c.fill();
            // "LET'S EAT" bib text (tiny)
            c.fillStyle = '#cc2200';
            c.font = 'bold ' + Math.floor(ch * 0.07) + 'px Arial';
            c.textAlign = 'center';
            c.fillText("LET'S EAT", cx, cy + ch * 0.56);
            // Cupcake (small)
            c.fillStyle = '#c06818';
            c.fillRect(cx - ch * 0.28, cy + ch * 0.55, ch * 0.11, ch * 0.14);
            c.fillStyle = '#ee2244';
            c.beginPath();
            c.arc(cx - ch * 0.225, cy + ch * 0.54, ch * 0.065, 0, Math.PI * 2);
            c.fill();
        })();
        // Stage lighting (warm cones from above)
        [w * 0.2, w * 0.5, w * 0.8].forEach(function(lx) {
            c.fillStyle = 'rgba(255,220,120,0.07)';
            c.beginPath();
            c.moveTo(lx, 0);
            c.lineTo(lx - w * 0.12, h * 0.78);
            c.lineTo(lx + w * 0.12, h * 0.78);
            c.fill();
            ceilLight(lx, h * 0.06, h * 0.03);
        });

    } else if (cam === 'dining') {
        // ── CAM 1B: Dining Area ─────────────────────────────────────────
        // Ceiling
        c.fillStyle = '#1a1228';
        c.fillRect(0, 0, w, h);
        // Back wall — dark purple
        c.fillStyle = '#3a2c50';
        c.fillRect(0, h * 0.08, w, h * 0.55);
        // Side walls
        c.fillStyle = '#2e2240';
        c.fillRect(0, 0, w * 0.06, h);
        c.fillRect(w * 0.94, 0, w * 0.06, h);
        // Checker floor (from below mid to bottom)
        c.fillStyle = '#2e2440';
        c.fillRect(0, h * 0.6, w, h * 0.4);
        perspTileFloor(c, w * 0.12, w * 0.88, 0, w, h * 0.6, h, 6, 7);
        // Hanging overhead round lights
        for (var li = 0; li < 3; li++) {
            var lx = w * (0.22 + li * 0.28);
            // Cord
            c.strokeStyle = '#404050';
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(lx, 0);
            c.lineTo(lx, h * 0.09);
            c.stroke();
            ceilLight(lx, h * 0.09, h * 0.028);
        }
        // Wainscoting on back wall
        wainscot(0, h * 0.52, w, h * 0.08);
        // Party banner on back wall
        c.fillStyle = '#7a0020';
        c.fillRect(w * 0.2, h * 0.12, w * 0.6, h * 0.09);
        c.strokeStyle = '#ffcc00';
        c.lineWidth = 2;
        c.strokeRect(w * 0.2, h * 0.12, w * 0.6, h * 0.09);
        c.fillStyle = '#ffcc00';
        c.font = 'bold ' + Math.floor(h * 0.055) + 'px Arial';
        c.textAlign = 'center';
        c.fillText('PARTY ROOM', w * 0.5, h * 0.185);
        // Balloons — clusters on left and right sides
        var bColors = ['#cc2244', '#2244cc', '#22aa44', '#cc8800', '#9922cc'];
        [
            [w * 0.08, h * 0.22],
            [w * 0.14, h * 0.18],
            [w * 0.11, h * 0.28],
            [w * 0.88, h * 0.22],
            [w * 0.92, h * 0.18],
            [w * 0.85, h * 0.26]
        ].forEach(function(pos, idx) {
            c.fillStyle = bColors[idx % bColors.length];
            c.beginPath();
            c.arc(pos[0], pos[1], h * 0.032, 0, Math.PI * 2);
            c.fill();
            c.strokeStyle = 'rgba(0,0,0,0.4)';
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(pos[0], pos[1] + h * 0.032);
            c.lineTo(pos[0] + (idx % 3 - 1) * h * 0.01, pos[1] + h * 0.1);
            c.stroke();
        });
        // Tables (perspective rows — back row smaller, front row larger)
        var tblData = [
            { y: h * 0.33, tw: w * 0.13, th: h * 0.06, xs: [w * 0.22, w * 0.5, w * 0.78] },
            { y: h * 0.5, tw: w * 0.17, th: h * 0.08, xs: [w * 0.18, w * 0.5, w * 0.82] }
        ];
        tblData.forEach(function(row) {
            row.xs.forEach(function(tx) {
                // Shadow
                c.fillStyle = 'rgba(0,0,0,0.4)';
                c.fillRect(tx - row.tw * 0.48, row.y + row.th, row.tw * 0.96, row.th * 0.3);
                // Tablecloth
                var clothColors = ['#8b0000', '#1a3066', '#226622'];
                c.fillStyle = clothColors[Math.floor(tx / w * 3) % 3];
                c.fillRect(tx - row.tw * 0.5, row.y, row.tw, row.th);
                // Table edge highlight
                c.fillStyle = 'rgba(255,255,255,0.1)';
                c.fillRect(tx - row.tw * 0.5, row.y, row.tw, row.th * 0.12);
                // Chairs either side
                c.fillStyle = '#4a3260';
                c.fillRect(tx - row.tw * 0.7, row.y + row.th * 0.1, row.tw * 0.18, row.th * 0.7);
                c.fillRect(tx + row.tw * 0.52, row.y + row.th * 0.1, row.tw * 0.18, row.th * 0.7);
            });
        });

    } else if (cam === 'pirate') {
        // ── CAM 1C: Pirate's Cove ───────────────────────────────────────
        var foxyStage = (animatronics && animatronics.foxy) ? Math.min(3, animatronics.foxy.pos) : 0;
        // Very dark background
        c.fillStyle = '#0a0818';
        c.fillRect(0, 0, w, h);
        // Stage floor (dark wooden planks)
        c.fillStyle = '#2a1c10';
        c.fillRect(0, h * 0.68, w, h * 0.32);
        for (var pl = 0; pl < 6; pl++) {
            c.strokeStyle = '#1a0e08';
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(0, h * (0.7 + pl * 0.05));
            c.lineTo(w, h * (0.7 + pl * 0.05));
            c.stroke();
        }
        // Stage platform / sign board
        c.fillStyle = '#3a1408';
        c.fillRect(w * 0.1, h * 0.62, w * 0.8, h * 0.08);
        c.fillStyle = '#cc8800';
        c.font = 'bold ' + Math.floor(h * 0.055) + 'px Arial';
        c.textAlign = 'center';
        c.fillText('\u2605 PIRATE COVE \u2605', w * 0.5, h * 0.68);

        // Draw star-patterned curtain helper
        function drawStarCurtain(cx, cy, cw, ch, depth) {
            var tone = depth ? '#600030' : '#8b0040';
            c.fillStyle = tone;
            c.fillRect(cx, cy, cw, ch);
            // Fold lines
            for (var cf = 1; cf < 5; cf++) {
                c.fillStyle = 'rgba(0,0,0,0.2)';
                c.fillRect(cx + cw * cf / 5 - 2, cy, 4, ch);
            }
            // Yellow star pattern
            c.fillStyle = '#ffcc00';
            var stRows = 4,
                stCols = Math.max(1, Math.floor(cw / (h * 0.1)));
            for (var sr = 0; sr < stRows; sr++) {
                for (var sc = 0; sc < stCols; sc++) {
                    var stx = cx + cw * (sc + 0.5) / stCols;
                    var sty = cy + ch * (sr + 0.5) / stRows;
                    var stR = h * 0.024;
                    c.beginPath();
                    for (var sp = 0; sp < 5; sp++) {
                        var ang = sp * Math.PI * 2 / 5 - Math.PI / 2;
                        var ang2 = ang + Math.PI / 5;
                        if (sp === 0) c.moveTo(stx + Math.cos(ang) * stR, sty + Math.sin(ang) * stR);
                        else c.lineTo(stx + Math.cos(ang) * stR, sty + Math.sin(ang) * stR);
                        c.lineTo(stx + Math.cos(ang2) * stR * 0.4, sty + Math.sin(ang2) * stR * 0.4);
                    }
                    c.closePath();
                    c.fill();
                }
            }
        }

        if (foxyStage === 3) {
            // Empty cove — curtains pulled to sides, dark empty stage
            drawStarCurtain(0, h * 0.08, w * 0.12, h * 0.6, true);
            drawStarCurtain(w * 0.88, h * 0.08, w * 0.12, h * 0.6, true);
            c.fillStyle = '#050408';
            c.fillRect(w * 0.12, h * 0.08, w * 0.76, h * 0.6);
            c.fillStyle = 'rgba(180,30,30,0.2)';
            c.font = 'bold ' + Math.floor(h * 0.1) + 'px Arial';
            c.fillText("IT'S ME", w * 0.5, h * 0.42);
        } else if (foxyStage === 2) {
            // Curtains wide open, Foxy fully visible
            drawStarCurtain(0, h * 0.08, w * 0.12, h * 0.6, false);
            drawStarCurtain(w * 0.88, h * 0.08, w * 0.12, h * 0.6, false);
            c.fillStyle = '#0d0818';
            c.fillRect(w * 0.12, h * 0.08, w * 0.76, h * 0.6);
            // Foxy (orange-red fox with hook, eye patch)
            var fh2 = h * 0.5;
            c.fillStyle = '#c43020';
            c.fillRect(w * 0.38, h * 0.3, w * 0.24, fh2 * 0.7);
            c.fillStyle = '#d84030';
            c.beginPath();
            c.arc(w * 0.5, h * 0.3, w * 0.13, 0, Math.PI * 2);
            c.fill();
            // Fox snout
            c.fillStyle = '#e06840';
            c.beginPath();
            c.ellipse(w * 0.5, h * 0.34, w * 0.06, h * 0.04, 0, 0, Math.PI * 2);
            c.fill();
            // Eye patch
            c.fillStyle = '#111';
            c.beginPath();
            c.arc(w * 0.44, h * 0.27, w * 0.042, 0, Math.PI * 2);
            c.fill();
            // Good eye
            c.fillStyle = '#fff';
            c.beginPath();
            c.arc(w * 0.56, h * 0.27, w * 0.032, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#00aaff';
            c.beginPath();
            c.arc(w * 0.56, h * 0.27, w * 0.016, 0, Math.PI * 2);
            c.fill();
            // Fox ears (triangular)
            c.fillStyle = '#d84030';
            c.beginPath();
            c.moveTo(w * 0.39, h * 0.19);
            c.lineTo(w * 0.43, h * 0.08);
            c.lineTo(w * 0.47, h * 0.19);
            c.fill();
            c.beginPath();
            c.moveTo(w * 0.53, h * 0.19);
            c.lineTo(w * 0.57, h * 0.08);
            c.lineTo(w * 0.61, h * 0.19);
            c.fill();
            // Hook arm
            c.strokeStyle = '#c0c4c8';
            c.lineWidth = 4;
            c.beginPath();
            c.moveTo(w * 0.62, h * 0.42);
            c.lineTo(w * 0.7, h * 0.52);
            c.arc(w * 0.7, h * 0.56, h * 0.04, -Math.PI / 2, Math.PI / 2);
            c.stroke();
        } else if (foxyStage === 1) {
            // Peeking — curtains mostly closed, Foxy peeks from gap
            drawStarCurtain(0, h * 0.08, w * 0.42, h * 0.6, false);
            drawStarCurtain(w * 0.58, h * 0.08, w * 0.42, h * 0.6, true);
            // Foxy peeking head in gap
            c.fillStyle = '#d84030';
            c.beginPath();
            c.arc(w * 0.5, h * 0.38, w * 0.1, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#111';
            c.beginPath();
            c.arc(w * 0.45, h * 0.36, w * 0.025, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#fff';
            c.beginPath();
            c.arc(w * 0.55, h * 0.36, w * 0.022, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#00aaff';
            c.beginPath();
            c.arc(w * 0.55, h * 0.36, w * 0.011, 0, Math.PI * 2);
            c.fill();
        } else {
            // Stage 0 — curtains fully closed + OUT OF ORDER sign
            drawStarCurtain(0, h * 0.08, w * 0.5, h * 0.6, false);
            drawStarCurtain(w * 0.5, h * 0.08, w * 0.5, h * 0.6, true);
            // Curtain overlap shadow in center
            c.fillStyle = 'rgba(0,0,0,0.4)';
            c.fillRect(w * 0.46, h * 0.08, w * 0.08, h * 0.6);
            // OUT OF ORDER sign
            c.fillStyle = 'rgba(0,0,0,0.65)';
            c.fillRect(w * 0.18, h * 0.37, w * 0.64, h * 0.13);
            c.strokeStyle = '#888';
            c.lineWidth = 1;
            c.strokeRect(w * 0.18, h * 0.37, w * 0.64, h * 0.13);
            c.fillStyle = '#ffcc00';
            c.font = 'bold ' + Math.floor(h * 0.065) + 'px Courier New';
            c.textAlign = 'center';
            c.fillText('SORRY! OUT OF ORDER', w * 0.5, h * 0.454);
        }
        // Ceiling light above cove
        ceilLight(w * 0.5, h * 0.05, h * 0.025);

    } else if (cam === 'stage_left') {
        // ── CAM 3: Supply Closet ────────────────────────────────────────
        c.fillStyle = '#1e1830';
        c.fillRect(0, 0, w, h);
        // Floor
        c.fillStyle = '#16121e';
        c.fillRect(0, h * 0.7, w, h * 0.3);
        // Ceiling
        c.fillStyle = '#0e0a18';
        c.fillRect(0, 0, w, h * 0.1);
        // Back wall slightly lighter
        c.fillStyle = '#2a2240';
        c.fillRect(w * 0.15, h * 0.1, w * 0.7, h * 0.6);
        // Wire metal shelves
        [h * 0.25, h * 0.42, h * 0.58].forEach(function(sy) {
            // Shelf board
            c.fillStyle = '#505060';
            c.fillRect(w * 0.15, sy, w * 0.7, h * 0.025);
            // Shelf supports
            c.fillStyle = '#404050';
            c.fillRect(w * 0.18, sy + h * 0.025, w * 0.015, h * 0.18);
            c.fillRect(w * 0.8, sy + h * 0.025, w * 0.015, h * 0.18);
            // Items on shelf
            c.fillStyle = '#604828';
            c.fillRect(w * 0.2, sy - h * 0.06, w * 0.1, h * 0.06);
            c.fillRect(w * 0.38, sy - h * 0.05, w * 0.08, h * 0.05);
            c.fillStyle = '#3a5030';
            c.fillRect(w * 0.55, sy - h * 0.07, w * 0.12, h * 0.07);
            c.fillStyle = '#5a4a38';
            c.fillRect(w * 0.72, sy - h * 0.045, w * 0.06, h * 0.045);
        });
        // Overhead bare bulb
        c.strokeStyle = '#505060';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(w * 0.5, 0);
        c.lineTo(w * 0.5, h * 0.1);
        c.stroke();
        ceilLight(w * 0.5, h * 0.12, h * 0.025);

    } else if (cam === 'stage_right') {
        // ── CAM 7: Restrooms ────────────────────────────────────────────
        // Dark hall leading to restrooms
        c.fillStyle = '#1e1830';
        c.fillRect(0, 0, w, h);
        // Ceiling
        c.fillStyle = '#0e0a18';
        c.fillRect(0, 0, w, h * 0.1);
        // Checker floor
        c.fillStyle = '#161224';
        c.fillRect(0, h * 0.65, w, h * 0.35);
        perspTileFloor(c, w * 0.3, w * 0.7, 0, w, h * 0.65, h, 4, 5);
        // Left wall
        c.fillStyle = '#2e2448';
        c.fillRect(0, h * 0.1, w * 0.28, h * 0.55);
        // Right wall
        c.fillStyle = '#2a2040';
        c.fillRect(w * 0.72, h * 0.1, w * 0.28, h * 0.55);
        // Far wall
        c.fillStyle = '#201830';
        c.fillRect(w * 0.28, h * 0.1, w * 0.44, h * 0.55);
        // Restroom doors in far wall
        [
            [w * 0.32, '#884422', 'LADIES'],
            [w * 0.56, '#224488', 'GENTS']
        ].forEach(function(dr) {
            c.fillStyle = dr[1];
            c.fillRect(dr[0], h * 0.18, w * 0.12, h * 0.38);
            c.strokeStyle = '#555';
            c.lineWidth = 2;
            c.strokeRect(dr[0], h * 0.18, w * 0.12, h * 0.38);
            c.fillStyle = '#ddd';
            c.font = Math.floor(h * 0.035) + 'px Arial';
            c.textAlign = 'center';
            c.fillText(dr[2], dr[0] + w * 0.06, h * 0.58);
            // Door knob
            c.fillStyle = '#cc9900';
            c.beginPath();
            c.arc(dr[0] + w * 0.02, h * 0.37, h * 0.012, 0, Math.PI * 2);
            c.fill();
        });
        ceilLight(w * 0.5, h * 0.08, h * 0.025);

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
        // ── CAM 5: Backstage / Parts & Service ──────────────────────────
        c.fillStyle = '#12100e';
        c.fillRect(0, 0, w, h);
        // Ceiling
        c.fillStyle = '#0a0808';
        c.fillRect(0, 0, w, h * 0.1);
        // Floor — very dark
        c.fillStyle = '#1a1610';
        c.fillRect(0, h * 0.68, w, h * 0.32);
        // Back wall — slightly visible
        c.fillStyle = '#1e1c18';
        c.fillRect(0, h * 0.1, w, h * 0.6);
        // "PARTS & SERVICE" label at top
        c.fillStyle = '#cc3333';
        c.font = 'bold ' + Math.floor(h * 0.06) + 'px Arial';
        c.textAlign = 'center';
        c.fillText('PARTS & SERVICE', w * 0.5, h * 0.065);
        // ── Main table in center ─────────────────────────────────────────
        c.fillStyle = '#2e2a24';
        c.fillRect(w * 0.2, h * 0.5, w * 0.6, h * 0.2);
        c.fillStyle = '#3a3428';
        c.fillRect(w * 0.2, h * 0.5, w * 0.6, h * 0.025);
        // ── Freddy head on table ─────────────────────────────────────────
        // Head
        c.fillStyle = '#8b5c28';
        c.beginPath();
        c.arc(w * 0.42, h * 0.45, h * 0.1, 0, Math.PI * 2);
        c.fill();
        // Ears
        c.beginPath();
        c.arc(w * 0.32, h * 0.38, h * 0.04, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(w * 0.52, h * 0.38, h * 0.04, 0, Math.PI * 2);
        c.fill();
        // Empty eye sockets (hollow, dark)
        c.fillStyle = '#050408';
        c.beginPath();
        c.arc(w * 0.37, h * 0.44, h * 0.035, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(w * 0.47, h * 0.44, h * 0.035, 0, Math.PI * 2);
        c.fill();
        // Endo eyes inside (glowing)
        c.fillStyle = '#302898';
        c.beginPath();
        c.arc(w * 0.37, h * 0.44, h * 0.018, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(w * 0.47, h * 0.44, h * 0.018, 0, Math.PI * 2);
        c.fill();
        // ── Endoskeleton sat to the right ───────────────────────────────
        // Body frame
        c.fillStyle = '#484440';
        c.fillRect(w * 0.64, h * 0.28, w * 0.14, h * 0.24);
        // Head
        c.fillStyle = '#545050';
        c.beginPath();
        c.arc(w * 0.71, h * 0.25, h * 0.08, 0, Math.PI * 2);
        c.fill();
        // Endo glowing eyes
        c.fillStyle = '#c8c4a0';
        c.beginPath();
        c.arc(w * 0.665, h * 0.24, h * 0.022, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(w * 0.755, h * 0.24, h * 0.022, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#302898';
        c.beginPath();
        c.arc(w * 0.665, h * 0.24, h * 0.012, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(w * 0.755, h * 0.24, h * 0.012, 0, Math.PI * 2);
        c.fill();
        // Arm/legs
        c.fillStyle = '#3a3630';
        c.fillRect(w * 0.62, h * 0.3, w * 0.04, h * 0.18);
        c.fillRect(w * 0.78, h * 0.3, w * 0.04, h * 0.18);
        // ── Spare parts on left ──────────────────────────────────────────
        // Bonnie head (purple blob on table)
        c.fillStyle = '#5c3494';
        c.beginPath();
        c.arc(w * 0.25, h * 0.47, h * 0.07, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#050408';
        c.beginPath();
        c.arc(w * 0.22, h * 0.46, h * 0.025, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(w * 0.28, h * 0.46, h * 0.025, 0, Math.PI * 2);
        c.fill();
        // Overhead light — single bare bulb
        c.strokeStyle = '#404040';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(w * 0.45, 0);
        c.lineTo(w * 0.45, h * 0.1);
        c.stroke();
        ceilLight(w * 0.45, h * 0.11, h * 0.022);

    } else if (cam === 'hallW') {
        // ── CAM 2A: West Hall ───────────────────────────────────────────
        // Dark purple-gray background / ceiling
        c.fillStyle = '#1e1630';
        c.fillRect(0, 0, w, h);
        // Ceiling band (very dark)
        c.fillStyle = '#100c1c';
        c.fillRect(0, 0, w, h * 0.1);
        // Left wall — dark purple
        c.fillStyle = '#3c2e58';
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(0, h);
        c.lineTo(w * 0.38, h * 0.5);
        c.lineTo(w * 0.38, 0);
        c.fill();
        // Right wall
        c.fillStyle = '#342848';
        c.beginPath();
        c.moveTo(w, 0);
        c.lineTo(w, h);
        c.lineTo(w * 0.62, h * 0.5);
        c.lineTo(w * 0.62, 0);
        c.fill();
        // Far end wall (near vanishing point)
        c.fillStyle = '#1a1228';
        c.fillRect(w * 0.38, 0, w * 0.24, h * 0.5);
        // Floor — B&W checker
        c.fillStyle = '#1a1228';
        c.beginPath();
        c.moveTo(0, h);
        c.lineTo(w, h);
        c.lineTo(w * 0.62, h * 0.5);
        c.lineTo(w * 0.38, h * 0.5);
        c.fill();
        perspTileFloor(c, w * 0.38, w * 0.62, 0, w, h * 0.5, h, 6, 7);
        // Wainscoting (lighter band low on left/right walls)
        wainscot(0, h * 0.74, w * 0.38, h * 0.1);
        wainscot(w * 0.62, h * 0.74, w * 0.38, h * 0.1);
        // Vanishing-point warm glow
        var hallGlow = c.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, h * 0.25);
        hallGlow.addColorStop(0, 'rgba(220,190,100,0.18)');
        hallGlow.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = hallGlow;
        c.fillRect(0, 0, w, h);
        // Overhead ceiling disc light (prominent, near camera)
        ceilLight(w * 0.5, h * 0.08, h * 0.038);
        // "IT'S ME" distorted poster on LEFT wall
        c.fillStyle = '#1a1020';
        c.fillRect(w * 0.04, h * 0.17, w * 0.16, h * 0.25);
        c.strokeStyle = '#604868';
        c.lineWidth = 2;
        c.strokeRect(w * 0.04, h * 0.17, w * 0.16, h * 0.25);
        // Distorted face inside poster
        c.fillStyle = '#8b3010';
        c.font = 'bold ' + Math.floor(h * 0.07) + 'px Arial';
        c.textAlign = 'center';
        c.save();
        c.translate(w * 0.12, h * 0.31);
        c.rotate(-0.06);
        c.fillText("IT'S", 0, -h * 0.04);
        c.fillText('ME', 0, h * 0.04);
        c.restore();
        // Baseboard lines
        c.strokeStyle = '#2a1e3a';
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
        // ── CAM 4A: East Hall ───────────────────────────────────────────
        // Dark purple-gray, slightly warmer than west
        c.fillStyle = '#201830';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#120e1c';
        c.fillRect(0, 0, w, h * 0.1);
        // Left wall
        c.fillStyle = '#3e3060';
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(0, h);
        c.lineTo(w * 0.39, h * 0.5);
        c.lineTo(w * 0.39, 0);
        c.fill();
        // Right wall
        c.fillStyle = '#382a50';
        c.beginPath();
        c.moveTo(w, 0);
        c.lineTo(w, h);
        c.lineTo(w * 0.61, h * 0.5);
        c.lineTo(w * 0.61, 0);
        c.fill();
        // Far wall
        c.fillStyle = '#1c1430';
        c.fillRect(w * 0.39, 0, w * 0.22, h * 0.5);
        // Floor checker
        c.fillStyle = '#1c1430';
        c.beginPath();
        c.moveTo(0, h);
        c.lineTo(w, h);
        c.lineTo(w * 0.61, h * 0.5);
        c.lineTo(w * 0.39, h * 0.5);
        c.fill();
        perspTileFloor(c, w * 0.39, w * 0.61, 0, w, h * 0.5, h, 6, 7);
        // Wainscoting
        wainscot(0, h * 0.74, w * 0.39, h * 0.1);
        wainscot(w * 0.61, h * 0.74, w * 0.39, h * 0.1);
        // Warm glow at vanishing point
        var hallGlowE = c.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, h * 0.25);
        hallGlowE.addColorStop(0, 'rgba(210,180,90,0.16)');
        hallGlowE.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = hallGlowE;
        c.fillRect(0, 0, w, h);
        // Ceiling light
        ceilLight(w * 0.5, h * 0.08, h * 0.038);
        // Birthday child drawing on right wall — "IT'S ME" variant
        c.fillStyle = '#1a1028';
        c.fillRect(w * 0.8, h * 0.15, w * 0.15, h * 0.28);
        c.strokeStyle = '#584868';
        c.lineWidth = 2;
        c.strokeRect(w * 0.8, h * 0.15, w * 0.15, h * 0.28);
        // Crayon-style face drawing
        c.strokeStyle = '#aa4010';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(w * 0.875, h * 0.24, h * 0.065, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.arc(w * 0.855, h * 0.235, h * 0.015, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.arc(w * 0.895, h * 0.235, h * 0.015, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.arc(w * 0.875, h * 0.26, h * 0.025, Math.PI * 0.1, Math.PI * 0.9);
        c.stroke();
        c.fillStyle = '#cc3300';
        c.font = Math.floor(h * 0.038) + 'px Arial';
        c.textAlign = 'center';
        c.fillText("IT'S ME", w * 0.875, h * 0.415);
        // Baseboards
        c.strokeStyle = '#2a1e3c';
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
        // ── CAM 2B: West Hall Corner ────────────────────────────────────
        // BG
        c.fillStyle = '#1c1630';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#100c1c';
        c.fillRect(0, 0, w, h * 0.1);
        // ── LEFT HALF: hallway continues to the left ─────────────────────
        // Left hall ceiling/wall (looking left, foreshortened)
        c.fillStyle = '#3a2c54';
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(w * 0.46, 0);
        c.lineTo(w * 0.46, h * 0.46);
        c.lineTo(0, h * 0.54);
        c.fill();
        // Left hall floor - checker
        c.fillStyle = '#161024';
        c.beginPath();
        c.moveTo(0, h);
        c.lineTo(w * 0.46, h);
        c.lineTo(w * 0.46, h * 0.54);
        c.lineTo(0, h * 0.62);
        c.fill();
        perspTileFloor(c, 0, w * 0.46, 0, w * 0.46, h * 0.58, h, 4, 4);
        // Wainscoting on left-hall wall
        wainscot(0, h * 0.44, w * 0.46, h * 0.09);
        // Glow down the hall to the left
        var lwGlow = c.createRadialGradient(0, h * 0.5, 0, 0, h * 0.5, w * 0.44);
        lwGlow.addColorStop(0, 'rgba(200,170,70,0.12)');
        lwGlow.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = lwGlow;
        c.fillRect(0, 0, w * 0.46, h);
        // ── RIGHT HALF: the left office door ────────────────────────────
        c.fillStyle = '#302448';
        c.fillRect(w * 0.46, 0, w * 0.54, h);
        // Door (metal industrial, inset in right wall)
        // Frame
        c.fillStyle = '#1e1830';
        c.fillRect(w * 0.57, h * 0.04, w * 0.38, h * 0.85);
        // Door panel — depends on door state (default open = dark gap)
        var lDoor = (typeof game !== 'undefined' && game.doorLeft);
        c.fillStyle = lDoor ? '#484840' : '#0c0818';
        c.fillRect(w * 0.61, h * 0.08, w * 0.3, h * 0.76);
        // Door frame edges (metal trim)
        c.strokeStyle = '#505854';
        c.lineWidth = 3;
        c.strokeRect(w * 0.61, h * 0.08, w * 0.3, h * 0.76);
        // Rivets on door frame
        c.fillStyle = '#4a4c48';
        [
            [w * 0.63, h * 0.12],
            [w * 0.63, h * 0.78],
            [w * 0.88, h * 0.12],
            [w * 0.88, h * 0.78]
        ].forEach(function(rv) {
            c.beginPath();
            c.arc(rv[0], rv[1], h * 0.012, 0, Math.PI * 2);
            c.fill();
        });
        if (lDoor) {
            // Closed door warning stripe
            c.fillStyle = 'rgba(255,220,0,0.15)';
            for (var ds = 0; ds < 6; ds++) {
                c.fillRect(w * 0.61, h * (0.08 + ds * 0.13), w * 0.3, h * 0.065);
            }
        }
        // Corner wall divider pillar
        c.fillStyle = '#181228';
        c.fillRect(w * 0.44, 0, w * 0.04, h);
        // Door-side floor — checker
        c.fillStyle = '#1a1228';
        c.fillRect(w * 0.46, h * 0.78, w * 0.54, h * 0.22);
        perspTileFloor(c, w * 0.46, w, w * 0.46, w, h * 0.78, h, 3, 5);
        // Ceiling disc light above left-hall side
        ceilLight(w * 0.22, h * 0.08, h * 0.032);

    } else if (cam === 'hallE_corner') {
        // ── CAM 4B: East Hall Corner ────────────────────────────────────
        // BG
        c.fillStyle = '#1e1834';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#120e20';
        c.fillRect(0, 0, w, h * 0.1);
        // ── LEFT HALF: the right office door ────────────────────────────
        c.fillStyle = '#322650';
        c.fillRect(0, 0, w * 0.54, h);
        // Door frame
        c.fillStyle = '#201a34';
        c.fillRect(w * 0.05, h * 0.04, w * 0.38, h * 0.85);
        // Door panel
        var rDoor = (typeof game !== 'undefined' && game.doorRight);
        c.fillStyle = rDoor ? '#484840' : '#0e0c1e';
        c.fillRect(w * 0.09, h * 0.08, w * 0.3, h * 0.76);
        // Metal trim
        c.strokeStyle = '#505854';
        c.lineWidth = 3;
        c.strokeRect(w * 0.09, h * 0.08, w * 0.3, h * 0.76);
        // Rivets
        c.fillStyle = '#4a4c48';
        [
            [w * 0.11, h * 0.12],
            [w * 0.11, h * 0.78],
            [w * 0.36, h * 0.12],
            [w * 0.36, h * 0.78]
        ].forEach(function(rv) {
            c.beginPath();
            c.arc(rv[0], rv[1], h * 0.012, 0, Math.PI * 2);
            c.fill();
        });
        if (rDoor) {
            c.fillStyle = 'rgba(255,220,0,0.15)';
            for (var ds2 = 0; ds2 < 6; ds2++) {
                c.fillRect(w * 0.09, h * (0.08 + ds2 * 0.13), w * 0.3, h * 0.065);
            }
        }
        // Door-side floor
        c.fillStyle = '#1c1430';
        c.fillRect(0, h * 0.78, w * 0.54, h * 0.22);
        perspTileFloor(c, 0, w * 0.54, 0, w * 0.54, h * 0.78, h, 3, 5);
        // Corner pillar divider
        c.fillStyle = '#160e28';
        c.fillRect(w * 0.52, 0, w * 0.04, h);
        // ── RIGHT HALF: hallway going to the right ───────────────────────
        c.fillStyle = '#3c2e58';
        c.beginPath();
        c.moveTo(w * 0.56, 0);
        c.lineTo(w, 0);
        c.lineTo(w, h * 0.54);
        c.lineTo(w * 0.56, h * 0.46);
        c.fill();
        // Right hall floor
        c.fillStyle = '#18122a';
        c.beginPath();
        c.moveTo(w * 0.56, h);
        c.lineTo(w, h);
        c.lineTo(w, h * 0.62);
        c.lineTo(w * 0.56, h * 0.54);
        c.fill();
        perspTileFloor(c, w * 0.56, w, w * 0.56, w, h * 0.58, h, 4, 4);
        // Wainscoting on right-hall wall
        wainscot(w * 0.56, h * 0.44, w * 0.44, h * 0.09);
        // Glow to the right
        var reGlow = c.createRadialGradient(w, h * 0.5, 0, w, h * 0.5, w * 0.42);
        reGlow.addColorStop(0, 'rgba(200,170,70,0.12)');
        reGlow.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = reGlow;
        c.fillRect(w * 0.56, 0, w * 0.44, h);
        // Ceiling disc light above right-hall side
        ceilLight(w * 0.78, h * 0.08, h * 0.032);

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
        // Stop the camera static audio immediately when monitor closes
        var camSfxStop = document.getElementById('camStaticAudio');
        if (camSfxStop && !camSfxStop.paused) {
            camSfxStop.pause();
            camSfxStop.currentTime = 0;
        }
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