/**
 * Aiyu Arcade soundtrack — one track per cabinet slug, keyed to that game's
 * registry color and pace. Pure data; synth.js renders it.
 *
 * Each channel is an array of bars, every bar 16 space-separated steps
 * (16th notes). All channels of a track share a bar count, so the sequencer
 * loops the whole track with no per-channel bookkeeping.
 *
 *   Pitched channels:  "C#4" attack · "-" sustain previous · "." rest
 *   Drums:             K kick · S snare · h closed hat · H open hat · . rest
 *
 * Gains are pre-mix — the music bus and the compressor sit downstream.
 */
export const TRACKS = {
    // Cyan. Endless neon highway: four-on-the-floor, arpeggio lead, 16th bass.
    'byte-runner': {
        bpm: 150,
        lead: {
            wave: 'square', gain: 0.11, bars: [
                'A4 . E5 . C5 . E5 . A4 . E5 . C5 . E5 .',
                'G4 . D5 . B4 . D5 . G4 . D5 . B4 . D5 .',
                'F4 . C5 . A4 . C5 . F4 . C5 . A4 . C5 .',
                'E4 . B4 . G4 . B4 . E4 . B4 . E5 . D5 .',
            ],
        },
        bass: {
            wave: 'triangle', gain: 0.24, bars: [
                'A1 . A1 A1 . A1 . A1 A1 . A1 . A1 A1 . A1',
                'G1 . G1 G1 . G1 . G1 G1 . G1 . G1 G1 . G1',
                'F1 . F1 F1 . F1 . F1 F1 . F1 . F1 F1 . F1',
                'E1 . E1 E1 . E1 . E1 E1 . E1 . E1 E1 . E1',
            ],
        },
        drums: {
            gain: 0.18, bars: [
                'K . h . S . h . K . h . S . h h',
                'K . h . S . h . K . h . S . h h',
                'K . h . S . h . K . h . S . h h',
                'K . h . S . h . K . h K S . h H',
            ],
        },
    },

    // Green. Fastest track in the arcade; relentless offbeat hats.
    'moto-rush': {
        bpm: 168,
        lead: {
            wave: 'square', gain: 0.11, bars: [
                'E5 . . B4 . E5 . . G5 . F#5 . E5 . . .',
                'D5 . . A4 . D5 . . F5 . E5 . D5 . . .',
                'C5 . . G4 . C5 . . E5 . D5 . C5 . . .',
                'B4 . . F#4 . B4 . . D5 . C5 . B4 . . .',
            ],
        },
        bass: {
            wave: 'triangle', gain: 0.24, bars: [
                'E1 . E1 . E1 . E1 . E1 . E1 . E1 . E1 .',
                'D1 . D1 . D1 . D1 . D1 . D1 . D1 . D1 .',
                'C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .',
                'B1 . B1 . B1 . B1 . B1 . B1 . F#1 . F#1 .',
            ],
        },
        drums: {
            gain: 0.18, bars: [
                'K . h h S . h h K . h h S . h h',
                'K . h h S . h h K . h h S . h h',
                'K . h h S . h h K . h h S . h h',
                'K . h h S . h h K . h h S . h H',
            ],
        },
    },

    // Magenta. Written in Korobeiniki's idiom — minor, stepwise, walking bass —
    // but an original melody, not the folk tune.
    tetris: {
        bpm: 144,
        lead: {
            wave: 'square', gain: 0.12, bars: [
                'A4 . . C5 . E5 . D5 . C5 . B4 . . A4 .',
                'G4 . . B4 . D5 . C5 . B4 . A4 . . G4 .',
                'F4 . . A4 . C5 . B4 . A4 . G4 . . F4 .',
                'E4 . . G#4 . B4 . D5 . C5 . B4 . . . .',
            ],
        },
        bass: {
            wave: 'triangle', gain: 0.22, bars: [
                'A2 . . . E2 . . . A2 . . . C3 . B2 .',
                'G2 . . . D2 . . . G2 . . . B2 . A2 .',
                'F2 . . . C2 . . . F2 . . . A2 . G2 .',
                'E2 . . . B1 . . . E2 . . . E2 . E2 .',
            ],
        },
        drums: {
            gain: 0.17, bars: [
                'K . . h S . . h K . K h S . h .',
                'K . . h S . . h K . K h S . h .',
                'K . . h S . . h K . K h S . h .',
                'K . . h S . . h K . K h S . h H',
            ],
        },
    },

    // Green. Bouncy and playful — the shortest loop here.
    snake: {
        bpm: 112,
        lead: {
            wave: 'square', gain: 0.12, bars: [
                'C5 . E5 . G5 . E5 . F5 . D5 . C5 . . .',
                'D5 . F5 . A5 . F5 . G5 . E5 . C5 . . .',
            ],
        },
        bass: {
            wave: 'triangle', gain: 0.22, bars: [
                'C2 . . . G2 . . . F2 . . . G2 . . .',
                'D2 . . . A2 . . . G2 . . . G2 . . .',
            ],
        },
        drums: {
            gain: 0.16, bars: [
                'K . h . S . h . K . h . S . h .',
                'K . h . S . h . K . h . S . h H',
            ],
        },
    },

    // Magenta. Punchy, snare-heavy, 1976 energy.
    breakout: {
        bpm: 130,
        lead: {
            wave: 'square', gain: 0.12, bars: [
                'D5 . . . F5 . E5 . D5 . . . A4 . . .',
                'C5 . . . E5 . D5 . C5 . . . G4 . . .',
                'Bb4 . . . D5 . C5 . Bb4 . . . F4 . . .',
                'A4 . . . C5 . D5 . E5 . . . F5 . E5 .',
            ],
        },
        bass: {
            wave: 'triangle', gain: 0.24, bars: [
                'D2 . D2 . . D2 . . A1 . A1 . . A1 . .',
                'C2 . C2 . . C2 . . G1 . G1 . . G1 . .',
                'Bb1 . Bb1 . . Bb1 . . F1 . F1 . . F1 . .',
                'A1 . A1 . . A1 . . A1 . A1 . . E1 . .',
            ],
        },
        drums: {
            gain: 0.18, bars: [
                'K . S . S . K S K . S . S . S h',
                'K . S . S . K S K . S . S . S h',
                'K . S . S . K S K . S . S . S h',
                'K . S . S . K S K . S . S S S H',
            ],
        },
    },

    // Amber. A descending ostinato that tightens as the fleet drops — the
    // classic four-tone pulse idea, original notes.
    invaders: {
        bpm: 100,
        lead: {
            wave: 'square', gain: 0.11, bars: [
                'C5 . . . . . Eb5 . . . D5 . . . . .',
                'Bb4 . . . . . C5 . . . G4 . . . . .',
                'Ab4 . . . . . C5 . . . Eb5 . . . . .',
                'G4 . . . . . Bb4 . . . D5 . . . . .',
            ],
        },
        bass: {
            wave: 'triangle', gain: 0.26, bars: [
                'C2 . . . Ab1 . . . G1 . . . F1 . . .',
                'C2 . . . Ab1 . . . G1 . . . F1 . . .',
                'C2 . . . Ab1 . . . G1 . . . Eb1 . . .',
                'C2 . . . G1 . . . Eb1 . . . C1 . . .',
            ],
        },
        drums: {
            gain: 0.16, bars: [
                'K . . . S . . . K . . . S . . h',
                'K . . . S . . . K . . . S . . h',
                'K . . . S . . . K . . . S . . h',
                'K . . . S . . . K . . . S . h H',
            ],
        },
    },

    // Cyan. 1972: cold, sparse, almost no lead.
    pong: {
        bpm: 126,
        lead: {
            wave: 'square', gain: 0.10, bars: [
                'E5 . . . B4 . . . E5 . . . D5 . . .',
                'C5 . . . G4 . . . A4 . . . B4 . - .',
            ],
        },
        bass: {
            wave: 'triangle', gain: 0.22, bars: [
                'E2 - . . E2 . . . E2 - . . B1 . . .',
                'C2 - . . C2 . . . G1 - . . G1 . . .',
            ],
        },
        drums: {
            gain: 0.16, bars: [
                'K . h . S . h . K . h . S . h .',
                'K . h . S . h . K . h . S . h H',
            ],
        },
    },

    // Amber. Light and airy, drums barely there.
    'flappy-byte': {
        bpm: 118,
        lead: {
            wave: 'square', gain: 0.12, bars: [
                'F5 . A5 . C6 . A5 . G5 . . . F5 . . .',
                'Bb5 . G5 . E5 . G5 . F5 . . . C5 . . .',
                'D5 . F5 . A5 . F5 . E5 . . . D5 . . .',
                'G5 . E5 . C5 . E5 . F5 . . . A5 . . .',
            ],
        },
        bass: {
            wave: 'triangle', gain: 0.20, bars: [
                'F2 . . . . . C2 . . . . . Bb1 . . .',
                'Bb1 . . . . . F2 . . . . . C2 . . .',
                'D2 . . . . . A1 . . . . . Bb1 . . .',
                'C2 . . . . . G1 . . . . . F2 . . .',
            ],
        },
        drums: {
            gain: 0.14, bars: [
                'K . . . . . h . K . . . . . h .',
                'K . . . . . h . K . . . . . h .',
                'K . . . . . h . K . . . . . h .',
                'K . . . . . h . K . . . . . h H',
            ],
        },
    },

    // Red. Slow and brooding — there is no game loop here to compete with.
    'tic-tac-toe': {
        bpm: 92,
        lead: {
            wave: 'triangle', gain: 0.12, bars: [
                'A4 . . . . . . . E5 . . . . . . .',
                'C5 . . . . . . . B4 . . . . . . .',
                'F4 . . . . . . . C5 . . . . . . .',
                'E4 . . . . . . . B4 . . . . . . .',
            ],
        },
        bass: {
            wave: 'triangle', gain: 0.20, bars: [
                'A1 . . . . . . . . . . . . . . .',
                'F1 . . . . . . . . . . . . . . .',
                'D1 . . . . . . . . . . . . . . .',
                'E1 . . . . . . . . . . . . . . .',
            ],
        },
        drums: {
            gain: 0.12, bars: [
                'K . . . . . . . . . . . . . . .',
                'K . . . . . . . . . . . . . . .',
                'K . . . . . . . . . . . . . . .',
                'K . . . . . . . . . . . . . h .',
            ],
        },
    },
};
