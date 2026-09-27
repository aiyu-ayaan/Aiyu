# Brag Plan: aiyu.co.in — the life-story home page

## What is this app?
A personal portfolio site (aiyu.co.in) whose new home page tells the owner's
whole life story as eight scroll-scrubbed HyperFrames chapters (birth →
school → college → first Android app → an internship → a master's degree →
a first job → building this very site with AI) before landing on projects,
blogs and contact.

## The angle
Compress the site's own life-story chapters into a 21.5s vertical recap that
speaks in the same visual language already shipped on the site (the CRT
kid, the C linked list, the BIT App icon, the offer envelope, the ID badge,
the agent terminal) — then pull back to reveal it's all one real, scrollable
page, and land on the URL. The video is the trailer for the story that
already exists on the site.

## Hook (first 2-3 seconds)
Black. Lightning flash. A night window with rain, "3 MAY." typing in, and a
flatlining heartbeat line that turns into a blinking cursor.

## Key moments (the middle)
- A notebook flipping 2005 → 2019 as a computer doodle stays in every margin.
- A C linked list connecting nodes on a laptop screen (12 → 7 → 99 → 42).
- COVID calendar days crossing out, then the Android robot rising.
- The real BIT App icon opening into its Compose-era UI; "1,000+ · 4.7★".
- A TTS waveform box getting packed and labelled "TTS-Engine".
- A camera viewfinder locking detection boxes onto a desk (computer vision).
- An envelope opening on "Adrosonic" — the offer letter.
- An ID badge flipping from "trainee" to "full time" beside a C# snippet.
- An agent terminal stacking site layers: static → CMS → Postgres → backup.

## Outro / punchline
Hard cut to a phone showing the real "Hi, I'm Ayaan" hero with the site's own
play/pause story controls, caption "the story keeps scrolling." Then a clean
card: **aiyu.co.in**, cursor blinking, "watch the whole story →".

## User flow worth showing
none — this is a personal narrative site, not a transactional app. The
"flow" is the reader's own scroll through the eight chapters; the outro
recreates that exact hero UI (headline + the StoryPlayer pill built this
session) rather than an abstract diagram of it.

## Tone
- Preset: cinematic
- Creative direction: a life told in the same terminal-green, CRT-and-code
  visual language as the site itself; warm, not corporate.
- Interpretation: big type, dramatic hard cuts on the beat, confident holds
  on each memory-image rather than lingering captions; restraint on text —
  let the recognizable visuals (rain window, linked list, BIT icon, offer
  envelope) carry the story instead of sentences.

## Format: vertical — 1080x1920
## Duration: 21.5s

