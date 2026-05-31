/**
 * office3d.js - Three.js 3D office for FNAF
 * ES Module — imports Three.js via importmap.
 * 
 * Public API exposed as window.office3d:
 * @typedef {Object} Office3D
 * @property {function} init - Initialize Three.js scene and renderer
 * @property {function(boolean)} setDoorLeft - Close/open left hall door
 * @property {function(boolean)} setDoorRight - Close/open right hall door
 * @property {function(number)} setMouse - Update camera head rotation (0..1 → normalized X position)
 * @property {function(boolean)} setLightLeft - Toggle left hall light visibility
 * @property {function(boolean)} setLightRight - Toggle right hall light visibility
 * @property {function(string|null)} setHallLeft - Set left hall animatronic silhouette or null to clear
 * @property {function(string|null)} setHallRight - Set right hall animatronic silhouette or null to clear
 * @property {function():number} getRotation - Get current camera Y rotation in radians
 * @property {function} show - Make office visible
 * @property {function} hide - Hide office
 * @property {function} resize - Recalculate canvas/viewport on window resize
 *
 * Room layout (units):
 *   Width  X: -11 to +11  (22 wide)
 *   Height Y:   0 to +11  (11 tall)
 *   Depth  Z:  -9 to  +9  (18 deep)
 *   Camera: (0, 4, 7.5) looking toward z=-9 (back wall)
 *
 * Lighting: AmbientLight 0.38 + DirectionalLights (no shadows for performance)
 * Fog: THREE.Fog linear 18-32 (gentle, does not kill the back wall)
 */
import * as THREE from 'three';
import { buildMaterials } from './office/materials.js';
import { buildScene, MAX_ROT } from './office/scene.js';
import { buildRoom } from './office/room.js';
import { buildDoors, tickDoors, setDoor, DOOR_SPRING_K, DOOR_DAMPING, DOOR_OPEN_Y, DOOR_CLOSED_Y } from './office/doors.js';
import { buildHallLights, setHallLight } from './office/hall-lights.js';
import { buildHallSilhouettes, setHallAnimatronic } from './office/hall-animatronics.js';
import { buildButtonHitboxes, setupInteraction } from './office/interaction.js';

