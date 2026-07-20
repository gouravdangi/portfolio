/* ── Multi-Armed Bandit — Nudge Timing Demo ──────────────────── */
/*
 * Simulates the production RLHF bandit from the resume project:
 *   - Hours 8 AM–11 PM are the "arms" of the bandit
 *   - Each pull returns a simulated 0/1 reward (click)
 *   - Epsilon-greedy policy (ε=0.15) balances exploration vs exploitation
 *   - CTR climbs from ~2.4% initial to ~7.4% as the best arm is discovered
 */

const HOURS       = ['8AM','9AM','10AM','11AM','12PM','1PM','2PM','3PM','4PM','5PM','6PM','7PM','8PM','9PM','10PM','11PM'];
const NUM_ARMS    = HOURS.length;
const EPSILON     = 0.15;
// Hidden true CTR per arm — one arm is significantly better (mimics the 7.4% winner)
const TRUE_CTR    = [0.024, 0.028, 0.031, 0.035, 0.038, 0.055, 0.074, 0.068, 0.052, 0.045, 0.040, 0.060, 0.048, 0.033, 0.025, 0.018];
const BEST_ARM    = TRUE_CTR.indexOf(Math.max(...TRUE_CTR)); // index 6 → 2PM

let pulls, rewards, banditCanvas, banditCtx;
let totalPulls = 0;
let totalRewards = 0;

function reset() {
  pulls   = new Array(NUM_ARMS).fill(0);
  rewards = new Array(NUM_ARMS).fill(0);
  totalPulls = 0;
  totalRewards = 0;
  updateCtrDisplay();
  drawChart();
  renderHourButtons();
  const optEl = document.getElementById('banditOptHour');
  if (optEl) optEl.textContent = '?';
}

function pull(arm) {
  const reward = Math.random() < TRUE_CTR[arm] ? 1 : 0;
  pulls[arm]++;
  rewards[arm] += reward;
  totalPulls++;
  totalRewards += reward;
  updateCtrDisplay();
  drawChart();
  renderHourButtons();

  // Reveal best hour once it's been pulled enough to be clearly leading
  const q = getQ();
  const bestFound = q.indexOf(Math.max(...q.map((v, i) => pulls[i] > 0 ? v : 0)));
    if (pulls[BEST_ARM] >= 3) {
    const optEl = document.getElementById('banditOptHour');
    if (optEl) optEl.textContent = HOURS[BEST_ARM]; // 2PM (index 6)
  }
}

function getQ() {
  return pulls.map((p, i) => p > 0 ? rewards[i] / p : 0);
}

function updateCtrDisplay() {
  const ctrEl = document.getElementById('banditCtr');
  if (!ctrEl) return;
  const ctr = totalPulls > 0 ? (totalRewards / totalPulls * 100).toFixed(1) : '2.4';
  ctrEl.textContent = `${ctr}%`;
}

function renderHourButtons() {
  const grid = document.getElementById('hourGrid');
  if (!grid) return;
  const q = getQ();
  const bestSoFar = q.indexOf(Math.max(...q.map((v, i) => pulls[i] > 0 ? v : -1)));

  grid.innerHTML = '';
  HOURS.forEach((h, i) => {
    const btn = document.createElement('button');
    btn.className = `hour-btn${i === bestSoFar && pulls[i] > 0 ? ' best' : ''}`;
    btn.textContent = h;
    btn.title = pulls[i] > 0 ? `${pulls[i]} pulls, CTR: ${(q[i]*100).toFixed(1)}%` : 'Not tried yet';
    btn.addEventListener('click', () => {
      // Epsilon-greedy: with prob ε explore random, else exploit best
      const action = Math.random() < EPSILON
        ? Math.floor(Math.random() * NUM_ARMS)
        : i;
      pull(action);
    });
    grid.appendChild(btn);
  });
}

/* ── Canvas bar chart ────────────────────────────────────────── */
function getCSSVar(v) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}

function drawChart() {
  if (!banditCanvas || !banditCtx) return;
  const W = banditCanvas.width;
  const H = banditCanvas.height;
  const accent     = getCSSVar('--accent');
  const accentSoft = getCSSVar('--accent-soft');
  const surface    = getCSSVar('--surface');
  const muted      = getCSSVar('--muted');
  const text       = getCSSVar('--text');
  const border     = getCSSVar('--border');

  banditCtx.clearRect(0, 0, W, H);

  const q = getQ();
  const maxQ = Math.max(...q, 0.08);
  const padL = 8; const padR = 8; const padT = 10; const padB = 28;
  const bw = (W - padL - padR) / NUM_ARMS;

  // Background
  banditCtx.fillStyle = surface;
  banditCtx.fillRect(0, 0, W, H);

  // Baseline
  banditCtx.strokeStyle = border;
  banditCtx.lineWidth = 1;
  banditCtx.beginPath();
  banditCtx.moveTo(padL, H - padB);
  banditCtx.lineTo(W - padR, H - padB);
  banditCtx.stroke();

  q.forEach((v, i) => {
    const bh = (v / maxQ) * (H - padT - padB);
    const bx = padL + i * bw + bw * 0.1;
    const bww = bw * 0.8;
    const by = H - padB - bh;

    // Bar
    const grad = banditCtx.createLinearGradient(0, by, 0, H - padB);
    grad.addColorStop(0, i === BEST_ARM ? accent : accentSoft);
    grad.addColorStop(1, i === BEST_ARM ? accentSoft : surface);
    banditCtx.fillStyle = grad;

    roundRectFill(banditCtx, bx, by, bww, bh, 3);

    // Pulls count above bar
    if (pulls[i] > 0) {
      banditCtx.fillStyle = text;
      banditCtx.font = `bold 9px Inter, sans-serif`;
      banditCtx.textAlign = 'center';
      banditCtx.fillText(pulls[i], bx + bww / 2, by - 2);
    }

    // Hour label below
    banditCtx.fillStyle = muted;
    banditCtx.font = `8px Inter, sans-serif`;
    banditCtx.textAlign = 'center';
    banditCtx.fillText(HOURS[i].replace('M',''), bx + bww / 2, H - padB + 14);
  });
}

function roundRectFill(c, x, y, w, h, r) {
  if (h <= 0) return;
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
  c.fill();
}

/* ── Init ────────────────────────────────────────────────────── */
function initBandit() {
  banditCanvas = document.getElementById('banditCanvas');
  if (!banditCanvas) return;
  banditCtx = banditCanvas.getContext('2d');

  // Resize canvas to match CSS dimensions
  const ro = new ResizeObserver(() => {
    banditCanvas.width  = banditCanvas.clientWidth;
    banditCanvas.height = banditCanvas.clientHeight;
    drawChart();
  });
  ro.observe(banditCanvas);
  banditCanvas.width  = banditCanvas.clientWidth  || 280;
  banditCanvas.height = banditCanvas.clientHeight || 200;

  document.getElementById('banditReset')?.addEventListener('click', reset);

  document.getElementById('banditAutorun')?.addEventListener('click', function() {
    var n = 0;
    function step() {
      if (n >= 200) return;
      var action = Math.random() < EPSILON
        ? Math.floor(Math.random() * NUM_ARMS)
        : (function() {
            var q = getQ();
            var best = 0;
            q.forEach(function(v, i) { if (v > q[best]) best = i; });
            return best;
          })();
      pull(action);
      n++;
      setTimeout(step, 18);
    }
    step();
  });

  reset();
}
