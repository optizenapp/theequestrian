type Chord = [number, number, number, number];
type Vibe = { name: string; chords: Chord[]; bpm: number; lead: number[]; hat: boolean };

const VIBES: Vibe[] = [
  {
    name: 'sunrise',
    chords: [
      [261.63, 329.63, 392.0, 523.25],
      [220.0, 277.18, 329.63, 440.0],
      [196.0, 246.94, 293.66, 392.0],
      [261.63, 329.63, 392.0, 523.25],
    ],
    bpm: 96,
    lead: [523.25, 587.33, 659.25, 523.25, 440.0, 523.25, 493.88, 440.0],
    hat: true,
  },
  {
    name: 'meadow',
    chords: [
      [196.0, 246.94, 293.66, 392.0],
      [261.63, 329.63, 392.0, 523.25],
      [220.0, 277.18, 329.63, 440.0],
      [196.0, 246.94, 293.66, 392.0],
    ],
    bpm: 88,
    lead: [392.0, 440.0, 493.88, 392.0, 329.63, 392.0, 440.0, 493.88],
    hat: false,
  },
  {
    name: 'studio',
    chords: [
      [233.08, 293.66, 349.23, 466.16],
      [311.13, 392.0, 466.16, 622.25],
      [277.18, 349.23, 415.3, 554.37],
      [233.08, 293.66, 349.23, 466.16],
    ],
    bpm: 104,
    lead: [466.16, 554.37, 622.25, 554.37, 466.16, 415.3, 466.16, 554.37],
    hat: true,
  },
  {
    name: 'open-road',
    chords: [
      [349.23, 440.0, 523.25, 698.46],
      [293.66, 369.99, 440.0, 587.33],
      [329.63, 415.3, 493.88, 659.25],
      [349.23, 440.0, 523.25, 698.46],
    ],
    bpm: 100,
    lead: [698.46, 783.99, 880.0, 698.46, 587.33, 698.46, 659.25, 587.33],
    hat: true,
  },
  {
    name: 'soft-pop',
    chords: [
      [261.63, 311.13, 392.0, 523.25],
      [220.0, 261.63, 329.63, 440.0],
      [196.0, 246.94, 311.13, 392.0],
      [261.63, 311.13, 392.0, 523.25],
    ],
    bpm: 92,
    lead: [523.25, 466.16, 392.0, 466.16, 523.25, 466.16, 392.0, 349.23],
    hat: false,
  },
];

export function synthFeelGood(durationSeconds: number, sampleRate: number): { left: Float32Array; right: Float32Array } {
  const vibe = VIBES[Math.floor(Math.random() * VIBES.length)];
  console.log(`[music-fallback] synth vibe=${vibe.name} bpm=${vibe.bpm} hat=${vibe.hat}`);
  const total = Math.floor(durationSeconds * sampleRate);
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  const beatsPerSecond = vibe.bpm / 60;
  const chordCount = vibe.chords.length;
  const chordDuration = durationSeconds / chordCount;
  const fadeIn = Math.floor(sampleRate * 0.5);
  const fadeOut = Math.floor(sampleRate * 1.5);

  for (let i = 0; i < total; i++) {
    const t = i / sampleRate;
    const beat = t * beatsPerSecond;
    const chord = vibe.chords[Math.min(chordCount - 1, Math.floor(t / chordDuration))];

    const pad = renderPad(t, chord);
    const bass = renderBass(t, chord, beat);
    const lead = renderLead(t, vibe.lead, beat);
    const drums = renderDrums(beat, vibe.hat);

    let env = 1;
    if (i < fadeIn) env = i / fadeIn;
    else if (i > total - fadeOut) env = (total - i) / fadeOut;

    const monoMix = (pad * 0.55 + bass * 0.55 + lead * 0.4 + drums * 0.7) * env;
    const stereoSpread = 0.12 * Math.sin(2 * Math.PI * 0.6 * t);
    left[i] = Math.max(-1, Math.min(1, monoMix * (1 - stereoSpread) + lead * 0.05 * env));
    right[i] = Math.max(-1, Math.min(1, monoMix * (1 + stereoSpread) - lead * 0.05 * env));
  }

  return { left, right };
}

function renderPad(t: number, chord: Chord): number {
  const [n1, n2, n3, n4] = chord;
  const wob = 1 + 0.003 * Math.sin(2 * Math.PI * 0.4 * t);
  return (
    0.18 * Math.sin(2 * Math.PI * (n1 / 2) * wob * t) +
    0.16 * Math.sin(2 * Math.PI * n1 * wob * t) +
    0.14 * Math.sin(2 * Math.PI * n2 * wob * t) +
    0.12 * Math.sin(2 * Math.PI * n3 * wob * t) +
    0.06 * Math.sin(2 * Math.PI * n4 * wob * t)
  );
}

function renderBass(t: number, chord: Chord, beat: number): number {
  const beatPos = beat % 1;
  const env = Math.exp(-beatPos * 4) * 0.9 + 0.1;
  const root = chord[0] / 2;
  return 0.4 * env * (Math.sin(2 * Math.PI * root * t) + 0.25 * Math.sin(2 * Math.PI * root * 2 * t));
}

function renderLead(t: number, leadNotes: number[], beat: number): number {
  const noteIdx = Math.floor(beat * 2) % leadNotes.length;
  const beatInNote = (beat * 2) % 1;
  const note = leadNotes[noteIdx];
  const env = Math.exp(-beatInNote * 5);
  return 0.35 * env * (Math.sin(2 * Math.PI * note * t) + 0.2 * Math.sin(2 * Math.PI * note * 2 * t));
}

function renderDrums(beat: number, useHat: boolean): number {
  const beatPos = beat % 1;
  const kickPos = beat % 2;
  let drum = 0;
  if (kickPos < 0.05) {
    const env = Math.exp(-kickPos * 60);
    drum += 0.7 * env * Math.sin(2 * Math.PI * (60 + 40 * Math.exp(-kickPos * 80)) * kickPos);
  }
  if (useHat) {
    const hatPos = (beat * 2) % 1;
    if (hatPos < 0.04) {
      const env = Math.exp(-hatPos * 80);
      drum += 0.18 * env * (Math.random() * 2 - 1);
    }
  }
  if (beatPos > 0.99 || beatPos < 0.005) {
    drum += 0.12 * (Math.random() * 2 - 1) * Math.exp(-Math.abs(beatPos - 1) * 40);
  }
  return drum;
}
