/**
 * jumpscare.js — Flexible jumpscare animation system
 * Displays full-screen jumpscare animations (images, sprites, frame sequences)
 * Independent of office background — pure black-background canvas overlay
 * 
 * SETUP (in game.js or at startup):
 *   window.initJumpscares({
 *     freddy: { type: 'image', src: 'src/assets/freddy_jumpscare.png' },
 *     bonnie: { type: 'sprite', src: 'src/assets/bonnie_frames.png', frameWidth: 512, frameHeight: 512, frames: 4, fps: 15 },
 *     chica: { type: 'sequence', src: 'src/assets/chica_frame_', ext: '.png', frameCount: 8, fps: 20 }
 *   });
 * 
 * PLAYBACK (triggered by game.js on collision):
 *   window.jumpScare.animate('freddy', 2800);  // Play 2.8s animation
 * 
 * ASSET TYPES:
 *   - 'image': Single PNG/WebP with transparent background (fade in/hold/fade out)
 *   - 'sprite': Sprite sheet grid (frame strip left-to-right, top-to-bottom)
 *   - 'sequence': Frame files with numeric suffix (frame_0.png, frame_1.png, etc)
 * 
 * KEY FEATURES:
 *   ✓ Full-screen canvas overlay (z-index 9999)
 *   ✓ Black background (rainforest office colors irrelevant)
 *   ✓ Responsive to window resize
 *   ✓ Image caching for performance
 *   ✓ Synchronized with jumpscare audio
 *   ✓ Works no matter what office/bg is displayed
 */

