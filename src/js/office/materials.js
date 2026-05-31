/**
 * materials.js — Material definitions for 3D office
 */
import * as THREE from 'three';

/**
 * Creates procedural door texture (canvas-based steel blast door with panels + rivets)
 */
function createDoorTexture() {
    var W = 256, H = 512;
    var dc = document.createElement('canvas');
    dc.width = W;
    dc.height = H;
    var c = dc.getContext('2d');
    var bn = document.createElement('canvas');
    bn.width = W;
    bn.height = H;
    var b = bn.getContext('2d');
    b.fillStyle = '#808080';
    b.fillRect(0, 0, W, H);
    c.fillStyle = '#3c3c3c';
    c.fillRect(0, 0, W, H);
    for (var gx = 0; gx < W; gx += 2) {
        for (var gy = 0; gy < H; gy += 2) {
            var n = (Math.sin(gx * 13.7 + gy * 5.3) * Math.cos(gx * 3.1 - gy * 9.7) + 1) * 0.5;
            var d = Math.floor(50 + n * 18);
            c.fillStyle = 'rgb(' + d + ',' + d + ',' + d + ')';
            c.fillRect(gx, gy, 2, 2);
        }
    }
    var HAZARD_H = 48, BORDER = 9, RIDGE_H = 11, PANEL_N = 4;
    var usableH = H - HAZARD_H, innerH = usableH - BORDER * 2;
    var panelH = (innerH - (PANEL_N - 1) * RIDGE_H) / PANEL_N;
    c.fillStyle = '#242424';
    c.fillRect(0, 0, W, BORDER);
    c.fillRect(0, usableH - BORDER, W, BORDER);
    c.fillRect(0, 0, BORDER, usableH);
    c.fillRect(W - BORDER, 0, BORDER, usableH);
    c.fillStyle = '#4e4e4e';
    c.fillRect(BORDER, BORDER, W - BORDER * 2, 1);
    c.fillRect(BORDER, BORDER, 1, usableH - BORDER * 2);
    b.fillStyle = '#d4d4d4';
    b.fillRect(0, 0, W, BORDER);
    b.fillRect(0, usableH - BORDER, W, BORDER);
    b.fillRect(0, 0, BORDER, usableH);
    b.fillRect(W - BORDER, 0, BORDER, usableH);
    for (var p = 0; p < PANEL_N; p++) {
        var pTop = BORDER + p * (panelH + RIDGE_H), pw = W - BORDER * 2, pm = 8;
        c.fillStyle = 'rgba(0,0,0,0.20)';
        c.fillRect(BORDER + pm, pTop + pm, pw - pm * 2, panelH - pm * 2);
        c.fillStyle = 'rgba(255,255,255,0.11)';
        c.fillRect(BORDER + pm, pTop + pm, pw - pm * 2, 2);
        c.fillRect(BORDER + pm, pTop + pm, 2, panelH - pm * 2);
        c.fillStyle = 'rgba(0,0,0,0.18)';
        c.fillRect(BORDER + pm, pTop + panelH - pm - 2, pw - pm * 2, 2);
        c.fillRect(BORDER + pw - pm - 2, pTop + pm, 2, panelH - pm * 2);
        b.fillStyle = '#5c5c5c';
        b.fillRect(BORDER + pm, pTop + pm, pw - pm * 2, panelH - pm * 2);
        b.fillStyle = '#a4a4a4';
        b.fillRect(BORDER + pm, pTop + pm, pw - pm * 2, 2);
        b.fillRect(BORDER + pm, pTop + pm, 2, panelH - pm * 2);
        if (p < PANEL_N - 1) {
            var rY = pTop + panelH;
            c.fillStyle = '#303030';
            c.fillRect(BORDER, rY, pw, RIDGE_H);
            c.fillStyle = '#525252';
            c.fillRect(BORDER, rY, pw, 2);
            c.fillStyle = '#1c1c1c';
            c.fillRect(BORDER, rY + Math.floor(RIDGE_H / 2) - 1, pw, 2);
            b.fillStyle = '#c4c4c4';
            b.fillRect(BORDER, rY, pw, RIDGE_H);
            b.fillStyle = '#e8e8e8';
            b.fillRect(BORDER, rY, pw, 2);
            b.fillStyle = '#3c3c3c';
            b.fillRect(BORDER, rY + Math.floor(RIDGE_H / 2) - 1, pw, 2);
        }
    }
    var rivetX = [BORDER + 7, Math.floor(W / 2) - 14, Math.floor(W / 2) + 8, W - BORDER - 11];
    var rivetY = [BORDER + 7];
    for (var ri = 0; ri < PANEL_N - 1; ri++) {
        rivetY.push(BORDER + (ri + 1) * (panelH + RIDGE_H) - Math.floor(RIDGE_H / 2));
    }
    rivetY.push(usableH - BORDER - 7);
    rivetX.forEach(function(rx) {
        rivetY.forEach(function(ry) {
            var r = 5;
            c.fillStyle = 'rgba(0,0,0,0.58)';
            c.beginPath();
            c.arc(rx + 1, ry + 1, r + 1, 0, Math.PI * 2);
            c.fill();
            var gr = c.createRadialGradient(rx - 1.5, ry - 2, 0.5, rx, ry, r);
            gr.addColorStop(0, '#747474');
            gr.addColorStop(0.5, '#484848');
            gr.addColorStop(1, '#222222');
            c.fillStyle = gr;
            c.beginPath();
            c.arc(rx, ry, r, 0, Math.PI * 2);
            c.fill();
            var hi = c.createRadialGradient(rx - 2, ry - 2.5, 0, rx - 1, ry - 1, r * 0.65);
            hi.addColorStop(0, 'rgba(255,255,255,0.58)');
            hi.addColorStop(1, 'rgba(255,255,255,0)');
            c.fillStyle = hi;
            c.beginPath();
            c.arc(rx, ry, r, 0, Math.PI * 2);
            c.fill();
            var br = b.createRadialGradient(rx, ry, 0, rx, ry, r + 2);
            br.addColorStop(0, '#ffffff');
            br.addColorStop(0.4, '#d4d4d4');
            br.addColorStop(1, '#686868');
            b.fillStyle = br;
            b.beginPath();
            b.arc(rx, ry, r + 2, 0, Math.PI * 2);
            b.fill();
        });
    });
    c.save();
    c.globalAlpha = 0.16;
    [[36, 58, 70, 84, 1.5], [172, 103, 209, 120, 1], [58, 294, 94, 338, 1], [148, 198, 174, 228, 1.5], [200, 392, 231, 414, 1], [115, 150, 138, 178, 1]].forEach(function(s) {
        c.strokeStyle = '#909090';
        c.lineWidth = s[4];
        c.beginPath();
        c.moveTo(s[0], s[1]);
        c.lineTo(s[2], s[3]);
        c.stroke();
    });
    c.restore();
    var hY = H - HAZARD_H;
    c.save();
    c.beginPath();
    c.rect(0, hY, W, HAZARD_H);
    c.clip();
    c.fillStyle = '#111111';
    c.fillRect(0, hY, W, HAZARD_H);
    var bW = 26;
    for (var sx = -(HAZARD_H + bW); sx < W + HAZARD_H + bW; sx += bW * 2) {
        c.fillStyle = '#c8a400';
        c.beginPath();
        c.moveTo(sx, hY);
        c.lineTo(sx + bW, hY);
        c.lineTo(sx + bW + HAZARD_H, hY + HAZARD_H);
        c.lineTo(sx + HAZARD_H, hY + HAZARD_H);
        c.closePath();
        c.fill();
    }
    c.fillStyle = '#1a1a1a';
    c.fillRect(0, hY, W, 3);
    c.restore();
    b.fillStyle = '#808080';
    b.fillRect(0, hY, W, HAZARD_H);
    var vL = c.createLinearGradient(0, 0, BORDER * 2.5, 0);
    vL.addColorStop(0, 'rgba(0,0,0,0.30)');
    vL.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = vL;
    c.fillRect(0, 0, BORDER * 2.5, H);
    var vR = c.createLinearGradient(W, 0, W - BORDER * 2.5, 0);
    vR.addColorStop(0, 'rgba(0,0,0,0.30)');
    vR.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = vR;
    c.fillRect(W - BORDER * 2.5, 0, BORDER * 2.5, H);
    return { map: dc, bumpMap: bn };
}

export function buildMaterials() {
    var doorTex = createDoorTexture();
    var diffMap = new THREE.CanvasTexture(doorTex.map);
    var bumpMap = new THREE.CanvasTexture(doorTex.bumpMap);
    diffMap.wrapS = diffMap.wrapT = THREE.ClampToEdgeWrapping;
    bumpMap.wrapS = bumpMap.wrapT = THREE.ClampToEdgeWrapping;
    var doorMat = new THREE.MeshStandardMaterial({
        map: diffMap,
        bumpMap: bumpMap,
        bumpScale: 0.55,
        roughness: 0.62,
        metalness: 0.52,
        envMapIntensity: 0.0
    });
    return {
        MAT_DOOR_OPEN: doorMat,
        MAT_DOOR_CLOSED: doorMat,
        MAT_HALL_DARK: new THREE.MeshBasicMaterial({ color: 0x000000 }),
        MAT_HALL_WALL: new THREE.MeshBasicMaterial({ color: 0xffe8c0 }),
        MAT_HALL_FLOOR: new THREE.MeshBasicMaterial({ color: 0x504030 }),
        MAT_HALL_CEIL: new THREE.MeshBasicMaterial({ color: 0xf8f0e0 })
    };
}
