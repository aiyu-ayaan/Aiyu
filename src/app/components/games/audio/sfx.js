/**
 * One-shot sound recipes, as data. synth.js renders these — nothing here
 * touches the Web Audio API.
 *
 *   tone  — a single oscillator sweeping f0 -> f1 over dur
 *   noise — filtered white noise sweeping the filter f0 -> f1 over dur
 *   arp   — a run of notes, `step` seconds apart
 *
 * Gains are pre-mix; the sfx bus and the compressor sit downstream.
 */
export const SFX = {
    blip: { type: 'tone', wave: 'square', f0: 880, f1: 1320, dur: 0.05, gain: 0.16 },
    bounce: { type: 'tone', wave: 'square', f0: 440, f1: 660, dur: 0.06, gain: 0.18 },
    wall: { type: 'tone', wave: 'square', f0: 330, f1: 300, dur: 0.04, gain: 0.12 },
    jump: { type: 'tone', wave: 'square', f0: 300, f1: 760, dur: 0.12, gain: 0.16 },
    shoot: { type: 'tone', wave: 'sawtooth', f0: 1200, f1: 400, dur: 0.09, gain: 0.14 },
    lock: { type: 'tone', wave: 'triangle', f0: 180, f1: 120, dur: 0.05, gain: 0.18 },
    rotate: { type: 'tone', wave: 'square', f0: 620, f1: 700, dur: 0.03, gain: 0.10 },

    roll: { type: 'noise', filter: 'bandpass', f0: 900, f1: 300, dur: 0.16, gain: 0.14 },
    hit: { type: 'noise', filter: 'bandpass', f0: 2200, f1: 800, dur: 0.10, gain: 0.20 },
    explode: { type: 'noise', filter: 'lowpass', f0: 1400, f1: 90, dur: 0.45, gain: 0.30 },

    coin: { type: 'arp', wave: 'square', notes: ['E6', 'B6'], step: 0.05, gain: 0.16 },
    point: { type: 'arp', wave: 'square', notes: ['G5', 'C6'], step: 0.05, gain: 0.16 },
    lineClear: { type: 'arp', wave: 'square', notes: ['C5', 'E5', 'G5', 'C6'], step: 0.045, gain: 0.18 },
    levelUp: { type: 'arp', wave: 'square', notes: ['C5', 'G5', 'C6', 'E6'], step: 0.06, gain: 0.18 },
    gameOver: { type: 'arp', wave: 'square', notes: ['C5', 'G4', 'Eb4', 'C4'], step: 0.13, gain: 0.20 },
    win: { type: 'arp', wave: 'square', notes: ['C5', 'E5', 'G5', 'C6', 'G5', 'C6'], step: 0.09, gain: 0.20 },
    lose: { type: 'arp', wave: 'triangle', notes: ['G4', 'Eb4', 'C4'], step: 0.14, gain: 0.20 },
    draw: { type: 'arp', wave: 'triangle', notes: ['E4', 'E4'], step: 0.16, gain: 0.16 },
};
