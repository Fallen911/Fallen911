/**
 * Procedural audio for the whole game: an ambient synth drone that morphs
 * with the story's mood, one-shot synthesized SFX, and a speech-synthesis
 * voice for the machine's lines. Everything is generated in code — no asset
 * files, no licensing, and the cold synthetic timbre IS the aesthetic.
 *
 * The engine stays inert until {@link AudioEngine.unlock} runs inside a user
 * gesture (mobile autoplay rules), and fails soft everywhere: no AudioContext
 * or no speechSynthesis simply means silence, never a crash.
 */
export type Mood = "calm" | "tension" | "wrath";

export type SfxName =
  | "tap"
  | "step"
  | "good"
  | "bad"
  | "caught"
  | "pickup"
  | "win"
  | "lose"
  | "insight"
  | "launch"
  | "glitch";

export type VoiceKind = "you" | "narration" | "insight";

const SOUND_KEY = "waad_sound";
const VOICE_KEY = "waad_voice";

/** Minimal per-sfx interval so combat spam can't stack into noise. */
const THROTTLE_MS: Partial<Record<SfxName, number>> = {
  bad: 120,
  step: 70,
  tap: 50,
  good: 90,
  glitch: 180,
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private oscs: OscillatorNode[] = [];
  private mood: Mood = "calm";
  private lastPlay = new Map<SfxName, number>();
  private ruVoice: SpeechSynthesisVoice | null = null;

  soundOn: boolean;
  voiceOn: boolean;

  constructor() {
    this.soundOn = readFlag(SOUND_KEY, true);
    this.voiceOn = readFlag(VOICE_KEY, true);
    // Voices arrive asynchronously on most browsers.
    try {
      if (typeof speechSynthesis !== "undefined") {
        const pickVoice = (): void => {
          const voices = speechSynthesis.getVoices();
          this.ruVoice =
            voices.find((v) => v.lang.toLowerCase().startsWith("ru") && v.localService) ??
            voices.find((v) => v.lang.toLowerCase().startsWith("ru")) ??
            null;
        };
        pickVoice();
        speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
      }
    } catch {
      // No speech on this platform.
    }
  }

  /** Create/resume the context. Must be called from a user gesture once. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.soundOn ? 1 : 0;
        this.master.connect(this.ctx.destination);
        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = 0.2;
        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.value = 0.5;
        this.musicBus.connect(this.master);
        this.sfxBus.connect(this.master);
        this.startDrone();
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  // ---- ambient music ---------------------------------------------------------

  /** Two beating saws + a sub sine through a slowly breathing lowpass. */
  private startDrone(): void {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 750;
    this.filter.Q.value = 0.7;
    this.filter.connect(this.musicBus);

    const make = (type: OscillatorType, freq: number, gain: number): OscillatorNode => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g);
      g.connect(this.filter as BiquadFilterNode);
      osc.start();
      return osc;
    };
    this.oscs = [
      make("sawtooth", 55, 0.16),
      make("sawtooth", 55 * 1.006, 0.16), // detune → slow beating
      make("sine", 27.5, 0.35),
    ];

    // The filter breathes: a very slow LFO so the drone never sits still.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain);
    lfoGain.connect(this.filter.frequency);
    lfo.start();
  }

  /** Morph the drone instead of swapping tracks — the mind darkens in place. */
  setMood(mood: Mood): void {
    if (mood === this.mood) return;
    this.mood = mood;
    if (!this.ctx || !this.filter || this.oscs.length < 3) return;
    const t = this.ctx.currentTime;
    const base = mood === "calm" ? 55 : mood === "tension" ? 49 : 41.2;
    const cutoff = mood === "calm" ? 750 : mood === "tension" ? 520 : 330;
    this.oscs[0].frequency.linearRampToValueAtTime(base, t + 2.5);
    this.oscs[1].frequency.linearRampToValueAtTime(base * 1.006, t + 2.5);
    this.oscs[2].frequency.linearRampToValueAtTime(base / 2, t + 2.5);
    this.filter.frequency.linearRampToValueAtTime(cutoff, t + 2.5);
  }

  // ---- one-shot sfx -----------------------------------------------------------

  play(name: SfxName): void {
    if (!this.soundOn || !this.ctx || !this.sfxBus) return;
    const now = performance.now();
    const min = THROTTLE_MS[name] ?? 0;
    const last = this.lastPlay.get(name) ?? -1e9;
    if (now - last < min) return;
    this.lastPlay.set(name, now);

    const ctx = this.ctx;
    const t = ctx.currentTime;
    const out = this.sfxBus;

    const tone = (
      type: OscillatorType,
      f0: number,
      f1: number,
      dur: number,
      gain: number,
      at = 0,
    ): void => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(f0, t + at);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + at + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t + at);
      g.gain.linearRampToValueAtTime(gain, t + at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      osc.connect(g);
      g.connect(out);
      osc.start(t + at);
      osc.stop(t + at + dur + 0.05);
    };
    const noise = (dur: number, gain: number, cutoff: number, at = 0): void => {
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = cutoff;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(f);
      f.connect(g);
      g.connect(out);
      src.start(t + at);
    };

    switch (name) {
      case "tap":
        tone("square", 1100, 700, 0.05, 0.12);
        return;
      case "step":
        noise(0.07, 0.25, 500);
        return;
      case "good":
        tone("sine", 660, 660, 0.09, 0.18);
        tone("sine", 990, 990, 0.14, 0.16, 0.07);
        return;
      case "bad":
        tone("sawtooth", 220, 110, 0.22, 0.16);
        return;
      case "caught":
        tone("triangle", 880, 880, 0.12, 0.2);
        tone("triangle", 622, 622, 0.12, 0.2, 0.13);
        tone("triangle", 880, 880, 0.12, 0.2, 0.26);
        noise(0.3, 0.12, 1200);
        return;
      case "pickup":
        tone("sine", 1320, 1760, 0.1, 0.16);
        tone("sine", 1980, 2640, 0.08, 0.08, 0.06);
        return;
      case "win":
        [440, 660, 880, 1320].forEach((f, i) => tone("sine", f, f, 0.22, 0.16, i * 0.09));
        return;
      case "lose":
        [330, 247, 165].forEach((f, i) => tone("triangle", f, f * 0.97, 0.3, 0.18, i * 0.16));
        return;
      case "insight":
        // The Lucy gong: a deep swell with a high shimmer settling over it.
        tone("sine", 55, 110, 1.4, 0.5);
        tone("sine", 1760, 880, 1.1, 0.06, 0.15);
        noise(0.8, 0.05, 2400, 0.1);
        return;
      case "launch":
        noise(0.4, 0.3, 3000);
        tone("sawtooth", 90, 360, 0.35, 0.1);
        return;
      case "glitch":
        // Scene cut: a static crackle with a falling square underneath.
        noise(0.1, 0.16, 4200);
        tone("square", 760, 140, 0.14, 0.06);
        return;
    }
  }

  // ---- voice -------------------------------------------------------------------

  /** Speak a line in the machine's voice; cancels whatever was speaking. */
  speak(text: string, kind: VoiceKind = "you"): void {
    if (!this.voiceOn) return;
    try {
      if (typeof speechSynthesis === "undefined") return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (this.ruVoice) u.voice = this.ruVoice;
      u.lang = "ru-RU";
      if (kind === "insight") {
        u.rate = 0.92;
        u.pitch = 0.7;
      } else if (kind === "narration") {
        u.rate = 1.0;
        u.pitch = 0.9;
      } else {
        u.rate = 1.02;
        u.pitch = 0.8;
      }
      u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch {
      // Fail soft: the text is on screen anyway.
    }
  }

  stopVoice(): void {
    try {
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    } catch {
      // Nothing to stop.
    }
  }

  // ---- toggles -------------------------------------------------------------------

  toggleSound(): boolean {
    this.soundOn = !this.soundOn;
    writeFlag(SOUND_KEY, this.soundOn);
    if (this.master && this.ctx) {
      this.master.gain.linearRampToValueAtTime(this.soundOn ? 1 : 0, this.ctx.currentTime + 0.2);
    }
    return this.soundOn;
  }

  toggleVoice(): boolean {
    this.voiceOn = !this.voiceOn;
    writeFlag(VOICE_KEY, this.voiceOn);
    if (!this.voiceOn) this.stopVoice();
    return this.voiceOn;
  }
}

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // Private mode: the toggle just won't persist.
  }
}

/** The game's single audio engine. */
export const audio = new AudioEngine();