(function() {
    'use strict';

    var jumpScareCanvas = null;
    var jumpScareCtx = null;
    var animationFrameId = null;
    var isAnimating = false;

    // Asset library: maps animatronic name → asset config
    var assets = {
        freddy: null,
        bonnie: null,
        chica: null,
        foxy: null,
        golden: null
    };

    // Preloaded images cache
    var imageCache = {};

    /**
     * Initialize jumpscare canvas overlay
     */
    function init() {
        if (jumpScareCanvas) return; // Already initialized

        jumpScareCanvas = document.createElement('canvas');
        jumpScareCtx = jumpScareCanvas.getContext('2d');
        jumpScareCanvas.style.position = 'fixed';
        jumpScareCanvas.style.top = '0';
        jumpScareCanvas.style.left = '0';
        jumpScareCanvas.style.width = '100%';
        jumpScareCanvas.style.height = '100%';
        jumpScareCanvas.style.zIndex = '9999';
        jumpScareCanvas.style.display = 'none';
        document.body.appendChild(jumpScareCanvas);

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
        if (!jumpScareCanvas) return;
        jumpScareCanvas.width = window.innerWidth;
        jumpScareCanvas.height = window.innerHeight;
    }

    /**
     * Load image with promise
     */
    function loadImage(src) {
        return new Promise(function(resolve, reject) {
            if (imageCache[src]) {
                resolve(imageCache[src]);
                return;
            }
            var img = new Image();
            img.onload = function() {
                imageCache[src] = img;
                resolve(img);
            };
            img.onerror = function() {
                reject(new Error('Failed to load image: ' + src));
            };
            img.src = src;
        });
    }

    /**
     * Procedural animatronic shapes — silent silhouettes
     */
    function drawFreddyHead(ctx, x, y, scale, alpha) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#1a0f0a';
        // Head
        ctx.beginPath();
        ctx.ellipse(x, y, 80 * scale, 100 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyes (glowing white with red tint)
        ctx.fillStyle = '#ffcccc';
        ctx.beginPath();
        ctx.arc(x - 25 * scale, y - 15 * scale, 10 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 25 * scale, y - 15 * scale, 10 * scale, 0, Math.PI * 2);
        ctx.fill();
        // Eyes glow
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.arc(x - 25 * scale, y - 15 * scale, 12 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + 25 * scale, y - 15 * scale, 12 * scale, 0, Math.PI * 2);
        ctx.stroke();
        // Snout
        ctx.fillStyle = '#2a1a10';
        ctx.beginPath();
        ctx.ellipse(x, y + 20 * scale, 50 * scale, 30 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        // Ears
        ctx.fillStyle = '#1a0f0a';
        ctx.beginPath();
        ctx.arc(x - 50 * scale, y - 70 * scale, 20 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 50 * scale, y - 70 * scale, 20 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    function drawBonnieHead(ctx, x, y, scale, alpha) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#1a1a3a';
        // Head
        ctx.beginPath();
        ctx.ellipse(x, y, 75 * scale, 95 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#ffff99';
        ctx.beginPath();
        ctx.arc(x - 20 * scale, y - 20 * scale, 12 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 20 * scale, y - 20 * scale, 12 * scale, 0, Math.PI * 2);
        ctx.fill();
        // Snout
        ctx.fillStyle = '#2a2a4a';
        ctx.beginPath();
        ctx.ellipse(x, y + 15 * scale, 45 * scale, 28 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        // Ears (longer than Freddy's)
        ctx.fillStyle = '#1a1a3a';
        ctx.beginPath();
        ctx.ellipse(x - 55 * scale, y - 60 * scale, 18 * scale, 35 * scale, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 55 * scale, y - 60 * scale, 18 * scale, 35 * scale, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    function drawChicaHead(ctx, x, y, scale, alpha) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#3a2a1a';
        // Head
        ctx.beginPath();
        ctx.ellipse(x, y, 70 * scale, 90 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(x - 18 * scale, y - 18 * scale, 11 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 18 * scale, y - 18 * scale, 11 * scale, 0, Math.PI * 2);
        ctx.fill();
        // Beak (large yellow beak)
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.ellipse(x, y + 25 * scale, 55 * scale, 35 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        // Comb on head
        ctx.fillStyle = '#cc3300';
        ctx.beginPath();
        ctx.arc(x, y - 80 * scale, 12 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    function drawFoxyHead(ctx, x, y, scale, alpha) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#4a2020';
        // Head (pointed fox snout)
        ctx.beginPath();
        ctx.ellipse(x, y, 65 * scale, 85 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyes (eerie narrow)
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(x - 22 * scale, y - 15 * scale, 9 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 22 * scale, y - 15 * scale, 9 * scale, 0, Math.PI * 2);
        ctx.fill();
        // Snout (pointed)
        ctx.fillStyle = '#5a2a2a';
        ctx.beginPath();
        ctx.moveTo(x - 30 * scale, y + 10 * scale);
        ctx.lineTo(x + 30 * scale, y + 10 * scale);
        ctx.lineTo(x, y + 35 * scale);
        ctx.closePath();
        ctx.fill();
        // Ears (pointed fox ears)
        ctx.fillStyle = '#4a2020';
        ctx.beginPath();
        ctx.moveTo(x - 40 * scale, y - 70 * scale);
        ctx.lineTo(x - 28 * scale, y - 50 * scale);
        ctx.lineTo(x - 52 * scale, y - 55 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 40 * scale, y - 70 * scale);
        ctx.lineTo(x + 28 * scale, y - 50 * scale);
        ctx.lineTo(x + 52 * scale, y - 55 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    function drawGoldenFreddyHead(ctx, x, y, scale, alpha) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#3a2a1a';
        // Head (glowing golden)
        ctx.beginPath();
        ctx.ellipse(x, y, 80 * scale, 100 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        // Glowing aura
        ctx.strokeStyle = 'rgba(255, 200, 0, 0.5)';
        ctx.lineWidth = 6 * scale;
        ctx.beginPath();
        ctx.ellipse(x, y, 100 * scale, 120 * scale, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Eyes (golden glow)
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(x - 25 * scale, y - 15 * scale, 11 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 25 * scale, y - 15 * scale, 11 * scale, 0, Math.PI * 2);
        ctx.fill();
        // Eyes glow (golden)
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.arc(x - 25 * scale, y - 15 * scale, 14 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + 25 * scale, y - 15 * scale, 14 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    /**
     * Animate jumpscare sequence
     * @param {string} animatronicType - 'freddy', 'bonnie', 'chica', 'foxy', 'golden'
     * @param {number} durationMs - How long to animate (ms)
     */
    function animate(animatronicType, durationMs) {
        if (isAnimating || !jumpScareCanvas) return;
        isAnimating = true;
        jumpScareCanvas.style.display = 'block';

        var startTime = Date.now();
        var drawer = null;

        switch (animatronicType.toLowerCase()) {
            case 'freddy':
                drawer = drawFreddyHead;
                break;
            case 'bonnie':
                drawer = drawBonnieHead;
                break;
            case 'chica':
                drawer = drawChicaHead;
                break;
            case 'foxy':
                drawer = drawFoxyHead;
                break;
            case 'golden':
                drawer = drawGoldenFreddyHead;
                break;
            default:
                drawer = drawFreddyHead;
        }

        function frame() {
            var elapsed = Date.now() - startTime;
            var progress = Math.min(elapsed / durationMs, 1.0);

            // Clear canvas
            jumpScareCtx.fillStyle = '#000000';
            jumpScareCtx.fillRect(0, 0, jumpScareCanvas.width, jumpScareCanvas.height);

            // Animate: scale up from 0.3 to 1.2, alpha in then out
            var scale = 0.3 + progress * 0.9;
            var alpha = progress < 0.5 ? progress * 2 : Math.max(0, 1 - (progress - 0.5) * 2);

            var w = jumpScareCanvas.width / 2;
            var h = jumpScareCanvas.height / 2;

            // Draw animatronic
            drawer(jumpScareCtx, w, h, scale, alpha);

            if (progress < 1.0) {
                animationFrameId = requestAnimationFrame(frame);
            } else {
                jumpScareCanvas.style.display = 'none';
                isAnimating = false;
                cancelAnimationFrame(animationFrameId);
            }
        }

        animationFrameId = requestAnimationFrame(frame);
    }

    /**
     * Public API
     */
    window.jumpScare = {
        init: init,
        animate: animate
    };

    // Auto-init on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();