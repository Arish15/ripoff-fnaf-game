/**
 * hall-lights.js — Hall light meshes and toggling
 */
import * as THREE from 'three';

export function buildHallLights(scene) {
    var hallLightLeft = new THREE.PointLight(0xfff0d0, 0, 30);
    hallLightLeft.position.set(-12, 4, 0);
    scene.add(hallLightLeft);
    
    var hallLightRight = new THREE.PointLight(0xfff0d0, 0, 30);
    hallLightRight.position.set(12, 4, 0);
    scene.add(hallLightRight);
    
    var dW = 4, dH = 8, HW = 11;
    var geo = new THREE.PlaneGeometry(dW + 0.4, dH + 0.4);
    var darkMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    var hallApertureLeft = new THREE.Mesh(geo, darkMat);
    hallApertureLeft.rotation.y = Math.PI / 2;
    hallApertureLeft.position.set(-(HW + 0.1), dH / 2, 0);
    scene.add(hallApertureLeft);
    
    var hallApertureRight = new THREE.Mesh(geo, darkMat);
    hallApertureRight.rotation.y = -Math.PI / 2;
    hallApertureRight.position.set(HW + 0.1, dH / 2, 0);
    scene.add(hallApertureRight);
    
    return {
        left: { light: hallLightLeft, aperture: hallApertureLeft },
        right: { light: hallLightRight, aperture: hallApertureRight }
    };
}

export function setHallLight(hallMesh, on) {
    if (hallMesh.light) hallMesh.light.intensity = on ? 24 : 0;
    if (hallMesh.aperture) hallMesh.aperture.visible = !on;
}
