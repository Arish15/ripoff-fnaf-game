/**
 * Phone Guy Audio Generator — ElevenLabs TTS
 *
 * Generates phoneguy_night1.mp3 … phoneguy_night6.mp3 in src/assets/
 * using the ElevenLabs v1 TTS API.
 *
 * Usage:
 *   node generate_phoneguy.js --key YOUR_API_KEY
 *   -- OR --
 *   set XI_API_KEY=YOUR_API_KEY && node generate_phoneguy.js
 *
 * If your free-tier character quota runs out mid-way the script
 * stops and prints a Casting Call Club post template for the
 * remaining nights.
 *
 * Voice: "Adam" (pNInz6obpgDQGcFmaJgB) — deep, slightly husky American male.
 * You can swap VOICE_ID for any ElevenLabs voice you prefer.
 * Browse voices at: https://elevenlabs.io/voice-library
 */

'use strict';

var https = require('https');
var fs = require('fs');
var path = require('path');

// ── Config ─────────────────────────────────────────────────────────────────
var VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam — change to any voice ID you like
var MODEL_ID = 'eleven_monolingual_v1';
var OUT_DIR = path.join(__dirname, 'src', 'assets');
var VOICE_SETTINGS = { stability: 0.55, similarity_boost: 0.60, style: 0.15, use_speaker_boost: true };

