/**
 * The arcade synth — a lazily-created, document-level singleton.
 *
 * Everything is rendered from oscillators at runtime; there are no audio files.
 * Loaded only via dynamic import from useGameAudio, so this code and tracks.js
 * live in an async chunk that non-arcade routes never fetch.
 *
 * Timing note: notes are scheduled ahead on the AudioContext clock rather than
 * fired from the cabinets' rAF loop. rAF is throttled to ~0fps on a hidden tab,
 * is display-coupled (144Hz vs 60Hz changes granularity), shares a jank budget
 * with Three.js, and does not exist at all in TicTacToe. A 25ms interval only
 * decides *when to enqueue*; osc.start(t) stays sample-accurate.
 */

import { getMuted, subscribe } from './muteStore';
import { SFX } from './sfx';
import { TRACKS } from './tracks';

const LOOKAHEAD_S = 0.12;
const TICK_MS = 25;
const STEPS_PER_BEAT = 4;
const MAX_VOICES = 10;
const SFX_MIN_GAP_MS = 30;

const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const freqCache = new Map();

function noteToFreq(name) {
    const cached = freqCache.get(name);
    if (cached !== undefined) return cached;

    const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!match) {
        freqCache.set(name, 0);
        return 0;
    }
    const [, letter, accidental, octave] = match;
    const offset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
    const midi = (Number(octave) + 1) * 12 + SEMITONES[letter] + offset;
    const freq = 440 * 2 ** ((midi - 69) / 12);

    freqCache.set(name, freq);
    return freq;
}

/**
 * Flatten a track's bar-strings into a per-step timeline. A pitched note holds
 * for every "-" that follows it, so duration is resolved here rather than in
 * the scheduler's hot path. Compiled once per slug, then cached.
 */
const compiled = new Map();

function compileChannel(channel, stepDur) {
    if (!channel) return [];
    const tokens = channel.bars.flatMap((bar) => bar.trim().split(/\s+/));

    return tokens.map((token, i) => {
        if (token === '.' || token === '-') return null;

        let held = 1;
        while (tokens[i + held] === '-') held += 1;

        return { freq: noteToFreq(token), dur: held * stepDur };
    });
}

function compileTrack(slug) {
    const cachedTrack = compiled.get(slug);
    if (cachedTrack) return cachedTrack;

    const track = TRACKS[slug];
    if (!track) return null;

    const stepDur = 60 / track.bpm / STEPS_PER_BEAT;
    const drumTokens = track.drums
        ? track.drums.bars.flatMap((bar) => bar.trim().split(/\s+/)).map((t) => (t === '.' ? null : t))
        : [];

    const result = {
        stepDur,
        lead: compileChannel(track.lead, stepDur),
        bass: compileChannel(track.bass, stepDur),
        drums: drumTokens,
        leadWave: track.lead?.wave ?? 'square',
        bassWave: track.bass?.wave ?? 'triangle',
        leadGain: track.lead?.gain ?? 0.12,
        bassGain: track.bass?.gain ?? 0.22,
        drumGain: track.drums?.gain ?? 0.16,
        steps: Math.max(
            track.lead ? track.lead.bars.length * 16 : 0,
            track.bass ? track.bass.bars.length * 16 : 0,
            drumTokens.length,
        ),
    };

    compiled.set(slug, result);
    return result;
}

