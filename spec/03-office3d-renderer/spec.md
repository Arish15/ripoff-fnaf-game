# Spec 03 — Split office3d.js (3D Renderer Monolith)

**Risk:** Low (self-contained IIFE with clean public API)  
**Effort:** Large (~1 day)  
**Prerequisite:** None

---

## Problem

`office3d.js` is **2209 lines** — the largest file in the codebase by far. It mixes:
- Three.js scene setup (renderer, camera, lights, materials)
- Room geometry construction (`buildRoom`)
- Door spring-physics animation
- Hall light mesh toggling
- Animatronic silhouette rendering in hallways
- Mouse-driven camera rotation
- RAF render loop
- Resize handling
- `show()` / `hide()` lifecycle
- Button hitbox raycasting for doors/lights

Every aspect of the 3D office is entangled in one IIFE. Changing the door animation requires
reading past room geometry. Adding a new animatronic position requires reading past material setup.

---

## Target File Split

The IIFE wrapper (`window.office3d = (function() { ... })()`) is **preserved** — it already
provides the right encapsulation boundary. The split is internal to that IIFE via helper modules
that the IIFE imports or inlines.

```
src/js/office/
  office3d.js          ← IIFE shell + public API (~120 lines); imports/calls sub-modules
  scene.js             ← renderer, camera, scene, ambient/directional lights, RAF loop
  room.js              ← buildRoom(): all static geometry (walls, floor, desk, fan, monitor)
  materials.js         ← all MeshLambertMaterial / MeshStandardMaterial definitions
  doors.js             ← door mesh positions, spring-physics tick, setDoorLeft/Right
  hall-lights.js       ← hall light mesh toggle, setLightLeft/Right
  hall-animatronics.js ← silhouette geometry per animatronic, setHallLeft/Right
  interaction.js       ← raycaster hitboxes for wall buttons (door/light toggles)
```

Until ES modules (spec 01), each sub-file is loaded via `<script>` before `office3d.js` and
exposes a builder function the IIFE calls.

---

## Detailed Responsibilities

### `scene.js`
```js
function buildScene(container) {
    // Returns { renderer, scene, camera, clock }
    // Sets up WebGLRenderer, PerspectiveCamera (FOV 75, YXZ order),
    // ambient light, directional key light, RAF render loop handle
}
function startRenderLoop(scene, camera, renderer, onTick) { ... }
function resizeScene(renderer, camera, container) { ... }
```
Owns: `renderer`, `scene`, `camera`, `clock`, `animationFrameId`.  
Constants: `MAX_ROT = 0.62`, camera position `(0, 4.0, 7.5)`, target `(0, 4.0, -9)`.

---

### `room.js`
```js
function buildRoom(scene, materials) {
    // Adds all static meshes to scene: back wall, side walls, floor, ceiling,
    // desk, monitor prop, fan (rotation animated in RAF), decorative posters
    // Returns { fan } so RAF loop can spin it
}
```
Coordinate system documented inline: X −11…+11, Y 0…+11, Z −9…+9.

---

### `materials.js`
```js
function buildMaterials() {
    // Returns named material map:
    // { wall, floor, ceiling, desk, door, hallLight, hallDark, silhouette }
    // All MeshLambertMaterial except hallLight (emissive)
}
```
Centralising materials means colour/texture changes need one edit, not a grep-through-2000-lines hunt.

---

### `doors.js`
```js
// Constants (top of file)
var DOOR_SPRING_K   = 0.075;
var DOOR_DAMPING    = 0.26;
var DOOR_OPEN_Y     = 12.0;   // above ceiling — "open" position
var DOOR_CLOSED_Y   = 4.0;    // lowered into frame — "closed" position

function buildDoors(scene, materials) {
    // Creates left + right door meshes, returns door state objects
    // Returns { left: DoorState, right: DoorState }
}
function tickDoors(doors) {
    // Spring-physics step for both doors — called every RAF frame
}
function setDoor(doorState, closed) {
    // Sets doorState.target to DOOR_CLOSED_Y or DOOR_OPEN_Y
}
```
`DoorState` = `{ mesh, posY, velY, target }` — plain object, no class needed.

---

### `hall-lights.js`
```js
function buildHallLights(scene) {
    // Creates left + right hall light cone meshes (initially hidden)
    // Returns { left: Mesh, right: Mesh }
}
function setHallLight(mesh, on) {
    mesh.visible = on;
}
```

---

### `hall-animatronics.js`
```js
function buildHallSilhouettes(scene) {
    // Creates placeholder silhouette geometries for both halls
    // Returns { left: Group, right: Group }
}
function setHallAnimatronic(group, animatronic) {
    // animatronic = { color, name } or null to clear
    // Updates silhouette color and visibility
}
```
Current API passes whole animatronic objects — keep that contract at the IIFE boundary.

---

### `interaction.js`
```js
function buildButtonHitboxes(scene) {
    // Invisible raycaster targets aligned to left/right door buttons
    // Returns { leftDoorBtn, rightDoorBtn, leftLightBtn, rightLightBtn }
}
function checkButtonClick(raycaster, hitboxes, camera, onClick) {
    // Fires onClick({ id }) when a hitbox is intersected
}
```

---

### `office3d.js` (IIFE shell after split, ~120 lines)
```js
window.office3d = (function() {
    var _scene, _doors, _hallLights, _silhouettes, _hitboxes;

    return {
        init: function() {
            var built = buildScene(document.getElementById('officeScene'));
            _scene = built;
            buildRoom(built.scene, buildMaterials());
            _doors        = buildDoors(built.scene);
            _hallLights   = buildHallLights(built.scene);
            _silhouettes  = buildHallSilhouettes(built.scene);
            _hitboxes     = buildButtonHitboxes(built.scene);
            startRenderLoop(built.scene, built.camera, built.renderer, function(dt) {
                tickDoors(_doors);
                // mouse lerp, fan spin, etc.
            });
        },
        setDoorLeft:  function(c) { setDoor(_doors.left, c); },
        setDoorRight: function(c) { setDoor(_doors.right, c); },
        setLightLeft: function(on) { setHallLight(_hallLights.left, on); },
        setLightRight:function(on) { setHallLight(_hallLights.right, on); },
        setHallLeft:  function(a)  { setHallAnimatronic(_silhouettes.left, a); },
        setHallRight: function(a)  { setHallAnimatronic(_silhouettes.right, a); },
        setMouse:     function(n)  { /* lerp targetRotY */ },
        getRotation:  function()   { return _scene.camera.rotation.y; },
        show:  function() { document.getElementById('officeArea').style.display = 'flex'; },
        hide:  function() { document.getElementById('officeArea').style.display = 'none'; },
        resize:function() { resizeScene(_scene.renderer, _scene.camera); }
    };
})();
```
Public API is **identical** — zero impact on callers.

---

## index.html Load Order (until ES modules)
```html
<script type="module">
  import './src/js/office/materials.js';
  import './src/js/office/scene.js';
  import './src/js/office/room.js';
  import './src/js/office/doors.js';
  import './src/js/office/hall-lights.js';
  import './src/js/office/hall-animatronics.js';
  import './src/js/office/interaction.js';
  import './src/js/office/office3d.js';
</script>
```
Or as sequential `<script>` tags — either works since office3d.js is already an ES module.

---

## Verification
- Door spring animation plays correctly (open/close).
- Hall lights toggle on/off.
- Animatronic silhouettes appear/disappear in hallways.
- Camera head-turn tracks mouse across full ±35° range.
- Resize works after window resize.
- No regression on performance (RAF budget stays under 16ms).