// ── Phone Guy scripts ───────────────────────────────────────────────────────
// Night 5 uses a cleaned version (no stage directions) so TTS sounds natural.
// Night 6 is dead air — we generate a very short silent placeholder instead.
var SCRIPTS = {
    1: "Uh, hello? Hello, hello? Uh, I wanted to record a message for you to help you get settled in on your first night. Um, I actually worked in that office before you. I'm finishing up my last week now, as a matter of fact. So, I know it can be a bit overwhelming, but I'm here to tell you there's nothing to worry about. Uh, you'll do fine! So, let's just focus on getting you through your first week. Okay? Uh, let's see, first there's an introductory greeting from the company that I'm supposed to read. Uh, it's kind of a legal thing, you know. Um, Welcome to Freddy Fazbear's Pizza. A magical place for kids and grown-ups alike, where fantasy and fun come to life. Fazbear Entertainment is not responsible for damage to property or person. Upon discovering that damage or death has occurred, a missing persons report will not be filed within 90 days, and a general safety and security report will not be issued. Uh, that's all. So, um, let's move on! Uh, so the animatronic characters here do get a bit quirky at night. But do I blame them? No! If I were forced to sing those same stupid songs for twenty years and I never got a bath? I'd probably be a bit irritable at night too. So, remember, these characters hold a special place in the hearts of children and we need to show them a little respect, right? Okay. So just be aware, the characters do tend to wander a bit. Uh, they're left in some kind of free-roaming mode at night. Something about their servos locking up if they get turned off for too long. We can't get the parts to fix 'em. They used to be allowed to walk around during the day too. But then there was The Bite of '87. Yeah. It's amazing that the human body can live without the frontal lobe, you know? Uh, now concerning your safety — the only real risk to you as a night watchman here, if you were to allow yourself to be seen by the animatronics in their free-roaming mode, is being stuffed into a Freddy Fazbear suit. Now that wouldn't be so bad if the suits were in good condition, but they're not. So, just avoid being seen or make sure that the characters don't walk into your office, okay? Um, the doors are to your left and to your right. You have two lights, one for each door. There's also a fan in your office — helps with the, uh, smell in there. Um, just hang tight. I'll talk to you again tomorrow night. Okay? Bye-bye.",

    2: "Uh, hello? Hello? Uh, well, if you're hearing this then, uh, congratulations on completing Night One! Um, I knew you could do it. Uh, just to let you know, uh, we do have one more chair in the back room — the one with the yellow suit. We don't use it anymore. If you see it, um... just leave it alone. Uh, I wanted to clarify a few things. The older models, uh — they're not quite retired. We still have them in the establishment. They spend most of their time wandering the halls, but they've been given a very specific directive. They're essentially looking for any endoskeletal unit not enclosed in a suit. That means you, unfortunately. So, uh, just make sure they don't see you. Also, uh, keep an eye on Pirate Cove — the character there, Foxy, he's a bit unique. He doesn't move like the others. He gets restless the longer he's observed, but also the longer he's ignored. Um, just check in on him periodically. You'll figure out the balance. Uh, as for power — use it wisely. Every door, every light, every camera check drains a little. Try to keep the doors closed only when necessary. You'll be fine. Hang in there! Good night.",

    3: "Hello, hello! Hey, you're doing great! Most people don't last this long. I mean, uh — I don't mean to scare you — they quit. Um, I wanted to tell you something though. Um, the animatronics have some kind of facial recognition built in. Originally it was used to identify criminal activity and the like. But now... well, you see, after the restaurant had some... issues, they reprogrammed the units to identify any endoskeletal element not fully enclosed in a suit. And then, of course, they... well, they try to put you in one. So the mask idea — don't try it. They can tell. The suits are the real solution. But obviously you can't put on a suit, so just keep the doors closed when they get close. Also — Foxy. He gets jumpier the more you stare at him, but also the more you ignore him. It's about balance. Check pirate cove regularly but don't linger. Um, I should mention — if things get really intense tonight, don't panic. Panicking wastes power. Stay calm, be systematic. You've got this! Okay, I'll let you go. Have a good night, and I'll see you on the flipside!",

    4: "Hello? Hello? Hey! Glad you made it. Uh, hey, look — I don't know if I'll be able to send you a message tomorrow night. I just don't think I'll be able to. It's been a bit of a rough night here for me. Um, I got a bit turned around. Uh, I want to remind you — if the power runs out before 6 AM, do not — I repeat, do not — make any noise. Don't move. Freddy himself will come to your office. He will stand in the doorway and just... watch you. If you stay completely still, don't even move the camera, he will eventually leave. Or he won't. It's kind of a coin flip at that point. Um. Just... keep the power up if you can. Check the cameras. Close the doors when you see someone at the end of the hall. Don't waste the lights. Um. Okay. I gotta go. Good luck. Bye-bye.",

    5: "I'm still here. I'm okay. Um. I... they... Hello? Is anyone there? Stay back. Hey... no... stay... NO!",

    6: "..." // Night 6 is dead air / static — very short, game layered static over TTS anyway
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function parseArgs() {
    var args = process.argv.slice(2);
    for (var i = 0; i < args.length - 1; i++) {
        if (args[i] === '--key') return args[i + 1];
    }
    return process.env.XI_API_KEY || null;
}

function countChars() {
    return Object.values(SCRIPTS).reduce(function(n, s) { return n + s.length; }, 0);
}

function fmtNight(n) { return 'phoneguy_night' + n + '.mp3'; }

function alreadyDone(night) {
    var dest = path.join(OUT_DIR, fmtNight(night));
    try { return fs.statSync(dest).size > 0; } catch (e) { return false; }
}

function callElevenLabs(apiKey, text) {
    return new Promise(function(resolve, reject) {
        var body = JSON.stringify({
            text: text,
            model_id: MODEL_ID,
            voice_settings: VOICE_SETTINGS
        });

        var options = {
            hostname: 'api.elevenlabs.io',
            path: '/v1/text-to-speech/' + VOICE_ID,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey,
                'Accept': 'audio/mpeg',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        var chunks = [];
        var req = https.request(options, function(res) {
            res.on('data', function(c) { chunks.push(c); });
            res.on('end', function() {
                var buf = Buffer.concat(chunks);
                if (res.statusCode === 200) {
                    resolve(buf);
                } else {
                    var errText = buf.toString('utf8');
                    var err = new Error('ElevenLabs API ' + res.statusCode + ': ' + errText);
                    err.status = res.statusCode;
                    err.body = errText;
                    reject(err);
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function printCastingCallTemplate(remainingNights) {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ElevenLabs quota hit. Post on Casting Call Club for nights:');
    console.log('  ' + remainingNights.map(function(n) { return 'Night ' + n; }).join(', '));
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\nPASTE THIS AT: https://www.castingcallclub.com/projects/new\n');
    console.log('--- CUT HERE ---');
    console.log('PROJECT TITLE:  FNAF Browser Recreation — Phone Guy Voice (Night ' + remainingNights.join('/') + ')');
    console.log('USAGE:          Non-commercial fan game (browser-based, no monetisation)');
    console.log('DEADLINE:       Open (volunteer, no pay)');
    console.log('FORMAT:         MP3, 44100 Hz, ~128 kbps, mono ok');
    console.log('FILE NAMES:     phoneguy_night' + remainingNights.join('.mp3 / phoneguy_night') + '.mp3\n');
    remainingNights.forEach(function(n) {
        console.log('── NIGHT ' + n + ' SCRIPT ──────────────────────────────────────────');
        console.log(SCRIPTS[n]);
        console.log('');
    });
    console.log('--- CUT HERE ---');
    console.log('\nDrop the received files into:  fnaf/src/assets/');
    console.log('The game will pick them up automatically on the next page load.\n');
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
    var apiKey = parseArgs();
    if (!apiKey) {
        console.error('ERROR: No API key found.');
        console.error('  Usage: node generate_phoneguy.js --key YOUR_XI_API_KEY');
        console.error('  Or:    set XI_API_KEY=YOUR_XI_API_KEY  (Windows)');
        console.error('         export XI_API_KEY=YOUR_XI_API_KEY  (mac/linux)');
        console.error('\nGet a free key at: https://elevenlabs.io  (10,000 chars/month free)');
        process.exit(1);
    }

    console.log('Phone Guy Generator — ElevenLabs TTS');
    console.log('Voice: Adam (' + VOICE_ID + ')');
    console.log('Estimated characters: ~' + countChars() + ' / 10,000 free tier');
    console.log('Output directory: ' + OUT_DIR + '\n');

    var nights = [1, 2, 3, 4, 5, 6];
    var failed = [];

    for (var i = 0; i < nights.length; i++) {
        var night = nights[i];
        var dest = path.join(OUT_DIR, fmtNight(night));

        if (alreadyDone(night)) {
            console.log('Night ' + night + ' — already exists, skipping.');
            continue;
        }

        if (night === 6) {
            // Night 6 is dead air — write a 0-byte placeholder; the game handles it with static.
            fs.writeFileSync(dest, Buffer.alloc(0));
            console.log('Night 6 — dead air placeholder written (0 bytes).');
            continue;
        }

        process.stdout.write('Night ' + night + ' — generating (' + SCRIPTS[night].length + ' chars)... ');
        try {
            var mp3buf = await callElevenLabs(apiKey, SCRIPTS[night]);
            fs.writeFileSync(dest, mp3buf);
            console.log('done. Saved ' + mp3buf.length + ' bytes → ' + fmtNight(night));
        } catch (err) {
            if (err.status === 401) {
                console.error('\nERROR: Invalid API key (401 Unauthorized).');
                console.error('Check your key at https://elevenlabs.io/settings');
                process.exit(1);
            } else if (err.status === 429 || (err.body && err.body.includes('quota'))) {
                console.log('QUOTA EXCEEDED');
                failed = nights.slice(i);
                break;
            } else {
                console.error('FAILED — ' + err.message);
                failed.push(night);
            }
        }
    }

    if (failed.length > 0) {
        printCastingCallTemplate(failed);
    } else {
        console.log('\nAll nights generated successfully!');
        console.log('Restart the game server (node server.js) and hard-refresh the browser.');
    }
}

main().catch(function(err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
});