## Visual identity (from the project)
- Background: #0b0f14
- Accent: #5ee1ff (code/linux), #a78bfa (secondary), #ff5fa2 (play/highlight), #ffb454, #4ade80 (success)
- Text: #f2f5f9 (bright), #8f99a6 (muted)
- Display font: ui-sans-serif / system-ui, weight 800, tight tracking (matches site headings)
- Body/label font: ui-monospace (matches every chapter's mono eyebrow/stamp)
- Strongest visual element: the "ch 0X · chapter" header + right-aligned date
  stamp used identically across all nine site films — reused verbatim as the
  video's own recurring chrome so it reads as one continuous artifact.

## Share copy (draft)
Turned my life into a scrollable website — literally. 8 animated chapters,
one linked list, one Android robot, and a lot of coffee. The full story
(with playback controls) is live at aiyu.co.in.

## Audio direction
- Role: cinematic support, restrained
- Music: happy-beats-business-moves-vol-1-by-ende-dot-app.mp3 (120 BPM; bundled preset available)
- Music treatment: starts under the rain/hook near silent, rises into the beat
  grid by the first highlight montage (~4s), holds through both montages,
  swells slightly under the outro reveal, fades over the final URL card's
  last second.
- Music cue guidance: preset `happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.json`.
  Strong cues used: 16.02s (phone-reveal hard cut), 18.02s (URL card impact).
  Beat grid (every other beat, ~1.0s apart from 4.02s) drives the two
  highlight-montage cuts: 4.02, 5.03, 6.03, 7.02, 8.02 / 9.02, 10.02, 11.02,
  12.02, 13.01.
- Audio-reactive treatment: subtle — the persistent scanline glow behind the
  chapter chrome breathes a few percent with music RMS; no waveform/EQ visuals.
- SFX posture: sparse. One soft key-tick under the "3 MAY" type-in, one card
  hit on the BIT-icon open, one soft "chime" on the URL card landing.
- Audio-coupled moments: hook type-in (keyboard tick), each montage cut
  (soft ui tick on the beat), phone reveal (impact hit), URL card (chime).
- Restraint rule: never let SFX or the beat force a cut faster than a label
  can be read; short labels get their ~0.8s floor even if that means
  skipping a beat.

## Storyboard

### Scene 1 — Hook: 3 May — 2.2s
Black frame. A single lightning flash lights a night window; rain starts.
"3 MAY." types in over ~0.5s. A thin heartbeat line runs across the bottom
and flatlines into a blinking terminal cursor.
Sequential/interaction: none
Audio intent: near-silent, one flash-synced low hit, a soft key tick as the date types
Audio-coupled idea: type the date with subtle key ticks
Music: intro, very low
Transition mood: hard flash → Scene 2

### Scene 2 — Reveal: the fascination — 1.82s
CRT monitor close-up, a child's silhouette lit by the screen. Terminal
prints "hello" → "hello". Text fragment slams in: "...what I tell them to."
Sequential/interaction: none
Audio intent: music fades up into the beat grid
Audio-coupled idea: none
Music: rising into the grid
Transition mood: hard cut on beat 4.02s → Scene 3

### Scene 3 — Highlight montage A (growing up) — 5.0s
Five beat-locked cuts (beat-grid, ~1.0s apart: 4.02, 5.03, 6.03, 7.02, 8.02):
1) notebook pages flipping 2005→2019, 2) a C linked list connecting
12→7→99→42 on a laptop, 3) COVID calendar days crossing out into the
Android robot rising, 4) the real BIT App icon opening into its Compose UI,
5) hold on "1,000+ students · 4.7★".
Sequential/interaction: yes — five cuts land on consecutive beat-grid points
Audio intent: energetic, on-the-grid
Audio-coupled idea: soft ui tick on each of the five cuts
Music: full beat grid
Transition mood: hard cuts, beat-grid → Scene 4

### Scene 4 — Highlight montage B (levelling up) — 6.0s
Five beat-locked cuts (9.02, 10.02, 11.02, 12.02, 13.01): 1) a TTS box being
packed and labelled, 2) a viewfinder locking boxes onto a desk, 3) an
envelope opening on "Adrosonic", 4) an ID badge flipping "trainee"→"full
time" beside a C# snippet, 5) an agent terminal stacking site layers
(static → cms → postgres → backup).
Sequential/interaction: yes — five cuts on consecutive beat-grid points
Audio intent: same energy, one degree calmer heading into the outro
Audio-coupled idea: soft ui tick on each cut
Music: full beat grid
Transition mood: hard cut, beat-locked at 15.02s → Scene 5

### Scene 5 — Outro / URL — 6.5s
15.02–16.02s: a phone frame slams up (impact beat-locked to 16.02s) showing
the real "Hi, I'm Ayaan" hero headline with the site's own play/pause story
pill. Caption: "the story keeps scrolling." 16.02–18.52s hold. Hard cut
(beat-locked 18.02→18.52s window) to a clean full-bleed card: **aiyu.co.in**
in large mono type with a blinking cursor, small line "watch the whole
story →" underneath. Hold to 21.52s; music fades in the last ~0.8s.
Sequential/interaction: none
Audio intent: one impact hit on the phone reveal, one soft chime on the URL card, then a clean fade
Audio-coupled idea: impact SFX at 16.02s, chime SFX at 18.52s
Music: swell then fade out
Transition mood: hard cut → end

**Music mood for this video:** upbeat, driving, warm — never overwhelms the small text
**Audio summary:** near-silent hook rises into a steady 120 BPM pulse for both highlight montages, swells once for the phone reveal, chimes on the URL card, then fades to silence by the last frame.
