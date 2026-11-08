import { FORMS, END_RARITY, layerName, formAffinity } from './data.js';

export class UI {
  constructor() {
    this.els = {
      course: document.getElementById('course'),
      best: document.getElementById('best'),
      form: document.getElementById('form-display'),
      formName: document.getElementById('form-name'),
      score: document.getElementById('score'),
      place: document.getElementById('place'),
      help: document.getElementById('help-panel'),
      result: document.getElementById('result-overlay'),
      toast: document.getElementById('toast'),
    };
    document.getElementById('btn-again')?.addEventListener('click', () => {
      window.__game?.reset();
    });
    document.getElementById('btn-copy')?.addEventListener('click', () => this.copyResult());
    document.getElementById('btn-share')?.addEventListener('click', () => this.shareX());
  }

  onState(game) {
    const form = FORMS[game.formId] || FORMS.O2;
    this.els.course.textContent = game.course;
    this.els.best.textContent = game.best.toLocaleString();
    this.els.form.textContent = form.formula;
    this.els.formName.textContent = form.name;
    this.els.score.textContent = game.score.toLocaleString();
    const depth = Math.round(game.depth);
    if (depth < 30 && game.mode === 'aim') {
      this.els.place.textContent = '上空的顶点';
    } else {
      this.els.place.textContent = `${layerName(depth)} · 深度 ${depth.toLocaleString()} nm`;
    }
  }

  hideHelp() {
    if (this.els.help) this.els.help.classList.add('hidden');
  }

  hideResult() {
    this.els.result.classList.add('hidden');
    this.els.result.setAttribute('aria-hidden', 'true');
  }

