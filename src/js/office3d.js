/**
 * office3d.js - Three.js 3D office for FNAF
 * Requires Three.js loaded via CDN before this file.
 * Exposes window.office3d = { init, setDoorLeft, setDoorRight, setMouse, show, hide, resize }
 *
 * Room layout (units):
 *   Width  X: -11 to +11  (22 wide)
 *   Height Y:   0 to +11  (11 tall)
 *   Depth  Z:  -9 to  +9  (18 deep)
 *   Camera: (0, 4, 7.5) looking toward z=-9 (back wall)
 *
 * Lighting: AmbientLight 0.9 + DirectionalLights (no shadows for performance)
 * Fog: THREE.Fog linear 18-32 (gentle, does not kill the back wall)
 */
(function () {
    'use strict';

    var scene, camera, renderer, animId;
    var doorLeftPanel, doorRightPanel;
    var hallLightLeft, hallLightRight;
    var hallDarknessLeft, hallDarknessRight;
    var hallAnimLeftGroup, hallAnimRightGroup;
    var hallAnimLeftMat,  hallAnimRightMat;
    var hallLeftLightOn  = false, hallRightLightOn  = false;
    var hallLeftPresent  = false, hallRightPresent  = false;
    var fanPivot;

    var mouseNorm   = 0.5;
    var currentRotY = 0;
    var MAX_ROT     = 0.62;
    var ROT_LERP    = 0.08;

    var MAT_DOOR_OPEN, MAT_DOOR_CLOSED;

    window.office3d = {
        init:          init,
        setDoorLeft:   setDoorLeft,
        setDoorRight:  setDoorRight,
        setLightLeft:  setLightLeft,
        setLightRight: setLightRight,
        setHallLeft:   setHallLeft,
        setHallRight:  setHallRight,
        setMouse:      setMouse,
        show:          show,
        hide:          hide,
        resize:        onResize
    };

    function init() {
        var container = document.getElementById('officeScene');
        if (!container) { console.warn('[office3d] #officeScene not found'); return; }
        if (typeof THREE === 'undefined') { console.warn('[office3d] Three.js not loaded'); return; }

        if (animId) { cancelAnimationFrame(animId); animId = null; }
        container.innerHTML = '';

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1208);
        scene.fog = new THREE.Fog(0x1a1208, 18, 32);

        var w = container.clientWidth  || window.innerWidth;
        var h = container.clientHeight || window.innerHeight;
        camera = new THREE.PerspectiveCamera(72, w / h, 0.1, 60);
        camera.position.set(0, 4.0, 7.5);
        camera.rotation.order = 'YXZ';

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h);
        renderer.shadowMap.enabled = false;
        renderer.toneMapping = THREE.NoToneMapping;
        container.appendChild(renderer.domElement);

        buildMaterials();
        buildRoom();
        buildLighting();
        buildHallDarkness();
        buildHallAnimatronics();

        window.addEventListener('resize', onResize);
        animate();
        console.log('[office3d] initialized ' + w + 'x' + h + ' | bg=' + scene.background.getHexString() + ' | lights=' + scene.children.filter(function(c){return c.isLight;}).length);
        // Force a test render immediately
        renderer.render(scene, camera);
        console.log('[office3d] test render done — canvas size: ' + renderer.domElement.width + 'x' + renderer.domElement.height);
    }

    function buildMaterials() {
        MAT_DOOR_OPEN   = new THREE.MeshLambertMaterial({ color: 0x2a1e10 });
        MAT_DOOR_CLOSED = new THREE.MeshLambertMaterial({ color: 0x707070 });
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
        var RW = 22, RH = 11, RD = 18;
        var HW = RW / 2;
        var HD = RD / 2;

        var mBackWall  = mat(0xb89060);
        var mSideWall  = mat(0x8a6840);
        var mDarkWall  = mat(0x3a2810);
        var mFloor     = mat(0x2a1e0e);
        var mCeil      = mat(0x181008);
        var mHall      = mat(0x100c06);
        var mDesk      = mat(0x3a2818);
        var mDeskFront = mat(0x1e1008);
        var mPoster    = mat(0x6a4c2c);
        var mPosterTxt = mat(0xf0d060, true);
        var mDrawing   = mat(0x302418);
        var mFanHub    = mat(0x888888);
        var mFanBlade  = new THREE.MeshLambertMaterial({ color: 0xcccccc, side: THREE.DoubleSide });
        var mMonBody   = mat(0x141414);
        var mMonScreen = mat(0x0a1a0a, true, 0x003300);
        var mCup       = mat(0xb84040);
        var mPaper     = mat(0xd0c0a0);
        var mLightBody = mat(0x222018);
        var mBulb      = mat(0xffe870, true, 0xffe870);
        var mDoorFrame = mat(0x28180a);
        var mTrim      = mat(0x241a0c);

        box(scene, RW, RH, 0.5,  0,    RH/2,  -HD, mBackWall);
        box(scene, RW, 0.3, RD,  0,    0,      0,  mFloor);
        box(scene, RW, 0.3, RD,  0,    RH,     0,  mCeil);

        var dW = 4, dH = 8;
        var sZ = dW / 2;

        box(scene, 0.4, RH - dH, RD,    -HW, dH + (RH-dH)/2,  0,          mSideWall);
        box(scene, 0.4, dH, HD - sZ,    -HW, dH/2,            -(HD+sZ)/2, mDarkWall);
        box(scene, 0.4, dH, HD - sZ,    -HW, dH/2,             (HD+sZ)/2, mSideWall);
        box(scene, 0.4, RH - dH, RD,     HW, dH + (RH-dH)/2,  0,          mSideWall);
        box(scene, 0.4, dH, HD - sZ,     HW, dH/2,            -(HD+sZ)/2, mDarkWall);
        box(scene, 0.4, dH, HD - sZ,     HW, dH/2,             (HD+sZ)/2, mSideWall);

        [-HW, HW].forEach(function(x) {
            var s = x < 0 ? 0.3 : -0.3;
            box(scene, 0.5, dH + 0.2, 0.4,  x+s, dH/2, -sZ, mDoorFrame);
            box(scene, 0.5, dH + 0.2, 0.4,  x+s, dH/2,  sZ, mDoorFrame);
            box(scene, 0.5, 0.4, dW + 0.4,  x+s, dH,     0, mDoorFrame);
        });

        doorLeftPanel  = box(scene, 0.5, dH, dW - 0.2, -HW, dH/2, 0, MAT_DOOR_OPEN);
        doorRightPanel = box(scene, 0.5, dH, dW - 0.2,  HW, dH/2, 0, MAT_DOOR_OPEN);

        [-1, 1].forEach(function(s) {
            var cx = s * (HW + 4);
            box(scene, 8, 0.3, RD,   cx,  0,    0,   mHall);
            box(scene, 8, 0.3, RD,   cx,  RH,   0,   mHall);
            box(scene, 8, RH,  0.4,  cx,  RH/2, -HD, mHall);
            box(scene, 0.3, RH, RD,  s*(HW+8), RH/2, 0, mHall);
        });

        box(scene, RW, 0.25, 0.3,  0, RH - 0.1, -HD + 0.3, mTrim);
        box(scene, RW, 0.25, 0.3,  0, 0.15,     -HD + 0.3, mTrim);

        box(scene, 3.8, 5.0, 0.12,   0,    7.5, -HD + 0.3,  mPoster);
        box(scene, 3.2, 0.55, 0.18,  0,    8.4, -HD + 0.38, mPosterTxt);
        box(scene, 3.2, 0.55, 0.18,  0,    7.7, -HD + 0.38, mPosterTxt);
        box(scene, 3.2, 0.55, 0.18,  0,    7.0, -HD + 0.38, mPosterTxt);
        box(scene, 1.5, 2.0, 0.10, -4.5,  7.8, -HD + 0.28, mDrawing);
        box(scene, 1.5, 2.0, 0.10,  4.5,  7.8, -HD + 0.28, mDrawing);

        var lh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 16), mLightBody);
        lh.position.set(0, RH - 0.25, 1.0);
        scene.add(lh);
        var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), mBulb);
        bulb.position.set(0, RH - 0.6, 1.0);
        scene.add(bulb);

        box(scene, 18, 0.4, 5.5,   0, 2.2, 7.2,  mDesk);
        box(scene, 18, 2.4, 0.4,   0, 1.0, 9.45, mDeskFront);

        fanPivot = new THREE.Object3D();
        fanPivot.position.set(0.2, 2.65, 6.8);
        scene.add(fanPivot);
        var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.15, 12), mFanHub);
        hub.rotation.x = Math.PI / 2;
        fanPivot.add(hub);
        for (var b = 0; b < 3; b++) {
            var blade = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.18), mFanBlade);
            blade.rotation.z = (b / 3) * Math.PI * 2;
            blade.position.set(Math.sin(blade.rotation.z)*0.32, Math.cos(blade.rotation.z)*0.32, 0);
            fanPivot.add(blade);
        }

        box(scene, 1.0, 0.8, 0.12,   -2.6, 2.85, 6.75, mMonBody);
        box(scene, 0.88, 0.66, 0.14, -2.6, 2.85, 6.69, mMonScreen);

        var cup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.52, 8), mCup);
        cup.position.set(-3.8, 2.46, 7.1);
        scene.add(cup);

        var ballGeo = new THREE.SphereGeometry(0.1, 6, 4);
        [[-0.5,2.26,6.8],[0.8,2.26,7.3],[1.6,2.26,6.6]].forEach(function(p){
            var ball = new THREE.Mesh(ballGeo, mPaper);
            ball.position.set(p[0],p[1],p[2]);
            scene.add(ball);
        });
    }

    function buildLighting() {
        scene.add(new THREE.AmbientLight(0xffe0b0, 1.1));

        // Main light from above-front
        var dir = new THREE.DirectionalLight(0xffd070, 1.6);
        dir.position.set(0, 10, 8);
        scene.add(dir);

        // Fill from right
        var fill = new THREE.DirectionalLight(0xffb040, 0.4);
        fill.position.set(5, 6, 4);
        scene.add(fill);

        // Rim from behind
        var rim = new THREE.DirectionalLight(0x301a08, 0.3);
        rim.position.set(0, 4, -10);
        scene.add(rim);

        // Side lights — illuminate the inward-facing door panels (±X normals)
        var sideR = new THREE.DirectionalLight(0xffd070, 1.0);
        sideR.position.set(18, 8, 4);  // from +X → hits left door inner face
        scene.add(sideR);

        var sideL = new THREE.DirectionalLight(0xffd070, 1.0);
        sideL.position.set(-18, 8, 4); // from -X → hits right door inner face
        scene.add(sideL);

        // Hall lights — toggled by the light buttons; illuminate blind-spot corridors
        hallLightLeft  = new THREE.PointLight(0xffee88, 0, 22);
        hallLightLeft.position.set(-15, 6, 1);
        scene.add(hallLightLeft);

        hallLightRight = new THREE.PointLight(0xffee88, 0, 22);
        hallLightRight.position.set(15, 6, 1);
        scene.add(hallLightRight);
    }

    function buildHallDarkness() {
        // MeshBasicMaterial ignores all lighting — always renders as solid black.
        // These planes sit just inside each corridor entrance and block any ambient
        // light bleed when the hall light is off.
        // NOTE: RH=11, HD=9 — hardcoded because buildRoom() vars are not in scope.
        var darkMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
        var planeGeo = new THREE.PlaneGeometry(18, 11); // 18 deep (Z), 11 tall (Y)

        hallDarknessLeft = new THREE.Mesh(planeGeo, darkMat);
        hallDarknessLeft.rotation.y = Math.PI / 2;   // face toward +X (toward office)
        hallDarknessLeft.position.set(-11.6, 5.5, 0);
        scene.add(hallDarknessLeft);

        hallDarknessRight = new THREE.Mesh(planeGeo, darkMat);
        hallDarknessRight.rotation.y = -Math.PI / 2; // face toward -X (toward office)
        hallDarknessRight.position.set(11.6, 5.5, 0);
        scene.add(hallDarknessRight);
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
            var eyeMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: new THREE.Color(0xffffff), emissiveIntensity: 1.0 });
            var eyeGeo = new THREE.BoxGeometry(0.28, 0.22, 0.12);
            var eL = new THREE.Mesh(eyeGeo, eyeMat);
            eL.position.set(-0.38, 5.2, 0.92);
            g.add(eL);
            var eR = new THREE.Mesh(eyeGeo, eyeMat);
            eR.position.set( 0.38, 5.2, 0.92);
            g.add(eR);
            g.visible = false;
            return g;
        }
        hallAnimLeftMat  = new THREE.MeshLambertMaterial({ color: 0x888888 });
        hallAnimRightMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        hallAnimLeftGroup  = makeGroup(hallAnimLeftMat);
        hallAnimLeftGroup.position.set(-14, 0, 0);
        scene.add(hallAnimLeftGroup);
        hallAnimRightGroup = makeGroup(hallAnimRightMat);
        hallAnimRightGroup.position.set(14, 0, 0);
        scene.add(hallAnimRightGroup);
    }

    function animate() {
        animId = requestAnimationFrame(animate);

        var edge = 0.28, target;
        if (mouseNorm < edge) {
            target =  MAX_ROT * Math.pow(1 - mouseNorm / edge, 1.4);
        } else if (mouseNorm > 1 - edge) {
            target = -MAX_ROT * Math.pow((mouseNorm - (1 - edge)) / edge, 1.4);
        } else {
            target = 0;
        }
        currentRotY += (target - currentRotY) * ROT_LERP;
        camera.rotation.y = currentRotY;
        camera.rotation.x = 0;
        camera.rotation.z = 0;

        if (fanPivot) fanPivot.rotation.z += 0.06;

        renderer.render(scene, camera);
    }

    function setDoorLeft(closed) {
        if (doorLeftPanel) doorLeftPanel.material = closed ? MAT_DOOR_CLOSED : MAT_DOOR_OPEN;
    }
    function setDoorRight(closed) {
        if (doorRightPanel) doorRightPanel.material = closed ? MAT_DOOR_CLOSED : MAT_DOOR_OPEN;
    }
    function setLightLeft(on) {
        hallLeftLightOn = on;
        if (hallLightLeft)    hallLightLeft.intensity   = on ? 18 : 0;
        if (hallDarknessLeft) hallDarknessLeft.visible  = !on;
        updateHallVis('left');
    }
    function setLightRight(on) {
        hallRightLightOn = on;
        if (hallLightRight)    hallLightRight.intensity  = on ? 18 : 0;
        if (hallDarknessRight) hallDarknessRight.visible = !on;
        updateHallVis('right');
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
        if (side === 'left'  && hallAnimLeftGroup)  hallAnimLeftGroup.visible  = hallLeftLightOn  && hallLeftPresent;
        if (side === 'right' && hallAnimRightGroup) hallAnimRightGroup.visible = hallRightLightOn && hallRightPresent;
    }
    function setMouse(normX) { mouseNorm = normX; }

    function show() {
        var c = document.getElementById('officeScene');
        if (c) c.style.display = '';
        if (!animId) animate();
    }
    function hide() {
        var c = document.getElementById('officeScene');
        if (c) c.style.display = 'none';
    }

    function onResize() {
        var c = document.getElementById('officeScene');
        if (!c || !renderer || !camera) return;
        var w = c.clientWidth  || window.innerWidth;
        var h = c.clientHeight || window.innerHeight;
        if (w < 10 || h < 10) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }

})();