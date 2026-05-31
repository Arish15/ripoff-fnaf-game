/**
 * room.js — Static room geometry (walls, floor, desk, fan, decorations)
 */
import * as THREE from 'three';

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

export function buildRoom(scene, materials) {
    var RW = 22, RH = 11, RD = 18;
    var HW = RW / 2, HD = RD / 2;
    
    var mBackWall = mat(0xc4b080);
    var mSideWall = mat(0xb8a878);
    var mDarkWall = mat(0x3a3228);
    var mFloor = mat(0x261f18);
    var mCeil = mat(0x28261a);
    var mHall = mat(0x100c06);
    var mDesk = mat(0x3a2818);
    var mDeskFront = mat(0x1e1008);
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
    
    var dW = 4, dH = 8, sZ = dW / 2;
    
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
    
    var mDoorSlot = mat(0x28180a);
    box(scene, 0.75, RH - dH + 0.6, dW + 0.3, -HW, dH + (RH - dH) / 2, 0, mDoorSlot);
    box(scene, 0.75, RH - dH + 0.6, dW + 0.3, HW, dH + (RH - dH) / 2, 0, mDoorSlot);
    
    [-1, 1].forEach(function(s) {
        var cx = s * (HW + 4);
        box(scene, 8, 0.3, RD, cx, 0, 0, materials.MAT_HALL_FLOOR);
        box(scene, 8, 0.3, RD, cx, RH, 0, materials.MAT_HALL_CEIL);
        box(scene, 8, RH, 0.4, cx, RH / 2, -HD, materials.MAT_HALL_WALL);
        box(scene, 0.3, RH, RD, s * (HW + 8), RH / 2, 0, materials.MAT_HALL_WALL);
        box(scene, 8, RH, 0.4, cx, RH / 2, HD, materials.MAT_HALL_WALL);
    });
    
    box(scene, RW, 0.25, 0.3, 0, RH - 0.1, -HD + 0.3, mTrim);
    box(scene, RW, 0.25, 0.3, 0, 0.15, -HD + 0.3, mTrim);
    
    var lh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 16), mLightBody);
    lh.position.set(0, RH - 0.25, 1.0);
    scene.add(lh);
    var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), mBulb);
    bulb.position.set(0, RH - 0.6, 1.0);
    scene.add(bulb);
    
    box(scene, 18, 0.4, 5.5, 0, 2.2, 7.2, mDesk);
    box(scene, 18, 2.4, 0.4, 0, 1.0, 9.45, mDeskFront);
    
    var fanPivot = new THREE.Object3D();
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
    box(scene, 1.0, 0.8, 0.12, -1.2, 2.85, 6.75, mMonBody);
    box(scene, 0.88, 0.66, 0.14, -1.2, 2.85, 6.69, mMonScreen);
    
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
    
    var cup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.52, 8), mCup);
    cup.position.set(-3.8, 2.46, 7.1);
    scene.add(cup);
    
    var ballGeo = new THREE.SphereGeometry(0.1, 6, 4);
    [[-0.5, 2.26, 6.8], [0.8, 2.26, 7.3], [1.6, 2.26, 6.6]].forEach(function(p) {
        var ball = new THREE.Mesh(ballGeo, mPaper);
        ball.position.set(p[0], p[1], p[2]);
        scene.add(ball);
    });
    
    return { fan: fanPivot };
}
