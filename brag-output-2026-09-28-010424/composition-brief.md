# Hyperframes Composition Brief: aiyu.co.in — life-story recap

## Objective
A 21.5s vertical recap of the life-story chapters already shipped on the
aiyu.co.in home page, ending on the real production URL.

## Output
- Composition directory: `composition/`
- Rendered video: `../brag.mp4`
- Format: vertical — 1080x1920
- Duration: 21.5s

## Source Material
- Project root: repo root (`hyperframes/{origin,school,college,bitapp,voice,masters,adrosonic,now}/index.html`, `src/app/data/lifeStory.js`)
- Product name: aiyu
- Tagline / strongest claim: "They do only what I tell them to." / "the story keeps scrolling."
- Key UI or visual moment to recreate: the "ch 0X · label" header + right stamp chrome shared by every chapter film; the real BIT App icon; the site's own hero headline + StoryPlayer play/pause pill.
- Copy that must appear verbatim:
  - 3 MAY.
  - ...what I tell them to.
  - 1,000+ · 4.7★
  - Adrosonic
  - the story keeps scrolling.
  - aiyu.co.in
  - watch the whole story →

## Creative Direction
- Tone preset: cinematic
- Creative direction: told in the site's own terminal/CRT visual language; warm, not corporate
- Interpretation: big type, hard cuts on the beat, confident holds; the recognizable images (rain window, linked list, BIT icon, envelope) carry the story over sentences
- Angle: see brag-plan.md § The angle
- Hook: black → lightning flash → rain window, "3 MAY." types in, heartbeat line flatlines into a cursor
- Outro / punchline: phone reveals the real hero UI ("the story keeps scrolling."), hard cut to aiyu.co.in card
- Avoid: generic SaaS language, abstract filler, any redesign of the site's established chapter chrome

## Visual Identity
- Background: #0b0f14
- Text: #f2f5f9 bright / #8f99a6 muted
- Accent: #5ee1ff, #a78bfa, #ff5fa2, #ffb454, #4ade80
- Display font: ui-sans-serif/system-ui, weight 800
- Body/label font: ui-monospace
- Visual references from the project: `hyperframes/origin` (rain window, CRT kid), `hyperframes/school` (notebook), `hyperframes/college` (linked list, COVID calendar, Android robot), `hyperframes/bitapp` (real icon + Compose UI + stats), `hyperframes/voice` (TTS box), `hyperframes/masters` (viewfinder, envelope), `hyperframes/adrosonic` (ID badge, C#), `hyperframes/now` (agent terminal stack), `src/app/components/landing/v2/V2Hero.js` + `StoryPlayer.js` (the real hero + play/pause pill styling)

## Storyboard
Use `brag-plan.md`'s storyboard as the creative contract.

1. Hook — 2.2s — rain window, "3 MAY.", heartbeat → cursor
2. Reveal — 1.82s — CRT kid, "...what I tell them to."
3. Highlight montage A — 5.0s — notebook / linked list / COVID→Android / BIT icon opens / "1,000+ · 4.7★"
4. Highlight montage B — 6.0s — TTS box / viewfinder / envelope / ID badge+C# / agent terminal stack
5. Outro — 6.5s — phone reveals real hero + StoryPlayer pill, "the story keeps scrolling.", hard cut to aiyu.co.in card

## Audio
- Audio role: cinematic support, restrained
- Audio arc: near-silent hook → steady 120 BPM pulse through both montages → one swell on the phone reveal → chime on the URL card → fade to silence
- Music: `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3`
- Music treatment: near-silent under scene 1, rises by scene 3, holds through scenes 3-4, swells at scene 5's phone reveal, fades over the last ~0.8s
- Music cue guidance: bundled preset `happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.json`. Strong cues at 16.02s (phone reveal) and 18.02s (URL card). Beat grid every other beat (~1.0s) for the two five-cut montages: 4.02/5.03/6.03/7.02/8.02 and 9.02/10.02/11.02/12.02/13.01.
- Audio-reactive treatment: subtle — persistent background glow behind the chapter chrome breathes a few percent with RMS; no waveform/EQ visuals
- Audio-coupled moments:
  - hook date type-in — soft key ticks
  - each of the ten montage cuts — soft ui tick on the beat
  - phone reveal (16.02s) — impact hit
  - URL card (18.02–18.52s) — soft chime
- SFX selection guidance: use Kenney interface/ui ticks for the montage cuts (low high-frequency-risk, they repeat ten times), one impact hit for the phone reveal, one bell/chime for the URL card landing
- SFX analysis guidance: `sfx-analysis.md`/`sfx-analysis.json` beside the bundled SFX library — prefer low high-frequency-risk files for the repeated montage ticks
- Exact SFX choice: chosen during composition build to match the implemented animation
- Audio files: copy into `composition/assets/music/` and `composition/assets/sfx/`

## Hyperframes Instructions
Load `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`,
`hyperframes-keyframes`, `hyperframes-cli`. This is the `/brag` workflow —
do not enter the generic `hyperframes` intent interview.

Requirements:
- Show at least one real UI element (the BIT App icon, and the site's real hero headline/StoryPlayer styling).
- Keep all text readable; respect the reading-time floor from step-2-plan.md even inside fast montage cuts.
- Total duration 21.5s (15-25s window).
- Include the planned music + SFX layer.
- Beat-lock the two strong-cue moments (±0.15s) and the two five-cut montages to the beat grid (±0.10s); mark each with `// beat-locked` / `// beat-grid` comments.
- Run `npx hyperframes check` before render — the single gate.