  showResult(game) {
    const form = FORMS[game.formId] || FORMS.O2;
    const rarity = END_RARITY[game.formId] || { endPct: 5, crustPct: 1, label: '少见一生' };
    const transferCount = game.transfers.length - 1;
    // turbulence: more transfers → higher "turbulent journey" chance display
    const turbPct = clamp(Math.round(12 + transferCount * 8 + Math.min(game.revives, 2) * 10), 8, 85);
    const combined = Math.max(1, Math.round(100 / Math.max(1, (rarity.endPct / 100) * (turbPct / 100) * 100)));
    // 约 N 分之 1
    const combinedLabel = `约 ${combined} 分之 1`;

    const chain = game.transfers.map(id => (FORMS[id] || { formula: id }).formula);
    const chainHtml = chain.map((f, i) =>
      `<span class="pill">${f}</span>${i < chain.length - 1 ? '<span class="arrow">→</span>' : ''}`
    ).join('');

    // journey chart + log
    const path = game.pathLog;
    const maxD = Math.max(MAX_SAFE(game.maxDepth, 1), 1);
    const chartW = 56;
    const chartH = 220;
    let poly = '';
    path.forEach((p, i) => {
      const x = (p.x / 360) * (chartW - 8) + 4;
      const y = (p.depth / maxD) * (chartH - 8) + 4;
      poly += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
    });
    // numbered markers for transfers
    const transferEvents = game.events.filter(e => e.transfer);
    let markers = '';
    transferEvents.forEach((ev, i) => {
      const x = ((ev.x || 180) / 360) * (chartW - 8) + 4;
      const y = (ev.depth / maxD) * (chartH - 8) + 4;
      markers += `<circle cx="${x}" cy="${y}" r="6" fill="#212121"/><text x="${x}" y="${y + 3}" text-anchor="middle" fill="#fff" font-size="8">${i + 1}</text>`;
    });

    const logHtml = game.events.map(ev => {
      const d = Math.round(ev.depth).toLocaleString();
      const layer = layerName(ev.depth);
      const num = ev.index ? `<strong>${ev.index}.</strong> ` : '';
      const cls = ev.transfer ? 'log-item transfer' : 'log-item';
      return `<div class="${cls}"><div class="log-depth">${num}${layer} ${d} nm</div><div class="log-msg">${escapeHtml(ev.msg)}</div>${ev.equation ? `<div class="log-eq">${escapeHtml(ev.equation)}</div>` : ''}</div>`;
    }).join('') || '<div class="log-item">这一程几乎没有波折。</div>';

    this.els.result.innerHTML = `
      <div class="result-card">
        <div class="rarity-block">
          <div class="rarity-label">这一生的稀有度</div>
          <div class="rarity-title">${rarity.label}</div>
          <div class="rarity-stats">
            <div>成为此终态的概率 <b>${rarity.endPct}%</b></div>
            <div>走到如此波折的概率 <b>${turbPct}%</b></div>
            <div>合计 <b>${combinedLabel}</b></div>
          </div>
          <p class="rarity-note">概率为按「今日课程」模拟约 1 万次得到的玩法设定值（沿用原版口径）。地壳等环境中该形态氧约占 ${rarity.crustPct}%（粗估）。非官方中国统计。</p>
        </div>
        <div class="chain">${chainHtml}</div>
        <h3 class="journey-title">旅程记录</h3>
        <div class="journey">
          <svg class="journey-chart" viewBox="0 0 ${chartW} ${chartH}" width="${chartW}" height="${chartH}">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#bbdefb"/>
                <stop offset="45%" stop-color="#c8e6c9"/>
                <stop offset="100%" stop-color="#d7ccc8"/>
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="${chartW}" height="${chartH}" rx="6" fill="url(#g)"/>
            <path d="${poly}" fill="none" stroke="#e53935" stroke-width="1.5"/>
            ${markers}
          </svg>
          <div class="journey-log">${logHtml}</div>
        </div>
        <div class="result-stats">
          <div><span>旅程距离</span><b>${Math.round(game.distance).toLocaleString()} nm</b></div>
          <div><span>变身</span><b>${transferCount} 次</b></div>
          <div><span>复活</span><b>${game.revives} 次</b></div>
          <div><span>分数</span><b>${game.score.toLocaleString()}</b></div>
        </div>
        <div class="result-actions">
          <button id="btn-again" class="btn btn-red" type="button">再来一次</button>
          <button id="btn-copy" class="btn btn-outline" type="button">复制结果</button>
          <button id="btn-share" class="btn btn-outline" type="button">分享到 X</button>
        </div>
        <p class="credit">非官方学习改编 · 《氧气的一生》 · 据公开录屏观察重建</p>
      </div>
    `;
    this.els.result.classList.remove('hidden');
    this.els.result.setAttribute('aria-hidden', 'false');
    // rebind
    document.getElementById('btn-again').addEventListener('click', () => window.__game?.reset());
    document.getElementById('btn-copy').addEventListener('click', () => this.copyResult());
    document.getElementById('btn-share').addEventListener('click', () => this.shareX());

    this._lastShareText = this._buildShareText(game, rarity, turbPct, combinedLabel);
  }

  _buildShareText(game, rarity, turbPct, combinedLabel) {
    const form = FORMS[game.formId];
    const chain = game.transfers.map(id => (FORMS[id] || { formula: id }).formula).join(' → ');
    return `【氧气的一生】终态 ${form.formula}（${form.name}）\n分数 ${game.score}｜变身 ${game.transfers.length - 1} 次｜复活 ${game.revives} 次\n${rarity.label}｜终态 ${rarity.endPct}% · 波折 ${turbPct}% · 合计 ${combinedLabel}\n换乘：${chain}\n#氧气的一生`;
  }

  async copyResult() {
    const text = this._lastShareText || '';
    try {
      await navigator.clipboard.writeText(text);
      this.toast('已复制到剪贴板');
    } catch {
      this.toast('复制失败，请手动选择');
    }
  }

  async shareX() {
    const text = this._lastShareText || '';
    if (navigator.share) {
      try {
        await navigator.share({ text, title: '氧气的一生' });
        return;
      } catch (_) { /* fall through */ }
    }
    const url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener');
  }

  toast(msg) {
    const t = this.els.toast;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function MAX_SAFE(a, b) { return Math.max(a, b); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
