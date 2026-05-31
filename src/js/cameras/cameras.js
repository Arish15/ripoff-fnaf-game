/**
 * FNAF Game — Camera System Entry Point
 * Minimal entry module — declares CAM_LABELS
 * All functionality split into: renderer.js, monitor.js, loop.js
 */

/**
 * Camera key → display label mapping
 * Each key corresponds to a camera feed drawable via drawCamBg()
 * @type {Object<string, string>}
 */
var CAM_LABELS = {
    stage: 'CAM 1A - SHOW STAGE',
    dining: 'CAM 1B - DINING AREA',
    pirate: 'CAM 1C - PIRATE COVE',
    hallW: 'CAM 2A - W. HALL',
    hallW_corner: 'CAM 2B - W. HALL CORNER',
    stage_left: 'CAM 3 - SUPPLY CLOSET',
    hallE: 'CAM 4A - E. HALL',
    hallE_corner: 'CAM 4B - E. HALL CORNER',
    backstage: 'CAM 5 - BACKSTAGE',
    kitchen: 'CAM 6 - KITCHEN',
    stage_right: 'CAM 7 - RESTROOMS'
};
