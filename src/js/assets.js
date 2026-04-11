/**
 * FNAF Game — Assets Loader
 */

var assets = {};

function loadAssets() {
    var keys = ['office_left_open','office_left_closed','office_right_open','office_right_closed','cam_stage'];
    var exts = ['.png', '.jpg', '.jpeg', '.svg'];
    var pending = keys.length;
    if (!pending) { assets.loaded = true; return; }

    keys.forEach(function(key) {
        var tryExt = function(i) {
            if (i >= exts.length) {
                assets[key] = null;
                pending--; if (pending <= 0) assets.loaded = true;
                return;
            }
            var path = 'src/assets/' + key + exts[i];
            var img = new Image();
            img.onload = function() { assets[key] = img; pending--; if (pending <= 0) assets.loaded = true; };
            img.onerror = function() { tryExt(i+1); };
            img.src = path;
        };
        tryExt(0);
    });
}

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
        if (tries > 20) { console.log('[ASSETS] not fully loaded yet'); assets.verified = false; return; }
        setTimeout(check, 150);
    };
    check();
}
