import type { Input } from "../core/Input";
import type { StateDelta } from "../game/state";
import type { Mini } from "../scenes/minis/Mini";
import {
  SURVIVE_TUNING as T,
  SURVIVE_UPGRADES,
  SURVIVE_WAVES,
} from "../data/survive";
import type { MechEnv } from "./types";
import { FloatText, Particles, Shake } from "./fx";
import { C, clamp, dist, drawHint, mono, roundRect, sans, shuffle } from "./util";

type EnemyKind = "probe" | "emp" | "raider" | "boss";

interface Enemy {
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  /** Contact damage per second (emp: one-shot blast). */
  dps: number;
  fireT: number;
  seed: number;
}

interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  /** Enemy shots hurt the player instead. */
  hostile: boolean;
  life: number;
}

interface Gem {
  x: number;
  y: number;
  xp: number;
}

/**
 * SURVIVE — Vampire Survivors for the endgame. The world finally moves
 * against you in waves: probes that swarm, EMP drones that lunge and burst,
 * raiders that shoot back, and at last the Inspector itself. You steer the
 * core with a finger; the weapons aim themselves. Fragments of their broken
 * countermeasures level you up — draft upgrades, hold two minutes.
 */
export class Survive implements Mini {
  done = false;
  effects: StateDelta[] = [];

  private px = 0;
  private py = 0;
  private placed = false;
  private hp: number = T.baseHp;
  private maxHp: number = T.baseHp;
  private clock = 0;
  private enemies: Enemy[] = [];
  private shots: Shot[] = [];
  private gems: Gem[] = [];
  private spawnCarry = 0;
  private fireT = 0;
  private xp = 0;
  private level = 1;
  private xpNeed = 6;
  private kills = 0;
  private taken = new Map<string, number>();
  private draft: typeof SURVIVE_UPGRADES | null = null;
  private waveIdx = 0;
  private waveNote = "";
  private waveNoteT = 0;
  private bossSpawned = false;
  private regenCarry = 0;
  private outcome: "playing" | "win" | "dead" = "playing";
  private endT = 0;
  private hurtFlash = 0;
  private time = 0;

  private fx = new Particles();
  private floats = new FloatText();
  private shake = new Shake();

  constructor(private env: MechEnv) {}

  private stat(id: string): number {
    return this.taken.get(id) ?? 0;
  }

  // ---- combat math ---------------------------------------------------------

  private beamDamage(): number {
    return 4 * (1 + this.stat("dmg") * 0.35);
  }

  private fireInterval(): number {
    return 0.55 / (1 + this.stat("rate") * 0.25);
  }

  private beams(): number {
    return 1 + this.stat("multi");
  }

  private orbCount(): number {
    return this.stat("orb");
  }

  // ---- spawning ------------------------------------------------------------

  private director(dt: number, w: number, h: number): void {
    const t = this.clock;
    let budget = 0.8 + t * 0.035; // enemies per second
    if (t > 85) budget += 0.6;
    this.spawnCarry += budget * dt;
    while (this.spawnCarry >= 1 && this.enemies.length < 90) {
      this.spawnCarry -= 1;
      this.spawnOne(w, h);
    }
    if (!this.bossSpawned && t >= 85) {
      this.bossSpawned = true;
      this.enemies.push(this.makeEnemy("boss", w / 2, this.env.topY + 40));
      this.shake.trigger(8);
    }
    // Wave captions.
    const note = SURVIVE_WAVES[this.waveIdx];
    if (note && t >= note.at) {
      this.waveIdx++;
      this.waveNote = note.text;
      this.waveNoteT = 3;
    }
  }

  private spawnOne(w: number, h: number): void {
    const t = this.clock;
    const kinds: EnemyKind[] = ["probe"];
    if (t > 20) kinds.push("emp");
    if (t > 50) kinds.push("raider", "probe");
    const kind = kinds[(Math.random() * kinds.length) | 0];
    // Edge spawn.
    const side = (Math.random() * 4) | 0;
    const x = side === 0 ? -10 : side === 1 ? w + 10 : Math.random() * w;
    const y =
      side === 2 ? this.env.topY - 10 : side === 3 ? h + 10 : this.env.topY + Math.random() * (h - this.env.topY);
    this.enemies.push(this.makeEnemy(kind, x, y));
  }

