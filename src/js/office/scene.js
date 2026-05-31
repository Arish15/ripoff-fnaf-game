/**
 * scene.js — Three.js scene, camera, renderer setup
 */
import * as THREE from 'three';

export const MAX_ROT = 0.62;

export function buildScene(container) {
    var w = container.clientWidth || window.innerWidth;
    var h = container.clientHeight || window.innerHeight;
    
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1410);
    scene.fog = new THREE.Fog(0x1a1410, 16, 28);
    
    var camera = new THREE.PerspectiveCamera(72, w / h, 0.1, 60);
    camera.position.set(0, 4.0, 7.5);
    camera.rotation.order = 'YXZ';
    
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.NoToneMapping;
    
    return { renderer, scene, camera };
}
