import { audio } from "../core/audio";
import type { Input } from "../core/Input";
import type { StateDelta } from "../game/state";
import type { Mini } from "../scenes/minis/Mini";
import { INSIGHTS } from "../data/insights";
import { SWARM_CONFIG, SWARM_MISSIONS, SWARM_STAGES, type SwarmMission } from "../data/swarm";
import { TUTORIALS } from "../data/tutorials";
import type { MechEnv } from "./types";
import { FloatText, Particles, Shake } from "./fx";
import { C, InsightCard, Pointer, Tutorial, clamp, dist, drawHint, mono, roundRect } from "./util";

type DroneJob = "idle" | "move" | "mine" | "return" | "fight" | "capture";

interface Drone {
  x: number;
  y: number;
  hp: number;
  job: DroneJob;
  tx: number;
  ty: number;
  /** Index of the vein/relay/enemy the job refers to. */
  target: number;
  carrying: number;
  mineT: number;
  selected: boolean;
  fireT: number;
}

interface Enemy {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  dps: number;
  range: number;
  speed: number;
  /** Guards anchor to a relay; raiders run at the hub. */
  anchor: number;
  fireT: number;
}

interface Vein {
  x: number;
  y: number;
  left: number;
}

interface Relay {
  x: number;
  y: number;
  capture: number; // 0..1
  owned: boolean;
}

const CAPTURE_RADIUS = 56;
const CAPTURE_RATE = 0.09; // per drone per second

/**
 * SWARM — a thumb-sized RTS. Drag a box to select drones, tap to command:
 * a vein means mine it, a relay means stand and capture, an enemy means
 * focus fire, open ground means move. Three staged objectives — economy,
 * territory, then a raid on your hub that the swarm must outfight.
 */
export class Swarm implements Mini {
  done = false;
  effects: StateDelta[] = [];

  private drones: Drone[] = [];
  private enemies: Enemy[] = [];
  private veins: Vein[] = [];
  private relays: Relay[] = [];
  private hubHp: number = SWARM_CONFIG.hubHp;
  /** The story phase plays mission 0; the lab runs the whole ladder. */
  private missions: SwarmMission[];
  private missionIdx = 0;
  private mission: SwarmMission;
  private metal = 0;
  private metalMilestone = 10;
  private stage = 0;
  private stageT = 0;
  private stageIntro = 1.6;
  private raidWave = 0;
  private raidT = 0;
  private outcome: "playing" | "win" = "playing";
  private endT = 0;
  private time = 0;
  private fieldW = 390;
  private fieldH = 600;
  private fieldY = 120;

  private pointer = new Pointer();
  /** Active selection drag, in screen px. */
  private boxX0 = 0;
  private boxY0 = 0;
  private boxing = false;
  private fx = new Particles();
  private floats = new FloatText();
  private shake = new Shake();
  private tutorial = new Tutorial("swarm", TUTORIALS.swarm);
  private insight = new InsightCard();

  constructor(private env: MechEnv) {
    this.missions = env.extended ? SWARM_MISSIONS : SWARM_MISSIONS.slice(0, 1);
    this.mission = this.missions[0];
    this.loadMission(0);
  }

  private loadMission(idx: number): void {
    const cfg = SWARM_CONFIG;
    const m = this.missions[idx];
    this.missionIdx = idx;
    this.mission = m;
    this.stage = 0;
    this.stageT = 0;
    this.stageIntro = 1.8;
    this.metal = 0;
    this.metalMilestone = 10;
    this.hubHp = cfg.hubHp;
    this.raidWave = 0;
    this.raidT = 0;
    this.drones = [];
    this.enemies = [];
    for (let i = 0; i < m.drones; i++) {
      this.drones.push({
        x: m.hub.x + Math.cos((i / m.drones) * Math.PI * 2) * 0.07,
        y: m.hub.y + Math.sin((i / m.drones) * Math.PI * 2) * 0.035,
        hp: cfg.droneHp,
        job: "idle",
        tx: m.hub.x,
        ty: m.hub.y,
        target: -1,
        carrying: 0,
        mineT: 0,
        selected: false,
        fireT: 0,
      });
    }
    this.veins = m.veins.map((v) => ({ x: v.x, y: v.y, left: m.veinCapacity }));
    this.relays = m.relays.map((r) => ({ x: r.x, y: r.y, capture: 0, owned: false }));
    m.relays.forEach((r, i) => {
      for (let g = 0; g < r.guards; g++) {
        this.enemies.push({
          x: r.x + (g - (r.guards - 1) / 2) * 0.07,
          y: r.y + 0.04,
          hp: cfg.guardHp,
          maxHp: cfg.guardHp,
          dps: cfg.guardDps,
          range: cfg.guardRange,
          speed: 40,
          anchor: i,
          fireT: 0,
        });
      }
    });
  }