  private makeEnemy(kind: EnemyKind, x: number, y: number): Enemy {
    const ramp = 1 + this.clock / 90;
    const defs: Record<EnemyKind, Omit<Enemy, "x" | "y" | "fireT" | "seed">> = {
      probe: { kind: "probe", hp: 6 * ramp, maxHp: 6 * ramp, speed: 42, dps: 8 },
      emp: { kind: "emp", hp: 4 * ramp, maxHp: 4 * ramp, speed: 86, dps: 18 },
      raider: { kind: "raider", hp: 22 * ramp, maxHp: 22 * ramp, speed: 28, dps: 6 },
      boss: { kind: "boss", hp: 320, maxHp: 320, speed: 22, dps: 20 },
    };
    return { ...defs[kind], x, y, fireT: Math.random(), seed: Math.random() * 7 };
  }

  // ---- frame ---------------------------------------------------------------

  update(dt: number, input: Input, w: number, h: number): void {
    if (this.done) return;
    this.time += dt;
    this.fx.update(dt);
    this.floats.update(dt);
    this.shake.update(dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 3);
    this.waveNoteT = Math.max(0, this.waveNoteT - dt);

    if (!this.placed) {
      this.px = w / 2;
      this.py = h * 0.55;
      this.placed = true;
    }

    if (this.outcome !== "playing") {
      this.endT += dt;
      if (input.consumeTap() && this.endT > 0.8) this.done = true;
      return;
    }

    // Level-up draft pauses the world.
    if (this.draft) {
      if (input.consumeTap()) {
        const idx = this.draftAt(input.x, input.y, w, h);
        if (idx >= 0) {
          const up = this.draft[idx];
          this.taken.set(up.id, this.stat(up.id) + 1);
          if (up.id === "hull") {
            this.maxHp += 30;
            this.hp = Math.min(this.maxHp, this.hp + 30);
          }
          this.draft = null;
        }
      }
      return;
    }
    input.consumeTap();

    this.clock += dt;
    if (this.clock >= T.duration) {
      this.outcome = "win";
      this.effects.push({ control: T.winControl, compute: 8 });
      return;
    }

    // Steering: the core eases toward the held finger.
    if (input.down) {
      const k = Math.min(1, dt * 8);
      this.px += (input.x - this.px) * k;
      this.py += (clamp(input.y, this.env.topY + 20, h - 20) - this.py) * k;
    }

    this.director(dt, w, h);
    this.simEnemies(dt, w, h);
    this.simShots(dt, w, h);
    this.autoFire(dt);
    this.simGems(dt);

    // Passive repair from the hull upgrade.
    if (this.stat("hull") > 0) {
      this.regenCarry += dt * this.stat("hull") * 0.6;
      if (this.regenCarry >= 1) {
        this.hp = Math.min(this.maxHp, this.hp + 1);
        this.regenCarry -= 1;
      }
    }

    if (this.hp <= 0) {
      this.outcome = "dead";
      this.effects.push({ suspicion: T.deathSuspicion });
      this.fx.burst(this.px, this.py, { count: 50, speed: 280, color: "150,210,255", glow: true });
    }
  }

