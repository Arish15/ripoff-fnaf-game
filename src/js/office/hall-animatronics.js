/**
 * hall-animatronics.js — Hall silhouette meshes for animatronics
 */
import * as THREE from 'three';

function makeBonnie() {
    var g = new THREE.Group();
    var mat = new THREE.MeshBasicMaterial({ color: 0x4a2880 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 4.2, 1.8), mat);
    body.position.set(0, 2.1, 0);
    g.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.95, 8, 8), mat);
    head.position.set(0, 5.2, 0);
    g.add(head);
    var ear = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 8), mat);
    ear.position.set(-0.7, 6.4, 0);
    g.add(ear);
    var ear2 = ear.clone();
    ear2.position.set(0.7, 6.4, 0);
    g.add(ear2);
    var eyeMat = new THREE.MeshBasicMaterial({ color: 0xaa00cc });
    var eL = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), eyeMat);
    eL.position.set(-0.35, 5.3, 0.8);
    g.add(eL);
    var eR = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), eyeMat);
    eR.position.set(0.35, 5.3, 0.8);
    g.add(eR);
    g.visible = false;
    return g;
}

function makeFreddy() {
    var g = new THREE.Group();
    var mat = new THREE.MeshBasicMaterial({ color: 0x7a501e });
    var body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.2, 1.8), mat);
    body.position.set(0, 2.1, 0);
    g.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 8), mat);
    head.position.set(0, 5.3, 0);
    g.add(head);
    var ear = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), mat);
    ear.position.set(-0.75, 6.3, 0);
    g.add(ear);
    var ear2 = ear.clone();
    ear2.position.set(0.75, 6.3, 0);
    g.add(ear2);
    var hatMat = new THREE.MeshBasicMaterial({ color: 0x111018 });
    var hat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 1.0), hatMat);
    hat.position.set(0, 6.4, 0);
    g.add(hat);
    var rimMat = new THREE.MeshBasicMaterial({ color: 0x8b0000 });
    var rim = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 1.2), rimMat);
    rim.position.set(0, 6.0, 0);
    g.add(rim);
    var eyeMat = new THREE.MeshBasicMaterial({ color: 0x200c00 });
    var eL = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), eyeMat);
    eL.position.set(-0.3, 5.4, 0.8);
    g.add(eL);
    var eR = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), eyeMat);
    eR.position.set(0.3, 5.4, 0.8);
    g.add(eR);
    g.visible = false;
    return g;
}

function makeChica() {
    var g = new THREE.Group();
    var mat = new THREE.MeshBasicMaterial({ color: 0xd4a800 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 4.2, 1.8), mat);
    body.position.set(0, 2.1, 0);
    g.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.95, 8, 8), mat);
    head.position.set(0, 5.2, 0);
    g.add(head);
    var beakMat = new THREE.MeshBasicMaterial({ color: 0xe07000 });
    var beak = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 8), beakMat);
    beak.position.set(0, 5.0, 0.95);
    beak.rotation.x = Math.PI / 2;
    g.add(beak);
    var eyeMat = new THREE.MeshBasicMaterial({ color: 0x201000 });
    var eL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), eyeMat);
    eL.position.set(-0.3, 5.4, 0.75);
    g.add(eL);
    var eR = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), eyeMat);
    eR.position.set(0.3, 5.4, 0.75);
    g.add(eR);
    g.visible = false;
    return g;
}

function makeFoxy() {
    var g = new THREE.Group();
    var mat = new THREE.MeshBasicMaterial({ color: 0xe74c3c });
    var body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 4.2, 1.8), mat);
    body.position.set(0, 2.1, 0);
    g.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.95, 8, 8), mat);
    head.position.set(0, 5.2, 0);
    g.add(head);
    var snoutMat = new THREE.MeshBasicMaterial({ color: 0xc87137 });
    var snout = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), snoutMat);
    snout.position.set(0, 5.0, 0.85);
    g.add(snout);
    var eyeMat = new THREE.MeshBasicMaterial({ color: 0xc0392b });
    var eL = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), eyeMat);
    eL.position.set(-0.3, 5.3, 0.75);
    g.add(eL);
    var eR = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), eyeMat);
    eR.position.set(0.3, 5.3, 0.75);
    g.add(eR);
    g.visible = false;
    return g;
}

export function buildHallSilhouettes(scene) {
    var hallAnimLeftGroup = new THREE.Group();
    hallAnimLeftGroup.position.set(-12, 0, 0);
    hallAnimLeftGroup.rotation.y = Math.PI / 2;
    scene.add(hallAnimLeftGroup);
    
    var hallAnimRightGroup = new THREE.Group();
    hallAnimRightGroup.position.set(12, 0, 0);
    hallAnimRightGroup.rotation.y = -Math.PI / 2;
    scene.add(hallAnimRightGroup);
    
    return {
        left: hallAnimLeftGroup,
        right: hallAnimRightGroup
    };
}

export function setHallAnimatronic(group, animatronic) {
    if (!group) return;
    while (group.children.length > 0) {
        group.remove(group.children[0]);
    }
    if (!animatronic) {
        group.visible = false;
        return;
    }
    var name = animatronic.name.toLowerCase();
    var model = null;
    if (name === 'bonnie') model = makeBonnie();
    else if (name === 'freddy') model = makeFreddy();
    else if (name === 'chica') model = makeChica();
    else if (name === 'foxy') model = makeFoxy();
    if (model) {
        group.add(model);
        model.visible = true;
        group.visible = true;
    } else {
        group.visible = false;
    }
}
