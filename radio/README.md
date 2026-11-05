# RΛNDØM[NULL] RADIO — Xenowave Transmission Engine

**Static JavaScript procedural xenarmonic radio** for OBSCURA/07, Sellone integration and embedded players. Runs in the browser; no Node backend, CDN, cloud TTS, account, token, subscription or network calls needed.

- **Live UI:** [Radio](./index.html) — play, regenerate, mute, actual mini FFT spectrum, MP3/WAV download, seed copy link.
- **Seed:** self-contained `R1....` token encodes all arrangement settings including tuning, duration and `withVox`; `makePlan({seed: token})` reconstructs the same plan. The renderer is sample deterministic in the same JS runtime/version, not formally guaranteed bit-perfect across every architecture/browser.
- **Music:** 19/22/31/53-EDO and 7-limit just intonation; eighteen style families; arranged drones, pads, pulse, leads, bells, plucked guitar simulation, bass, electronic drum voices, noise textures and simple stereo feedback effects. Consonance is favoured by curated pitch sets, but pleasingness is subjective and cannot be mathematically guaranteed.
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

Parameters: `seed`, `style`, `mood`, `concept`, `language`, `duration` (16–125 seconds), `bpm` (42–205), `intensity` (0–1), `withVox`. Without `seed`, one is created with crypto.getRandomValues. Title and artist also derive from seed. For a full replay use the **returned** `plan.seed` (R1 recipe), rather than the originally supplied bare seed plus external options.

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


## Arranger v2 — 2026-11-04

Every R1 seed now produces a sectioned, deterministic arrangement via arrangement.js. Supported styles: legacy xenodrone/vaporwave/dreamwave/synthwave/guitar/ritual/biosphere/darkambient/pulse plus chiptune, harpsichord, medieval, meditation, hangdrum, metal, techno, punk, glitch. Sound comes from original procedural oscillators, not copied recorded instrument samples. The medieval/hangpan/metal timbres are synthesis approximations, not sampled acoustic instruments or human performances.

The arranger uses 3/4, 4/4, 5/4 and 7/4 sections, per-section tempo modulation, break/drop silences with short fades, motif transformations, melodic runs, syncopation and occasional triplet grids. plan.sections and plan.breaks expose the arrangement for debugging, and the post-mix breaks affect WAV/MP3 too. No musical style guarantees professional composition or true infinite nonrepetition; randomness is cryptographically seeded when created normally, then deterministic when replaying the saved R1 token. New engine v0.2.0 reinterprets older R1 recipes musically (the style-index prefix remains compatible) and intentionally does not promise bit-identical older v0.1 audio.

With withVox, lyrics.js selects distinct words, slogans or full statements (one of each for sufficiently long pieces) using seeded templates; an exact phrase is not repeated within a track. Italian, English, Spanish and French have hand-authored sentence/slogan templates; the remaining supported languages use phrase-bank fallbacks. As before, playback TTS depends on device capabilities and the native spoken track is not captured in WAV/MP3 exports; those still contain synthetic vox only.


## Offline corpus, hip-hop, vocal mixing and cover viewer (2026-11-05)

- **Offline text generator:** `linguistic-corpus.js` includes original Italian/English banks for grammar-preserving surreal statements, paradoxical questions, slogans, abstract observations and rhyme families. Thousands/millions of combinations emerge from deterministic seeded grammar; other languages retain the 18 original multilingual banks. The advanced TEXT INPUT accepts only brief vocabulary provided by the user or appropriately licensed material, extracts short words and never downloads/copies entire pages.
- **ANSA licensing:** the radio does **not** automatically harvest, store, scrape or recombine ANSA headlines/articles. ANSA's published RSS terms restrict their use and their copyright statement restricts AI/automated reuse. Integrate licensed or user-authored text through the optional text field instead; offline generation is the default.
- **HIP-HOP/RAP:** dedicated four-four arrangement with kick, backbeat snare, swung hats and bass. Verses have seeded AABB/ABAB end rhyme patterns; the final rhyme word is placed on beat four of each bar (musical scheduling, not a guarantee of natural vocal intelligibility). Choosing HIP-HOP activates withVøx by default, unless explicitly disabled.
- **Rendered voice (not live TTS):** `voice-render.js` generates phoneme PCM from original text then renders tuned robotic/monster/chorus layers, short room echoes, delay and saturation in the same offline worker as music. No `speechSynthesis` playback, remote TTS service or voice capture. The vocal quality is deliberately synthetic and pronunciation is approximate, especially for unsupported scripts; it does **not** claim to turn all languages into natural speech.
- **Two gain controls:** visible VOL adjusts the shared master. Advanced VOX LEVEL adjusts the pre-rendered vocal bus independently while playing, keeping voice below the instrumental track by default; mute operates on both. WAV/MP3 exports merge the processed vocal bus at the current vocal level. An optional site iframe keeps its intentionally very low initial master.
- **Album:** clicking the miniature generated cover opens a scalable closeable dialog. For the Obscura07 embedded player, the image is forwarded through validated same-origin `postMessage` to a page-level dialog, so the modal is never cropped by the iframe. Escape, backdrop click and × close it.
- **Offline:** `sw.js` caches the self-contained radio shell, synthesis modules and encoder after the first successful HTTPS visit. Neither the browser engine nor the service worker collects news or sends lyrics anywhere. Offline replay is version-stable when the R1 recipe and local corpus revision are unchanged.

The synthesis pipeline includes a prior-to-play audio rendering step: it is not a real-time speech processor. The generator remains a procedural electronic-voice instrument, not a faithful human rap performance. Browser/autoplay acceptance and listening tests remain separate from unit tests.