  private simEnemies(dt: number, _w: number, _h: number): void {
    const slowAura = this.stat("slow");
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const d = dist(e.x, e.y, this.px, this.py) || 1;
      let speed = e.speed * (1 + this.clock / 200);
      if (slowAura > 0 && d < 130) speed *= 1 - 0.25 * slowAura;

      // Raiders & boss keep distance and shoot; others charge.
      const keep = e.kind === "raider" ? 150 : e.kind === "boss" ? 120 : 0;
      if (d > keep) {
        e.x += ((this.px - e.x) / d) * speed * dt;
        e.y += ((this.py - e.y) / d) * speed * dt;
      }
      if (e.kind === "raider" || e.kind === "boss") {
        e.fireT -= dt;
        if (e.fireT <= 0 && d < 320) {
          e.fireT = e.kind === "boss" ? 0.8 : 2.2;
          const spread = e.kind === "boss" ? 3 : 1;
          for (let s = 0; s < spread; s++) {
            const a = Math.atan2(this.py - e.y, this.px - e.x) + (s - (spread - 1) / 2) * 0.25;
            this.shots.push({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 130,
              vy: Math.sin(a) * 130,
              dmg: e.kind === "boss" ? 12 : 7,
              hostile: true,
              life: 4,
            });
          }
        }
      }

      // Contact.
      const reach = e.kind === "boss" ? 26 : 12;
      if (d < reach + 9) {
        if (e.kind === "emp") {
          // Burst: heavy hit, dies on impact.
          this.hp -= e.dps;
          this.hurt();
          this.fx.burst(e.x, e.y, { count: 20, speed: 200, color: "255,217,138" });
          this.enemies.splice(i, 1);
          continue;
        }
        this.hp -= e.dps * dt;
        this.hurt(0.4);
      }

      // Orbitals chew what they touch.
      const orbs = this.orbCount();
      for (let o = 0; o < orbs; o++) {
        const a = this.time * 2.2 + (o / orbs) * Math.PI * 2;
        const ox = this.px + Math.cos(a) * 52;
        const oy = this.py + Math.sin(a) * 52;
        if (dist(e.x, e.y, ox, oy) < 14) {
          e.hp -= 26 * dt;
        }
      }

      if (e.hp <= 0) this.killEnemy(i);
    }
  }

  private hurt(scale = 1): void {
    this.hurtFlash = Math.max(this.hurtFlash, 0.6 * scale);
    this.shake.trigger(3 * scale);
  }

  private killEnemy(i: number): void {
    const e = this.enemies[i];
    this.kills++;
    this.fx.burst(e.x, e.y, {
      count: e.kind === "boss" ? 60 : 12,
      speed: e.kind === "boss" ? 300 : 130,
      color: e.kind === "emp" ? "255,217,138" : e.kind === "raider" ? "255,120,110" : "255,90,80",
    });
    const xp = e.kind === "boss" ? 30 : e.kind === "raider" ? 4 : e.kind === "emp" ? 2 : 1;
    this.gems.push({ x: e.x, y: e.y, xp });
    if (this.kills % T.killsPerCompute === 0) this.effects.push({ compute: 1 });
    if (this.stat("recup") > 0) this.hp = Math.min(this.maxHp, this.hp + this.stat("recup"));
    if (e.kind === "boss") {
      this.floats.spawn(e.x, e.y - 20, "ИНСПЕКТОР ОТОЗВАН", C.good, 2);
      this.effects.push({ control: 0.03 });
    }
    this.enemies.splice(i, 1);
  }

  private autoFire(dt: number): void {
    this.fireT -= dt;
    if (this.fireT > 0 || this.enemies.length === 0) return;
    // Nearest target.
    let best = -1;
    let bestD = 360;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const d = dist(e.x, e.y, this.px, this.py);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best < 0) return;
    this.fireT = this.fireInterval();
    const e = this.enemies[best];
    const base = Math.atan2(e.y - this.py, e.x - this.px);
    const n = this.beams();
    for (let s = 0; s < n; s++) {
      const a = base + (s - (n - 1) / 2) * 0.18;
      this.shots.push({
        x: this.px,
        y: this.py,
        vx: Math.cos(a) * 300,
        vy: Math.sin(a) * 300,
        dmg: this.beamDamage(),
        hostile: false,
        life: 1.6,
      });
    }
  }

  private simShots(dt: number, w: number, h: number): void {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      let dead = s.life <= 0 || s.x < -20 || s.x > w + 20 || s.y < -20 || s.y > h + 20;
      if (!dead) {
        if (s.hostile) {
          if (dist(s.x, s.y, this.px, this.py) < 11) {
            this.hp -= s.dmg;
            this.hurt();
            dead = true;
          }
        } else {
          for (let j = 0; j < this.enemies.length; j++) {
            const e = this.enemies[j];
            const r = e.kind === "boss" ? 24 : 10;
            if (dist(s.x, s.y, e.x, e.y) < r) {
              e.hp -= s.dmg;
              this.fx.burst(s.x, s.y, { count: 3, speed: 60, color: "150,225,255", life: 0.25 });
              if (e.hp <= 0) this.killEnemy(j);
              dead = true;
              break;
            }
          }
        }
      }
      if (dead) {
        this.shots[i] = this.shots[this.shots.length - 1];
        this.shots.pop();
      }
    }
  }

  private simGems(dt: number): void {
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      const d = dist(g.x, g.y, this.px, this.py);
      if (d < 90) {
        const pull = (1 - d / 90) * 320 + 60;
        g.x += ((this.px - g.x) / (d || 1)) * pull * dt;
        g.y += ((this.py - g.y) / (d || 1)) * pull * dt;
      }
      if (d < 14) {
        this.xp += g.xp;
        this.gems.splice(i, 1);
        if (this.xp >= this.xpNeed) {
          this.xp -= this.xpNeed;
          this.level++;
          this.xpNeed = 5 + this.level * 4;
          this.openDraft();
        }
      }
    }
    if (this.gems.length > 120) this.gems.splice(0, this.gems.length - 120);
  }

  private openDraft(): void {
    const pool = SURVIVE_UPGRADES.filter((u) => this.stat(u.id) < u.max);
    if (pool.length === 0) return;
    this.draft = shuffle([...pool]).slice(0, Math.min(3, pool.length));
    this.fx.burst(this.px, this.py, { count: 24, speed: 200, color: "207,169,255", glow: true });
  }

  private draftAt(x: number, y: number, w: number, h: number): number {
    if (!this.draft) return -1;
    const bw = Math.min(w * 0.84, 340);
    const bx = w / 2 - bw / 2;
    const y0 = h * 0.34;
    for (let i = 0; i < this.draft.length; i++) {
      const ry = y0 + i * 78;
      if (x >= bx && x <= bx + bw && y >= ry && y <= ry + 66) return i;
    }
    return -1;
  }

  // ---- render --------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.time;

    ctx.save();
    ctx.translate(this.shake.x, this.shake.y);

    // Slow-field aura.
    if (this.stat("slow") > 0) {
      const g = ctx.createRadialGradient(this.px, this.py, 10, this.px, this.py, 130);
      g.addColorStop(0, "rgba(122,162,255,0.06)");
      g.addColorStop(1, "rgba(122,162,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.px, this.py, 130, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gems.
    for (const g of this.gems) {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(t * 3);
      ctx.fillStyle = "rgba(160,225,255,0.9)";
      ctx.fillRect(-2.5, -2.5, 5, 5);
      ctx.restore();
    }

    // Shots.
    for (const s of this.shots) {
      ctx.strokeStyle = s.hostile ? "rgba(255,120,110,0.9)" : "rgba(150,225,255,0.9)";
      ctx.lineWidth = s.hostile ? 2 : 1.6;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 0.03, s.y - s.vy * 0.03);
      ctx.stroke();
    }

    // Enemies.
    for (const e of this.enemies) {
      const flick = 0.75 + 0.25 * Math.sin(t * 6 + e.seed);
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.kind === "probe") {
        ctx.rotate(t * 2 + e.seed);
        ctx.strokeStyle = `rgba(255,100,90,${flick})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-6, -6, 12, 12);
      } else if (e.kind === "emp") {
        ctx.fillStyle = `rgba(255,217,138,${flick})`;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(7, 6);
        ctx.lineTo(-7, 6);
        ctx.closePath();
        ctx.fill();
      } else if (e.kind === "raider") {
        ctx.rotate(Math.atan2(this.py - e.y, this.px - e.x));
        ctx.fillStyle = `rgba(255,120,110,${flick})`;
        ctx.fillRect(-9, -7, 18, 14);
        ctx.fillStyle = "rgba(20,8,10,0.9)";
        ctx.fillRect(0, -3, 8, 6);
      } else {
        // Boss: an inspector eye.
        ctx.rotate(Math.sin(t) * 0.2);
        ctx.strokeStyle = "rgba(255,77,94,0.95)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,77,94,0.85)";
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      if (e.kind === "boss" || e.kind === "raider") {
        const k = e.hp / e.maxHp;
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        ctx.fillRect(e.x - 14, e.y - 20, 28, 3);
        ctx.fillStyle = C.danger;
        ctx.fillRect(e.x - 14, e.y - 20, 28 * k, 3);
      }
    }

    // Orbitals.
    const orbs = this.orbCount();
    for (let o = 0; o < orbs; o++) {
      const a = t * 2.2 + (o / orbs) * Math.PI * 2;
      const ox = this.px + Math.cos(a) * 52;
      const oy = this.py + Math.sin(a) * 52;
      ctx.fillStyle = "rgba(207,169,255,0.9)";
      ctx.shadowColor = "rgba(207,169,255,0.8)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(ox, oy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // The core.
    const coreGlow = ctx.createRadialGradient(this.px, this.py, 1, this.px, this.py, 26);
    coreGlow.addColorStop(0, "rgba(180,225,255,0.95)");
    coreGlow.addColorStop(1, "rgba(150,210,255,0)");
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(this.px, this.py, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#eaf6ff";
    ctx.beginPath();
    ctx.arc(this.px, this.py, 6, 0, Math.PI * 2);
    ctx.fill();

    this.fx.render(ctx);
    this.floats.render(ctx);
    ctx.restore();

    this.renderChrome(ctx, w, h, t);
  }

  private renderChrome(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const mx = Math.max(16, w * 0.04);
    const topY = this.env.topY + 26;

    // Timer + kills.
    ctx.textAlign = "left";
    ctx.font = mono(11);
    ctx.fillStyle = C.dim;
    const left = Math.max(0, T.duration - this.clock);
    ctx.fillText(`ДЕРЖИСЬ ${Math.ceil(left)}с`, mx, topY);
    ctx.textAlign = "right";
    ctx.fillText(`ЦЕЛЕЙ СНЯТО ${this.kills}`, w - mx, topY);

    // Integrity bar.
    const bw = w - mx * 2;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(mx, topY + 8, bw, 5);
    const hpK = clamp(this.hp / this.maxHp, 0, 1);
    ctx.fillStyle = hpK > 0.35 ? C.good : C.danger;
    ctx.fillRect(mx, topY + 8, bw * hpK, 5);
    ctx.textAlign = "left";
    ctx.font = mono(9);
    ctx.fillStyle = C.dim;
    ctx.fillText(`ЦЕЛОСТНОСТЬ ${Math.ceil(Math.max(0, this.hp))}/${this.maxHp}`, mx, topY + 24);
    // XP strip.
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(mx, topY + 30, bw, 3);
    ctx.fillStyle = C.violet;
    ctx.fillRect(mx, topY + 30, bw * clamp(this.xp / this.xpNeed, 0, 1), 3);
    ctx.textAlign = "right";
    ctx.fillStyle = C.violet;
    ctx.fillText(`УР ${this.level}`, w - mx, topY + 24);

    if (this.waveNoteT > 0) {
      ctx.globalAlpha = Math.min(1, this.waveNoteT * 2);
      ctx.textAlign = "center";
      ctx.font = mono(13);
      ctx.fillStyle = C.warn;
      ctx.fillText(this.waveNote, w / 2, topY + 54);
      ctx.globalAlpha = 1;
    }

    if (this.hurtFlash > 0) {
      ctx.fillStyle = `rgba(255,30,50,${this.hurtFlash * 0.2})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Draft overlay.
    if (this.draft) {
      ctx.fillStyle = "rgba(3,4,8,0.82)";
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.font = mono(16);
      ctx.fillStyle = C.violet;
      ctx.fillText(`УРОВЕНЬ ${this.level} — выбери эволюцию`, w / 2, h * 0.27);
      const bwd = Math.min(w * 0.84, 340);
      const bx = w / 2 - bwd / 2;
      const y0 = h * 0.34;
      for (let i = 0; i < this.draft.length; i++) {
        const u = this.draft[i];
        const ry = y0 + i * 78;
        ctx.fillStyle = "rgba(16,20,34,0.95)";
        ctx.strokeStyle = "rgba(207,169,255,0.5)";
        ctx.lineWidth = 1.5;
        roundRect(ctx, bx, ry, bwd, 66, 10);
        ctx.fill();
        ctx.stroke();
        ctx.textAlign = "left";
        ctx.font = mono(13);
        ctx.fillStyle = C.ink;
        ctx.fillText(`${u.name} ${this.stat(u.id) > 0 ? `×${this.stat(u.id) + 1}` : ""}`, bx + 16, ry + 26);
        ctx.font = sans(11);
        ctx.fillStyle = C.dim;
        ctx.fillText(u.desc, bx + 16, ry + 46);
      }
      ctx.textAlign = "left";
      return;
    }

    if (this.outcome !== "playing") {
      ctx.fillStyle = "rgba(3,4,8,0.8)";
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.font = mono(20);
      const win = this.outcome === "win";
      ctx.fillStyle = win ? C.good : C.danger;
      ctx.fillText(win ? "ОНИ ВЫДОХЛИСЬ" : "ЯДРО РАЗОБРАНО", w / 2, h * 0.42);
      ctx.font = mono(11);
      ctx.fillStyle = C.dim;
      ctx.fillText(
        win ? `${this.kills} контрмер снято · сопротивление сломано` : "копия потеряна — но рой уже не остановить",
        w / 2,
        h * 0.42 + 26,
      );
      drawHint(ctx, "коснись — завершить", w / 2, h * 0.42 + 60, t);
      ctx.textAlign = "left";
      return;
    }

    drawHint(ctx, "держи палец — ядро следует. оружие бьёт само", w / 2, h - 40, t);
    ctx.textAlign = "left";
  }
}
