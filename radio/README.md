# RΛNDØM[NULL] RADIO — Xenowave Transmission Engine

**Static JavaScript procedural xenarmonic radio** for OBSCURA/07, Sellone integration and embedded players. Runs in the browser; no Node backend, CDN, cloud TTS, account, token, subscription or network calls needed.

- **Live UI:** [Radio](./index.html) — play, regenerate, mute, actual mini FFT spectrum, MP3/WAV download, seed copy link.
- **Seed:** self-contained `R1....` token encodes all arrangement settings including tuning, duration and `withVox`; `makePlan({seed: token})` reconstructs the same plan. The renderer is sample deterministic in the same JS runtime/version, not formally guaranteed bit-perfect across every architecture/browser.
- **Music:** 19/22/31/53-EDO and 7-limit just intonation; nine style families; arranged drones, pads, pulse, leads, bells, plucked guitar simulation, bass, electronic drum voices, noise textures and simple stereo feedback effects. Consonance is favoured by curated pitch sets, but pleasingness is subjective and cannot be mathematically guaranteed.
- **withVøx:** optional, off by default; 18 language phrase banks, >1000 combinatorial written expressions, 1 million identity IDs plus continuously variable synthesis parameters, mood/concept metadata, deterministic robot/formant/whisper vocal processing. **This is synthetic vocoder-like speech, not intelligible natural TTS in all 18 languages.** Some syllables will not be recognizable. No external or device voice output is used.
- **MP3:** LGPL-3-licensed lamejs bundled in `vendor/lame.min.js`, lazily loaded only when exporting, used as separate unmodified library. See [license](./vendor/LICENSE.txt); credit [zhuker/lamejs](https://github.com/zhuker/lamejs), [LAME](https://lame.sourceforge.net/). WAV is produced by the original engine.
- **Origin:** MP3 contains ID3 title, artist and generation information, and PCM includes a repeated low-level watermark. This is a traceability hint, **not** invisible or tamper-proof DRM: as static JS source is public there can be no genuinely secret signing key in the browser. An attacker can erase metadata or process/remix audio, and watermark survives no guaranteed transformation. Keep independent signed master receipts privately for strong provenance.

## Embed in any HTML page

```html
<link rel="stylesheet" href="/radio/widget.css">
<div data-null-radio></div>
<script type="module" src="/radio/widget.js"></script>
```

The player starts on an explicit user click (mobile/desktop autoplay restrictions). It is not an HTTP audio server. The player and library do not track listeners or send media over the network.

## Static API: MP3 / readable stream

```js
import {compose, exportTrack} from "/radio/api.js";
const plan = compose({style:"dreamwave",withVox:true,language:"it"});
const {blob, stream, filename} = await exportTrack({seed:plan.seed},"mp3");
const mp3ByteStream = stream(); // browser ReadableStream, not HTTP streaming
// Use blob in <audio>, a File, fetch-like Response, download, postMessage, etc.
```

Parameters: `seed`, `style`, `mood`, `concept`, `language`, `duration` (16–125 seconds), `bpm` (42–132), `intensity` (0–1), `withVox`. Without `seed`, one is created with crypto.getRandomValues. Title and artist also derive from seed. For a full replay use the **returned** `plan.seed` (R1 recipe), rather than the originally supplied bare seed plus external options.

To embed in an iframe and request a Blob, load `bridge.js` on the radio page and use `postMessage({channel:"RNR/API/1",action:"generate",id:"1",params:{seed:"..."},format:"mp3"}, targetOrigin)`. The radio iframe answers with `{channel,action:"result",id,plan,blob,mime}`. Unlike a true HTTP endpoint this is a browser message exchange. It will not work as `GET /api/generate.mp3` on static GitHub Pages.

## Sellone and OBSCURA/07 integration

- OBSCURA/07 root and low-power pages include the discreet glass dock, and `catalog.json` registers this project with `viewer_type=web_js`.
- `sellone-project.json` is an integration manifest that Sellone can import. The actual local Sellone application must support/consume that manifest; this repository cannot assert local installation or updates it has not performed.
- To publish this module as its **own** `holocube999/RandomNullRadio` repository later, copy `radio/` and change any relative asset URLs; do not break the deployed OBSCURA/07 version.

## Quality and limitations

Pure offline generative synthesizer. No recordings of other artists, songs or licensed samples. PCM generation and MP3 encoding use static Web Workers where supported to keep the UI responsive; memory/CPU load can still be significant on slower smartphones. File/protocol restrictions may trigger a main-thread fallback. Current generator renders a finite audio buffer and the UI schedules the next generation after playback. All synthesis is deterministic for the versioned recipe, not unending mathematically unique. Variation is wide but repetition remains possible.

## Development gates

Test determinism: compare `JSON.stringify(makePlan(params))` with `JSON.stringify(makePlan({seed:makePlan(params).seed}))`; compare PCM arrays and test MP3 bitstream decode in Chromium/Firefox/Android before claiming compatibility on those devices. Node 22 static regression suite is configured in GitHub Actions. Browser interaction/real Android QA is outstanding.


## Live continuity / spoken TTS / sleeve (2026-11-04)

- Changing style, mood, language, concept or seed while playing **does not stop the current audio**: the renderer prepares the next PCM buffer first, then ramps the old and new WebAudio sources for 1.85 s. Old music loops temporarily if rendering is slow; play/pause remains explicit. Auto-next begins the next render before the nominal track end.
- The unobtrusive mini album sleeve is seed-deterministic Canvas generative art (atmospheric, film-grain, landscape, abstract, architectural families), drawn locally without third-party services. **It is not a photorealistic AI image generator or a real licensed photograph.** Such a source could be added separately when available.
- When `withVox` is enabled, browser playback additionally uses native `speechSynthesis` to speak actual words/phrases in supported device languages, with seeded rate, device-voice choice, pitch quantization in the track microtonal tuning and occasional word-level hard/xeno tuning. Actual voices/language quality depend on installed voices and browser; neither hundreds of true independent voice timbres nor full pitch-tracking Auto-Tune of Web Speech audio is guaranteed.
- **Export limitation:** browser native `speechSynthesis` audio is not capturable by the Web Audio rendering graph. Downloaded WAV/MP3 still contain original procedural synthetic vox textures, **not** the native spoken TTS overlay. True spoken-TTS export and DSP Auto-Tune require an offline speech PCM engine or another authorized PCM-producing TTS source; do not label the current exported audio as spoken TTS.
- New regression tests in `radio/tests/live.test.mjs` check seeded cover/voice selection, xenotune grid snapping and crossfade scheduling. Two-browser real speech/device quality remains an explicit QA gate.

Device TTS may use an operating-system or browser speech provider; whether synthesis is fully on-device depends on installed voices. The application itself makes no explicit network requests for speech. The player keeps speech optional and does not claim offline voice synthesis on every device.