function createEngine() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;

    const ctx = new Ctor();

    const master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    const musicBus = ctx.createGain();
    const sfxBus = ctx.createGain();

    comp.threshold.value = -14;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;

    musicBus.gain.value = 0.55;
    sfxBus.gain.value = 0.9;
    master.gain.value = getMuted() ? 0 : 1;

    musicBus.connect(comp);
    sfxBus.connect(comp);
    comp.connect(master);
    master.connect(ctx.destination);

    // Every live source, so unmount can hard-kill mid-note instead of leaving a
    // stuck oscillator droning.
    const live = new Set();
    let noise = null;

    function track(node, endTime) {
        live.add(node);
        node.onended = () => live.delete(node);
        node.stop(endTime);
    }

    function noiseBuffer() {
        if (noise) return noise;
        const len = ctx.sampleRate;
        noise = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
        return noise;
    }

    function env(gain, t, dur, peak) {
        gain.setValueAtTime(0, t);
        gain.linearRampToValueAtTime(peak, t + 0.005);
        gain.exponentialRampToValueAtTime(Math.max(peak * 0.6, 0.0001), t + 0.04);
        gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }

    function tone({ wave, f0, f1, dur, gain, dest, t }) {
        if (!f0) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();

        osc.type = wave;
        osc.frequency.setValueAtTime(f0, t);
        if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);

        env(g.gain, t, dur, gain);
        osc.connect(g).connect(dest);
        osc.start(t);
        track(osc, t + dur + 0.02);
    }

    function noiseHit({ filter, f0, f1, dur, gain, dest, t, q = 1 }) {
        const src = ctx.createBufferSource();
        const filt = ctx.createBiquadFilter();
        const g = ctx.createGain();

        src.buffer = noiseBuffer();
        filt.type = filter;
        filt.Q.value = q;
        filt.frequency.setValueAtTime(f0, t);
        if (f1 && f1 !== f0) filt.frequency.exponentialRampToValueAtTime(f1, t + dur);

        env(g.gain, t, dur, gain);
        src.connect(filt).connect(g).connect(dest);
        src.start(t);
        track(src, t + dur + 0.02);
    }

    function drum(kind, t, gain) {
        if (kind === 'K') {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
            g.gain.setValueAtTime(gain, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
            osc.connect(g).connect(musicBus);
            osc.start(t);
            track(osc, t + 0.11);
            return;
        }

        if (kind === 'S') {
            noiseHit({ filter: 'bandpass', f0: 1800, f1: 1800, dur: 0.11, gain: gain * 0.9, dest: musicBus, t, q: 0.8 });
            const body = ctx.createOscillator();
            const g = ctx.createGain();
            body.type = 'triangle';
            body.frequency.setValueAtTime(190, t);
            g.gain.setValueAtTime(gain * 0.4, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
            body.connect(g).connect(musicBus);
            body.start(t);
            track(body, t + 0.09);
            return;
        }

        // h / H — closed and open hats.
        const dur = kind === 'H' ? 0.16 : 0.03;
        noiseHit({ filter: 'highpass', f0: 7000, f1: 7000, dur, gain: gain * 0.5, dest: musicBus, t, q: 1 });
    }

    // ---- Sequencer -------------------------------------------------------

    let song = null;
    let step = 0;
    let nextTime = 0;
    let timer = null;
    let pendingSlug = null;
    let gestureArmed = false;
    const lastFired = new Map();

    function scheduleStep(t) {
        const lead = song.lead[step];
        if (lead) tone({ wave: song.leadWave, f0: lead.freq, f1: lead.freq, dur: lead.dur, gain: song.leadGain, dest: musicBus, t });

        const bass = song.bass[step];
        if (bass) tone({ wave: song.bassWave, f0: bass.freq, f1: bass.freq, dur: bass.dur, gain: song.bassGain, dest: musicBus, t });

        const hit = song.drums[step];
        if (hit) drum(hit, t, song.drumGain);
    }

    function tick() {
        if (!song) return;
        while (nextTime < ctx.currentTime + LOOKAHEAD_S) {
            scheduleStep(nextTime);
            nextTime += song.stepDur;
            step = (step + 1) % song.steps;
        }
    }

    function startTimer() {
        if (timer !== null || !song) return;
        nextTime = Math.max(nextTime, ctx.currentTime + 0.05);
        timer = setInterval(tick, TICK_MS);
        tick();
    }

    function stopTimer() {
        if (timer === null) return;
        clearInterval(timer);
        timer = null;
    }

    function killVoices() {
        for (const node of live) {
            try {
                node.stop();
            } catch {
                // Already stopped — nothing to do.
            }
        }
        live.clear();
    }

    function armGesture() {
        if (gestureArmed) return;
        gestureArmed = true;

        const fire = () => {
            gestureArmed = false;
            ctx.resume().then(() => {
                if (pendingSlug) {
                    const slug = pendingSlug;
                    pendingSlug = null;
                    engine.start(slug);
                }
            }).catch(() => {});
        };

        const opts = { once: true, passive: true };
        window.addEventListener('pointerdown', fire, opts);
        window.addEventListener('keydown', fire, opts);
        window.addEventListener('touchstart', fire, opts);
    }

    function ensureRunning() {
        if (ctx.state === 'running') return true;
        ctx.resume().catch(() => {});
        if (ctx.state === 'running') return true;
        armGesture();
        return false;
    }

    // ---- Public API ------------------------------------------------------

    const engine = {
        start(slug) {
            const next = compileTrack(slug);
            if (!next) return;

            song = next;
            step = 0;
            nextTime = 0;
            stopTimer();
            killVoices();

            if (getMuted()) return;
            if (!ensureRunning()) {
                pendingSlug = slug;
                return;
            }
            startTimer();
        },

        resumeMusic() {
            if (!song || getMuted()) return;
            if (!ensureRunning()) return;
            startTimer();
        },

        pauseMusic() {
            stopTimer();
            const t = ctx.currentTime;
            musicBus.gain.cancelScheduledValues(t);
            musicBus.gain.setValueAtTime(musicBus.gain.value, t);
            musicBus.gain.linearRampToValueAtTime(0, t + 0.05);
            setTimeout(() => {
                if (timer === null) {
                    killVoices();
                    musicBus.gain.setValueAtTime(0.55, ctx.currentTime);
                }
            }, 60);
        },

        stopMusic() {
            stopTimer();
            killVoices();
            song = null;
            pendingSlug = null;
            step = 0;
            nextTime = 0;
            musicBus.gain.setValueAtTime(0.55, ctx.currentTime);
        },

        sfx(name) {
            const recipe = SFX[name];
            if (!recipe || getMuted()) return;

            const now = Date.now();
            if (now - (lastFired.get(name) ?? 0) < SFX_MIN_GAP_MS) return;
            lastFired.set(name, now);

            if (live.size > MAX_VOICES) return;
            if (ctx.state !== 'running') {
                ctx.resume().catch(() => {});
                if (ctx.state !== 'running') return;
            }

            const t = ctx.currentTime;
            if (recipe.type === 'tone') {
                tone({ ...recipe, dest: sfxBus, t });
            } else if (recipe.type === 'noise') {
                noiseHit({ ...recipe, dest: sfxBus, t });
            } else if (recipe.type === 'arp') {
                recipe.notes.forEach((note, i) => {
                    const f = noteToFreq(note);
                    tone({
                        wave: recipe.wave, f0: f, f1: f, dur: recipe.step * 1.6,
                        gain: recipe.gain, dest: sfxBus, t: t + i * recipe.step,
                    });
                });
            }
        },

        dispose() {
            unsubscribe();
            stopTimer();
            killVoices();
            song = null;
            ctx.close().catch(() => {});
        },
    };

    // The engine listens to the store directly — MuteButton never touches it,
    // which is what keeps this module out of GameShell's chunk.
    const unsubscribe = subscribe(() => {
        const t = ctx.currentTime;
        if (getMuted()) {
            master.gain.cancelScheduledValues(t);
            master.gain.setValueAtTime(master.gain.value, t);
            master.gain.linearRampToValueAtTime(0, t + 0.02);
            stopTimer();
            setTimeout(() => {
                if (getMuted()) {
                    killVoices();
                    ctx.suspend().catch(() => {});
                }
            }, 100);
            return;
        }

        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(0, t);
        master.gain.linearRampToValueAtTime(1, t + 0.02);
        // The click itself is a gesture, so this resume is allowed.
        ctx.resume().then(() => { if (song) startTimer(); }).catch(() => {});
    });

    return engine;
}

let instance = null;
let refs = 0;

/** Lazy singleton — creates nothing (and no AudioContext) until first use. */
export function getEngine() {
    if (typeof window === 'undefined') return null;
    if (!instance) instance = createEngine();
    return instance;
}

export function acquireEngine() {
    refs += 1;
    return getEngine();
}

/**
 * Refcounted, so navigating between cabinets keeps one AudioContext for the
 * session — browsers cap them at around six.
 */
export function releaseEngine() {
    refs = Math.max(0, refs - 1);
    if (refs === 0 && instance) instance.stopMusic();
}
