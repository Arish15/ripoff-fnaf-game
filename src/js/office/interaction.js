/**
 * interaction.js — Raycaster button hitboxes for door/light controls
 */
import * as THREE from 'three';

export function buildButtonHitboxes(scene) {
    var PANEL_W = 0.8, PANEL_H = 1.6;
    var HIT_W = 0.48, HIT_H = 0.48;
    var sides = [
        { side: 'left', x: -10.61, y: 3.65, z: 3.5, ry: Math.PI / 2, nx: 0.03 },
        { side: 'right', x: 10.61, y: 3.65, z: 3.5, ry: -Math.PI / 2, nx: -0.03 }
    ];
    var hitboxes = {};
    var hitMatDoor = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    var hitMatLight = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    var hitGeo = new THREE.PlaneGeometry(HIT_W, HIT_H);
    sides.forEach(function(s) {
        var doorId = s.side === 'left' ? 'doorLeft' : 'doorRight';
        var lightId = s.side === 'left' ? 'lightLeft' : 'lightRight';
        var doorHit = new THREE.Mesh(hitGeo, hitMatDoor);
        doorHit.position.set(s.x + s.nx, s.y + 0.25, s.z);
        doorHit.rotation.y = s.ry;
        doorHit.userData.btnId = doorId;
        scene.add(doorHit);
        var lightHit = new THREE.Mesh(hitGeo, hitMatLight);
        lightHit.position.set(s.x + s.nx, s.y - 0.25, s.z);
        lightHit.rotation.y = s.ry;
        lightHit.userData.btnId = lightId;
        scene.add(lightHit);
        hitboxes[doorId] = doorHit;
        hitboxes[lightId] = lightHit;
    });
    return hitboxes;
}

export function setupInteraction(renderer, camera, hitboxes, onButtonClick) {
    var raycaster = new THREE.Raycaster();
    var hitMeshes = Object.keys(hitboxes).map(function(k) { return hitboxes[k]; });
    renderer.domElement.addEventListener('click', function(e) {
        var g = window.game;
        if (!g || !g.running || g.powerOutage) return;
        var rect = renderer.domElement.getBoundingClientRect();
        var mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(mouse, camera);
        var hits = raycaster.intersectObjects(hitMeshes);
        if (hits.length > 0) {
            var id = hits[0].object.userData.btnId;
            onButtonClick(id);
        }
    });
    renderer.domElement.addEventListener('mousemove', function(e) {
        var g = window.game;
        if (!g || !g.running || g.powerOutage) { renderer.domElement.style.cursor = 'default'; return; }
        var rect = renderer.domElement.getBoundingClientRect();
        var mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(mouse, camera);
        var hits = raycaster.intersectObjects(hitMeshes);
        renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'default';
    });
}
