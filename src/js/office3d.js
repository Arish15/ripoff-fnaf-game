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
 * @property {function(string|null)} setHallLeft - Set left hall animatronic silhouette color (hex) or null to clear
 * @property {function(string|null)} setHallRight - Set right hall animatronic silhouette color (hex) or null to clear
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

(function() {
    'use strict';

    var scene, camera, renderer, animId;
    var doorLeftPanel, doorRightPanel;
    var hallLightLeft, hallLightRight;
    var hallApertureLeft, hallApertureRight;
    var hallMeshesLeft = [],
        hallMeshesRight = [];
    var hallDecorLeft = [],
        hallDecorRight = [];
    var hallAnimLeftGroup, hallAnimRightGroup;
    var hallAnimLeftMat, hallAnimRightMat;
    var hallLeftLightOn = false,
        hallRightLightOn = false;
    var hallLeftPresent = false,
        hallRightPresent = false;
    var MAT_HALL_DARK, MAT_HALL_WALL, MAT_HALL_FLOOR, MAT_HALL_CEIL;
    var fanPivot;

    // Door spring-physics animation state (0 = open, 1 = closed)
    var doorAnimLeft = { pos: 0.0, vel: 0.0, target: 0.0 };
    var doorAnimRight = { pos: 0.0, vel: 0.0, target: 0.0 };
    var DOOR_SPRING_K = 0.075; // spring stiffness
    var DOOR_DAMPING = 0.26; // fraction of velocity removed each frame (<1 = slight bounce)
    var DOOR_THRESHOLD = 0.0007; // snap distance
    var DOOR_OPEN_Y = 12.0; // Y when fully retracted (above ceiling)
    var DOOR_CLOSED_Y = 4.0; // Y when fully lowered into frame

    var mouseNorm = 0.5;
    var currentRotY = 0;
    var MAX_ROT = 0.62;
    var ROT_LERP = 0.08;

    var MAT_DOOR_OPEN, MAT_DOOR_CLOSED;

    var wallBtns = {};
    var wallBtnPanels = { left: null, right: null };
    var raycaster3D;

    window.office3d = {
        init: init,
        setDoorLeft: setDoorLeft,
        setDoorRight: setDoorRight,
        setLightLeft: setLightLeft,
        setLightRight: setLightRight,
        setHallLeft: setHallLeft,
        setHallRight: setHallRight,
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

        // Cancel any running animation before reinitializing
        if (animId) {
            cancelAnimationFrame(animId);
            animId = null;
        }
        // Clean up any existing renderer/context before rebuilding.
        if (renderer) {
            if (typeof renderer.dispose === 'function') renderer.dispose();
            if (typeof renderer.forceContextLoss === 'function') renderer.forceContextLoss();
            renderer = null;
        }
        container.innerHTML = '';

        // Force layout recomputation to get accurate dimensions
        var w = container.clientWidth || window.innerWidth;
        var h = container.clientHeight || window.innerHeight;
        
        // If dimensions are still too small, wait and retry
        if (w < 10 || h < 10) {
            console.warn('[office3d] container too small (' + w + 'x' + h + '), retrying in 50ms');
            setTimeout(init, 50);
            return;
        }

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0e0c08);
        scene.fog = new THREE.Fog(0x0e0c08, 14, 26);

        camera = new THREE.PerspectiveCamera(72, w / h, 0.1, 60);
        camera.position.set(0, 4.0, 7.5);
        camera.rotation.order = 'YXZ';

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h);
        renderer.shadowMap.enabled = false;
        renderer.toneMapping = THREE.NoToneMapping;
        
        // Append canvas to container BEFORE building scene
        container.appendChild(renderer.domElement);
        
        // Force the canvas to fill the container
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';

        buildMaterials();
        buildRoom();
        buildDecorations();
        buildLighting();
        buildApertureCovers();
        buildHallDecor();
        buildHallAnimatronics();
        buildWallButtons();

        renderer.domElement.addEventListener('click', function(e) {
            var g = window.game;
            if (!g || !g.running || g.powerOutage) return;
            if (!raycaster3D) return;
            var rect = renderer.domElement.getBoundingClientRect();
            var mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1
            );
            raycaster3D.setFromCamera(mouse, camera);
            var meshes = Object.keys(wallBtns).map(function(k) { return wallBtns[k].mesh; });
            var hits = raycaster3D.intersectObjects(meshes);
            if (hits.length > 0) {
                var id = hits[0].object.userData.btnId;
                if (id === 'doorLeft' && window.toggleDoor) window.toggleDoor('left');
                else if (id === 'doorRight' && window.toggleDoor) window.toggleDoor('right');
                else if (id === 'lightLeft' && window.toggleLight) window.toggleLight('left');
                else if (id === 'lightRight' && window.toggleLight) window.toggleLight('right');
            }
        });

        renderer.domElement.addEventListener('mousemove', function(e) {
            if (!raycaster3D || !Object.keys(wallBtns).length) return;
            var g = window.game;
            if (!g || !g.running || g.powerOutage) { renderer.domElement.style.cursor = 'default'; return; }
            var rect = renderer.domElement.getBoundingClientRect();
            var mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1
            );
            raycaster3D.setFromCamera(mouse, camera);
            var meshes = Object.keys(wallBtns).map(function(k) { return wallBtns[k].mesh; });
            var hits = raycaster3D.intersectObjects(meshes);
            renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'default';
        });

        window.removeEventListener('resize', onResize);
        window.addEventListener('resize', onResize);
        animate();
        console.log('[office3d] initialized ' + w + 'x' + h + ' | bg=' + scene.background.getHexString() + ' | lights=' + scene.children.filter(function(c) { return c.isLight; }).length);
        // Force a test render immediately
        renderer.render(scene, camera);
        console.log('[office3d] test render done — canvas size: ' + renderer.domElement.width + 'x' + renderer.domElement.height);
    }

    // =========================================================
    // DOOR TEXTURE — procedural canvas-based steel blast door
    // =========================================================
    function createDoorTexture() {
        var W = 256,
            H = 512;

        // ---- Colour / diffuse map ----
        var dc = document.createElement('canvas');
        dc.width = W;
        dc.height = H;
        var c = dc.getContext('2d');

        // ---- Bump map (grey = neutral, white = raised, black = recessed) ----
        var bn = document.createElement('canvas');
        bn.width = W;
        bn.height = H;
        var b = bn.getContext('2d');
        b.fillStyle = '#808080';
        b.fillRect(0, 0, W, H);

        // -- Base coat: dark gunmetal with subtle noise grain --
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

        // Layout constants
        var HAZARD_H = 48; // caution stripe height at bottom
        var BORDER = 9; // outer frame thickness
        var RIDGE_H = 11; // height of separator ridges between panels
        var PANEL_N = 4; // number of recessed panels
        var usableH = H - HAZARD_H;
        var innerH = usableH - BORDER * 2;
        var panelH = (innerH - (PANEL_N - 1) * RIDGE_H) / PANEL_N;

        // -- Raised outer border frame --
        c.fillStyle = '#242424';
        c.fillRect(0, 0, W, BORDER);
        c.fillRect(0, usableH - BORDER, W, BORDER);
        c.fillRect(0, 0, BORDER, usableH);
        c.fillRect(W - BORDER, 0, BORDER, usableH);
        // Top-left highlight on frame edge
        c.fillStyle = '#4e4e4e';
        c.fillRect(BORDER, BORDER, W - BORDER * 2, 1);
        c.fillRect(BORDER, BORDER, 1, usableH - BORDER * 2);
        // Bump: frame protrudes
        b.fillStyle = '#d4d4d4';
        b.fillRect(0, 0, W, BORDER);
        b.fillRect(0, usableH - BORDER, W, BORDER);
        b.fillRect(0, 0, BORDER, usableH);
        b.fillRect(W - BORDER, 0, BORDER, usableH);

        // -- Recessed panels + inter-panel ridges --
        for (var p = 0; p < PANEL_N; p++) {
            var pTop = BORDER + p * (panelH + RIDGE_H);
            var pw = W - BORDER * 2;
            var pm = 8; // margin inside panel
            // Panel inset shadow
            c.fillStyle = 'rgba(0,0,0,0.20)';
            c.fillRect(BORDER + pm, pTop + pm, pw - pm * 2, panelH - pm * 2);
            // Bevel top & left (bright edge)
            c.fillStyle = 'rgba(255,255,255,0.11)';
            c.fillRect(BORDER + pm, pTop + pm, pw - pm * 2, 2);
            c.fillRect(BORDER + pm, pTop + pm, 2, panelH - pm * 2);
            // Bevel bottom & right (dark edge)
            c.fillStyle = 'rgba(0,0,0,0.18)';
            c.fillRect(BORDER + pm, pTop + panelH - pm - 2, pw - pm * 2, 2);
            c.fillRect(BORDER + pw - pm - 2, pTop + pm, 2, panelH - pm * 2);
            // Bump: inset
            b.fillStyle = '#5c5c5c';
            b.fillRect(BORDER + pm, pTop + pm, pw - pm * 2, panelH - pm * 2);
            b.fillStyle = '#a4a4a4';
            b.fillRect(BORDER + pm, pTop + pm, pw - pm * 2, 2);
            b.fillRect(BORDER + pm, pTop + pm, 2, panelH - pm * 2);

            // Ridge below panel (omit after last panel)
            if (p < PANEL_N - 1) {
                var rY = pTop + panelH;
                // Ridge body
                c.fillStyle = '#303030';
                c.fillRect(BORDER, rY, pw, RIDGE_H);
                // Top specular highlight
                c.fillStyle = '#525252';
                c.fillRect(BORDER, rY, pw, 2);
                // Centre groove
                c.fillStyle = '#1c1c1c';
                c.fillRect(BORDER, rY + Math.floor(RIDGE_H / 2) - 1, pw, 2);
                // Bump: ridge
                b.fillStyle = '#c4c4c4';
                b.fillRect(BORDER, rY, pw, RIDGE_H);
                b.fillStyle = '#e8e8e8';
                b.fillRect(BORDER, rY, pw, 2);
                b.fillStyle = '#3c3c3c';
                b.fillRect(BORDER, rY + Math.floor(RIDGE_H / 2) - 1, pw, 2);
            }
        }

        // -- Rivets (4 columns x rows at panel joints + top + bottom) --
        var rivetX = [BORDER + 7, Math.floor(W / 2) - 14, Math.floor(W / 2) + 8, W - BORDER - 11];
        var rivetY = [BORDER + 7]; // top row
        for (var ri = 0; ri < PANEL_N - 1; ri++) {
            rivetY.push(BORDER + (ri + 1) * (panelH + RIDGE_H) - Math.floor(RIDGE_H / 2));
        }
        rivetY.push(usableH - BORDER - 7); // bottom row

        rivetX.forEach(function(rx) {
            rivetY.forEach(function(ry) {
                var r = 5;
                // Drop shadow
                c.fillStyle = 'rgba(0,0,0,0.58)';
                c.beginPath();
                c.arc(rx + 1, ry + 1, r + 1, 0, Math.PI * 2);
                c.fill();
                // Body radial gradient (top-left lit)
                var gr = c.createRadialGradient(rx - 1.5, ry - 2, 0.5, rx, ry, r);
                gr.addColorStop(0, '#747474');
                gr.addColorStop(0.5, '#484848');
                gr.addColorStop(1, '#222222');
                c.fillStyle = gr;
                c.beginPath();
                c.arc(rx, ry, r, 0, Math.PI * 2);
                c.fill();
                // Specular glint
                var hi = c.createRadialGradient(rx - 2, ry - 2.5, 0, rx - 1, ry - 1, r * 0.65);
                hi.addColorStop(0, 'rgba(255,255,255,0.58)');
                hi.addColorStop(1, 'rgba(255,255,255,0)');
                c.fillStyle = hi;
                c.beginPath();
                c.arc(rx, ry, r, 0, Math.PI * 2);
                c.fill();
                // Bump
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

        // -- Scratch / scuff marks (wear and tear) --
        c.save();
        c.globalAlpha = 0.16;
        [
            [36, 58, 70, 84, 1.5],
            [172, 103, 209, 120, 1],
            [58, 294, 94, 338, 1],
            [148, 198, 174, 228, 1.5],
            [200, 392, 231, 414, 1],
            [115, 150, 138, 178, 1]
        ].forEach(function(s) {
            c.strokeStyle = '#909090';
            c.lineWidth = s[4];
            c.beginPath();
            c.moveTo(s[0], s[1]);
            c.lineTo(s[2], s[3]);
            c.stroke();
        });
        c.restore();

        // -- Hazard stripe: yellow/black diagonals at bottom --
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
        // Top border of stripe
        c.fillStyle = '#1a1a1a';
        c.fillRect(0, hY, W, 3);
        c.restore();
        // Bump: stripe is flat
        b.fillStyle = '#808080';
        b.fillRect(0, hY, W, HAZARD_H);

        // -- Side-edge vignette darkening --
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

    function buildMaterials() {
        var doorTex = createDoorTexture();
        var diffMap = new THREE.CanvasTexture(doorTex.map);
        var bumpMap = new THREE.CanvasTexture(doorTex.bumpMap);
        diffMap.wrapS = diffMap.wrapT = THREE.ClampToEdgeWrapping;
        bumpMap.wrapS = bumpMap.wrapT = THREE.ClampToEdgeWrapping;

        // Shared material used for the door panel mesh at all times.
        // Visibility + Y position drive the open/closed appearance.
        var doorMat = new THREE.MeshStandardMaterial({
            map: diffMap,
            bumpMap: bumpMap,
            bumpScale: 0.55,
            roughness: 0.62,
            metalness: 0.52,
            envMapIntensity: 0.0
        });
        MAT_DOOR_OPEN = doorMat;
        MAT_DOOR_CLOSED = doorMat;
        // Corridor materials — all MeshBasicMaterial so they show correctly regardless of lighting
        MAT_HALL_DARK = new THREE.MeshBasicMaterial({ color: 0x000000 }); // pure black when off
        MAT_HALL_WALL = new THREE.MeshBasicMaterial({ color: 0xffe8c0 }); // bright warm fluorescent lit wall
        MAT_HALL_FLOOR = new THREE.MeshBasicMaterial({ color: 0x504030 }); // medium dark concrete floor
        MAT_HALL_CEIL = new THREE.MeshBasicMaterial({ color: 0xf8f0e0 }); // near-white lit ceiling
    }

    function mat(hex, emissive, emHex) {
        var opts = { color: hex };
        if (emissive) {
            opts.emissive = emHex !== undefined ? emHex : hex;
            opts.emissiveIntensity = 0.6;
        }
        return new THREE.MeshLambertMaterial(opts);
    }

    function box(parent, w, h, d, x, y, z, material) {
        var m = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            material || new THREE.MeshLambertMaterial({ color: 0xffffff })
        );
        m.position.set(x, y, z);
        parent.add(m);
        return m;
    }

    function buildRoom() {
        var RW = 22,
            RH = 11,
            RD = 18;
        var HW = RW / 2;
        var HD = RD / 2;

        var mBackWall = mat(0x9c9a94); // FNAF1 canonical gray wall
        var mSideWall = mat(0x8a8880); // gray side walls
        var mDarkWall = mat(0x282828); // dark areas beside doors
        var mFloor = mat(0x1a1610); // dark linoleum floor
        var mCeil = mat(0x20201a); // dark ceiling
        var mHall = mat(0x100c06);
        var mDesk = mat(0x3a2818);
        var mDeskFront = mat(0x1e1008);
        var mPoster = mat(0x6a4c2c);
        var mPosterTxt = mat(0xf0d060, true);
        var mDrawing = mat(0x302418);
        var mFanHub = mat(0x888888);
        var mFanBlade = new THREE.MeshLambertMaterial({ color: 0xcccccc, side: THREE.DoubleSide });
        var mMonBody = mat(0x141414);
        var mMonScreen = mat(0x0a1a0a, true, 0x003300);
        var mCup = mat(0xb84040);
        var mPaper = mat(0xd0c0a0);
        var mLightBody = mat(0x222018);
        var mBulb = mat(0xffe870, true, 0xffe870);
        var mDoorFrame = mat(0x28180a);
        var mTrim = mat(0x241a0c);

        box(scene, RW, RH, 0.5, 0, RH / 2, -HD, mBackWall);
        box(scene, RW, 0.3, RD, 0, 0, 0, mFloor);
        box(scene, RW, 0.3, RD, 0, RH, 0, mCeil);

        var dW = 4,
            dH = 8;
        var sZ = dW / 2;

        box(scene, 0.4, RH - dH, RD, -HW, dH + (RH - dH) / 2, 0, mSideWall);
        box(scene, 0.4, dH, HD - sZ, -HW, dH / 2, -(HD + sZ) / 2, mDarkWall);
        box(scene, 0.4, dH, HD - sZ, -HW, dH / 2, (HD + sZ) / 2, mSideWall);
        box(scene, 0.4, RH - dH, RD, HW, dH + (RH - dH) / 2, 0, mSideWall);
        box(scene, 0.4, dH, HD - sZ, HW, dH / 2, -(HD + sZ) / 2, mDarkWall);
        box(scene, 0.4, dH, HD - sZ, HW, dH / 2, (HD + sZ) / 2, mSideWall);

        [-HW, HW].forEach(function(x) {
            var s = x < 0 ? 0.3 : -0.3;
            box(scene, 0.5, dH + 0.2, 0.4, x + s, dH / 2, -sZ, mDoorFrame);
            box(scene, 0.5, dH + 0.2, 0.4, x + s, dH / 2, sZ, mDoorFrame);
            box(scene, 0.5, 0.4, dW + 0.4, x + s, dH, 0, mDoorFrame);
        });

        // Door panels — initialised above the frame (DOOR_OPEN_Y) and hidden.
        // Spring physics in animate() slides them down/up.
        doorLeftPanel = box(scene, 0.5, dH, dW - 0.2, -HW, DOOR_OPEN_Y, 0, MAT_DOOR_CLOSED);
        doorRightPanel = box(scene, 0.5, dH, dW - 0.2, HW, DOOR_OPEN_Y, 0, MAT_DOOR_CLOSED);
        doorLeftPanel.visible = false;
        doorRightPanel.visible = false;

        // Door-slot housing — dark box above each door frame that visually
        // conceals the door panel as it retracts upward into the wall.
        var mDoorSlot = mat(0x28180a);
        box(scene, 0.75, RH - dH + 0.6, dW + 0.3, -HW, dH + (RH - dH) / 2, 0, mDoorSlot);
        box(scene, 0.75, RH - dH + 0.6, dW + 0.3, HW, dH + (RH - dH) / 2, 0, mDoorSlot);

        [-1, 1].forEach(function(s) {
            var cx = s * (HW + 4);
            // corridor geometry — always uses lit materials; aperture cover handles darkness
            var m0 = box(scene, 8, 0.3, RD, cx, 0, 0, MAT_HALL_FLOOR); // floor
            var m1 = box(scene, 8, 0.3, RD, cx, RH, 0, MAT_HALL_CEIL); // ceiling
            var m2 = box(scene, 8, RH, 0.4, cx, RH / 2, -HD, MAT_HALL_WALL); // back wall
            var m3 = box(scene, 0.3, RH, RD, s * (HW + 8), RH / 2, 0, MAT_HALL_WALL); // outer wall
            var m4 = box(scene, 8, RH, 0.4, cx, RH / 2, HD, MAT_HALL_WALL); // front wall
            if (s < 0) { hallMeshesLeft = [m0, m1, m2, m3, m4]; } else { hallMeshesRight = [m0, m1, m2, m3, m4]; }
        });

        box(scene, RW, 0.25, 0.3, 0, RH - 0.1, -HD + 0.3, mTrim);
        box(scene, RW, 0.25, 0.3, 0, 0.15, -HD + 0.3, mTrim);

        // ---- CELEBRATE poster (FNAF1 canonical — Freddy/Bonnie/Chica on stage) ----
        (function() {
            var W = 512,
                H = 448;
            var cv = document.createElement('canvas');
            cv.width = W;
            cv.height = H;
            var ctx = cv.getContext('2d');
            // Dark purple/blue stage atmosphere
            var bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#18082c');
            bg.addColorStop(1, '#3c1450');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);
            // Stars
            for (var st = 0; st < 55; st++) {
                var sv = 0.25 + Math.abs(Math.sin(st * 7.3)) * 0.65;
                ctx.fillStyle = 'rgba(255,255,200,' + sv + ')';
                ctx.fillRect(Math.abs(Math.sin(st * 2.7)) * W, Math.abs(Math.sin(st * 3.1)) * H * 0.52, 2, 2);
            }
            // Red curtain left, blue curtain right
            ctx.fillStyle = 'rgba(160,18,18,0.68)';
            ctx.fillRect(0, 0, 55, H);
            ctx.fillStyle = 'rgba(18,18,160,0.68)';
            ctx.fillRect(W - 55, 0, 55, H);
            // Stage platform
            var sY = Math.floor(H * 0.70);
            ctx.fillStyle = '#5c3a18';
            ctx.fillRect(0, sY, W, H - sY);
            ctx.fillStyle = '#2c1808';
            ctx.fillRect(0, sY, W, 5);
            // Freddy (center, brown bear, top hat)
            var fxC = Math.floor(W / 2);
            ctx.fillStyle = '#4a2e10';
            ctx.fillRect(fxC - 26, sY - 88, 52, 68);
            ctx.fillStyle = '#6a4020';
            ctx.fillRect(fxC - 16, sY - 78, 32, 48);
            ctx.fillStyle = '#4a2e10';
            ctx.beginPath();
            ctx.arc(fxC, sY - 112, 31, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(fxC - 32, sY - 133, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(fxC + 32, sY - 133, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a0808';
            ctx.fillRect(fxC - 24, sY - 153, 48, 8);
            ctx.fillRect(fxC - 16, sY - 196, 32, 46);
            ctx.fillStyle = '#e8e8e4';
            ctx.beginPath();
            ctx.arc(fxC - 11, sY - 115, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(fxC + 11, sY - 115, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#080808';
            ctx.beginPath();
            ctx.arc(fxC - 11, sY - 115, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(fxC + 11, sY - 115, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f0c878';
            ctx.beginPath();
            ctx.arc(fxC, sY - 109, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(fxC, sY - 18);
            ctx.lineTo(fxC, sY);
            ctx.stroke();
            // Bonnie (left, purple rabbit, guitar)
            var bxC = Math.floor(W * 0.22);
            ctx.fillStyle = '#3a1870';
            ctx.fillRect(bxC - 20, sY - 82, 40, 62);
            ctx.fillRect(bxC - 18, sY - 178, 12, 70);
            ctx.fillRect(bxC + 6, sY - 178, 12, 70);
            ctx.fillStyle = '#c870b0';
            ctx.fillRect(bxC - 15, sY - 174, 6, 58);
            ctx.fillRect(bxC + 9, sY - 174, 6, 58);
            ctx.fillStyle = '#3a1870';
            ctx.beginPath();
            ctx.arc(bxC, sY - 100, 26, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#aa48ff';
            ctx.beginPath();
            ctx.arc(bxC - 9, sY - 102, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(bxC + 9, sY - 102, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#cc0000';
            ctx.beginPath();
            ctx.arc(bxC - 9, sY - 102, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(bxC + 9, sY - 102, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#7a4820';
            ctx.fillRect(bxC + 15, sY - 58, 8, 34);
            ctx.beginPath();
            ctx.arc(bxC + 19, sY - 30, 12, 0, Math.PI * 2);
            ctx.fill();
            // Chica (right, yellow chicken, cupcake)
            var chxC = Math.floor(W * 0.78);
            ctx.fillStyle = '#c88010';
            ctx.fillRect(chxC - 22, sY - 85, 44, 65);
            ctx.beginPath();
            ctx.arc(chxC, sY - 107, 28, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f0a820';
            ctx.beginPath();
            ctx.moveTo(chxC - 10, sY - 105);
            ctx.lineTo(chxC + 10, sY - 105);
            ctx.lineTo(chxC, sY - 93);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#f4f4f4';
            ctx.beginPath();
            ctx.arc(chxC - 11, sY - 114, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(chxC + 11, sY - 114, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#080808';
            ctx.beginPath();
            ctx.arc(chxC - 11, sY - 114, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(chxC + 11, sY - 114, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#e03030';
            ctx.fillRect(chxC + 28, sY - 62, 16, 16);
            ctx.fillStyle = '#f0d0c0';
            ctx.beginPath();
            ctx.arc(chxC + 36, sY - 62, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff2020';
            ctx.beginPath();
            ctx.arc(chxC + 36, sY - 67, 4, 0, Math.PI * 2);
            ctx.fill();
            // "CELEBRATE!" text
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 16;
            ctx.fillStyle = '#ffe800';
            ctx.font = 'bold 60px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('CELEBRATE!', W / 2, 10);
            ctx.shadowBlur = 0;
            // Gold border
            ctx.strokeStyle = '#f0c020';
            ctx.lineWidth = 7;
            ctx.strokeRect(3, 3, W - 6, H - 6);
            var posterTex = new THREE.CanvasTexture(cv);
            var posterMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(9.2, 7.8),
                new THREE.MeshLambertMaterial({ map: posterTex })
            );
            posterMesh.position.set(3.5, 7.0, -HD + 0.32);
            posterMesh.rotation.y = Math.PI;
            scene.add(posterMesh);
            // Freddy's nose — small sphere (honk easter egg)
            var noseMsh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), mat(0xf0c878));
            noseMsh.position.set(3.5, 6.68, -HD + 0.45);
            scene.add(noseMsh);
        })();

        var lh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 16), mLightBody);
        lh.position.set(0, RH - 0.25, 1.0);
        scene.add(lh);
        var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), mBulb);
        bulb.position.set(0, RH - 0.6, 1.0);
        scene.add(bulb);

        box(scene, 18, 0.4, 5.5, 0, 2.2, 7.2, mDesk);
        box(scene, 18, 2.4, 0.4, 0, 1.0, 9.45, mDeskFront);

        fanPivot = new THREE.Object3D();
        fanPivot.position.set(0.2, 2.65, 6.8);
        scene.add(fanPivot);
        var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.15, 12), mFanHub);
        hub.rotation.x = Math.PI / 2;
        fanPivot.add(hub);
        for (var b = 0; b < 3; b++) {
            var blade = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.18), mFanBlade);
            blade.rotation.z = (b / 3) * Math.PI * 2;
            blade.position.set(Math.sin(blade.rotation.z) * 0.32, Math.cos(blade.rotation.z) * 0.32, 0);
            fanPivot.add(blade);
        }

        box(scene, 1.0, 0.8, 0.12, -2.6, 2.85, 6.75, mMonBody);
        box(scene, 0.88, 0.66, 0.14, -2.6, 2.85, 6.69, mMonScreen);
        // Second monitor (right of first)
        box(scene, 1.0, 0.8, 0.12, -1.2, 2.85, 6.75, mMonBody);
        box(scene, 0.88, 0.66, 0.14, -1.2, 2.85, 6.69, mMonScreen);
        // Mr. Cupcake — iconic pink cupcake with glowing eyes, sits on right monitor
        var mCpkW = mat(0xcc3344);
        var mCpkF = mat(0xf0b0a0);
        var cpkBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.14, 8), mCpkW);
        cpkBase.position.set(-1.2, 3.33, 6.7);
        scene.add(cpkBase);
        var cpkFrost = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mCpkF);
        cpkFrost.position.set(-1.2, 3.49, 6.7);
        scene.add(cpkFrost);
        var cpkCandle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 6), mat(0xf0e858));
        cpkCandle.position.set(-1.2, 3.63, 6.7);
        scene.add(cpkCandle);
        var cpkFlame = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), mat(0xff8820, true, 0xff4400));
        cpkFlame.position.set(-1.2, 3.72, 6.7);
        scene.add(cpkFlame);
        var mCpkEye = mat(0xffffff);
        var cpkEL = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 4), mCpkEye);
        cpkEL.position.set(-1.27, 3.48, 6.59);
        scene.add(cpkEL);
        var cpkER = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 4), mCpkEye);
        cpkER.position.set(-1.13, 3.48, 6.59);
        scene.add(cpkER);
        // Speaker with spider web — canonical desk prop
        (function() {
            var sw = 64,
                sh = 64;
            var scv = document.createElement('canvas');
            scv.width = sw;
            scv.height = sh;
            var sctx = scv.getContext('2d');
            sctx.fillStyle = '#141008';
            sctx.fillRect(0, 0, sw, sh);
            sctx.strokeStyle = '#282010';
            sctx.lineWidth = 1.5;
            for (var gi = 0; gi < 5; gi++) {
                sctx.beginPath();
                sctx.moveTo(4, 4 + gi * 12);
                sctx.lineTo(60, 4 + gi * 12);
                sctx.stroke();
                sctx.beginPath();
                sctx.moveTo(4 + gi * 12, 4);
                sctx.lineTo(4 + gi * 12, 60);
                sctx.stroke();
            }
            sctx.strokeStyle = 'rgba(230,230,200,0.58)';
            sctx.lineWidth = 0.9;
            var wcx = 52,
                wcy = 12,
                wR = 18;
            for (var wr = 4; wr <= wR; wr += 5) {
                sctx.beginPath();
                sctx.arc(wcx, wcy, wr, 0, Math.PI * 2);
                sctx.stroke();
            }
            for (var wa = 0; wa < 7; wa++) {
                var wang = wa / 7 * Math.PI * 2;
                sctx.beginPath();
                sctx.moveTo(wcx, wcy);
                sctx.lineTo(wcx + Math.cos(wang) * wR, wcy + Math.sin(wang) * wR);
                sctx.stroke();
            }
            var spkMat = new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(scv) });
            var spk = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 0.10), spkMat);
            spk.position.set(2.1, 2.68, 6.70);
            scene.add(spk);
        })();
        // Wires from monitors to ceiling
        var mWire = mat(0x1c1808);
        [
            [-2.54, 6.74],
            [-1.14, 6.74]
        ].forEach(function(w) {
            var wh = RH - 2.5;
            box(scene, 0.025, wh, 0.025, w[0], 2.45 + wh * 0.5, w[1], mWire);
        });

        var cup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.52, 8), mCup);
        cup.position.set(-3.8, 2.46, 7.1);
        scene.add(cup);

        var ballGeo = new THREE.SphereGeometry(0.1, 6, 4);
        [
            [-0.5, 2.26, 6.8],
            [0.8, 2.26, 7.3],
            [1.6, 2.26, 6.6]
        ].forEach(function(p) {
            var ball = new THREE.Mesh(ballGeo, mPaper);
            ball.position.set(p[0], p[1], p[2]);
            scene.add(ball);
        });
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

    function buildLighting() {
        scene.add(new THREE.AmbientLight(0xffd890, 0.42));

        // Main light from above-front
        var dir = new THREE.DirectionalLight(0xffc850, 0.82);
        dir.position.set(0, 10, 8);
        scene.add(dir);

        // Fill from right
        var fill = new THREE.DirectionalLight(0xffb040, 0.18);
        fill.position.set(5, 6, 4);
        scene.add(fill);

        // Rim from behind
        var rim = new THREE.DirectionalLight(0x301a08, 0.2);
        rim.position.set(0, 4, -10);
        scene.add(rim);

        // Side lights — illuminate the inward-facing door panels (±X normals)
        var sideR = new THREE.DirectionalLight(0xffd070, 0.7);
        sideR.position.set(18, 8, 4); // from +X → hits left door inner face
        scene.add(sideR);

        var sideL = new THREE.DirectionalLight(0xffd070, 0.7);
        sideL.position.set(-18, 8, 4); // from -X → hits right door inner face
        scene.add(sideL);

        // Hall lights — positioned at door-aperture height (y=4) just past the room wall
        // so the light shines through the door gap outward and illuminates the visible corridor
        hallLightLeft = new THREE.PointLight(0xfff0d0, 0, 30);
        hallLightLeft.position.set(-12, 4, 0);
        scene.add(hallLightLeft);

        hallLightRight = new THREE.PointLight(0xfff0d0, 0, 30);
        hallLightRight.position.set(12, 4, 0);
        scene.add(hallLightRight);
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

    function buildHallAnimatronics() {
        function makeGroup(mat) {
            var g = new THREE.Group();
            // Body
            var body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 4.2, 1.8), mat);
            body.position.set(0, 2.1, 0);
            g.add(body);
            // Head
            var head = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), mat);
            head.position.set(0, 5.1, 0);
            g.add(head);
            // White glowing eyes
            var eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            var eyeGeo = new THREE.BoxGeometry(0.28, 0.22, 0.12);
            var eL = new THREE.Mesh(eyeGeo, eyeMat);
            eL.position.set(-0.38, 5.2, 0.92);
            g.add(eL);
            var eR = new THREE.Mesh(eyeGeo, eyeMat);
            eR.position.set(0.38, 5.2, 0.92);
            g.add(eR);
            g.visible = false;
            return g;
        }
        // MeshBasicMaterial so animatronics are always clearly visible regardless of hall lighting
        hallAnimLeftMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
        hallAnimRightMat = new THREE.MeshBasicMaterial({ color: 0x888888 });

        hallAnimLeftGroup = makeGroup(hallAnimLeftMat);
        // x=-12: just inside corridor, directly in line with door gap from camera
        // rotation.y = Math.PI/2 so the animatronic faces +X (toward the office / camera)
        hallAnimLeftGroup.position.set(-12, 0, 0);
        hallAnimLeftGroup.rotation.y = Math.PI / 2;
        scene.add(hallAnimLeftGroup);

        hallAnimRightGroup = makeGroup(hallAnimRightMat);
        // mirror: x=+12, face -X toward the office
        hallAnimRightGroup.position.set(12, 0, 0);
        hallAnimRightGroup.rotation.y = -Math.PI / 2;
        scene.add(hallAnimRightGroup);
    }

    // Spring-physics step for a single door panel.
    // anim: { pos, vel, target }  |  panel: THREE.Mesh
    function tickDoorAnim(anim, panel) {
        if (!panel) return;
        var diff = anim.target - anim.pos;
        var moving = Math.abs(diff) > DOOR_THRESHOLD || Math.abs(anim.vel) > DOOR_THRESHOLD;
        if (moving) {
            anim.vel += diff * DOOR_SPRING_K;
            anim.vel *= (1.0 - DOOR_DAMPING);
            anim.pos += anim.vel;
            // Allow a tiny overshoot for physical bounce feel
            if (anim.pos < -0.04) {
                anim.pos = -0.04;
                anim.vel *= -0.3;
            }
            if (anim.pos > 1.04) {
                anim.pos = 1.04;
                anim.vel *= -0.3;
            }
        } else {
            anim.pos = anim.target;
            anim.vel = 0.0;
        }
        // pos=1 → closed (DOOR_CLOSED_Y), pos=0 → open (DOOR_OPEN_Y)
        panel.position.y = DOOR_CLOSED_Y + (1.0 - anim.pos) * (DOOR_OPEN_Y - DOOR_CLOSED_Y);
        // Hide once fully retracted while opening
        if (anim.target < 0.5 && anim.pos < 0.08) {
            panel.visible = false;
        }
    }

    function animate() {
        if (!renderer || !scene || !camera) return;
        animId = requestAnimationFrame(animate);

        var edge = 0.28,
            target;
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

        // Animate both doors with spring physics
        tickDoorAnim(doorAnimLeft, doorLeftPanel);
        tickDoorAnim(doorAnimRight, doorRightPanel);

        if (fanPivot) fanPivot.rotation.z += 0.06;

        try {
            renderer.render(scene, camera);
        } catch (e) {
            console.error('[office3d animate] render error:', e);
        }
    }

    function setDoorLeft(closed) {
        if (!doorLeftPanel) return;
        doorAnimLeft.target = closed ? 1.0 : 0.0;
        if (closed) {
            // Make visible immediately so the panel is seen dropping in
            doorLeftPanel.visible = true;
            // Reset position to just above the frame so it always drops down cleanly
            if (doorAnimLeft.pos < 0.05) {
                doorAnimLeft.pos = 0.0;
                doorAnimLeft.vel = 0.0;
            }
        }
        if (wallBtns.doorLeft) {
            wallBtns.doorLeft.active = closed;
            _refreshBtn('doorLeft');
        }
    }

    function setDoorRight(closed) {
        if (!doorRightPanel) return;
        doorAnimRight.target = closed ? 1.0 : 0.0;
        if (closed) {
            doorRightPanel.visible = true;
            if (doorAnimRight.pos < 0.05) {
                doorAnimRight.pos = 0.0;
                doorAnimRight.vel = 0.0;
            }
        }
        if (wallBtns.doorRight) {
            wallBtns.doorRight.active = closed;
            _refreshBtn('doorRight');
        }
    }

    function setLightLeft(on) {
        hallLeftLightOn = on;
        if (hallLightLeft) hallLightLeft.intensity = on ? 24 : 0;
        if (hallApertureLeft) hallApertureLeft.visible = !on;
        hallDecorLeft.forEach(function(m) { m.visible = on; });
        updateHallVis('left');
        if (wallBtns.lightLeft) {
            wallBtns.lightLeft.active = on;
            _refreshBtn('lightLeft');
        }
    }

    function setLightRight(on) {
        hallRightLightOn = on;
        if (hallLightRight) hallLightRight.intensity = on ? 24 : 0;
        if (hallApertureRight) hallApertureRight.visible = !on;
        hallDecorRight.forEach(function(m) { m.visible = on; });
        updateHallVis('right');
        if (wallBtns.lightRight) {
            wallBtns.lightRight.active = on;
            _refreshBtn('lightRight');
        }
    }

    function setHallLeft(colorCss) {
        hallLeftPresent = colorCss != null;
        if (hallAnimLeftMat && colorCss != null) hallAnimLeftMat.color.setStyle(colorCss);
        updateHallVis('left');
    }

    function setHallRight(colorCss) {
        hallRightPresent = colorCss != null;
        if (hallAnimRightMat && colorCss != null) hallAnimRightMat.color.setStyle(colorCss);
        updateHallVis('right');
    }

    function updateHallVis(side) {
        if (side === 'left' && hallAnimLeftGroup) hallAnimLeftGroup.visible = hallLeftLightOn && hallLeftPresent;
        if (side === 'right' && hallAnimRightGroup) hallAnimRightGroup.visible = hallRightLightOn && hallRightPresent;
    }

    function setMouse(normX) { mouseNorm = normX; }

    function show() {
        var c = document.getElementById('officeScene');
        if (c) {
            c.style.display = '';
            // Force immediate re-layout
            void c.offsetHeight;
        }
        // Ensure animation loop is running
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
        
        // Safeguard against zero-sized containers
        if (w < 10 || h < 10) {
            console.warn('[office3d resize] skipping resize: container too small (' + w + 'x' + h + ')');
            return;
        }
        
        var newAspect = w / h;
        var oldAspect = camera.aspect;
        
        // Only update if aspect ratio changed significantly (>1% difference)
        if (Math.abs(newAspect - oldAspect) > 0.01 || renderer.domElement.width !== w || renderer.domElement.height !== h) {
            camera.aspect = newAspect;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            console.log('[office3d resize] resized to ' + w + 'x' + h + ' (aspect ' + newAspect.toFixed(2) + ')');
        }
    }

    // =========================================================
    // WALL BUTTON PANELS — 3D clickable panels on office walls
    // =========================================================
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
        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        _roundRect(ctx, 8, 10, W - 16, H - 20, 16);
        ctx.fill();

        // Main black glossy holder
        var gMain = ctx.createLinearGradient(0, 0, 0, H);
        gMain.addColorStop(0, '#171717');
        gMain.addColorStop(0.55, '#070707');
        gMain.addColorStop(1, '#030303');
        ctx.fillStyle = gMain;
        _roundRect(ctx, 12, 14, W - 24, H - 28, 14);
        ctx.fill();

        // Inner recess
        ctx.fillStyle = '#040404';
        _roundRect(ctx, 24, 30, W - 48, H - 60, 10);
        ctx.fill();

        // Holder edge lighting
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(24, 30, 3, H - 60);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(W - 27, 30, 3, H - 60);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(24, 30, W - 48, 2);

        // Soft center sheen
        var gSheen = ctx.createLinearGradient(0, 0, W, 0);
        gSheen.addColorStop(0, 'rgba(255,255,255,0)');
        gSheen.addColorStop(0.5, 'rgba(255,255,255,0.04)');
        gSheen.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gSheen;
        _roundRect(ctx, 30, 36, W - 60, H - 72, 8);
        ctx.fill();

        var btnSize = Math.round(W * 0.44);
        var bx = Math.round((W - btnSize) / 2);
        var doorY = 58;
        var lightY = 260;

        function drawSquareButton(y, on, isDoor) {
            var bg = ctx.createLinearGradient(0, y, 0, y + btnSize);
            if (isDoor) {
                bg.addColorStop(0, on ? '#ff4a4a' : '#c52626');
                bg.addColorStop(0.62, on ? '#d12020' : '#961515');
                bg.addColorStop(1, on ? '#9f1313' : '#630d0d');
            } else {
                bg.addColorStop(0, on ? '#fff6d6' : '#efefef');
                bg.addColorStop(0.62, on ? '#f0e7be' : '#cfcfcf');
                bg.addColorStop(1, on ? '#d6cca1' : '#9f9f9f');
            }

            // Button body
            ctx.fillStyle = bg;
            ctx.fillRect(bx, y, btnSize, btnSize);

            // Bevel + border
            ctx.fillStyle = 'rgba(255,255,255,0.40)';
            ctx.fillRect(bx, y, btnSize, 3);
            ctx.fillRect(bx, y, 3, btnSize);
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(bx, y + btnSize - 3, btnSize, 3);
            ctx.fillRect(bx + btnSize - 3, y, 3, btnSize);
            ctx.strokeStyle = '#131313';
            ctx.lineWidth = 4;
            ctx.strokeRect(bx - 1.5, y - 1.5, btnSize + 3, btnSize + 3);

            // Active glow
            if (on) {
                var glow = ctx.createRadialGradient(
                    bx + btnSize / 2,
                    y + btnSize / 2,
                    0,
                    bx + btnSize / 2,
                    y + btnSize / 2,
                    btnSize * 0.9
                );
                if (isDoor) {
                    glow.addColorStop(0, 'rgba(255,80,80,0.32)');
                    glow.addColorStop(1, 'rgba(255,80,80,0)');
                } else {
                    glow.addColorStop(0, 'rgba(255,245,185,0.34)');
                    glow.addColorStop(1, 'rgba(255,245,185,0)');
                }
                ctx.fillStyle = glow;
                ctx.fillRect(bx - btnSize * 0.25, y - btnSize * 0.25, btnSize * 1.5, btnSize * 1.5);
            }
        }

        drawSquareButton(doorY, doorOn, true);
        drawSquareButton(lightY, lightOn, false);

        // Labels
        ctx.fillStyle = '#f3f3f3';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 72px Arial Black, Arial, sans-serif';
        ctx.fillText('DOOR', W / 2, 238);
        ctx.fillText('LIGHT', W / 2, 446);

        // Slight text shadow for retro look
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = 2;
        ctx.strokeText('DOOR', W / 2, 238);
        ctx.strokeText('LIGHT', W / 2, 446);

        panel.tex.needsUpdate = true;
    }

    function _refreshBtn(id) {
        var b = wallBtns[id];
        if (!b) return;
        _refreshBtnPanel(b.side);
    }

    function buildWallButtons() {
        // FNAF1-style holder: one vertical panel per side with DOOR (red, top)
        // and LIGHT (white, bottom). Separate transparent hitboxes handle clicks.
        var PANEL_W = 2.55,
            PANEL_H = 4.9;
        var HIT_W = 1.08,
            HIT_H = 1.08;
        var TW = 256,
            TH = 512;
        var sides = [
            { side: 'left', x: -10.61, y: 3.65, z: 2.3, ry: Math.PI / 2, nx: 0.03 },
            { side: 'right', x: 10.61, y: 3.65, z: 2.3, ry: -Math.PI / 2, nx: -0.03 }
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
            var hitMatDoor = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
            var hitMatLight = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
            var hitGeo = new THREE.PlaneGeometry(HIT_W, HIT_H);

            var doorId = s.side === 'left' ? 'doorLeft' : 'doorRight';
            var lightId = s.side === 'left' ? 'lightLeft' : 'lightRight';

            var doorHit = new THREE.Mesh(hitGeo, hitMatDoor);
            doorHit.position.set(s.x + s.nx, s.y + 1.10, s.z);
            doorHit.rotation.y = s.ry;
            doorHit.userData.btnId = doorId;
            scene.add(doorHit);

            var lightHit = new THREE.Mesh(hitGeo, hitMatLight);
            lightHit.position.set(s.x + s.nx, s.y - 0.82, s.z);
            lightHit.rotation.y = s.ry;
            lightHit.userData.btnId = lightId;
            scene.add(lightHit);

            wallBtns[doorId] = { mesh: doorHit, side: s.side, kind: 'door', active: false };
            wallBtns[lightId] = { mesh: lightHit, side: s.side, kind: 'light', active: false };
        });

        _refreshBtnPanel('left');
        _refreshBtnPanel('right');
        raycaster3D = new THREE.Raycaster();
    }

})();
