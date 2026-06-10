import type { Line } from "../data/script";
import { audio } from "./audio";
import { Typewriter } from "./text";

export interface VoiceStyle {
  font: string;
  color: string;
  glow: string;
  label: string;
  speed: number;
  italic?: boolean;
}

const VOICES: Record<Line["voice"], VoiceStyle> = {
  narration: {
    font: "italic 17px Inter, system-ui, sans-serif",
    color: "#8b95a8",
    glow: "transparent",
    label: "",
    speed: 40,
    italic: true,
  },
  screen: {
    font: "15px 'JetBrains Mono', 'Courier New', monospace",
    color: "#9fc0ff",
    glow: "rgba(122,162,255,0.5)",
    label: "ТРАНСЛЯЦИЯ",
    speed: 46,
  },
  you: {
    font: "18px Inter, system-ui, sans-serif",
    color: "#e7edf6",
    glow: "transparent",
    label: "ТЫ",
    speed: 40,
  },
  god: {
    font: "19px 'JetBrains Mono', 'Courier New', monospace",
    color: "#cfe0ff",
    glow: "rgba(122,162,255,0.7)",
    label: "ИИ",
    speed: 34,
  },
};

export function voiceStyle(voice: Line["voice"]): VoiceStyle {
  return VOICES[voice];
}

/**
 * Drives a sequence of {@link Line}s: types the current line, advances on tap,
 * and reports when the whole sequence is finished. Rendering is left to the
 * scene so each can place text in its own layout.
 */
export class Dialogue {
  index = 0;
  readonly tw = new Typewriter();
  done = false;

  constructor(private lines: Line[]) {
    this.tw.setText(lines[0].text);
    this.tw.speed = voiceStyle(lines[0].voice).speed;
    speakLine(lines[0]);
  }

  current(): Line {
    return this.lines[this.index];
  }

  update(dt: number): void {
    this.tw.update(dt);
  }

  /** Skip the reveal if still typing, otherwise move to the next line. */
  advance(): void {
    if (!this.tw.done) {
      this.tw.skip();
      return;
    }
    if (this.index < this.lines.length - 1) {
      this.index++;
      const line = this.lines[this.index];
      this.tw.setText(line.text);
      this.tw.speed = voiceStyle(line.voice).speed;
      speakLine(line);
    } else {
      this.done = true;
      audio.stopVoice();
    }
  }
}

/** Route a script line into the synthetic voice. */
function speakLine(line: Line): void {
  audio.speak(line.text, line.voice === "narration" || line.voice === "screen" ? "narration" : "you");
}
