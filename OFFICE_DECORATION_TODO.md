# FNAF 1 Office — Decoration & Visual Enhancement Todo

## Overview
This document outlines all decorative elements, visual enhancements, and environmental details needed to fully flesh out the FNAF 1 office in Three.js. Each item includes placement, color/texture specs, priority level, and implementation notes.

---

## SECTION 1: WALL DECORATIONS (PRIORITY: HIGH)

### 1.1 CELEBRATE Banner (Back Wall) — PARTIALLY COMPLETE
**Status**: Already implemented in `office3d.js` buildRoom()
- [ ] Verify banner dimensions: spans full back wall width (X: -11 to +11)
- [ ] Verify banner position: Y-axis placement (upper back wall)
- [ ] Purple/lavender bar color: `#7a4a9a` or similar vibrant purple
- [ ] Yellow letter blocks: 9 letters spelling "CELEBRATE" in `#ffdd00` bright yellow
- [ ] Letter spacing: evenly distributed across banner width
- [ ] Colored hanging streamers below banner: red, blue, green, yellow mix
- [ ] Add streamer physics (optional): slight sway/oscillation via time-based sine wave

### 1.2 Children's Drawings & Artwork (Below Banner)
**Location**: Back wall (Z: -8.9, Y: 0.5-3.0, X: distributed)
**Priority**: HIGH
- [ ] Create 8-12 child drawing placeholders on back wall below banner
- [ ] Drawing specifications:
  - Size: ~0.4m × 0.5m each
  - Simple colored rectangles with black frames (1980s school art style)
  - Content: crayon-like scribbles, stick figures, animals, random shapes
  - Colors: bright primary colors (red, blue, yellow, green, orange)
  - Placement: scattered grid pattern, slight rotation variation (±5°)
  - Material: simple canvas texture (procedurally generated colored noise)
- [ ] Three per row, stacked 3-4 rows
- [ ] Random overlapping allowed (authentic cluttered look)

### 1.3 Motivational Posters
**Location**: Side walls (various)
**Priority**: MEDIUM
- [ ] "KEEP SMILING" poster:
  - Location: West wall, upper section (X: -10.5, Y: 7.5, Z: -2)
  - Size: ~1.2m × 1.5m
  - Image: Freddy's face with big smile + text
  - Frame color: plastic red or wood brown border
  
- [ ] "WORK HARD" poster:
  - Location: East wall mirror position (X: +10.5, Y: 7.5, Z: -2)
  - Same dimensions as above
  - Image: Bonnie or generic motivational text
  - Frame color: plastic blue or wood brown border

- [ ] "HAPPY BIRTHDAY" banner:
  - Location: Back wall, above left side
  - Colorful text, balloon graphics
  - Material: fabric/paper appearance

### 1.4 Exit Signs & Safety Signage
**Location**: Multiple walls near doors/exits
**Priority**: MEDIUM
- [ ] Red "EXIT" sign:
  - Position: above left (west) exit doorway (X: -11, Y: 10, Z: -9)
  - Size: 0.5m × 0.3m
  - Material: plastic red with white text, metallic mounting bracket
  - Glow/luminosity: emit red light (optional, creates eerie feel)

- [ ] Second red "EXIT" sign:
  - Position: above right (east) exit doorway (X: +11, Y: 10, Z: -9)
  - Mirror of left sign

- [ ] Fire safety placard:
  - Location: Wall near office entrance (random wall, Y: 2-3)
  - Size: small (0.2m × 0.3m)
  - Text: procedurally small, unreadable at distance

### 1.5 Damage & Wear Effects (Story Atmosphere)
**Location**: Various walls
**Priority**: MEDIUM
- [ ] Torn/peeling paint patches:
  - Random dark spots, discolored patches on walls
  - Material: use bumpmap with exposed texture underneath
  - Locations: 4-6 random spots, slightly elevated positions
  - Effect: suggests age, wear, potential neglect

