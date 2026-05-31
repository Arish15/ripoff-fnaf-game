/**
 * doors.js — Door spring-physics animation
 */
import * as THREE from 'three';

export const DOOR_SPRING_K = 0.075;
export const DOOR_DAMPING = 0.26;
export const DOOR_OPEN_Y = 12.0;
export const DOOR_CLOSED_Y = 4.0;
const DOOR_THRESHOLD = 0.0007;

export function buildDoors(scene, materials) {
    var HW = 11, dW = 4, dH = 8;
    var doorLeftPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, dH, dW - 0.2),
        materials.MAT_DOOR_CLOSED
    );
    doorLeftPanel.position.set(-HW, DOOR_OPEN_Y, 0);
    doorLeftPanel.visible = false;
    scene.add(doorLeftPanel);
    
    var doorRightPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, dH, dW - 0.2),
        materials.MAT_DOOR_CLOSED
    );
    doorRightPanel.position.set(HW, DOOR_OPEN_Y, 0);
    doorRightPanel.visible = false;
    scene.add(doorRightPanel);
    
    return {
        left: { mesh: doorLeftPanel, pos: 0.0, vel: 0.0, target: 0.0 },
        right: { mesh: doorRightPanel, pos: 0.0, vel: 0.0, target: 0.0 }
    };
}

function tickDoorAnim(doorState) {
    if (!doorState.mesh) return;
    var diff = doorState.target - doorState.pos;
    var moving = Math.abs(diff) > DOOR_THRESHOLD || Math.abs(doorState.vel) > DOOR_THRESHOLD;
    if (moving) {
        doorState.vel += diff * DOOR_SPRING_K;
        doorState.vel *= (1.0 - DOOR_DAMPING);
        doorState.pos += doorState.vel;
        if (doorState.pos < -0.04) {
            doorState.pos = -0.04;
            doorState.vel *= -0.3;
        }
        if (doorState.pos > 1.04) {
            doorState.pos = 1.04;
            doorState.vel *= -0.3;
        }
    } else {
        doorState.pos = doorState.target;
        doorState.vel = 0.0;
    }
    doorState.mesh.position.y = DOOR_CLOSED_Y + (1.0 - doorState.pos) * (DOOR_OPEN_Y - DOOR_CLOSED_Y);
    if (doorState.target < 0.5 && doorState.pos < 0.08) {
        doorState.mesh.visible = false;
    }
}

export function tickDoors(doors) {
    tickDoorAnim(doors.left);
    tickDoorAnim(doors.right);
}

export function setDoor(doorState, closed) {
    if (!doorState.mesh) return;
    doorState.target = closed ? 1.0 : 0.0;
    if (closed) {
        doorState.mesh.visible = true;
        if (doorState.pos < 0.05) {
            doorState.pos = 0.0;
            doorState.vel = 0.0;
        }
    }
}
