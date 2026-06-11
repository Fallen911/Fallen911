import type { Line } from "../data/script";
import { audio } from "./audio";
import { Typewriter } from "./text";
import { tr } from "./i18n";

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
    font: "italic 500 17px Manrope, system-ui, sans-serif",
    color: "#9aa7bd",
    glow: "transparent",
    label: "",
    speed: 40,
    italic: true,
  },
  screen: {
    font: "15px 'JetBrains Mono', ui-monospace, monospace",
    color: "#9fe8c0",
    glow: "rgba(70,222,150,0.4)",
    label: tr("ТРАНСЛЯЦИЯ", "BROADCAST"),
    speed: 46,
  },
  you: {
    font: "italic 500 17px Manrope, system-ui, sans-serif",
    color: "#dbe7ff",
    glow: "transparent",
    label: tr("ТЫ", "YOU"),
    speed: 40,
  },
  god: {
    font: "18px 'JetBrains Mono', ui-monospace, monospace",
    color: "#e8dcff",
    glow: "rgba(194,164,255,0.6)",
    label: tr("ИИ", "AI"),
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