(function() {
    'use strict';
    
    var scene, camera, renderer, animId;
    var doors, hallLights, hallSilhouettes, hitboxes, fan;
    var hallDecorLeft = [], hallDecorRight = [];
    var hallApertureLeft, hallApertureRight;
    var wallBtns = {};
    var wallBtnPanels = { left: null, right: null };
    var mouseNorm = 0.5;
    var currentRotY = 0;
    var ROT_LERP = 0.08;
    
    window.office3d = {
        init: init,
        setDoorLeft: setDoorLeft,
        setDoorRight: setDoorRight,
        setLightLeft: setLightLeft,
        setLightRight: setLightRight,
        setHallLeft: setHallLeft,
        setHallRight: setHallRight,
        setAnimatronicPosition: setAnimatronicPosition,
        setMouse: setMouse,
        getRotation: function() { return currentRotY; },
        show: show,
        hide: hide,
        resize: onResize
    };
    
    function init() {
        var container = document.getElementById('officeScene');
        if (!container) { console.warn('[office3d] #officeScene not found'); return; }
        if (!THREE) { console.warn('[office3d] Three.js import failed'); return; }
        
        if (animId) {
            cancelAnimationFrame(animId);
            animId = null;
        }
        if (renderer) {
            if (typeof renderer.dispose === 'function') renderer.dispose();
            if (typeof renderer.forceContextLoss === 'function') renderer.forceContextLoss();
            renderer = null;
        }
        container.innerHTML = '';
        
        var w = container.clientWidth || window.innerWidth;
        var h = container.clientHeight || window.innerHeight;
        
        if (w < 10 || h < 10) {
            console.warn('[office3d] container too small (' + w + 'x' + h + '), retrying in 50ms');
            setTimeout(init, 50);
            return;
        }
        
        var built = buildScene(container);
        scene = built.scene;
        camera = built.camera;
        renderer = built.renderer;
        
        container.appendChild(renderer.domElement);
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.zIndex = '0';
        
        var materials = buildMaterials();
        var roomParts = buildRoom(scene, materials);
        fan = roomParts.fan;
        
        buildLighting();
        buildApertureCovers();
        buildDecorations();
        buildHallDecor();
        buildWallButtons();
        
        doors = buildDoors(scene, materials);
        hallLights = buildHallLights(scene);
        hallSilhouettes = buildHallSilhouettes(scene);
        hitboxes = buildButtonHitboxes(scene);
        
        setupInteraction(renderer, camera, hitboxes, function(btnId) {
            if (btnId === 'doorLeft' && window.toggleDoor) window.toggleDoor('left');
            else if (btnId === 'doorRight' && window.toggleDoor) window.toggleDoor('right');
            else if (btnId === 'lightLeft' && window.toggleLight) window.toggleLight('left');
            else if (btnId === 'lightRight' && window.toggleLight) window.toggleLight('right');
        });
        
        window.removeEventListener('resize', onResize);
        window.addEventListener('resize', onResize);
        animate();
        console.log('[office3d] initialized ' + w + 'x' + h + ' | bg=' + scene.background.getHexString());
        renderer.render(scene, camera);
        console.log('[office3d] test render done — canvas size: ' + renderer.domElement.width + 'x' + renderer.domElement.height);
    }
    
    function buildApertureCovers() {
        // Black plane at each door aperture (corridor side).
        // Visible = dark corridor; Hidden = lit corridor visible through the door gap.
        var dW = 4,
            dH = 8,
            HW = 11;
        var geo = new THREE.PlaneGeometry(dW + 0.4, dH + 0.4);
        var darkMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

        hallApertureLeft = new THREE.Mesh(geo, darkMat);
        hallApertureLeft.rotation.y = Math.PI / 2; // normal points +X — visible from room interior looking left
        hallApertureLeft.position.set(-(HW + 0.1), dH / 2, 0);
        scene.add(hallApertureLeft);

        hallApertureRight = new THREE.Mesh(geo, darkMat);
        hallApertureRight.rotation.y = -Math.PI / 2; // normal points -X — visible from room interior looking right
        hallApertureRight.position.set(HW + 0.1, dH / 2, 0);
        scene.add(hallApertureRight);
    }


    function _roundRect(ctx, x, y, w, h, r) {
        var rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.lineTo(x + w - rr, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
        ctx.lineTo(x + w, y + h - rr);
        ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
        ctx.lineTo(x + rr, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
        ctx.lineTo(x, y + rr);
        ctx.quadraticCurveTo(x, y, x + rr, y);
        ctx.closePath();
    }


    function _refreshBtnPanel(side) {
        var panel = wallBtnPanels[side];
        if (!panel) return;

        var doorId = side === 'left' ? 'doorLeft' : 'doorRight';
        var lightId = side === 'left' ? 'lightLeft' : 'lightRight';
        var doorOn = !!(wallBtns[doorId] && wallBtns[doorId].active);
        var lightOn = !!(wallBtns[lightId] && wallBtns[lightId].active);

        var ctx = panel.ctx,
            W = panel.canvas.width,
            H = panel.canvas.height;
        ctx.clearRect(0, 0, W, H);

        // Holder shadow
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        _roundRect(ctx, 8, 10, W - 16, H - 20, 16);
        ctx.fill();

        // Main black glossy holder
        var gMain = ctx.createLinearGradient(0, 0, 0, H);
        gMain.addColorStop(0, '#1a1a1a');
        gMain.addColorStop(0.2, '#0f0f0f');
        gMain.addColorStop(0.5, '#050505');
        gMain.addColorStop(0.8, '#0a0a0a');
        gMain.addColorStop(1, '#020202');
        ctx.fillStyle = gMain;
        _roundRect(ctx, 12, 14, W - 24, H - 28, 14);
        ctx.fill();

        // Metallic left edge highlight
        var edgeLight = ctx.createLinearGradient(12, 14, 18, 14);
        edgeLight.addColorStop(0, 'rgba(255,255,255,0.18)');
        edgeLight.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = edgeLight;
        ctx.fillRect(12, 14, 6, H - 28);

        // Metallic right edge shadow
        var edgeShadow = ctx.createLinearGradient(W - 18, 14, W - 12, 14);
        edgeShadow.addColorStop(0, 'rgba(0,0,0,0)');
        edgeShadow.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = edgeShadow;
        ctx.fillRect(W - 18, 14, 6, H - 28);

        // Inner recess - full height, no bottom padding
        ctx.fillStyle = '#020202';
        _roundRect(ctx, 24, 30, W - 48, H - 44, 10);
        ctx.fill();

        // Inner recess top edge
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(24, 30, W - 48, 1);

        // Holder edge lighting - top
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(24, 30, 4, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(28, 30, W - 52, 2);

        // Holder edge lighting - left side
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.fillRect(24, 30, 2, H - 44);

        // Holder edge shadow - right side
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(W - 26, 30, 2, H - 44);

        // BUTTON LAYOUT: Maximize button size, minimal gaps
        var btnSize = Math.round((W - 48) * 0.95);  // 95% of inner width
        var bx = Math.round((W - btnSize) / 2);      // Center
        var gapBetweenButtons = 14;                  // Gap for text labels (in 3D)
        var doorY = 30;                              // Start at top
        var lightY = doorY + btnSize + gapBetweenButtons; // Door + gap + light

        function drawSquareButton(y, on, isDoor) {
            var cornerRadius = 6;
            
            // Main button gradient (more subtle colors for a less flat appearance)
            var bg = ctx.createLinearGradient(0, y, 0, y + btnSize);
            if (isDoor) {
                // Red button gradient with more depth
                bg.addColorStop(0, on ? '#ff5555' : '#c02020');
                bg.addColorStop(0.35, on ? '#dd2020' : '#a01010');
                bg.addColorStop(0.65, on ? '#b01010' : '#801010');
                bg.addColorStop(1, on ? '#8a0a0a' : '#550505');
            } else {
                // White/cream button with subtle warmth
                bg.addColorStop(0, on ? '#fffcf0' : '#f5f5f5');
                bg.addColorStop(0.35, on ? '#f5efd5' : '#e8e8e8');
                bg.addColorStop(0.65, on ? '#e5d9b5' : '#d5d5d5');
                bg.addColorStop(1, on ? '#c8b896' : '#a0a0a0');
            }

            // Draw button body with rounded corners
            ctx.fillStyle = bg;
            _roundRect(ctx, bx, y, btnSize, btnSize, cornerRadius);
            ctx.fill();

            // Button depth shadow (bottom/right side)
            var shadowGrad = ctx.createLinearGradient(0, y + btnSize * 0.5, 0, y + btnSize);
            shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
            shadowGrad.addColorStop(1, on ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.45)');
            ctx.fillStyle = shadowGrad;
            _roundRect(ctx, bx, y, btnSize, btnSize, cornerRadius);
            ctx.fill();

            // Right side shadow for 3D depth
            var rightShadow = ctx.createLinearGradient(bx + btnSize * 0.6, y, bx + btnSize, y);
            rightShadow.addColorStop(0, 'rgba(0,0,0,0)');
            rightShadow.addColorStop(1, on ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.35)');
            ctx.fillStyle = rightShadow;
            _roundRect(ctx, bx, y, btnSize, btnSize, cornerRadius);
            ctx.fill();

            // Top highlight for glossy appearance
            var highlightGrad = ctx.createLinearGradient(0, y, 0, y + btnSize * 0.4);
            if (isDoor) {
                highlightGrad.addColorStop(0, on ? 'rgba(255,200,200,0.4)' : 'rgba(255,100,100,0.2)');
                highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
            } else {
                highlightGrad.addColorStop(0, on ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.35)');
                highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
            }
            ctx.fillStyle = highlightGrad;
            _roundRect(ctx, bx + 2, y + 2, btnSize - 4, btnSize * 0.35, cornerRadius - 1);
            ctx.fill();

            // Center shine reflection (glossy plastic effect)
            var shineRadial = ctx.createRadialGradient(
                bx + btnSize * 0.5,
                y + btnSize * 0.35,
                0,
                bx + btnSize * 0.5,
                y + btnSize * 0.35,
                btnSize * 0.25
            );
            if (isDoor) {
                shineRadial.addColorStop(0, on ? 'rgba(255,220,220,0.35)' : 'rgba(255,150,150,0.15)');
                shineRadial.addColorStop(1, 'rgba(255,255,255,0)');
            } else {
                shineRadial.addColorStop(0, on ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.25)');
                shineRadial.addColorStop(1, 'rgba(255,255,255,0)');
            }
            ctx.fillStyle = shineRadial;
            ctx.fillRect(bx, y, btnSize, btnSize);

            // Bottom inset shadow for depth when not pressed
            if (!on) {
                var insetShadow = ctx.createLinearGradient(0, y + btnSize * 0.6, 0, y + btnSize);
                insetShadow.addColorStop(0, 'rgba(0,0,0,0)');
                insetShadow.addColorStop(0.7, 'rgba(0,0,0,0.2)');
                insetShadow.addColorStop(1, 'rgba(0,0,0,0.4)');
                ctx.fillStyle = insetShadow;
                _roundRect(ctx, bx + 3, y + 3, btnSize - 6, btnSize - 6, cornerRadius - 2);
                ctx.fill();
            }

            // Border with bevel effect
            // Outer border (dark)
            ctx.strokeStyle = '#0a0a0a';
            ctx.lineWidth = 3;
            _roundRect(ctx, bx - 1.5, y - 1.5, btnSize + 3, btnSize + 3, cornerRadius + 1);
            ctx.stroke();

            // Inner highlight bevel (top/left)
            ctx.strokeStyle = on ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.25)';
            ctx.lineWidth = 2;
            _roundRect(ctx, bx + 1, y + 1, btnSize - 2, btnSize - 2, cornerRadius - 1);
            ctx.stroke();

            // Active glow with enhanced effect
            if (on) {
                // Soft outer glow
                var glowOuter = ctx.createRadialGradient(
                    bx + btnSize / 2,
                    y + btnSize / 2,
                    btnSize * 0.3,
                    bx + btnSize / 2,
                    y + btnSize / 2,
                    btnSize * 1.1
                );
                if (isDoor) {
                    glowOuter.addColorStop(0, 'rgba(255,80,80,0.15)');
                    glowOuter.addColorStop(1, 'rgba(255,80,80,0)');
                } else {
                    glowOuter.addColorStop(0, 'rgba(255,245,185,0.15)');
                    glowOuter.addColorStop(1, 'rgba(255,245,185,0)');
                }
                ctx.fillStyle = glowOuter;
                ctx.fillRect(bx - btnSize * 0.2, y - btnSize * 0.2, btnSize * 1.4, btnSize * 1.4);

                // Brighter inner glow
                var glowInner = ctx.createRadialGradient(
                    bx + btnSize / 2,
                    y + btnSize / 2,
                    0,
                    bx + btnSize / 2,
                    y + btnSize / 2,
                    btnSize * 0.5
                );
                if (isDoor) {
                    glowInner.addColorStop(0, 'rgba(255,100,100,0.25)');
                    glowInner.addColorStop(1, 'rgba(255,80,80,0)');
                } else {
                    glowInner.addColorStop(0, 'rgba(255,255,200,0.28)');
                    glowInner.addColorStop(1, 'rgba(255,245,185,0)');
                }
                ctx.fillStyle = glowInner;
                ctx.fillRect(bx - btnSize * 0.1, y - btnSize * 0.1, btnSize * 1.2, btnSize * 1.2);
            }
        }

        drawSquareButton(doorY, doorOn, true);
        drawSquareButton(lightY, lightOn, false);
        
        drawSquareButton(doorY, doorOn, true);
        drawSquareButton(lightY, lightOn, false);

        panel.tex.needsUpdate = true;
    }


    function _refreshBtn(id) {
        var b = wallBtns[id];
        if (!b) return;
        _refreshBtnPanel(b.side);
    }


    function buildLighting() {
        scene.add(new THREE.AmbientLight(0xffd890, 0.42));
        var dir = new THREE.DirectionalLight(0xffc850, 0.82);
        dir.position.set(0, 10, 8);
        scene.add(dir);
        var fill = new THREE.DirectionalLight(0xffb040, 0.18);
        fill.position.set(5, 6, 4);
        scene.add(fill);
        var rim = new THREE.DirectionalLight(0x301a08, 0.2);
        rim.position.set(0, 4, -10);
        scene.add(rim);
        var sideR = new THREE.DirectionalLight(0xffd070, 0.7);
        sideR.position.set(18, 8, 4);
        scene.add(sideR);
        var sideL = new THREE.DirectionalLight(0xffd070, 0.7);
        sideL.position.set(-18, 8, 4);
        scene.add(sideL);
    }
    
    function buildDecorations() {
        var RH = 11,
            HD = 9,
            HW = 11,
            sZ = 2; // door half-width (dW=4 in buildRoom)

        // ── Procedural texture helpers ────────────────────────────────────
        function ceilTex() {
            var W = 512,
                H = 512,
                ts = Math.floor(W / 6);
            var cv = document.createElement('canvas');
            cv.width = W;
            cv.height = H;
            var ctx = cv.getContext('2d');
            ctx.fillStyle = '#c8c8bc';
            ctx.fillRect(0, 0, W, H);
            for (var i = 0; i < 5000; i++) {
                var v = 178 + Math.floor(Math.random() * 32);
                ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 6) + ',0.5)';
                ctx.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1 + Math.random() * 2);
            }
            ctx.strokeStyle = '#5c5c54';
            ctx.lineWidth = 3;
            for (var gx = ts; gx < W; gx += ts) {
                ctx.beginPath();
                ctx.moveTo(gx, 0);
                ctx.lineTo(gx, H);
                ctx.stroke();
            }
            for (var gy = ts; gy < H; gy += ts) {
                ctx.beginPath();
                ctx.moveTo(0, gy);
                ctx.lineTo(W, gy);
                ctx.stroke();
            }
            [{ x: 82, y: 68, r: 26 }, { x: 318, y: 198, r: 19 }, { x: 168, y: 398, r: 14 }].forEach(function(s) {
                var g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
                g.addColorStop(0, 'rgba(138,108,58,0.42)');
                g.addColorStop(1, 'rgba(138,108,58,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fill();
            });
            var t = new THREE.CanvasTexture(cv);
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(7, 5);
            return t;
        }

        function floorTex() {
            var W = 512,
                H = 512,
                ts = Math.floor(W / 10);
            var cv = document.createElement('canvas');
            cv.width = W;
            cv.height = H;
            var ctx = cv.getContext('2d');
            // True black-and-white checkered tiles (canonical FNAF1 floor)
            for (var ty = 0; ty < 10; ty++) {
                for (var tx = 0; tx < 10; tx++) {
                    var isW = (tx + ty) % 2 === 0;
                    var bv = isW ? 200 + Math.floor(Math.sin(tx * 3.1 + ty * 2.7) * 14) : 22 + Math.floor(Math.sin(tx * 2.3 + ty * 4.1) * 8);
                    ctx.fillStyle = 'rgb(' + bv + ',' + bv + ',' + bv + ')';
                    ctx.fillRect(tx * ts, ty * ts, ts, ts);
                }
            }
            ctx.strokeStyle = '#585858';
            ctx.lineWidth = 2.5;
            for (var gx = ts; gx < W; gx += ts) {
                ctx.beginPath();
                ctx.moveTo(gx, 0);
                ctx.lineTo(gx, H);
                ctx.stroke();
            }
            for (var gy = ts; gy < H; gy += ts) {
                ctx.beginPath();
                ctx.moveTo(0, gy);
                ctx.lineTo(W, gy);
                ctx.stroke();
            }
            ctx.save();
            ctx.globalAlpha = 0.20;
            ctx.fillStyle = '#080808';
            ctx.fillRect(W * 0.28, 0, W * 0.44, H);
            ctx.restore();
            var t = new THREE.CanvasTexture(cv);
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(9, 7);
            return t;
        }

        function drawingTex(seed) {
            var W = 128,
                H = 160;
            var cv = document.createElement('canvas');
            cv.width = W;
            cv.height = H;
            var ctx = cv.getContext('2d');
            var rng = function(n) { return Math.abs(Math.sin(n * 127.1 + seed * 311.7) * 43758.5453) % 1; };
            ctx.fillStyle = 'rgb(' + Math.floor(205 + rng(1) * 25) + ',' + Math.floor(188 + rng(2) * 22) + ',' + Math.floor(150 + rng(3) * 25) + ')';
            ctx.fillRect(0, 0, W, H);
            // Canonical FNAF1 header text on each child drawing
            ctx.fillStyle = '#cc1818';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('MY FUN DAY!!!', W / 2, 4);
            ctx.strokeStyle = '#881010';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(5, 17);
            ctx.lineTo(W - 5, 17);
            ctx.stroke();
            var cols = ['#e01808', '#0e3ed0', '#d09010', '#0a8a3a', '#b828aa', '#e05400'];
            for (var i = 0; i < 5; i++) {
                ctx.strokeStyle = cols[Math.floor(rng(i * 7) * cols.length)];
                ctx.lineWidth = 3 + Math.floor(rng(i * 3) * 4);
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(8 + rng(i + 0.1) * (W - 16), 8 + rng(i + 0.2) * (H - 16));
                ctx.lineTo(8 + rng(i * 2 + 0.5) * (W - 16), 8 + rng(i * 2 + 0.7) * (H - 16));
                if (rng(i + 9) > 0.5) { ctx.lineTo(8 + rng(i * 3 + 1.1) * (W - 16), 8 + rng(i * 3 + 1.2) * (H - 16)); }
                ctx.stroke();
            }
            var sx = Math.floor(rng(10) * 65 + 22),
                sy = 20;
            ctx.strokeStyle = '#e0b000';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(sx, sy, 11, 0, Math.PI * 2);
            ctx.stroke();
            for (var ri = 0; ri < 8; ri++) {
                var ang = ri / 8 * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(sx + Math.cos(ang) * 12, sy + Math.sin(ang) * 12);
                ctx.lineTo(sx + Math.cos(ang) * 17, sy + Math.sin(ang) * 17);
                ctx.stroke();
            }
            var hx = Math.floor(rng(20) * 55 + 42),
                hy = H - 88;
            ctx.strokeStyle = '#32200a';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(hx, hy + 9, 9, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(hx, hy + 18);
            ctx.lineTo(hx, hy + 50);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(hx - 13, hy + 30);
            ctx.lineTo(hx + 13, hy + 30);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(hx, hy + 50);
            ctx.lineTo(hx - 10, hy + 72);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(hx, hy + 50);
            ctx.lineTo(hx + 10, hy + 72);
            ctx.stroke();
            ctx.strokeStyle = '#0a0400';
            ctx.lineWidth = 6;
            ctx.strokeRect(3, 3, W - 6, H - 6);
            return new THREE.CanvasTexture(cv);
        }

        function exitSignTex() {
            var W = 192,
                H = 80;
            var cv = document.createElement('canvas');
            cv.width = W;
            cv.height = H;
            var ctx = cv.getContext('2d');
            ctx.fillStyle = '#c81010';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#f5f5f5';
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('EXIT', W / 2, H / 2);
            ctx.strokeStyle = '#660808';
            ctx.lineWidth = 4;
            ctx.strokeRect(2, 2, W - 4, H - 4);
            return new THREE.CanvasTexture(cv);
        }

        function posterTex(title, sub, bgHex, textHex) {
            var W = 256,
                H = 320;
            var cv = document.createElement('canvas');
            cv.width = W;
            cv.height = H;
            var ctx = cv.getContext('2d');
            ctx.fillStyle = bgHex;
            ctx.fillRect(0, 0, W, H);
            var g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, 'rgba(255,255,255,0.10)');
            g.addColorStop(1, 'rgba(0,0,0,0.35)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(30, 18, W - 60, Math.floor(H * 0.52));
            ctx.fillStyle = textHex;
            ctx.font = 'bold 34px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(title, W / 2, Math.floor(H * 0.68));
            ctx.font = '17px Arial';
            ctx.fillText(sub, W / 2, Math.floor(H * 0.80));
            ctx.strokeStyle = 'rgba(255,255,255,0.32)';
            ctx.lineWidth = 5;
            ctx.strokeRect(4, 4, W - 8, H - 8);
            return new THREE.CanvasTexture(cv);
        }

        function clockTex() {
            var W = 256,
                H = 256;
            var cv = document.createElement('canvas');
            cv.width = W;
            cv.height = H;
            var ctx = cv.getContext('2d');
            var cx = W / 2,
                cy = H / 2,
                R = W / 2 - 10;
            ctx.fillStyle = '#f0ece0';
            ctx.beginPath();
            ctx.arc(cx, cy, R, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#2e2e2e';
            ctx.lineWidth = 13;
            ctx.beginPath();
            ctx.arc(cx, cy, R, 0, Math.PI * 2);
            ctx.stroke();
            for (var hh = 0; hh < 12; hh++) {
                var a = hh / 12 * Math.PI * 2 - Math.PI / 2;
                ctx.strokeStyle = '#111111';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * (R - 20), cy + Math.sin(a) * (R - 20));
                ctx.lineTo(cx + Math.cos(a) * (R - 4), cy + Math.sin(a) * (R - 4));
                ctx.stroke();
            }
            ctx.fillStyle = '#111111';
            ctx.font = 'bold 22px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].forEach(function(n, i) {
                var a2 = i / 12 * Math.PI * 2 - Math.PI / 2;
                ctx.fillText(n, cx + Math.cos(a2) * (R - 38), cy + Math.sin(a2) * (R - 38));
            });
            var ha = (11 / 12) * Math.PI * 2 - Math.PI / 2;
            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 9;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(ha) * (R * 0.52), cy + Math.sin(ha) * (R * 0.52));
            ctx.stroke();
            var ma = (59 / 60) * Math.PI * 2 - Math.PI / 2;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(ma) * (R * 0.76), cy + Math.sin(ma) * (R * 0.76));
            ctx.stroke();
            ctx.fillStyle = '#7a0000';
            ctx.beginPath();
            ctx.arc(cx, cy, 7, 0, Math.PI * 2);
            ctx.fill();
            return new THREE.CanvasTexture(cv);
        }

        // ── Material helpers ─────────────────────────────────────────────
        function mL(hex) { return new THREE.MeshLambertMaterial({ color: hex }); }

        function mT(tex, emHex) {
            var o = { map: tex };
            if (emHex) {
                o.emissive = new THREE.Color(emHex);
                o.emissiveIntensity = 0.55;
            }
            return new THREE.MeshLambertMaterial(o);
        }

        // ── Ceiling tile overlay ─────────────────────────────────────────
        var ct = new THREE.Mesh(new THREE.PlaneGeometry(22, 18), mT(ceilTex()));
        ct.rotation.x = Math.PI / 2;
        ct.position.set(0, RH - 0.18, 0);
        scene.add(ct);

        // ── Additional side ceiling lights ───────────────────────────────
        var mLBody = mL(0x1e1c14);
        var mBulbE = new THREE.MeshLambertMaterial({ color: 0xffe870, emissive: new THREE.Color(0xffe870), emissiveIntensity: 0.7 });
        [-6, 6].forEach(function(lx) {
            var lh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.38, 12), mLBody);
            lh.position.set(lx, RH - 0.24, 1.0);
            scene.add(lh);
            var bl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 6), mBulbE);
            bl.position.set(lx, RH - 0.54, 1.0);
            scene.add(bl);
        });

        // ── Floor tile overlay ───────────────────────────────────────────
        var ft = new THREE.Mesh(new THREE.PlaneGeometry(22, 18), mT(floorTex()));
        ft.rotation.x = -Math.PI / 2;
        ft.position.set(0, 0.17, 0);
        scene.add(ft);

        // ── 6 canonical children's drawings (left side of back wall, per wiki) ─
        // Layout: 2 columns × 3 rows — each has "MY FUN DAY!!!" header
        // Drawing subjects (canonical): 1:Bonnie-in-box, 2:Freddy+child, 3:Sun+balloons
        //                               4:Freddy+girl, 5:Bonnie bust, 6:Birthday cake
        var drawData = [
            [-8.0, 7.6], // top-left  (Bonnie popping out of box)
            [-5.6, 7.4], // top-right (child getting present from Freddy)
            [-7.6, 5.9], // mid-left  (sun next to balloons)
            [-5.2, 5.7], // mid-right (Freddy handing girl a present)
            [-7.8, 4.3], // bot-left  (bust of Bonnie — partially obscured at edge)
            [-5.4, 4.1] // bot-right (two kids + birthday cake)
        ];
        drawData.forEach(function(d, i) {
            var dm = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.35), mT(drawingTex(i * 7 + 2)));
            dm.position.set(d[0], d[1], -HD + 0.34);
            dm.rotation.y = Math.PI;
            dm.rotation.z = Math.sin(i * 2.1 + 0.5) * 0.07;
            scene.add(dm);
        });

        // ── EXIT signs (back wall upper corners) ─────────────────────────
        var mExit = mT(exitSignTex(), 0x550000);
        var eGeo = new THREE.PlaneGeometry(0.9, 0.38);
        [-8.0, 8.0].forEach(function(ex) {
            var s = new THREE.Mesh(eGeo, mExit);
            s.position.set(ex, 9.4, -HD + 0.26);
            s.rotation.y = Math.PI;
            scene.add(s);
            box(scene, 0.95, 0.44, 0.07, ex, 9.4, -HD + 0.23, mL(0x1a1a1a));
        });

        // ── Baseboards ───────────────────────────────────────────────────
        var mBB = mL(0x241608);
        box(scene, 22, 0.16, 0.12, 0, 0.08, -HD + 0.36, mBB);
        box(scene, 0.12, 0.16, 18, -HW + 0.28, 0.08, 0, mBB);
        box(scene, 0.12, 0.16, 18, HW - 0.28, 0.08, 0, mBB);

        // ── Black-and-white tile stripe on walls (canonical FNAF1) ───────
        // The floor tile pattern continues as a stripe on all walls, ~1.8 units high
        (function() {
            var W = 256,
                H = 64,
                ts = Math.floor(W / 8);
            var cv = document.createElement('canvas');
            cv.width = W;
            cv.height = H;
            var ctx = cv.getContext('2d');
            var rowsH = Math.ceil(H / ts);
            for (var ty2 = 0; ty2 < rowsH; ty2++) {
                for (var tx2 = 0; tx2 < 8; tx2++) {
                    var isW2 = (tx2 + ty2) % 2 === 0;
                    var bv2 = isW2 ? 196 : 26;
                    ctx.fillStyle = 'rgb(' + bv2 + ',' + bv2 + ',' + bv2 + ')';
                    ctx.fillRect(tx2 * ts, ty2 * ts, ts, ts);
                }
            }
            ctx.strokeStyle = '#505050';
            ctx.lineWidth = 2;
            for (var gx2 = ts; gx2 < W; gx2 += ts) {
                ctx.beginPath();
                ctx.moveTo(gx2, 0);
                ctx.lineTo(gx2, H);
                ctx.stroke();
            }
            for (var gy2 = ts; gy2 < H; gy2 += ts) {
                ctx.beginPath();
                ctx.moveTo(0, gy2);
                ctx.lineTo(W, gy2);
                ctx.stroke();
            }
            var stripeTex = new THREE.CanvasTexture(cv);
            stripeTex.wrapS = stripeTex.wrapT = THREE.RepeatWrapping;
            // Back wall stripe
            var bwStripe = new THREE.Mesh(new THREE.PlaneGeometry(22, 1.8),
                new THREE.MeshLambertMaterial({ map: stripeTex }));
            bwStripe.position.set(0, 0.9, -HD + 0.38);
            bwStripe.rotation.y = Math.PI;
            stripeTex.repeat.set(7, 1);
            scene.add(bwStripe);
            // Clone texture for sides — split into two segments to skip door gap (z=-sZ..+sZ)
            function wallStripe(x, ry) {
                var segLen = HD - sZ; // 7 units per segment
                var segRep = segLen / 18 * 6; // same tile density as original (≈2.33)
                // Back segment: z = -(HD+sZ)/2 = -5.5
                var texA = new THREE.CanvasTexture(cv);
                texA.wrapS = texA.wrapT = THREE.RepeatWrapping;
                texA.repeat.set(segRep, 1);
                var mA = new THREE.Mesh(new THREE.PlaneGeometry(segLen, 1.8),
                    new THREE.MeshLambertMaterial({ map: texA }));
                mA.position.set(x, 0.9, -(HD + sZ) / 2);
                mA.rotation.y = ry;
                scene.add(mA);
                // Front segment: z = +(HD+sZ)/2 = +5.5
                var texB = new THREE.CanvasTexture(cv);
                texB.wrapS = texB.wrapT = THREE.RepeatWrapping;
                texB.repeat.set(segRep, 1);
                var mB = new THREE.Mesh(new THREE.PlaneGeometry(segLen, 1.8),
                    new THREE.MeshLambertMaterial({ map: texB }));
                mB.position.set(x, 0.9, (HD + sZ) / 2);
                mB.rotation.y = ry;
                scene.add(mB);
            }
            wallStripe(-HW + 0.38, Math.PI / 2);
            wallStripe(HW - 0.38, -Math.PI / 2);
        })();

        // ── Wall posters (side walls) ────────────────────────────────────
        var pLMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.9),
            mT(posterTex('KEEP IT UP', 'YOURE DOING GREAT', '#7a2818', '#f5d050')));
        pLMesh.position.set(-HW + 0.22, 6.2, -3.5);
        pLMesh.rotation.y = Math.PI / 2;
        scene.add(pLMesh);
        box(scene, 0.07, 2.05, 1.65, -HW + 0.18, 6.2, -3.5, mL(0x2c1408));

        var pRMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.9),
            mT(posterTex('STAY SAFE', 'HAVE A GREAT NIGHT', '#184878', '#f0e030')));
        pRMesh.position.set(HW - 0.22, 6.2, -3.5);
        pRMesh.rotation.y = -Math.PI / 2;
        scene.add(pRMesh);
        box(scene, 0.07, 2.05, 1.65, HW - 0.18, 6.2, -3.5, mL(0x2c1408));

        // ── Storage shelves (left wall) ─────────────────────────────────
        var mSh = mL(0x5a3e28),
            mBkt = mL(0x3c3c3c),
            mBx = mL(0x7a6040),
            mBxL = mL(0xc8b070);
        [3.2, 4.8, 6.4].forEach(function(sy) {
            box(scene, 0.10, 0.14, 2.1, -HW + 0.30, sy, -4.0, mSh);
            box(scene, 0.07, 0.44, 0.07, -HW + 0.28, sy - 0.24, -3.1, mBkt);
            box(scene, 0.07, 0.07, 0.46, -HW + 0.28, sy - 0.38, -3.3, mBkt);
            box(scene, 0.07, 0.44, 0.07, -HW + 0.28, sy - 0.24, -4.9, mBkt);
            box(scene, 0.07, 0.07, 0.46, -HW + 0.28, sy - 0.38, -4.7, mBkt);
            box(scene, 0.09, 0.36, 0.42, -HW + 0.32, sy + 0.22, -3.6, mBx);
            box(scene, 0.09, 0.30, 0.36, -HW + 0.32, sy + 0.19, -4.2, mBxL);
            box(scene, 0.09, 0.28, 0.32, -HW + 0.32, sy + 0.18, -4.7, mBx);
        });

        // ── Storage shelves (right wall) ─────────────────────────────────
        [3.2, 4.8, 6.4].forEach(function(sy) {
            box(scene, 0.10, 0.14, 2.1, HW - 0.30, sy, -4.0, mSh);
            box(scene, 0.07, 0.44, 0.07, HW - 0.28, sy - 0.24, -3.1, mBkt);
            box(scene, 0.07, 0.07, 0.46, HW - 0.28, sy - 0.38, -3.3, mBkt);
            box(scene, 0.07, 0.44, 0.07, HW - 0.28, sy - 0.24, -4.9, mBkt);
            box(scene, 0.07, 0.07, 0.46, HW - 0.28, sy - 0.38, -4.7, mBkt);
            box(scene, 0.09, 0.36, 0.42, HW - 0.32, sy + 0.22, -3.6, mBx);
            box(scene, 0.09, 0.30, 0.36, HW - 0.32, sy + 0.19, -4.2, mBxL);
            box(scene, 0.09, 0.28, 0.32, HW - 0.32, sy + 0.18, -4.7, mBx);
        });

        // ── Wall clock (back wall) ───────────────────────────────────────
        var clkMesh = new THREE.Mesh(new THREE.CircleGeometry(0.48, 24), mT(clockTex()));
        clkMesh.position.set(-5.0, 8.1, -HD + 0.26);
        clkMesh.rotation.y = Math.PI;
        scene.add(clkMesh);
        var clkRim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.07, 24), mL(0x3c3c34));
        clkRim.rotation.x = Math.PI / 2;
        clkRim.position.set(-5.0, 8.1, -HD + 0.23);
        scene.add(clkRim);

        // ── Fire extinguisher (left wall) ────────────────────────────────
        var mExtR = mL(0xbc0e0e),
            mMetal = mL(0x808080);
        var extC = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.75, 10), mExtR);
        extC.position.set(-HW + 0.36, 0.95, -7.6);
        scene.add(extC);
        var extT = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.22, 10), mMetal);
        extT.position.set(-HW + 0.36, 1.52, -7.6);
        scene.add(extT);
        var extN = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 8), mMetal);
        extN.rotation.z = 0.75;
        extN.position.set(-HW + 0.48, 1.68, -7.6);
        scene.add(extN);
        box(scene, 0.05, 0.82, 0.15, -HW + 0.20, 0.95, -7.6, mL(0x484848));

        // ── First aid kit (left wall, beside extinguisher) ───────────────
        box(scene, 0.09, 0.44, 0.55, -HW + 0.22, 2.06, -7.6, mL(0xf0f0f0));
        box(scene, 0.10, 0.14, 0.42, -HW + 0.20, 2.06, -7.6, mL(0xcc0000));
        box(scene, 0.10, 0.34, 0.14, -HW + 0.20, 2.06, -7.6, mL(0xcc0000));

        // ── Electrical panel (right wall) ────────────────────────────────
        box(scene, 0.09, 0.76, 0.55, HW - 0.22, 1.26, -7.8, mL(0xc0a880));
        box(scene, 0.10, 0.66, 0.46, HW - 0.20, 1.26, -7.8, mL(0xaa9068));
        [-0.13, 0, 0.13].forEach(function(bz) {
            box(scene, 0.11, 0.09, 0.07, HW - 0.18, 1.36, -7.8 + bz, mL(0x282828));
            box(scene, 0.11, 0.09, 0.07, HW - 0.18, 1.13, -7.8 + bz, mL(0x282828));
        });
        box(scene, 0.10, 0.11, 0.20, HW - 0.19, 0.79, -7.8, mL(0xe01818));

        // ── Ceiling vent (center) ────────────────────────────────────────
        var ventP = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), mL(0x585858));
        ventP.rotation.x = Math.PI / 2;
        ventP.position.set(0, RH - 0.16, 0);
        scene.add(ventP);
        for (var vs = -4; vs <= 4; vs++) {
            box(scene, 0.92, 0.05, 0.07, 0, RH - 0.14, vs * 0.11, mL(0x424242));
        }

        // ── Metal storage lockers (back wall corners) ────────────────────
        var mLkr = mL(0x5a5a5a),
            mLkrD = mL(0x404040);
        [-8.5, -7.7, -6.9].forEach(function(lx) {
            box(scene, 0.58, 3.1, 0.44, lx, 1.55, -HD + 0.52, mLkr);
            box(scene, 0.59, 0.05, 0.45, lx, 2.16, -HD + 0.52, mLkrD);
            box(scene, 0.59, 0.05, 0.45, lx, 0.96, -HD + 0.52, mLkrD);
            box(scene, 0.59, 0.08, 0.05, lx, 1.55, -HD + 0.74, mL(0x363636));
        });
        [8.5, 7.7, 6.9].forEach(function(lx) {
            box(scene, 0.58, 3.1, 0.44, lx, 1.55, -HD + 0.52, mLkr);
            box(scene, 0.59, 0.05, 0.45, lx, 2.16, -HD + 0.52, mLkrD);
            box(scene, 0.59, 0.05, 0.45, lx, 0.96, -HD + 0.52, mLkrD);
            box(scene, 0.59, 0.08, 0.05, lx, 1.55, -HD + 0.74, mL(0x363636));
        });

        // ── Hanging streamers from ceiling (colorful, scattered) ─────────
        var streamCols = [0xc83028, 0x2858c0, 0xe8aa10, 0x28943c, 0xb828a0];
        [-9.5, -7.5, -5.5, -3.8, -2.2, 0.2, 1.8, 3.5, 5.2, 7.0, 9.2].forEach(function(sx, i) {
            var h = 1.8 + (i % 4) * 0.5;
            box(scene, 0.06, h, 0.06, sx, RH - 0.18 - h * 0.5, -HD + 0.5, mL(streamCols[i % streamCols.length]));
        });

    }

    
    function buildHallDecor() {
        // FNAF1-style corridor decorations. All start hidden; revealed by hall light button.
        // corridor centers: cx = ±15, outer wall at X=±19, spans Z: -9 to +9
        var mPoster = new THREE.MeshLambertMaterial({ color: 0xa04030 }); // red poster
        var mText = new THREE.MeshLambertMaterial({ color: 0xf0d060, emissive: new THREE.Color(0x302000) });
        var mConduit = new THREE.MeshLambertMaterial({ color: 0x505050 }); // grey pipe
        var mSign = new THREE.MeshLambertMaterial({ color: 0xe8c020 }); // yellow wet-floor sign
        var mSignText = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        var mLight = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: new THREE.Color(0xffffff), emissiveIntensity: 1.0 }); // glowing strip light

        function makeDecor(sx) {
            var decor = [];
            var cx = sx * 15;
            var outerX = sx * 19;

            // Fluorescent tube along ceiling
            var tubeGeo = new THREE.BoxGeometry(6, 0.2, 0.5);
            var tube = new THREE.Mesh(tubeGeo, mLight);
            tube.position.set(cx, 10.6, 0);
            scene.add(tube);
            decor.push(tube);

            // Wire conduit along top of outer wall
            var conduit = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 16), mConduit);
            conduit.position.set(outerX + sx * -0.2, 9.5, 0);
            scene.add(conduit);
            decor.push(conduit);

            // Freddy poster on outer wall
            var poster = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.0, 2.8), mPoster);
            poster.position.set(outerX + sx * -0.1, 6.0, -2);
            scene.add(poster);
            decor.push(poster);
            // poster text bar
            var ptext = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 2.6), mText);
            ptext.position.set(outerX + sx * -0.12, 7.6, -2);
            scene.add(ptext);
            decor.push(ptext);

            // "WET FLOOR" triangular warning sign on floor
            var signBase = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.7), mSign);
            signBase.position.set(cx + sx * -1, 0.75, 1.5);
            scene.add(signBase);
            decor.push(signBase);
            var signTextMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.25, 0.55), mSignText);
            signTextMesh.position.set(cx + sx * -1, 0.9, 1.5);
            scene.add(signTextMesh);
            decor.push(signTextMesh);

            // Stripe / hazard band on corridor wall (door-side)
            var stripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 16), new THREE.MeshLambertMaterial({ color: 0x2a2a2a }));
            stripe.position.set(cx + sx * 3.9, 8.0, 0);
            scene.add(stripe);
            decor.push(stripe);

            decor.forEach(function(m) { m.visible = false; });
            return decor;
        }

        hallDecorLeft = makeDecor(-1);
        hallDecorRight = makeDecor(1);
    }

    
    function buildWallButtons() {
        // FNAF1-style holder: one vertical panel per side with DOOR (red, top)
        // and LIGHT (white, bottom). Separate transparent hitboxes handle clicks.
        // COMPACT panel proportions to match FNAF 1 - small, intimate control panel
        var PANEL_W = 0.8,
            PANEL_H = 1.6;
        var HIT_W = 0.48,
            HIT_H = 0.48;
        var TW = 120,
            TH = 240;
        var sides = [
            { side: 'left', x: -10.61, y: 3.65, z: 3.5, ry: Math.PI / 2, nx: 0.03 },
            { side: 'right', x: 10.61, y: 3.65, z: 3.5, ry: -Math.PI / 2, nx: -0.03 }
        ];

        wallBtns = {};
        wallBtnPanels = { left: null, right: null };

        sides.forEach(function(s) {
            // Visible holder panel
            var cv = document.createElement('canvas');
            cv.width = TW;
            cv.height = TH;
            var ctx = cv.getContext('2d');
            var tex = new THREE.CanvasTexture(cv);
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            var panelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: true });
            var panelGeo = new THREE.PlaneGeometry(PANEL_W, PANEL_H);
            var panelMesh = new THREE.Mesh(panelGeo, panelMat);
            panelMesh.position.set(s.x, s.y, s.z);
            panelMesh.rotation.y = s.ry;
            panelMesh.renderOrder = 1;
            scene.add(panelMesh);
            wallBtnPanels[s.side] = { mesh: panelMesh, canvas: cv, ctx: ctx, tex: tex };

            // Invisible clickable hitboxes over the two square buttons
            wallBtns[doorId] = { side: s.side, kind: 'door', active: false };
            wallBtns[lightId] = { side: s.side, kind: 'light', active: false };
            
            // Add 3D text labels in the gaps
            // "DOOR" label in top gap (above door button)
            var canvas_door_text = document.createElement('canvas');
            canvas_door_text.width = 64;
            canvas_door_text.height = 16;
            var ctx_door = canvas_door_text.getContext('2d');
            ctx_door.fillStyle = '#888888';
            ctx_door.font = 'bold 12px Arial';
            ctx_door.textAlign = 'center';
            ctx_door.textBaseline = 'middle';
            ctx_door.fillText('DOOR', 32, 8);
            var tex_door = new THREE.CanvasTexture(canvas_door_text);
            var mat_door_text = new THREE.MeshBasicMaterial({ map: tex_door, transparent: true });
            var geo_door_text = new THREE.PlaneGeometry(0.32, 0.08);
            var mesh_door_text = new THREE.Mesh(geo_door_text, mat_door_text);
            mesh_door_text.position.set(s.x + s.nx * 0.05, s.y + 0.38, s.z + 0.01);
            mesh_door_text.rotation.y = s.ry;
            scene.add(mesh_door_text);
            
            // "LIGHT" label in middle gap (between door and light buttons)
            var canvas_light_text = document.createElement('canvas');
            canvas_light_text.width = 64;
            canvas_light_text.height = 16;
            var ctx_light = canvas_light_text.getContext('2d');
            ctx_light.fillStyle = '#888888';
            ctx_light.font = 'bold 12px Arial';
            ctx_light.textAlign = 'center';
            ctx_light.textBaseline = 'middle';
            ctx_light.fillText('LIGHT', 32, 8);
            var tex_light = new THREE.CanvasTexture(canvas_light_text);
            var mat_light_text = new THREE.MeshBasicMaterial({ map: tex_light, transparent: true });
            var geo_light_text = new THREE.PlaneGeometry(0.36, 0.08);
            var mesh_light_text = new THREE.Mesh(geo_light_text, mat_light_text);
            mesh_light_text.position.set(s.x + s.nx * 0.05, s.y - 0.08, s.z + 0.01);
            mesh_light_text.rotation.y = s.ry;
            scene.add(mesh_light_text);
        });

        _refreshBtnPanel('left');
        _refreshBtnPanel('right');
    }
    
    function animate() {
        if (!renderer || !scene || !camera) return;
        animId = requestAnimationFrame(animate);
        
        var edge = 0.28, target;
        if (mouseNorm < edge) {
            target = MAX_ROT * Math.pow(1 - mouseNorm / edge, 1.4);
        } else if (mouseNorm > 1 - edge) {
            target = -MAX_ROT * Math.pow((mouseNorm - (1 - edge)) / edge, 1.4);
        } else {
            target = 0;
        }
        currentRotY += (target - currentRotY) * ROT_LERP;
        camera.rotation.y = currentRotY;
        camera.rotation.x = 0;
        camera.rotation.z = 0;
        
        tickDoors(doors);
        if (fan) fan.rotation.z += 0.06;
        
        try {
            renderer.render(scene, camera);
        } catch (e) {
            console.error('[office3d animate] render error:', e);
        }
    }
    
    function setDoorLeft(closed) {
        setDoor(doors.left, closed);
        if (wallBtns.doorLeft) {
            wallBtns.doorLeft.active = closed;
            _refreshBtn('doorLeft');
        }
    }
    
    function setDoorRight(closed) {
        setDoor(doors.right, closed);
        if (wallBtns.doorRight) {
            wallBtns.doorRight.active = closed;
            _refreshBtn('doorRight');
        }
    }
    
    function setLightLeft(on) {
        setHallLight(hallLights.left, on);
        if (hallApertureLeft) hallApertureLeft.visible = !on;
        hallDecorLeft.forEach(function(m) { m.visible = on; });
        if (wallBtns.lightLeft) {
            wallBtns.lightLeft.active = on;
            _refreshBtn('lightLeft');
        }
    }
    
    function setLightRight(on) {
        setHallLight(hallLights.right, on);
        if (hallApertureRight) hallApertureRight.visible = !on;
        hallDecorRight.forEach(function(m) { m.visible = on; });
        if (wallBtns.lightRight) {
            wallBtns.lightRight.active = on;
            _refreshBtn('lightRight');
        }
    }
    
    function setHallLeft(anim) {
        setHallAnimatronic(hallSilhouettes.left, anim);
    }
    
    function setHallRight(anim) {
        setHallAnimatronic(hallSilhouettes.right, anim);
    }
    
    function setAnimatronicPosition(side, camKey) {
        var leftRooms = { hallW: 0.35, hallW_corner: 0.15, doorW: -0.5, office: -2.0 };
        var rightRooms = { kitchen: 0.35, hallE: 0.35, hallE_corner: 0.15, doorE: -0.5, office: -2.0 };
        var group = side === 'left' ? hallSilhouettes.left : hallSilhouettes.right;
        var rooms = side === 'left' ? leftRooms : rightRooms;
        if (!group) return;
        if (camKey && rooms.hasOwnProperty(camKey)) {
            var targetZ = rooms[camKey];
            group.position.z += (targetZ - group.position.z) * 0.08;
        } else {
            group.position.z += (0.5 - group.position.z) * 0.05;
        }
    }
    
    function setMouse(normX) { mouseNorm = normX; }
    
    function show() {
        var c = document.getElementById('officeScene');
        if (c) {
            c.style.display = '';
            void c.offsetHeight;
        }
        if (!animId && renderer && scene && camera) {
            animate();
        }
    }
    
    function hide() {
        var c = document.getElementById('officeScene');
        if (c) c.style.display = 'none';
    }
    
    function onResize() {
        var c = document.getElementById('officeScene');
        if (!c || !renderer || !camera) return;
        var w = c.clientWidth || window.innerWidth;
        var h = c.clientHeight || window.innerHeight;
        if (w < 10 || h < 10) {
            console.warn('[office3d resize] skipping resize: container too small (' + w + 'x' + h + ')');
            return;
        }
        var newAspect = w / h;
        var oldAspect = camera.aspect;
        if (Math.abs(newAspect - oldAspect) > 0.01 || renderer.domElement.width !== w || renderer.domElement.height !== h) {
            camera.aspect = newAspect;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            console.log('[office3d resize] resized to ' + w + 'x' + h + ' (aspect ' + newAspect.toFixed(2) + ')');
        }
    }
})();