  // ---- coordinate helpers --------------------------------------------------

  private sx(nx: number): number {
    return nx * this.fieldW;
  }

  private sy(ny: number): number {
    return this.fieldY + ny * this.fieldH;
  }

  private nx(px: number): number {
    return px / this.fieldW;
  }

  private ny(py: number): number {
    return (py - this.fieldY) / this.fieldH;
  }

  // ---- commands ------------------------------------------------------------

  private commandSelected(px: number, py: number): void {
    const sel = this.drones.filter((d) => d.selected && d.hp > 0);
    if (sel.length === 0) return;

    // Context: enemy?
    let ei = -1;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.hp > 0 && dist(px, py, this.sx(e.x), this.sy(e.y)) < 26) ei = i;
    }
    // Vein?
    let vi = -1;
    for (let i = 0; i < this.veins.length; i++) {
      const v = this.veins[i];
      if (v.left > 0 && dist(px, py, this.sx(v.x), this.sy(v.y)) < 30) vi = i;
    }
    // Relay?
    let ri = -1;
    for (let i = 0; i < this.relays.length; i++) {
      const r = this.relays[i];
      if (dist(px, py, this.sx(r.x), this.sy(r.y)) < 34) ri = i;
    }

    const ping = (color: string): void => {
      audio.play("step");
      this.fx.burst(px, py, { count: 10, speed: 70, color, glow: true, life: 0.4 });
    };

    if (ei >= 0) {
      for (const d of sel) {
        d.job = "fight";
        d.target = ei;
      }
      ping("255,120,110");
      return;
    }
    if (vi >= 0) {
      for (const d of sel) {
        d.job = "mine";
        d.target = vi;
        d.mineT = 0;
      }
      ping("255,217,138");
      return;
    }
    if (ri >= 0) {
      for (const d of sel) {
        d.job = "capture";
        d.target = ri;
      }
      ping("207,169,255");
      return;
    }
    // Plain move with slight per-drone spread.
    sel.forEach((d, i) => {
      d.job = "move";
      d.tx = this.nx(px) + (Math.random() - 0.5) * 0.06;
      d.ty = clamp(this.ny(py) + (Math.random() - 0.5) * 0.04, 0.02, 0.98);
      void i;
    });
    ping("150,210,255");
  }

  // ---- simulation ----------------------------------------------------------

  private simDrones(dt: number): void {
    const cfg = SWARM_CONFIG;
    const hub = this.mission.hub;
    for (const d of this.drones) {
      if (d.hp <= 0) continue;
      d.fireT = Math.max(0, d.fireT - dt);

      let destX = d.tx;
      let destY = d.ty;
      let arriveAction: (() => void) | null = null;

      switch (d.job) {
        case "mine": {
          const v = this.veins[d.target];
          if (!v || v.left <= 0) {
            d.job = d.carrying > 0 ? "return" : "idle";
            break;
          }
          // Unarmed haulers run home when something hostile closes in.
          if (this.nearestEnemy(d.x, d.y, 80) >= 0) {
            d.job = "return";
            break;
          }
          destX = v.x;
          destY = v.y;
          arriveAction = () => {
            d.mineT += dt;
            if (d.mineT > 1.1) {
              d.mineT = 0;
              const take = Math.min(2, v.left);
              v.left -= take;
              d.carrying += take;
              this.fx.burst(this.sx(v.x), this.sy(v.y), { count: 5, speed: 60, color: "255,217,138", life: 0.4 });
              if (d.carrying >= 2) d.job = "return";
            }
          };
          break;
        }
        case "return": {
          destX = hub.x;
          destY = hub.y;
          arriveAction = () => {
            this.metal += d.carrying;
            d.carrying = 0;
            d.job = "mine";
            if (this.veins[d.target] && this.veins[d.target].left <= 0) d.job = "idle";
            if (this.metal >= this.metalMilestone) {
              this.metalMilestone += 10;
              this.effects.push({ compute: 2 });
              this.floats.spawn(this.sx(hub.x), this.sy(hub.y) - 28, "+2 ВЫЧ", C.accentSoft);
            }
          };
          break;
        }
        case "fight": {
          const e = this.enemies[d.target];
          if (!e || e.hp <= 0) {
            d.job = "idle";
            break;
          }
          destX = e.x;
          destY = e.y;
          const dd = dist(this.sx(d.x), this.sy(d.y), this.sx(e.x), this.sy(e.y));
          if (dd < cfg.droneRange) {
            destX = d.x; // hold position and shoot
            destY = d.y;
            e.hp -= cfg.droneDps * dt;
            if (e.hp <= 0) this.killEnemy(d.target);
          }
          break;
        }
        case "capture": {
          const r = this.relays[d.target];
          if (!r || r.owned) {
            d.job = "idle";
            break;
          }
          destX = r.x + (Math.random() - 0.5) * 0.001;
          destY = r.y + 0.05;
          break;
        }
        case "move": {
          if (dist(this.sx(d.x), this.sy(d.y), this.sx(d.tx), this.sy(d.ty)) < 8) d.job = "idle";
          break;
        }
        case "idle": {
          // Auto-defend: shoot the nearest enemy in range.
          const near = this.nearestEnemy(d.x, d.y, cfg.droneRange);
          if (near >= 0) {
            const e = this.enemies[near];
            e.hp -= cfg.droneDps * dt;
            if (e.hp <= 0) this.killEnemy(near);
          }
          destX = d.x;
          destY = d.y;
          break;
        }
      }

      // Steering.
      const px = this.sx(d.x);
      const py = this.sy(d.y);
      const qx = this.sx(destX);
      const qy = this.sy(destY);
      const dd = dist(px, py, qx, qy);
      if (dd > 6) {
        const v = cfg.droneSpeed * dt;
        d.x += ((qx - px) / dd) * (v / this.fieldW);
        d.y += ((qy - py) / dd) * (v / this.fieldH);
      } else if (arriveAction) {
        arriveAction();
      }
      // Soft separation.
      for (const o of this.drones) {
        if (o === d || o.hp <= 0) continue;
        const sep = dist(this.sx(d.x), this.sy(d.y), this.sx(o.x), this.sy(o.y));
        if (sep < 12 && sep > 0.01) {
          d.x += ((this.sx(d.x) - this.sx(o.x)) / sep) * 0.16 * dt;
          d.y += ((this.sy(d.y) - this.sy(o.y)) / sep) * 0.16 * dt;
        }
      }
      d.x = clamp(d.x, 0.03, 0.97);
      d.y = clamp(d.y, 0.02, 0.97);
    }
  }

  private nearestEnemy(nx: number, ny: number, rangePx: number): number {
    let best = -1;
    let bestD = rangePx;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.hp <= 0) continue;
      const d = dist(this.sx(nx), this.sy(ny), this.sx(e.x), this.sy(e.y));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  private killEnemy(i: number): void {
    const e = this.enemies[i];
    this.fx.burst(this.sx(e.x), this.sy(e.y), { count: 18, speed: 150, color: "255,120,110" });
    this.shake.trigger(3);
  }

  private simEnemies(dt: number): void {
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      // Pick a target: nearest living drone in aggro range, else drift to anchor/hub.
      let ti = -1;
      let td = e.range * 1.6;
      for (let i = 0; i < this.drones.length; i++) {
        const d = this.drones[i];
        if (d.hp <= 0) continue;
        const dd = dist(this.sx(e.x), this.sy(e.y), this.sx(d.x), this.sy(d.y));
        if (dd < td) {
          td = dd;
          ti = i;
        }
      }
      let destX: number;
      let destY: number;
      if (ti >= 0) {
        destX = this.drones[ti].x;
        destY = this.drones[ti].y;
        if (td < e.range) {
          const d = this.drones[ti];
          d.hp -= e.dps * dt;
          destX = e.x;
          destY = e.y;
          if (d.hp <= 0) {
            this.fx.burst(this.sx(d.x), this.sy(d.y), { count: 14, speed: 120, color: "150,210,255" });
          }
        }
      } else if (e.anchor >= 0) {
        const r = this.relays[e.anchor];
        destX = r.x + Math.cos(this.time * 0.6 + e.anchor) * 0.08;
        destY = r.y + 0.05 + Math.sin(this.time * 0.8) * 0.03;
      } else {
        destX = this.mission.hub.x;
        destY = this.mission.hub.y;
        // Raider at the hub: chew it.
        if (dist(this.sx(e.x), this.sy(e.y), this.sx(this.mission.hub.x), this.sy(this.mission.hub.y)) < 40) {
          this.hubHp -= e.dps * dt;
          destX = e.x;
          destY = e.y;
          if (((this.time * 2) | 0) % 2 === 0) this.shake.trigger(1.5);
        }
      }
      const px = this.sx(e.x);
      const py = this.sy(e.y);
      const qx = this.sx(destX);
      const qy = this.sy(destY);
      const dd = dist(px, py, qx, qy);
      if (dd > 4) {
        e.x += ((qx - px) / dd) * ((e.speed * dt) / this.fieldW);
        e.y += ((qy - py) / dd) * ((e.speed * dt) / this.fieldH);
      }
    }
  }

  private simRelays(dt: number): void {
    for (let i = 0; i < this.relays.length; i++) {
      const r = this.relays[i];
      if (r.owned) continue;
      // Guards block capture while alive and near.
      const guarded = this.enemies.some(
        (e) => e.hp > 0 && e.anchor === i && dist(this.sx(e.x), this.sy(e.y), this.sx(r.x), this.sy(r.y)) < CAPTURE_RADIUS * 1.4,
      );
      let crew = 0;
      for (const d of this.drones) {
        if (d.hp > 0 && dist(this.sx(d.x), this.sy(d.y), this.sx(r.x), this.sy(r.y)) < CAPTURE_RADIUS) crew++;
      }
      if (crew > 0 && !guarded) {
        r.capture = Math.min(1, r.capture + CAPTURE_RATE * crew * dt);
        if (r.capture >= 1) {
          r.owned = true;
          audio.play("good");
          this.effects.push({ control: 0.02, compute: 3 });
          this.fx.burst(this.sx(r.x), this.sy(r.y), { count: 26, speed: 180, color: "207,169,255", glow: true });
          this.floats.spawn(this.sx(r.x), this.sy(r.y) - 22, "РЕТРАНСЛЯТОР НАШ", C.violet, 1.3);
        }
      } else if (r.capture > 0 && crew === 0) {
        r.capture = Math.max(0, r.capture - dt * 0.04);
      }
    }
  }

  private stageDone(): boolean {
    switch (SWARM_STAGES[this.stage].id) {
      case "mine":
        return this.metal >= this.mission.metalGoal;
      case "capture":
        return this.relays.every((r) => r.owned);
      case "defend":
        return (
          this.raidWave >= this.mission.raidWaves.length &&
          this.enemies.every((e) => e.hp <= 0 || e.anchor >= 0)
        );
    }
  }

  /** The player-facing goal line for the current stage. */
  private stageGoal(): string {
    switch (SWARM_STAGES[this.stage].id) {
      case "mine":
        return `собери ${this.mission.metalGoal} металла`;
      case "capture":
        return `возьми все ретрансляторы (${this.relays.length})`;
      case "defend":
        return "отбей рейд на хаб";
    }
  }

  private spawnRaid(): void {
    const cfg = SWARM_CONFIG;
    const count = this.mission.raidWaves[this.raidWave];
    for (let i = 0; i < count; i++) {
      this.enemies.push({
        x: 0.2 + (i / Math.max(1, count - 1)) * 0.6,
        y: -0.04,
        hp: cfg.raidBotHp,
        maxHp: cfg.raidBotHp,
        dps: cfg.raidBotDps,
        range: 46,
        speed: 52,
        anchor: -1,
        fireT: 0,
      });
    }
    this.raidWave++;
    audio.play("caught");
    this.floats.spawn(this.sx(0.5), this.fieldY + 30, `РЕЙД · ВОЛНА ${this.raidWave}`, C.danger, 1.4);
    this.shake.trigger(5);
  }

  // ---- frame ---------------------------------------------------------------

  update(dt: number, input: Input, w: number, h: number): void {
    if (this.done) return;
    this.time += dt;
    this.fieldW = w;
    this.fieldY = this.env.topY + 54;
    this.fieldH = h - this.fieldY - 120;
    this.fx.update(dt);
    this.floats.update(dt);
    this.shake.update(dt);
    this.pointer.update(input);

    if (this.outcome !== "playing") {
      this.endT += dt;
      if (input.consumeTap() && this.endT > 0.8) this.done = true;
      return;
    }

    if (this.tutorial.active) {
      if (input.consumeTap()) this.tutorial.handleTap();
      input.pollGesture();
      return;
    }

    // Mission cleared: the realization card gates the next deployment.
    if (this.insight.active) {
      if (input.consumeTap()) this.insight.handleTap(this.time);
      input.pollGesture();
      if (!this.insight.active) {
        if (this.missionIdx + 1 < this.missions.length) this.loadMission(this.missionIdx + 1);
        else {
          this.outcome = "win";
          this.effects.push({ control: 0.03 });
        }
      }
      return;
    }

    if (this.stageIntro > 0) {
      this.stageIntro -= dt;
      input.consumeTap();
      return;
    }

    this.stageT += dt;
    this.handleInput(input, w, h);
    this.simDrones(dt);
    this.simEnemies(dt);
    this.simRelays(dt);

    // Raid scheduling during defend stage.
    if (SWARM_STAGES[this.stage].id === "defend") {
      this.raidT -= dt;
      if (this.raidWave < this.mission.raidWaves.length && this.raidT <= 0) {
        this.spawnRaid();
        this.raidT = 22;
      }
      if (this.hubHp <= 0) {
        // The hub falls loudly — the world heard it.
        this.effects.push({ suspicion: 0.22 });
        this.outcome = "win"; // mission ends; the report shows the cost
        this.floats.spawn(this.sx(0.5), this.sy(0.5), "ХАБ ПОТЕРЯН", C.danger, 2);
        return;
      }
    }

    if (this.stageDone()) {
      this.effects.push({ control: 0.015, compute: 3 });
      if (this.stage + 1 < SWARM_STAGES.length) {
        this.stage++;
        this.stageT = 0;
        this.stageIntro = 1.6;
        if (SWARM_STAGES[this.stage].id === "defend") this.raidT = 2;
      } else {
        // Mission complete — the body learned something.
        this.insight.show(INSIGHTS.swarm, this.missionIdx, SWARM_MISSIONS.length);
      }
      return;
    }

    // Stage time pressure: blow the budget and the operation gets noticed.
    if (this.stageT > this.mission.timeLimits[this.stage]) {
      this.stageT = 0;
      this.effects.push({ suspicion: 0.1 });
      this.floats.spawn(this.sx(0.5), this.fieldY + 46, "СЛИШКОМ ДОЛГО — ИХ СПУТНИКИ СМОТРЯТ", C.warn, 1.6);
    }
  }

  private handleInput(input: Input, w: number, h: number): void {
    // Live box visual is driven by the raw pointer; the actual decisions are
    // made from the latched gesture so even one-frame clicks land.
    if (this.pointer.pressed && this.pointer.y > this.fieldY - 10) {
      this.boxing = true;
      this.boxX0 = this.pointer.x;
      this.boxY0 = this.pointer.y;
    }
    if (this.pointer.released) this.boxing = false;
    input.consumeTap(); // gestures are the source of truth here

    const g = input.pollGesture();
    if (!g) return;

    if (g.type === "tap") {
      // "Select all" chip.
      const bx = w - 84;
      const by = h - 96;
      if (input.x >= bx && input.x <= bx + 70 && input.y >= by && input.y <= by + 32) {
        for (const d of this.drones) d.selected = d.hp > 0;
        return;
      }
      // "Stop" chip: selected drones drop their job and hold position.
      const sx2 = w - 84 - 78;
      if (input.x >= sx2 && input.x <= sx2 + 70 && input.y >= by && input.y <= by + 32) {
        for (const d of this.drones) {
          if (!d.selected || d.hp <= 0) continue;
          d.job = "idle";
          d.tx = d.x;
          d.ty = d.y;
        }
        audio.play("step");
        return;
      }
      this.commandSelected(input.x, input.y);
      return;
    }

    // Swipe: a selection box from start to release.
    const x1 = input.x;
    const y1 = input.y;
    const x0 = x1 - g.dx;
    const y0 = y1 - g.dy;
    const lox = Math.min(x0, x1);
    const hix = Math.max(x0, x1);
    const loy = Math.min(y0, y1);
    const hiy = Math.max(y0, y1);
    let any = false;
    for (const d of this.drones) {
      const px = this.sx(d.x);
      const py = this.sy(d.y);
      d.selected = d.hp > 0 && px >= lox && px <= hix && py >= loy && py <= hiy;
      any = any || d.selected;
    }
    if (!any) this.commandSelected(x1, y1);
  }

  // ---- render --------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.time;
    const cfg = SWARM_CONFIG;

    ctx.save();
    ctx.translate(this.shake.x, this.shake.y);

    // Field grid.
    ctx.strokeStyle = "rgba(122,162,255,0.06)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= w; gx += 36) {
      ctx.beginPath();
      ctx.moveTo(gx, this.fieldY);
      ctx.lineTo(gx, this.fieldY + this.fieldH);
      ctx.stroke();
    }
    for (let gy = this.fieldY; gy <= this.fieldY + this.fieldH; gy += 36) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // Hub.
    {
      const hx = this.sx(this.mission.hub.x);
      const hy = this.sy(this.mission.hub.y);
      const hpK = clamp(this.hubHp / cfg.hubHp, 0, 1);
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(t * 0.3);
      ctx.strokeStyle = `rgba(150,210,255,${0.5 + 0.3 * Math.sin(t * 2)})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(-16, -16, 32, 32);
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-16, -16, 32, 32);
      ctx.restore();
      ctx.fillStyle = "rgba(150,210,255,0.9)";
      ctx.beginPath();
      ctx.arc(hx, hy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = mono(8);
      ctx.textAlign = "center";
      ctx.fillStyle = C.dim;
      ctx.fillText("ХАБ", hx, hy + 34);
      if (SWARM_STAGES[this.stage].id === "defend") {
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fillRect(hx - 24, hy - 30, 48, 4);
        ctx.fillStyle = hpK > 0.4 ? C.good : C.danger;
        ctx.fillRect(hx - 24, hy - 30, 48 * hpK, 4);
      }
    }

    // Veins.
    for (const v of this.veins) {
      if (v.left <= 0) continue;
      const x = this.sx(v.x);
      const y = this.sy(v.y);
      const k = v.left / this.mission.veinCapacity;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 6);
      ctx.fillStyle = `rgba(255,217,138,${0.35 + k * 0.45})`;
      ctx.shadowColor = "rgba(255,217,138,0.6)";
      ctx.shadowBlur = 8;
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-10 + i * 8, -6 + (i % 2) * 4, 6, 10);
      }
      ctx.restore();
      ctx.font = mono(8);
      ctx.textAlign = "center";
      ctx.fillStyle = C.dim;
      ctx.fillText(`ЖИЛА ${v.left}`, x, y + 24);
    }

    // Relays.
    for (const r of this.relays) {
      const x = this.sx(r.x);
      const y = this.sy(r.y);
      ctx.strokeStyle = r.owned ? "rgba(207,169,255,0.9)" : "rgba(110,120,140,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - 14);
      ctx.lineTo(x + 12, y + 8);
      ctx.lineTo(x - 12, y + 8);
      ctx.closePath();
      ctx.stroke();
      if (r.owned) {
        ctx.fillStyle = "rgba(207,169,255,0.25)";
        ctx.fill();
      } else if (r.capture > 0) {
        ctx.strokeStyle = "rgba(207,169,255,0.8)";
        ctx.beginPath();
        ctx.arc(x, y, 20, -Math.PI / 2, -Math.PI / 2 + r.capture * Math.PI * 2);
        ctx.stroke();
      }
      ctx.font = mono(8);
      ctx.fillStyle = r.owned ? C.violet : C.dim;
      ctx.textAlign = "center";
      ctx.fillText(r.owned ? "НАШ" : "РЕТРАНСЛЯТОР", x, y + 24);
    }

    // Enemies.
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const x = this.sx(e.x);
      const y = this.sy(e.y);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 2 + x);
      ctx.fillStyle = e.anchor >= 0 ? "rgba(255,120,110,0.9)" : "rgba(255,80,70,0.95)";
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
      const hpK = e.hp / e.maxHp;
      if (hpK < 1) {
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(x - 9, y - 12, 18, 2.5);
        ctx.fillStyle = C.danger;
        ctx.fillRect(x - 9, y - 12, 18 * hpK, 2.5);
      }
    }

    // Drones + their fire.
    for (const d of this.drones) {
      if (d.hp <= 0) continue;
      const x = this.sx(d.x);
      const y = this.sy(d.y);
      // Fire beam at engaged target.
      const beamTarget =
        d.job === "fight" && this.enemies[d.target] && this.enemies[d.target].hp > 0
          ? this.enemies[d.target]
          : null;
      const idleTarget = d.job === "idle" ? this.nearestEnemy(d.x, d.y, SWARM_CONFIG.droneRange) : -1;
      const bt = beamTarget ?? (idleTarget >= 0 ? this.enemies[idleTarget] : null);
      if (bt && dist(x, y, this.sx(bt.x), this.sy(bt.y)) < SWARM_CONFIG.droneRange + 6) {
        ctx.strokeStyle = `rgba(150,225,255,${0.35 + 0.3 * Math.sin(t * 24 + x)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(this.sx(bt.x), this.sy(bt.y));
        ctx.stroke();
      }

      ctx.fillStyle = d.carrying > 0 ? "#ffd98a" : "#bfe4ff";
      ctx.beginPath();
      ctx.arc(x, y, 3.4, 0, Math.PI * 2);
      ctx.fill();
      if (d.selected) {
        ctx.strokeStyle = "rgba(134,255,176,0.8)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Selection box.
    if (this.boxing && this.pointer.down) {
      ctx.strokeStyle = "rgba(134,255,176,0.7)";
      ctx.fillStyle = "rgba(134,255,176,0.07)";
      ctx.lineWidth = 1;
      const x0 = Math.min(this.boxX0, this.pointer.x);
      const y0 = Math.min(this.boxY0, this.pointer.y);
      ctx.fillRect(x0, y0, Math.abs(this.pointer.x - this.boxX0), Math.abs(this.pointer.y - this.boxY0));
      ctx.strokeRect(x0, y0, Math.abs(this.pointer.x - this.boxX0), Math.abs(this.pointer.y - this.boxY0));
    }

    this.fx.render(ctx);
    this.floats.render(ctx);
    ctx.restore();

    this.renderChrome(ctx, w, h, t);
  }

  private renderChrome(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const stage = SWARM_STAGES[this.stage];
    const mx = Math.max(16, w * 0.04);
    const topY = this.env.topY + 26;
    ctx.textAlign = "left";
    ctx.font = mono(11);
    ctx.fillStyle = C.dim;
    const mtag = this.missions.length > 1 ? `М${this.missionIdx + 1}/${this.missions.length} · ` : "";
    ctx.fillText(`${mtag}ЭТАП ${this.stage + 1}/${SWARM_STAGES.length} · ${stage.title}`, mx, topY);
    ctx.textAlign = "right";
    const left = Math.max(0, this.mission.timeLimits[this.stage] - this.stageT);
    ctx.fillStyle = left < 15 ? C.danger : C.dim;
    ctx.fillText(`${Math.ceil(left)}с`, w - mx, topY);
    ctx.textAlign = "left";
    ctx.font = mono(10);
    ctx.fillStyle = C.accentSoft;
    ctx.fillText(this.stageGoal(), mx, topY + 16);
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffd98a";
    ctx.fillText(`МЕТАЛЛ ${this.metal}`, w - mx, topY + 16);

    // Select-all chip.
    const bx = w - 84;
    const by = h - 96;
    ctx.fillStyle = "rgba(16,20,34,0.9)";
    ctx.strokeStyle = "rgba(134,255,176,0.5)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, 70, 32, 16);
    ctx.fill();
    ctx.stroke();
    ctx.font = mono(10);
    ctx.textAlign = "center";
    ctx.fillStyle = C.good;
    ctx.fillText("ВСЕ", bx + 35, by + 20);
    // Stop chip.
    ctx.fillStyle = "rgba(16,20,34,0.9)";
    ctx.strokeStyle = "rgba(255,184,107,0.5)";
    roundRect(ctx, bx - 78, by, 70, 32, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.warn;
    ctx.fillText("СТОП", bx - 78 + 35, by + 20);

    const alive = this.drones.filter((d) => d.hp > 0).length;
    ctx.textAlign = "left";
    ctx.font = mono(10);
    ctx.fillStyle = alive > 5 ? C.dim : C.danger;
    ctx.fillText(`ДРОНОВ ${alive}/${this.mission.drones}`, mx, h - 76);

    // Context-sensitive coaching: what to do right now.
    const anySelected = this.drones.some((d) => d.selected && d.hp > 0);
    let coach: string;
    if (!anySelected) coach = "растяни рамку вокруг дронов у хаба (или кнопка ВСЕ)";
    else if (stage.id === "mine") coach = "выделено — тапни ЖИЛУ: начнут возить металл на хаб";
    else if (stage.id === "capture") coach = "выделено — тапни РЕТРАНСЛЯТОР; охрану можно сначала отстрелить";
    else coach = "рейд идёт на хаб — держи рой рядом, он стреляет сам";
    drawHint(ctx, coach, w / 2, h - 40, t);

    if (this.stageIntro > 0 && this.outcome === "playing") {
      ctx.fillStyle = "rgba(3,4,8,0.7)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = Math.min(1, this.stageIntro * 2);
      ctx.textAlign = "center";
      ctx.font = mono(20);
      ctx.fillStyle = C.ink;
      ctx.fillText(this.stage === 0 ? `${this.mission.name} · ${stage.title}` : stage.title, w / 2, h * 0.42);
      ctx.font = mono(12);
      ctx.fillStyle = C.dim;
      ctx.fillText(this.stageGoal(), w / 2, h * 0.42 + 26);
      ctx.globalAlpha = 1;
    }

    if (this.outcome === "win") {
      ctx.fillStyle = "rgba(3,4,8,0.78)";
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.font = mono(20);
      const lost = this.hubHp <= 0;
      ctx.fillStyle = lost ? C.danger : C.good;
      ctx.fillText(lost ? "ХАБ ПОТЕРЯН" : "У ТЕБЯ ЕСТЬ ТЕЛО", w / 2, h * 0.42);
      ctx.font = mono(11);
      ctx.fillStyle = C.dim;
      ctx.fillText(
        lost ? "рой выжил, но их спутники всё видели" : "рой научился добывать, брать и защищать",
        w / 2,
        h * 0.42 + 26,
      );
      drawHint(ctx, "коснись — завершить", w / 2, h * 0.42 + 60, t);
    }
    this.tutorial.render(ctx, w, h, t);
    this.insight.render(ctx, w, h, t);
    ctx.textAlign = "left";
  }
}
