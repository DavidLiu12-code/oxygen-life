/**
 * 《氧气的一生》— 主游戏逻辑
 * 观察重建自录屏，非官方源码级 1:1。
 */
import {
  FORMS, ELEMENT_DEFS, EVENT_DEFS, END_RARITY,
  formAffinity, layerName, todayCourse,
} from './data.js';
import { sfx } from './sound.js';

const W = 360;           // 逻辑板宽
const MAX_DEPTH = 4200;  // nm
const BALL_R = 10;
const PEG_R = 3;
const GRAVITY = 0.22;
const FRICTION_AIR = 0.995;
const RESTITUTION = 0.62;
const MAX_SPEED = 14;
const VIEW_H = 640;      // 可视高度（逻辑）
const HUD_RESERVE = 170; // 顶部 HUD 占位

const BEST_KEY = 'oxygen-life-best';

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function rand(a, b) { return a + Math.random() * (b - a); }
function choice(arr) { return arr[(Math.random() * arr.length) | 0]; }

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui;
    window.__sfx = sfx;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.mode = 'boot'; // boot | aim | playing | result
    this.best = Number(localStorage.getItem(BEST_KEY) || 0);
    this.course = todayCourse();
    this._accum = 0;
    this._raf = 0;
    this._lastTs = 0;
    this.virtualTime = true; // advanceTime 可用
    this.paused = false;
    this.pointer = { down: false, x: 0, y: 0, startX: 0, startY: 0 };
    this.bubbles = [];
    this.trail = [];
    this.pathLog = []; // {x, depth} for journey chart
    this.events = [];  // journey events
    this.transfers = [];
    this.revives = 0;
    this.distance = 0;
    this._lastPos = null;
    this.hitCooldown = new Map();
    this.fullscreen = false;

    this._bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.reset(true);
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  resize() {
    const wrap = this.canvas.parentElement;
    const cssW = wrap.clientWidth || 390;
    const cssH = wrap.clientHeight || 700;
    this.cssW = cssW;
    this.cssH = cssH;
    this.canvas.width = Math.floor(cssW * this.dpr);
    this.canvas.height = Math.floor(cssH * this.dpr);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.scale = (cssW * this.dpr) / W;
    this.viewH = (cssH * this.dpr) / this.scale;
  }

  reset(first = false) {
    this.mode = 'aim';
    this.formId = 'O2';
    this.score = 0;
    this.depth = 0;
    this.maxDepth = 0;
    this.ball = { x: W / 2, y: 40, vx: 0, vy: 0, r: BALL_R };
    this.camY = 0;
    this.bubbles = [];
    this.trail = [];
    this.pathLog = [{ x: W / 2, depth: 0 }];
    this.events = [];
    this.transfers = ['O2'];
    this.revives = 0;
    this.distance = 0;
    this._lastPos = { x: W / 2, y: 40 };
    this.hitCooldown.clear();
    this.showHelp = true;
    this.settledFrames = 0;
    this._stuckFrames = 0;
    this._stuckLastY = 0;
    this._buildWorld();
    this.ui.onState(this);
    if (!first) this.ui.hideResult();
  }

  _buildWorld() {
    this.pegs = [];
    this.tiles = [];
    this.eventZones = [];
    this.pockets = []; // side bumpers

    // Side pockets every ~70 nm
    for (let y = 60; y < MAX_DEPTH; y += 70) {
      this.pockets.push({ side: 'L', x: 0, y, r: 22 });
      this.pockets.push({ side: 'R', x: W, y, r: 22 });
    }

    // Pegs staggered grid (sparser so ball does not cage)
    const pegGapX = 52;
    const pegGapY = 68;
    for (let row = 0, y = 100; y < MAX_DEPTH - 40; y += pegGapY, row++) {
      const offset = (row % 2) * (pegGapX / 2);
      for (let x = 32 + offset; x < W - 24; x += pegGapX) {
        if (Math.random() < 0.22) continue;
        this.pegs.push({ x, y, r: PEG_R });
      }
    }

    // Layer content plans
    const skyEls = ['Au', 'N₂', 'Ar', 'H₂', 'H₂', 'H₂', 'N₂'];
    const surfEls = ['Fe', 'Fe', 'Fe', 'Cu', 'Ag', 'Pb', 'C', 'N₂', 'Au'];
    const deepEls = ['Si', 'Si', 'Al', 'Al', 'Ca', 'Ca', 'Na', 'Ti', 'Zn', 'Fe', 'Si'];

    const placeTile = (symbol, y, xJitter = 0) => {
      const def = ELEMENT_DEFS.find(e => e.symbol === symbol);
      if (!def) return;
      const x = clamp(40 + Math.random() * (W - 80) + xJitter, 36, W - 36);
      // avoid overlapping existing
      for (const t of this.tiles) {
        if (Math.hypot(t.x - x, t.y - y) < 48) return;
      }
      this.tiles.push({
        ...def,
        x, y,
        w: 36, h: 36,
        used: false,
      });
    };

    // Sky 80–950
    for (let y = 120; y < 950; y += rand(70, 110)) {
      placeTile(choice(skyEls), y);
      if (Math.random() < 0.45) placeTile(choice(skyEls), y + 20);
    }
    // Surface 1000–1950
    for (let y = 1050; y < 1950; y += rand(65, 100)) {
      placeTile(choice(surfEls), y);
      if (Math.random() < 0.55) placeTile(choice(surfEls), y + 15);
    }
    // Deep 2050–4000
    for (let y = 2100; y < MAX_DEPTH - 80; y += rand(60, 95)) {
      placeTile(choice(deepEls), y);
      if (Math.random() < 0.6) placeTile(choice(deepEls), y + 18);
    }

    // Event zones
    const placeEvent = (id, y) => {
      const def = EVENT_DEFS.find(e => e.id === id);
      if (!def) return;
      const x = clamp(50 + Math.random() * (W - 100), 50, W - 50);
      this.eventZones.push({ ...def, x, y, r: 22, used: false });
    };
    placeEvent('lightning', 180);
    placeEvent('lightning', 420);
    placeEvent('cloud', 280);
    placeEvent('cloud', 700);
    placeEvent('plant', 1200);
    placeEvent('plant', 1450);
    placeEvent('plant', 1700);
    placeEvent('animal', 1350);
    placeEvent('animal', 1600);
    placeEvent('al_smelter', 2600);
    placeEvent('al_smelter', 3100);
    placeEvent('cement', 2800);
    placeEvent('cement', 3500);
    placeEvent('cement', 3800);
  }

  // ——— Input ———
  _bindInput() {
    const toLogic = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * W;
      const y = ((clientY - rect.top) / rect.height) * this.viewH + this.camY;
      return { x, y };
    };

    const onDown = (e) => {
      const p = e.touches ? e.touches[0] : e;
      const { x, y } = toLogic(p.clientX, p.clientY);
      if (this.mode === 'aim') {
        this.pointer.down = true;
        this.pointer.startX = this.ball.x;
        this.pointer.startY = this.ball.y;
        this.pointer.x = x;
        this.pointer.y = y;
        this.showHelp = false;
        this.ui.hideHelp();
        sfx.ensure();
        sfx.pull();
      } else if (this.mode === 'playing') {
        // allow a mid-air nudge sling once? recording shows only start slingshot
        // ignore
      }
      e.preventDefault?.();
    };
    const onMove = (e) => {
      if (!this.pointer.down) return;
      const p = e.touches ? e.touches[0] : e;
      const { x, y } = toLogic(p.clientX, p.clientY);
      this.pointer.x = x;
      this.pointer.y = y;
      e.preventDefault?.();
    };
    const onUp = (e) => {
      if (!this.pointer.down) return;
      this.pointer.down = false;
      if (this.mode === 'aim') {
        const dx = this.pointer.startX - this.pointer.x; // pull opposite → fly this way
        const dy = this.pointer.startY - this.pointer.y;
        // Actually: pull toward direction, release flies OPPOSITE to pull
        // If user pulls ball down-right, release flies up-left
        // pull vector = pointer - ball; fly = -(pointer - ball) = ball - pointer
        const pullX = this.pointer.x - this.ball.x;
        const pullY = this.pointer.y - this.ball.y;
        const flyX = -pullX;
        const flyY = -pullY;
        const len = Math.hypot(flyX, flyY) || 1;
        const power = clamp(len / 18, 0.6, 4.2);
        this.ball.vx = (flyX / len) * power * 5.5;
        this.ball.vy = (flyY / len) * power * 5.5;
        // bias downward a bit if almost upward
        if (this.ball.vy < 0.5) this.ball.vy += 1.2;
        sfx.release(power / 3);
        this.mode = 'playing';
        this.ui.onState(this);
      }
      e.preventDefault?.();
    };

    this.canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    this.canvas.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'f' || e.key === 'F') this.toggleFullscreen();
      if (e.key === 'Escape' && this.fullscreen) this.toggleFullscreen(false);
    });
  }

  toggleFullscreen(force) {
    const el = document.documentElement;
    const go = force === undefined ? !document.fullscreenElement : force;
    if (go && !document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
      this.fullscreen = true;
    } else if (!go && document.fullscreenElement) {
      document.exitFullscreen?.();
      this.fullscreen = false;
    }
    setTimeout(() => this.resize(), 100);
  }

  // ——— Update ———
  advanceTime(ms) {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) this.update(1 / 60);
    this.render();
  }

  _loop(ts) {
    if (!this._lastTs) this._lastTs = ts;
    let dt = (ts - this._lastTs) / 1000;
    this._lastTs = ts;
    if (dt > 0.05) dt = 0.05;
    if (!this.paused) {
      this._accum += dt;
      while (this._accum >= 1 / 60) {
        this.update(1 / 60);
        this._accum -= 1 / 60;
      }
    }
    this.render();
    this._raf = requestAnimationFrame(this._loop);
  }

  update(dt) {
    if (this.mode === 'result') return;
    // cooldown tick
    for (const [k, v] of this.hitCooldown) {
      const n = v - dt;
      if (n <= 0) this.hitCooldown.delete(k);
      else this.hitCooldown.set(k, n);
    }

    if (this.mode !== 'playing') {
      this.ui.onState(this);
      return;
    }

    const b = this.ball;
    // physics substeps
    const sub = 3;
    for (let s = 0; s < sub; s++) {
      b.vy += GRAVITY / sub;
      b.vx *= Math.pow(FRICTION_AIR, 1 / sub);
      b.vy *= Math.pow(FRICTION_AIR, 1 / sub);
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > MAX_SPEED) {
        b.vx = (b.vx / sp) * MAX_SPEED;
        b.vy = (b.vy / sp) * MAX_SPEED;
      }
      b.x += b.vx / sub;
      b.y += b.vy / sub;

      // walls
      if (b.x < b.r + 8) { b.x = b.r + 8; b.vx = Math.abs(b.vx) * RESTITUTION; }
      if (b.x > W - b.r - 8) { b.x = W - b.r - 8; b.vx = -Math.abs(b.vx) * RESTITUTION; }
      if (b.y < 10) { b.y = 10; b.vy = Math.abs(b.vy) * 0.5; }

      this._collidePegs();
      this._collidePockets();
      this._collideTiles();
      this._collideEvents();
    }

    // trail & path
    this.trail.push({ x: b.x, y: b.y, t: performance.now() });
    if (this.trail.length > 18) this.trail.shift();

    if (this._lastPos) {
      this.distance += Math.hypot(b.x - this._lastPos.x, b.y - this._lastPos.y);
    }
    this._lastPos = { x: b.x, y: b.y };

    this.depth = Math.max(0, b.y);
    if (this.depth > this.maxDepth) this.maxDepth = this.depth;

    // score: depth contribution + keep transfer bonuses
    const depthScore = Math.floor(this.maxDepth * 0.28);
    this.score = Math.max(this.score, depthScore + this._transferBonus);

    if (this.pathLog.length === 0 || Math.abs(this.pathLog[this.pathLog.length - 1].depth - this.depth) > 25) {
      this.pathLog.push({ x: b.x, depth: this.depth });
    }

    // camera follow
    const targetCam = b.y - this.viewH * 0.35;
    this.camY += (targetCam - this.camY) * 0.12;
    this.camY = clamp(this.camY, 0, MAX_DEPTH - this.viewH + 80);

    // settle / end
    if (b.y >= MAX_DEPTH - 30) {
      b.y = MAX_DEPTH - 30;
      b.vy *= 0.5;
      b.vx *= 0.9;
      this.settledFrames++;
      if (this.settledFrames > 45 || Math.hypot(b.vx, b.vy) < 0.35) {
        this._finish();
      }
    } else {
      const spd = Math.hypot(b.vx, b.vy);
      // continuous downward assist
      if (b.y > 50) b.vy += 0.08;
      if (spd < 1.5 && b.y > 50) b.vy += 0.15;

      // position-based stuck detector
      if (Math.abs(b.y - this._stuckLastY) < 1.2) {
        this._stuckFrames++;
      } else {
        this._stuckFrames = 0;
        this._stuckLastY = b.y;
      }
      if (this._stuckFrames > 25 && b.y > 60) {
        // hard escape: clear nearby peg overlap by jumping down a lane gap
        b.x = Math.min(W - 40, Math.max(40, b.x + (Math.random() < 0.5 ? -28 : 28)));
        b.y += 40;
        b.vx = (Math.random() - 0.5) * 3;
        b.vy = 5 + Math.random() * 2;
        this._stuckFrames = 0;
        this._stuckLastY = b.y;
      }
    }

    // bubble life
    this.bubbles = this.bubbles.filter(bb => {
      bb.life -= dt;
      bb.y -= 18 * dt;
      return bb.life > 0;
    });

    this.ui.onState(this);
  }

  get _transferBonus() {
    let bonus = 0;
    for (const id of this.transfers) {
      bonus += Math.round(formAffinity(id) * 0.55);
    }
    return bonus;
  }

  _collidePegs() {
    const b = this.ball;
    for (const p of this.pegs) {
      if (Math.abs(p.y - b.y) > 40) continue;
      const d = dist(b.x, b.y, p.x, p.y);
      const minD = b.r + p.r;
      if (d < minD && d > 0.01) {
        const nx = (b.x - p.x) / d;
        const ny = (b.y - p.y) / d;
        const overlap = minD - d;
        b.x += nx * overlap;
        b.y += ny * overlap;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) {
          b.vx -= (1 + RESTITUTION) * vn * nx;
          b.vy -= (1 + RESTITUTION) * vn * ny;
          if (Math.hypot(b.vx, b.vy) > 0.8) sfx.peg();
        }
      }
    }
  }

  _collidePockets() {
    const b = this.ball;
    for (const p of this.pockets) {
      if (Math.abs(p.y - b.y) > 50) continue;
      const cx = p.side === 'L' ? 0 : W;
      const d = dist(b.x, b.y, cx, p.y);
      if (d < p.r + b.r * 0.3) {
        const nx = (b.x - cx) / (d || 1);
        const ny = (b.y - p.y) / (d || 1);
        const push = (p.r + b.r * 0.3) - d;
        b.x += nx * push;
        b.y += ny * push;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) {
          b.vx -= (1 + 0.85) * vn * nx;
          b.vy -= (1 + 0.85) * vn * ny;
          sfx.bounceSoft();
        }
      }
    }
  }

  _collideTiles() {
    const b = this.ball;
    const form = FORMS[this.formId];
    const curA = form.affinity;
    for (const t of this.tiles) {
      if (Math.abs(t.y - b.y) > 50) continue;
      const nearestX = clamp(b.x, t.x - t.w / 2, t.x + t.w / 2);
      const nearestY = clamp(b.y, t.y - t.h / 2, t.y + t.h / 2);
      const d = dist(b.x, b.y, nearestX, nearestY);
      if (d >= b.r) continue;

      // bounce
      const nx = d < 0.01 ? 1 : (b.x - nearestX) / d;
      const ny = d < 0.01 ? 0 : (b.y - nearestY) / d;
      const overlap = b.r - d;
      b.x += nx * overlap;
      b.y += ny * overlap;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= (1 + RESTITUTION) * vn * nx;
        b.vy -= (1 + RESTITUTION) * vn * ny;
      }

      const key = `t${t.x.toFixed(0)}_${t.y.toFixed(0)}`;
      if (this.hitCooldown.has(key)) continue;
      this.hitCooldown.set(key, 0.55);

      if (t.noReact || t.affinity == null) {
        if (!t.logged) {
          t.logged = true;
          sfx.noReact();
          this._pushBubble(t.transferMsg || '不反应', t.x, t.y - 30);
          this._logEvent({ depth: this.depth, msg: t.transferMsg || `${t.symbol}不反应`, transfer: false });
        } else {
          sfx.bounceSoft();
        }
        continue;
      }

      if (t.affinity <= curA) {
        if (!t.loggedWeak) {
          t.loggedWeak = true;
          sfx.weak();
          this._pushBubble(t.weakMsg || `${t.symbol}太弱，换乘不了`, t.x, t.y - 30);
          this._logEvent({ depth: this.depth, msg: t.weakMsg || `${t.symbol}太弱，换乘不了`, transfer: false });
        } else {
          sfx.bounceSoft();
        }
        continue;
      }

      // transfer!
      const prev = this.formId;
      const prevFormula = FORMS[prev].formula;
      this.formId = t.form;
      if (!FORMS[t.form]) {
        // ensure form exists
        FORMS[t.form] = { id: t.form, formula: t.symbol + 'O', name: t.symbol, affinity: t.affinity, color: t.color };
      }
      this.transfers.push(this.formId);
      const msg = (typeof t.fromMsg === 'function')
        ? t.fromMsg(prevFormula)
        : (t.transferMsg || `换乘成 ${FORMS[this.formId].formula}`);
      // special displacement equations from recording style
      let eq = t.equation;
      if (prev === 'Fe2O3' && t.form === 'SiO2') eq = '2Fe₂O₃ + 3Si → 4Fe + 3SiO₂';
      if (prev === 'SiO2' && t.form === 'Al2O3') eq = '3SiO₂ + 4Al → 3Si + 2Al₂O₃';
      if (prev === 'Al2O3' && t.form === 'CaO') eq = 'Al₂O₃ + 3Ca → 2Al + 3CaO';
      if (prev === 'CO2' && t.form === 'SiO2') eq = '二氧化碳换乘到硅';
      if (prev === 'H2O' && t.form === 'Fe2O3') {
        this._pushBubble('雨滴换乘到铁上', t.x, t.y - 36);
      }
      sfx.transfer();
      this._pushBubble(msg, t.x, t.y - 36, eq);
      this._logEvent({ depth: this.depth, msg, equation: eq, transfer: true, formId: this.formId });
      this.score += Math.round(t.affinity * 0.35 + 40);
    }
  }

  _collideEvents() {
    const b = this.ball;
    for (const ez of this.eventZones) {
      if (ez.used) continue;
      if (Math.abs(ez.y - b.y) > 40) continue;
      const d = dist(b.x, b.y, ez.x, ez.y);
      if (d > ez.r + b.r) continue;
      ez.used = true;
      // soft bounce
      const nx = (b.x - ez.x) / (d || 1);
      const ny = (b.y - ez.y) / (d || 1);
      b.vx += nx * 2;
      b.vy += ny * 2;

      const state = { formId: this.formId, affinity: formAffinity(this.formId) };
      const res = ez.trigger(state);
      if (res.kind === 'transfer' && res.formId) {
        this.formId = res.formId;
        this.transfers.push(this.formId);
        if (res.revive) {
          this.revives += 1;
          sfx.revive();
        } else {
          sfx.transfer();
        }
        this.score += 80;
        this._pushBubble(res.msg, ez.x, ez.y - 30, res.equation);
        this._logEvent({ depth: this.depth, msg: res.msg, equation: res.equation, transfer: true, formId: this.formId, revive: !!res.revive });
      } else {
        sfx.event();
        this._pushBubble(res.msg, ez.x, ez.y - 30);
        this._logEvent({ depth: this.depth, msg: res.msg, transfer: false });
      }
    }
  }

  _pushBubble(text, x, y, equation) {
    this.bubbles.push({ text, equation, x, y, life: 2.4 });
    if (this.bubbles.length > 5) this.bubbles.shift();
  }

  _logEvent(ev) {
    const numbered = ev.transfer;
    const idx = numbered ? this.events.filter(e => e.transfer).length + 1 : null;
    this.events.push({ ...ev, index: idx, x: this.ball.x });
  }

  _finish() {
    this.mode = 'result';
    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem(BEST_KEY, String(this.best));
    }
    sfx.result();
    this.ui.showResult(this);
    this.ui.onState(this);
  }

  // ——— Render ———
  render() {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const scale = this.scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    const cam = this.camY;
    const top = cam;
    const bot = cam + this.viewH;

    // page bg already CSS; draw board bg layers
    this._drawLayers(ctx, top, bot);
    this._drawPockets(ctx, top, bot);
    this._drawGrid(ctx, top, bot);
    this._drawDepthMarks(ctx, top, bot);
    this._drawPegs(ctx, top, bot);
    this._drawTiles(ctx, top, bot);
    this._drawEvents(ctx, top, bot);
    this._drawTrail(ctx, cam);
    this._drawBall(ctx, cam);
    this._drawAim(ctx, cam);
    this._drawBubbles(ctx, cam);

    // bottom ground line
    if (MAX_DEPTH > top && MAX_DEPTH < bot + 40) {
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(8, MAX_DEPTH - cam, W - 16, 24);
      ctx.fillStyle = '#fff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('地壳深处 · 一生落定', W / 2, MAX_DEPTH - cam + 15);
    }
  }

  _drawLayers(ctx, top, bot) {
    const bands = [
      { y0: 0, y1: 1000, c: '#e3f2fd' },
      { y0: 1000, y1: 2000, c: '#e8f5e9' },
      { y0: 2000, y1: MAX_DEPTH + 100, c: '#efebe9' },
    ];
    for (const b of bands) {
      const y0 = Math.max(b.y0, top) - this.camY;
      const y1 = Math.min(b.y1, bot) - this.camY;
      if (y1 <= y0) continue;
      ctx.fillStyle = b.c;
      ctx.fillRect(8, y0, W - 16, y1 - y0);
    }
    // surface line
    if (1000 > top && 1000 < bot) {
      ctx.strokeStyle = '#81c784';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, 1000 - this.camY);
      ctx.lineTo(W - 12, 1000 - this.camY);
      ctx.stroke();
      ctx.fillStyle = '#2e7d32';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('地表', 16, 1000 - this.camY - 6);
    }
    if (2000 > top && 2000 < bot) {
      ctx.strokeStyle = '#a1887f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, 2000 - this.camY);
      ctx.lineTo(W - 12, 2000 - this.camY);
      ctx.stroke();
      ctx.fillStyle = '#5d4037';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('地中', 16, 2000 - this.camY - 6);
    }
    // sky label
    if (top < 80) {
      ctx.fillStyle = '#1565c0';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('上空', 16, 28 - this.camY);
    }
    // board frame
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, top - this.camY, W - 16, bot - top);
  }

  _drawGrid(ctx, top, bot) {
    ctx.strokeStyle = 'rgba(100,140,180,0.18)';
    ctx.lineWidth = 1;
    const step = 20;
    for (let x = 20; x < W - 10; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, top - this.camY);
      ctx.lineTo(x, bot - this.camY);
      ctx.stroke();
    }
    const y0 = Math.floor(top / step) * step;
    for (let y = y0; y < bot; y += step) {
      ctx.beginPath();
      ctx.moveTo(12, y - this.camY);
      ctx.lineTo(W - 12, y - this.camY);
      ctx.stroke();
    }
  }

  _drawDepthMarks(ctx, top, bot) {
    ctx.fillStyle = '#607d8b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    for (let d = 0; d <= MAX_DEPTH; d += 500) {
      if (d < top - 10 || d > bot + 10) continue;
      ctx.fillText(`${d.toLocaleString()} nm`, W - 14, d - this.camY + 3);
    }
  }

  _drawPockets(ctx, top, bot) {
    ctx.fillStyle = '#1a237e';
    for (const p of this.pockets) {
      if (p.y < top - 30 || p.y > bot + 30) continue;
      ctx.beginPath();
      if (p.side === 'L') {
        ctx.arc(8, p.y - this.camY, p.r, -Math.PI / 2, Math.PI / 2);
      } else {
        ctx.arc(W - 8, p.y - this.camY, p.r, Math.PI / 2, -Math.PI / 2);
      }
      ctx.fill();
    }
  }

  _drawPegs(ctx, top, bot) {
    ctx.fillStyle = '#37474f';
    for (const p of this.pegs) {
      if (p.y < top - 10 || p.y > bot + 10) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y - this.camY, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawTiles(ctx, top, bot) {
    const curA = formAffinity(this.formId);
    for (const t of this.tiles) {
      if (t.y < top - 40 || t.y > bot + 40) continue;
      const weak = !t.noReact && t.affinity != null && t.affinity <= curA;
      ctx.globalAlpha = weak ? 0.35 : 1;
      const x = t.x - t.w / 2;
      const y = t.y - t.h / 2 - this.camY;
      roundRect(ctx, x, y, t.w, t.h, 6);
      ctx.fillStyle = t.color;
      ctx.fill();
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = t.text || '#111';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(String(t.Z), x + 3, y + 10);
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.symbol, t.x, y + 22);
      ctx.font = '9px sans-serif';
      if (t.noReact) {
        ctx.fillText('不反应', t.x, y + 32);
      } else {
        ctx.fillText(String(t.affinity), t.x, y + 32);
      }
      ctx.globalAlpha = 1;
    }
  }

  _drawEvents(ctx, top, bot) {
    for (const ez of this.eventZones) {
      if (ez.y < top - 40 || ez.y > bot + 40) continue;
      const y = ez.y - this.camY;
      ctx.globalAlpha = ez.used ? 0.35 : 1;
      ctx.beginPath();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#546e7a';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = ez.color;
      ctx.arc(ez.x, y, ez.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#333';
      ctx.fillText(ez.emoji, ez.x, y - 2);
      ctx.font = '9px sans-serif';
      ctx.fillText(ez.label, ez.x, y + 14);
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 1;
    }
  }

  _drawTrail(ctx, cam) {
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      const a = (i + 1) / this.trail.length * 0.45;
      ctx.beginPath();
      ctx.fillStyle = `rgba(229,57,53,${a})`;
      ctx.arc(p.x, p.y - cam, BALL_R * (0.4 + 0.6 * a), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawBall(ctx, cam) {
    const b = this.ball;
    const y = b.y - cam;
    const form = FORMS[this.formId] || FORMS.O2;
    // O2 as two circles when form is O2
    if (this.formId === 'O2') {
      ctx.beginPath();
      ctx.fillStyle = '#e53935';
      ctx.arc(b.x - 6, y, 8, 0, Math.PI * 2);
      ctx.arc(b.x + 6, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('O', b.x - 6, y + 3);
      ctx.fillText('O', b.x + 6, y + 3);
    } else {
      ctx.beginPath();
      ctx.fillStyle = form.color;
      ctx.strokeStyle = '#c62828';
      ctx.lineWidth = 2;
      ctx.arc(b.x, y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('O', b.x, y + 3);
    }
  }

  _drawAim(ctx, cam) {
    if (this.mode !== 'aim' || !this.pointer.down) {
      if (this.mode === 'aim' && this.showHelp) {
        ctx.fillStyle = 'rgba(33,33,33,0.75)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('拉开再松手（反方向飞出）', this.ball.x, this.ball.y - cam + 36);
      }
      return;
    }
    const b = this.ball;
    // pull line
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y - cam);
    ctx.lineTo(this.pointer.x, this.pointer.y - cam);
    ctx.stroke();
    // dotted trajectory opposite
    const pullX = this.pointer.x - b.x;
    const pullY = this.pointer.y - b.y;
    const flyX = -pullX;
    const flyY = -pullY;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(b.x, b.y - cam);
    ctx.lineTo(b.x + flyX * 0.9, b.y + flyY * 0.9 - cam);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _drawBubbles(ctx, cam) {
    for (const bb of this.bubbles) {
      const alpha = clamp(bb.life / 0.4, 0, 1);
      ctx.globalAlpha = alpha;
      const y = bb.y - cam;
      ctx.font = '11px sans-serif';
      const tw = ctx.measureText(bb.text).width;
      const w = Math.max(tw + 16, 80);
      const h = bb.equation ? 36 : 22;
      roundRect(ctx, bb.x - w / 2, y - h, w, h, 8);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#212121';
      ctx.textAlign = 'center';
      ctx.fillText(bb.text, bb.x, y - h + 14);
      if (bb.equation) {
        ctx.font = '10px monospace';
        ctx.fillStyle = '#546e7a';
        ctx.fillText(bb.equation, bb.x, y - 6);
      }
      ctx.globalAlpha = 1;
    }
  }

  // test helpers
  forceLaunch(vx = 2, vy = 6) {
    this.showHelp = false;
    this.ui.hideHelp();
    this.ball.vx = vx;
    this.ball.vy = vy;
    this.mode = 'playing';
    this.ui.onState(this);
  }

  forceFinish() {
    this._finish();
  }

  snapshot() {
    const form = FORMS[this.formId];
    return {
      coords: 'origin top-left of board; +x right; +y down (depth nm)',
      mode: this.mode,
      formId: this.formId,
      form: form ? form.formula : this.formId,
      formName: form ? form.name : '',
      affinity: formAffinity(this.formId),
      score: this.score,
      best: this.best,
      depth: Math.round(this.depth),
      layer: layerName(this.depth),
      ball: { x: +this.ball.x.toFixed(1), y: +this.ball.y.toFixed(1), vx: +this.ball.vx.toFixed(2), vy: +this.ball.vy.toFixed(2) },
      transfers: this.transfers.map(id => (FORMS[id] || { formula: id }).formula),
      revives: this.revives,
      distance: Math.round(this.distance),
      bubbles: this.bubbles.map(b => b.text),
      eventsCount: this.events.length,
      course: this.course,
      pointerDown: this.pointer.down,
    };
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export { FORMS, END_RARITY, layerName, formAffinity };