- [ ] Scuff marks on floor near doors:
  - Darker streaks along common traffic paths
  - Material: slightly darker floor color in 1-2m strips
  - Locations: at base of both side doors, leading to center

---

## SECTION 2: CEILING & OVERHEAD (PRIORITY: HIGH)

### 2.1 Ceiling Light Fixtures
**Location**: Ceiling (Y: 10.8-11)
**Priority**: HIGH
- [ ] Main overhead light (center):
  - Position: X: 0, Y: 11, Z: -2
  - Style: recessed cylindrical fixture, ~0.4m diameter
  - Color: metallic white/silver housing
  - Bulb: bright yellow (0xffee88) with slight glow
  - Brightness: should cast warm light downward

- [ ] Additional ceiling lights (left/right):
  - Position: X: -6, Y: 11, Z: -2 and X: +6, Y: 11, Z: -2
  - Same style as center, slightly dimmer
  - Creates layered overhead illumination

- [ ] Recessed light trim:
  - 0.1m circular rings around bulbs
  - Material: metal texture, slight specularity

### 2.2 Ceiling Tiles & Acoustic Treatment
**Location**: Entire ceiling
**Priority**: MEDIUM
- [ ] Grid pattern of ceiling tiles:
  - Typical acoustic drop ceiling (2ft × 2ft in scale)
  - Material: off-white (#dcdcdc) matte finish
  - Slight texture/bumpmap to avoid flatness
  - Visible grid lines (dark 1cm lines between tiles)
  - A few tiles showing stains/water damage (darker spots)

- [ ] Ceiling seams:
  - Thin dark lines dividing ceiling grid
  - Material: thin black lines, 1-2cm wide in world space

### 2.3 Ceiling Vents & Air Ducts
**Location**: Ceiling (Y: 10.5-11)
**Priority**: MEDIUM
- [ ] Central air vent:
  - Position: X: 0, Y: 10.9, Z: 0
  - Style: square vent grille (~0.8m × 0.8m)
  - Material: metal mesh pattern
  - Color: metallic grey (#707070)
  - Detail: thin vertical/horizontal bars with spacing

- [ ] Side air ducts:
  - Cylindrical ducts (0.3m diameter) running along walls
  - Positions: along X=-11 and X=+11 walls, Y: 9-10.5
  - Material: sheet metal, slight weathering/corrosion marks
  - Color: dull grey-brown (#696969)
  - Cap ends visible where they end

- [ ] Vent dampers:
  - Add small sliding/angled louvers to vents
  - Can add subtle animation (optional: slow opening/closing)

### 2.4 Ceiling Fan
**Status**: Partially implemented; needs enhancement
- [ ] Verify fan motor housing: mounted at center ceiling (X: 0, Y: 10.8, Z: -3)
  - Cylindrical motor: ~0.15m diameter, metallic silver
  - Mounting bracket: black metal, 0.2m drop rod
  
- [ ] Fan blades: size ~0.6m radius
  - Material: white/cream plastic blade faces (#fffaf0)
  - Rotation: continuous counterclockwise at moderate speed
  - Blade edges: slightly worn/dusty appearance
  - Wobble (optional): very slight offset rotation for authenticity

---

## SECTION 3: FLOORING & GROUND LEVEL (PRIORITY: HIGH)

### 3.1 Floor Tiles/Patterns
**Location**: Entire floor (Y: 0-0.1)
**Priority**: HIGH
- [ ] Tile grid pattern:
  - Checkered alternating colors or simple grid
  - Light grey (#b0b0b0) and green (#a8a894) tiles
  - Tile size: ~0.5m × 0.5m
  - Grid lines: subtle, dark 1-2mm lines between tiles
  - Material: slightly glossy, worn appearance

- [ ] Floor wear marks:
  - Darker streaks along common paths (center walkway)
  - Scuff marks near doors (both left and right)
  - Small stains scattered randomly (maintenance issues)
  - Material: same tile, but ~10% darker in worn areas

### 3.2 Baseboards & Trim
**Location**: Perimeter (walls at Y: 0-0.2)
**Priority**: MEDIUM
- [ ] Base trim all around:
  - Height: 0.15m from floor
  - Material: dark wood or plastic (#4a3a2a brown)
  - Slightly raised 3D geometry (not flat)
  - Corners rounded slightly (realistic rounded edges)
  - Color variations: weathered look with slight edge wear

- [ ] Scuff marks on baseboards:
  - Darker areas where equipment/furniture has been dragged
  - Random white/light marks (dust accumulation)

### 3.3 Floor Anchor Points
**Location**: Strategic floor locations
**Priority**: LOW (visual reference)
- [ ] Visible bolt holes/anchor points:
  - Where stage riser connects to floor (visual only, for scale reference)
  - Where desk/furniture would connect
  - Small dark circles (~0.02m) with slight depth

---

## SECTION 4: OFFICE DESK & WORK AREA (PRIORITY: HIGH)

### 4.1 Security Desk/Console
**Location**: Center-front of office (X: 0, Y: 0.8-1.2, Z: 6)
**Priority**: HIGH
- [ ] Desk surface:
  - Rectangular platform, ~1.2m wide × 0.8m deep × 0.9m tall
  - Material: worn laminate or wood (#5a4a3a brown)
  - Color: slightly darker than walls, stained appearance
  - Surface texture: scratches, water rings, dust marks
  - Slight slope toward camera (minor perspective detail)

- [ ] Desk top details:
  - Scattered papers, clipboard (non-interactive)
  - Small potted plant or worn decoration
  - Coffee cup (ceramic, realistic geometry)
  - Phone handset (old rotary or Push button style)
  - Monitor base position (where game monitor would sit — visual reference)
  - Name plate (unreadable text, decorative)
  - Pen holder with pens

- [ ] Desk drawers:
  - Left and right side, closed
  - Metal handles, slightly tarnished
  - Visible wear around drawer edges

- [ ] Desk cable management:
  - Visible cable tray or clips underneath
  - Thin cables visible (power, data) routed along underside
  - Slight disarray (authentic office look)

### 4.2 Office Chair (Optional Storage Detail)
**Location**: Behind desk (X: 0, Y: 0.3-0.8, Z: 6.5)
**Priority**: LOW
- [ ] Old office chair (optional interactive element):
  - Mesh/fabric back, worn appearance
  - Metal frame, slightly rusted
  - Wheels beneath
  - Cushioned seat with visible indentation
  - Can be rendered as simplified geometry or just suggested hints

---

## SECTION 5: STORAGE & SHELVING (PRIORITY: MEDIUM)

### 5.1 Wall-mounted Shelves
**Location**: Both side walls
**Priority**: MEDIUM
- [ ] Shelves left wall (West):
  - Position: X: -10.2, Y: 2-5 range, Z: -3 to -4
  - Quantity: 3-4 shelves, ~0.5m wide × 0.2m deep each
  - Material: particleboard or wood, slightly sagging/warped
  - Color: dark brown (#6a5a4a)
  - Mounting brackets: metal, visible L-brackets

- [ ] Shelves right wall (East):
  - Mirror positions of left shelves
  - Same material and condition

- [ ] Shelf contents:
  - Small cardboard boxes (stacked, labeled "SUPPLIES")
  - Spare parts in plastic bins (machinery gears, animatronic parts)
  - Cleaning supplies (bottles, spray cans)
  - Old manuals/documents (stacked papers, file holders)
  - Decorative items (broken toys, discarded props)
  - All items rendered as simple geometry, some partially occluded
  - Dust accumulation on shelf surfaces and items

### 5.2 Storage Cabinets
**Location**: Various wall positions
**Priority**: MEDIUM
- [ ] Metal storage lockers:
  - Style: vertical rectangular lockers, dull grey metal (#676767)
  - Quantity: 3-4 lockers, positioned at X: ±8, Y: 1-3, Z: -7 to -8
  - Door hinges: visible metal, slightly corroded
  - Door handles: simple bar handles, worn
  - Lock mechanisms: visible small holes where key would go
  - Visible numbers/labels barely legible

### 5.3 Utility Cabinet (Breaker/Electrical)
**Location**: Lower corner area
**Priority**: LOW
- [ ] Metal electrical panel:
  - Small rectangular cabinet (~0.4m wide × 0.6m tall)
  - Position: lower wall section X: ±10, Y: 0.8-1.5, Z: -8
  - Color: beige/tan metal (#d4a574)
  - Door: clear or opaque plastic cover
  - Interior: visible circuit breakers (small toggle switches), fuse holders
  - Warning label: "ELECTRICAL" (small red/yellow triangle warning)
  - Slight corrosion/age marks around edges

---

## SECTION 6: DOORS & DOORWAYS (PRIORITY: HIGH)

### 6.1 Door Frames & Trim
**Location**: Both sides of office
**Priority**: HIGH
- [ ] Left (West) door frame:
  - Frame geometry: rectangular surround around door opening
  - Material: metal frame, industrial style
  - Color: dark grey/black (#2a2a2a)
  - Width: 0.05m trim all around door opening
  - Corner brackets: small metal L-brackets at corners (visual detail)
  - Slight rust/corrosion marks on frame edges

- [ ] Right (East) door frame:
  - Mirror of left frame
  - Same material, color, wear patterns

- [ ] Door seals:
  - Rubber gasket visible around frame edges
  - Color: dark grey/black (#3a3a3a)
  - Slightly compressed appearance (realistic contact marks)

### 6.2 Door Hardware
**Location**: Both door panels
**Priority**: MEDIUM
- [ ] Handle/lock mechanisms:
  - Left door: handle on west side (left-facing)
  - Right door: handle on east side (right-facing)
  - Style: industrial push/pull bar handles
  - Color: brushed steel/metallic
  - Visible lock plate surround

- [ ] Door hinges:
  - Heavy-duty industrial hinges (3 per door, visible)
  - Positioned at Y: 1m, 5.5m, 10m
  - Material: metal, slight corrosion/weathering
  - Pin visible in hinge center (small detail)

### 6.3 Doorway Lighting
**Location**: Hallway apertures
**Priority**: MEDIUM
- [ ] Light fixtures above apertures:
  - Small wall-mounted sconces or recessed lights
  - Positions: above aperture centers (inside hallway opening, visible when camera turned)
  - Color: warm yellow light when on, dark/off when lights disabled
  - Mounting: metal bracket or recessed trim
  - Can emit subtle light into office (seen along edges)

---

## SECTION 7: PARTITION & ENCLOSED AREAS (PRIORITY: MEDIUM)

### 7.1 Office Walls/Partitions
**Location**: Creating enclosed office space
**Priority**: MEDIUM
- [ ] Partial wall segments:
  - Used to create "office corner" effect
  - Position: separating office from main room entrance
  - Height: ~2m (not full ceiling, creates openness)
  - Material: same as main walls (#c4b080)
  - Thickness: 0.1m (visible edge detail)
  - Wear: similar age/weathering as main building walls

- [ ] Corner shelving/divider:
  - Low divider wall or tall shelf unit in office entry corner
  - Creates transition visual boundary
  - Material: wood or metal

### 7.2 Window/Aperture Frames (Hallway Views)
**Status**: Partially implemented
**Priority**: MEDIUM
- [ ] Left (West) aperture window:
  - Rectangular opening: ~2.5m wide × 3m tall
  - Frame material: dark metal trim all around
  - Glass/transparency: optional (can be glass or just open frame)
  - Visible mounting brackets at corners
  - Weathered/worn appearance on frame edges

- [ ] Right (East) aperture window:
  - Mirror of left aperture
  - Same dimensions and frame style

---

## SECTION 8: MISCELLANEOUS DETAILS & PROPS (PRIORITY: LOW-MEDIUM)

### 8.1 Wall-mounted Accessories
**Location**: Various walls
**Priority**: LOW
- [ ] Clock:
  - Wall-mounted round clock (~0.3m diameter)
  - Position: back wall, upper section (X: -5, Y: 8, Z: -8.9)
  - Material: white/cream face, black hands and numbers
  - Numbers: simple Arabic numerals, 1-12
  - Detail: can show static time or actual game time
  - Frame: metal or plastic bezel, chrome/silver finish

- [ ] Thermometer/humidity gauge:
  - Small rectangular dial (~0.15m wide)
  - Position: wall near opposite corner from clock
  - Material: plastic housing, metal dial face
  - Numbers/markings: slightly faded/illegible detail

- [ ] Fire extinguisher wall mount:
  - Metal bracket on wall
  - Position: lower wall near door (X: ±10, Y: 1.5, Z: -8)
  - Red cylindrical extinguisher
  - Label: white/yellow warning label
  - Hose: coiled attachment, visible hanging loop

- [ ] First aid kit box:
  - Wall-mounted rectangular cabinet (~0.3m × 0.4m)
  - Position: near extinguisher (spaced ~0.5m apart)
  - Color: white with red cross symbol
  - Small door/latch detail
  - Glass front (optional, shows contents)

### 8.2 Decorative Objects & Figurines
**Location**: Shelves, desk, ledges
**Priority**: LOW
- [ ] Worn animatronic figurines:
  - Small Freddy, Bonnie, Chica statues (~0.15m tall each)
  - Position: desk or shelf display, scattered
  - Material: plastic, faded/chipped paint
  - Cracks and missing parts (authenticity)
  - Dust/grime accumulated on surfaces

- [ ] Broken toy/game items:
  - Old arcade machine or game console (non-functional decoration)
  - Position: corner or behind storage area (background detail)
  - Color: faded bright colors, visible wear
  - Status: appears unplugged/abandoned

- [ ] Worn ball pit balls (storage):
  - If children's play area exists: scattered colorful plastic balls
  - Material: faded plastic, some deflated/misshapen
  - Colors: primary colors but muted/worn
  - Symbolic of abandoned fun atmosphere

### 8.3 Hanging Decorations
**Location**: Walls and upper areas
**Priority**: LOW
- [ ] Suspended decoration streamers:
  - Colorful paper streamers hanging from ceiling corners
  - Positions: multiple locations, slight sag in middle
  - Colors: faded primary colors (red, blue, yellow, green)
  - Length: 2-3m drops
  - Status: some torn/partially missing (neglected party décor)

- [ ] Balloons (deflated):
  - Old deflated birthday balloons caught on ceiling/shelves
  - Position: randomly scattered, some stuck to walls
  - Colors: faded pastels
  - Material: thin latex, wrinkled appearance
  - Symbolic of abandoned festivities

---

## SECTION 9: LIGHTING EFFECTS & ATMOSPHERE (PRIORITY: HIGH)

### 9.1 Ambient Light Enhancement
**Priority**: HIGH
- [ ] Directional light improvement:
  - Adjust warm yellow hue (#ffdd88 or similar)
  - Slight shadows (if performance allows)
  - Intensity: 0.5-0.8 for balanced room illumination
  - Direction: angled from ceiling, slight forward tilt

- [ ] Ambient light tweaking:
  - Increase slightly from 0.38 to 0.45 for better visibility
  - Ensure dark corners still exist (creepy atmosphere)
  - Add slight color cast (warm yellowish ambient)

### 9.2 Hall Light Effects (Enhanced)
**Status**: Partially implemented; needs visual impact
**Priority**: HIGH
- [ ] When lights ON:
  - Warm glow spilling from apertures (#ffee99)
  - Slight halo/bloom effect around light sources
  - Shadows slightly sharper (directional light from hall)
  - Animatronic silhouettes clearly visible

- [ ] When lights OFF:
  - Apertures completely dark (black)
  - No light spillage into office
  - Animatronic presence suggested only by hall glow color (indirect)
  - Room feels more threatened/claustrophobic

### 9.3 Emergency Lighting (Power Outage Preparation)
**Priority**: MEDIUM
- [ ] Red exit sign glow:
  - When powered on: subtle red luminosity (#ff4444)
  - When powered off: no glow, just dim red geometry visible
  - Placement: above both exits, creates eerie dimness

- [ ] Battery backup glow (optional):
  - Small indicator lights on electrical panel
  - Color: dim green or amber
  - Visible even during power outage (suggests generator)
  - Very subtle, easily missed

### 9.4 Fog & Atmospheric Effects
**Status**: Implemented; may need tweaking
**Priority**: MEDIUM
- [ ] Fog parameters:
  - Current: THREE.Fog(0x0e0c08, 14, 26)
  - Verify near/far distances create appropriate depth
  - Test fog color matches background (#0e0c08)
  - Ensure back wall still visible (fog should fade, not eliminate)

- [ ] Optional volumetric effects:
  - Subtle dust particle effects (optional, performance-dependent)
  - Thin light rays through apertures (god rays effect, complex)
  - Very faint air movement visualization (rarely updated)

---

## SECTION 10: TEXTURE & MATERIAL REFINEMENTS (PRIORITY: MEDIUM)

### 10.1 Wall Texture Variations
**Priority**: MEDIUM
- [ ] Main wall material:
  - Base color: tan-beige (#c4b080)
  - Add bumpmap for wall texture (slight roughness)
  - Procedural noise at fine detail level (simulates paint/drywall)
  - Discoloration patches (stains, water damage, age marks)
  - Metallic specularity: very low (matte finish)

- [ ] Side wall variations:
  - Slightly different color tones (±5% brightness variation)
  - Additional weathering in lower sections
  - Water stains running downward from unknown source
  - Slightly more worn than back wall (more traffic)

### 10.2 Floor Material
**Priority**: MEDIUM
- [ ] Tile material:
  - Slight gloss (not shiny, but not matte)
  - Bump mapping for grout lines
  - Color variation per tile (±2% variance)
  - Wear patterns along paths (darker, more scuffed)
  - Material: durable commercial tile, aging

- [ ] Grout lines:
  - Darker color to raise floor aesthetic
  - Slight depth via normal mapping
  - Some grout stains/discoloration

### 10.3 Ceiling Material
**Priority**: MEDIUM
- [ ] Acoustic tile texture:
  - Porous appearance via bump/normal map
  - Slight color variation per tile
  - Water stains (slight brown discoloration)
  - Some tiles slightly disintegrated/damaged
  - Metallic grid lines (bumpmap for raised edges)

---

## SECTION 11: ANIMATED ELEMENTS (OPTIONAL ENHANCEMENTS)

### 11.1 Ceiling Fan Animation
**Status**: Partially implemented; enhance if desired
**Priority**: LOW
- [ ] Fan blade rotation:
  - Continuous counterclockwise spin (when viewed from below)
  - Speed: moderate (~2-3 full rotations per second)
  - Optional wobble: very subtle Y-axis oscillation (±0.05°)
  - Shadows cast from blades (if shadows enabled)

- [ ] Motor hum (audio):
  - Optional background hum sound
  - Very quiet, ambient frequency
  - Slight pitch variation for realism

### 11.2 Streamer Movement
**Priority**: LOW
- [ ] Decorative streamer sway:
  - Gentle side-to-side motion via sine wave
  - Frequency: ~0.3 Hz (slow, hypnotic)
  - Amplitude: ±0.02m movement
  - Offset timing per streamer (not synchronized)

- [ ] Balloon drift (if deflated balloons added):
  - Even slower drift
  - Occasional gentle spinning
  - Caught/stuck appearance (limited movement)

### 11.3 Optional: Light Flickering
**Priority**: LOW (atmosphere only)
- [ ] Rare ceiling light flicker:
  - Occasional brief dimming (1-2 frames)
  - Frequency: once every 30-60 seconds
  - Creates unsettling atmosphere
  - Optional setting (can disable for performance)

---

## SECTION 12: BACKGROUND & STAGE AREAS (PRIORITY: MEDIUM)

### 12.1 Distant Stage (Background)
**Location**: Far back (Z: -8 to -9)
**Priority**: MEDIUM
- [ ] Stage riser or platform:
  - Low elevation (~0.3m), extends across back
  - Material: wood-looking, darker than office floor
  - Purpose: visual reference for scale, stage area suggestion
  - Depth: ~0.5m front-to-back

- [ ] Stage microphone stand (optional):
  - Visible in center of back wall
  - Position: mounted on riser, Z: -8.8
  - Style: old 1980s chrome microphone with boom arm
  - Color: metal silver/chrome
  - Detail: grill visible, slightly worn

- [ ] Backdrop curtain (optional):
  - Dark curtain visible behind stage area
  - Color: dark maroon or navy blue
  - Worn, torn appearance in places
  - Provides depth, separates office from external areas

### 12.2 Party Room References (Visible Background)
**Location**: Through hallway apertures (background)
**Priority**: LOW-MEDIUM
- [ ] Party room ambiance (atmospheric):
  - When looking through apertures, slight details visible beyond
  - Suggestion: colorful shapes, balloons (out of focus/blurred)
  - Effect: reinforces "party facility" setting
  - Technical: can be simple background texture or distant geometry

---

## SECTION 13: IMPLEMENTATION GUIDE

### 13.1 Development Workflow
1. Start with HIGH priority items (walls, doors, ceiling, floor)
2. Add shelving and storage (medium visual impact, relatively simple)
3. Enhance lighting (atmospheric improvement)
4. Add accessories and props (fine detail polish)
5. Optional: animated elements, advanced effects

### 13.2 Three.js Implementation Notes

**Creating Decorative Meshes**:
```javascript
// Example: Simple shelf
var shelfGeo = new THREE.BoxGeometry(0.5, 0.04, 0.2);
var shelfMat = new THREE.MeshStandardMaterial({ color: 0x6a5a4a });
var shelf = new THREE.Mesh(shelfGeo, shelfMat);
shelf.position.set(-10.2, 3.0, -3.5);
scene.add(shelf);

// Example: Procedural decoration (like drawings)
function createChildDrawing(x, y, z) {
    var geo = new THREE.PlaneGeometry(0.4, 0.5);
    var canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 160;
    var ctx = canvas.getContext('2d');
    
    // Draw random colored shapes
    ctx.fillStyle = randomColor();
    ctx.fillRect(20, 20, 80, 120);
    
    // Add childlike scribbles (random lines)
    for (var i = 0; i < 5; i++) {
        ctx.strokeStyle = randomColor();
        ctx.beginPath();
        ctx.moveTo(Math.random() * 128, Math.random() * 160);
        ctx.lineTo(Math.random() * 128, Math.random() * 160);
        ctx.stroke();
    }
    
    var texture = new THREE.CanvasTexture(canvas);
    var mat = new THREE.MeshStandardMaterial({ map: texture });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.z = (Math.random() - 0.5) * 0.1; // slight rotation
    scene.add(mesh);
}
```

### 13.3 Asset Generation Strategy
- **Procedural Generation**: Use canvas drawing for decorations (drawings, posters, signs)
- **Geometry**: Use Three.js primitives (BoxGeometry, CylinderGeometry, PlaneGeometry)
- **Texturing**: Apply procedural canvas textures or simple colors
- **Batching**: Combine similar objects into single geometry where possible
- **Optimization**: Use THREE.InstancedMesh for repeated items (shelves, tiles, etc.)

### 13.4 Performance Considerations
- **Polygon Count**: Keep decorative meshes low-poly (each ~50-500 vertices)
- **Draw Calls**: Batch similar materials when possible
- **Texture Resolution**: Use 256×256 or 512×512 for procedural textures
- **Shadows**: Disable for performance; use baked lighting/normal maps instead
- **Total Office Complexity**: Aim for <50,000 total polygons (achievable with modern GPUs)

---

## SECTION 14: PRIORITY MATRIX

### Critical (Must Have for Immersion):
- [ ] Back wall CELEBRATE banner (partially done)
- [ ] Children's drawings
- [ ] Ceiling tiles & grid
- [ ] Ceiling lights
- [ ] Floor tile pattern
- [ ] Both door frames and hardware
- [ ] Baseboards
- [ ] Hall aperture frames
- [ ] Storage shelving
- [ ] Desk/console furniture

### Important (High Visual Impact):
- [ ] Wall posters & motivational signs
- [ ] Scuff marks and wear patterns
- [ ] Exit signs with lighting
- [ ] Electrical panel
- [ ] Shelf contents (supplies, boxes)
- [ ] Wall-mounted accessories (clock, fire extinguisher, first aid)

### Nice to Have (Polish & Details):
- [ ] Decorative figurines
- [ ] Hanging streamers & balloons
- [ ] Ceiling vents and ducts
- [ ] Animated elements (fan wobble, streamer sway)
- [ ] Particle effects or god rays
- [ ] Light flickering effects
- [ ] Distant stage backdrop

### Optional (Advanced Polish):
- [ ] Volumetric fog/dust
- [ ] Advanced material PBR texturing
- [ ] Interactive props
- [ ] Dynamic shadows
- [ ] High-poly decorative objects

---

## SECTION 15: TESTING CHECKLIST

- [ ] All decorations visible from center office position
- [ ] No clipping through walls or floor
- [ ] Textures render without seams or artifacts
- [ ] Lighting is appropriate (not too bright, not too dark)
- [ ] Performance maintained (FPS > 30 at all times)
- [ ] Navigation around decorations unobstructed
- [ ] Door/light buttons remain usable and visible
- [ ] Camera rotation shows decorations correctly from angles
- [ ] Power outage darkness is not diminished by new lighting
- [ ] All overlays and HUD elements remain visible
- [ ] Audio plays without interference
- [ ] Animatronics visible in hallway apertures despite decorations

---

## IMPLEMENTATION TRACKING

- [x] CELEBRATE banner (existing)
- [ ] Children's drawings
- [ ] Children's drawings positioning
- [ ] Ceiling tiles
- [ ] Ceiling lights (3x main fixtures)
- [ ] Baseboards
- [ ] Floor tile pattern
- [ ] Scuff marks/wear
- [ ] Left wall shelves
- [ ] Right wall shelves
- [ ] Door frames (both sides)
- [ ] Door hinges (both sides)
- [ ] Door handles/locks
- [ ] Desk/console surface
- [ ] Desk accessories (papers, cup, plant, nameplate)
- [ ] Electrical panel
- [ ] Wall-mounted clock
- [ ] Fire extinguisher + bracket
- [ ] First aid kit
- [ ] Exit signs (both sides)
- [ ] Posters (KEEP SMILING, WORK HARD)
- [ ] Hall aperture frames
- [ ] Ceiling vents
- [ ] Hall doorway sconces
- [ ] Hanging streamers
- [ ] Decorative figurines (optional)
- [ ] Material refinements (walls, floors, ceiling)
- [ ] Texture bumpmap enhancements
- [ ] Lighting tweaks (if needed)
- [ ] Performance optimization pass

---

**Document Version**: 1.0 (March 16, 2026)
**Total Items**: ~80+ decoration elements across 15 categories
**Estimated Implementation Time**: 20-40 hours (depending on detail level and parallelization)
**Expected FPS Impact**: -5 to -15 FPS with all items (acceptable for modern hardware)
