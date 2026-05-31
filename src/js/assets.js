/**
 * FNAF Game — Assets Loader
 * Loads SVG/PNG/JPG/JPEG images for office states and camera feeds
 * Falls back through extensions in order: .svg → .png → .jpg → .jpeg
 */

/** @type {Object<string, Image|null>} */
var assets = {};

/**
 * Load office door state images and camera feed backgrounds
 * Tries multiple file extensions for each asset
 * Sets assets[key] = Image on success, null on failure
 * Sets assets.loaded = true when all pending assets complete
 */
function loadAssets() {
    var keys = ['office_left_open', 'office_left_closed', 'office_right_open', 'office_right_closed', 'cam_stage'];
    var exts = ['.svg', '.png', '.jpg', '.jpeg'];
    var pending = keys.length;
    if (!pending) { assets.loaded = true; return; }

    keys.forEach(function(key) {
        var tryExt = function(i) {
            if (i >= exts.length) {
                assets[key] = null;
                pending--;
                if (pending <= 0) assets.loaded = true;
                return;
            }
            var path = 'src/assets/' + key + exts[i];
            var img = new Image();
            img.onload = function() { assets[key] = img;
                pending--; if (pending <= 0) assets.loaded = true; };
            img.onerror = function() { tryExt(i + 1); };
            img.src = path;
        };
        tryExt(0);
    });
}

/**
 * Verify that critical assets loaded successfully
 * Logs which assets are available to console
 * Sets assets.verified = true/false based on completion check
 */
function verifyAssets() {
    var tries = 0;
    var check = function() {
        tries++;
        if (assets.loaded) {
            console.log('[ASSETS] loaded: ', {
                left_open: !!assets.office_left_open,
                left_closed: !!assets.office_left_closed,
                right_open: !!assets.office_right_open,
                right_closed: !!assets.office_right_closed,
                cam_stage: !!assets.cam_stage
            });
            assets.verified = true;
            return;
        }
        if (tries > 20) { console.log('[ASSETS] not fully loaded yet');
            assets.verified = false; return; }
        setTimeout(check, 150);
    };
    check();
}
