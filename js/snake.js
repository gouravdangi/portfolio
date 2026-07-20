/* ── Snake: Human vs AI Race ─────────────────────────────────── */
/* Dual-board split-screen. Both boards share a seeded food       */
/* sequence. AI uses the trained DQN (Linear_QNet 11→256→3)      */
/* loaded from js/snake_weights.js at runtime.                    */
/* Collision rules: walls kill (matches the training environment).*/

var GRID = 20;
var CELL = 18;

/* Speed presets (ms per tick) */
var SPEEDS = { chill: 200, normal: 130, fast: 70 };
var currentSpeed = 'normal';

/* Per-board state */
var human = null;
var ai    = null;

/* Shared seeded food sequence */
var foodSeq = [];
var SEED = 42;

var loopTimer  = null;
var gameState  = 'idle'; /* idle | running | paused | over */

/* DOM refs set in init */
var humanCanvas, humanCtx;
var aiCanvas,    aiCtx;

/* ── Seeded PRNG (xorshift32) ────────────────────────────────── */
function seededRng(seed) {
  var s = seed;
  return function() {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function buildFoodSeq(len) {
  var rng = seededRng(SEED);
  var seq = [];
  for (var i = 0; i < len; i++) {
    seq.push({ x: Math.floor(rng() * GRID), y: Math.floor(rng() * GRID) });
  }
  return seq;
}

/* ── Board factory ───────────────────────────────────────────── */
function makeBoard(startX) {
  return {
    snake: [{ x: startX, y: 10 }, { x: startX - 1, y: 10 }, { x: startX - 2, y: 10 }],
    dir:     { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    score: 0,
    dead:  false,
    foodIdx: 0,
  };
}

function getFood(board) {
  var fi = board.foodIdx % foodSeq.length;
  var occupied = new Set(board.snake.map(function(s) { return s.x + ',' + s.y; }));
  var attempts = 0;
  while (occupied.has(foodSeq[fi].x + ',' + foodSeq[fi].y) && attempts < foodSeq.length) {
    fi = (fi + 1) % foodSeq.length;
    attempts++;
  }
  board.foodIdx = fi;
  return foodSeq[fi];
}

/* ── Collision (walls, no wrap) ──────────────────────────────── */
function isCollision(pt, snake) {
  if (pt.x < 0 || pt.x >= GRID || pt.y < 0 || pt.y >= GRID) return true;
  for (var i = 1; i < snake.length; i++) {
    if (snake[i].x === pt.x && snake[i].y === pt.y) return true;
  }
  return false;
}

/* ── DQN forward pass (11 → 256 → 3) ────────────────────────── */
function dqnForward(state11) {
  var W = (typeof SNAKE_DQN_WEIGHTS !== 'undefined') ? SNAKE_DQN_WEIGHTS : null;
  if (!W) return 0; /* fallback: straight */

  /* Layer 1: h = relu(W1·x + b1)  shape 256 */
  var h = new Array(256);
  for (var i = 0; i < 256; i++) {
    var sum = W.l1b[i];
    for (var j = 0; j < 11; j++) sum += W.l1w[i][j] * state11[j];
    h[i] = sum > 0 ? sum : 0; /* relu */
  }

  /* Layer 2: out = W2·h + b2  shape 3 */
  var out = new Array(3);
  for (var k = 0; k < 3; k++) {
    var s2 = W.l2b[k];
    for (var m = 0; m < 256; m++) s2 += W.l2w[k][m] * h[m];
    out[k] = s2;
  }

  /* argmax */
  var best = 0;
  if (out[1] > out[best]) best = 1;
  if (out[2] > out[best]) best = 2;
  return best;
}

/* ── DQN state: 11 features matching agent.py get_state ─────── */
/*  [danger_straight, danger_right, danger_left,               */
/*   dir_l, dir_r, dir_u, dir_d,                               */
/*   food_left, food_right, food_up, food_down]                */
function dqnState(board) {
  var head = board.snake[0];
  var d    = board.dir;

  /* direction flags (one-hot) */
  var dir_r = (d.x ===  1 && d.y === 0) ? 1 : 0;
  var dir_l = (d.x === -1 && d.y === 0) ? 1 : 0;
  var dir_u = (d.x ===  0 && d.y === -1) ? 1 : 0;
  var dir_d = (d.x ===  0 && d.y ===  1) ? 1 : 0;

  /* look-ahead points: straight / right-turn / left-turn */
  /* clockwise (right) rotation: (dx,dy) → (-dy,dx).  Counter-clockwise (left): (dy,-dx) */
  var straight = { x: head.x + d.x,     y: head.y + d.y    };
  var rightPt  = { x: head.x + (-d.y),  y: head.y + d.x    };  /* CW:  RIGHT→DOWN, UP→RIGHT … */
  var leftPt   = { x: head.x + d.y,     y: head.y + (-d.x) };  /* CCW: RIGHT→UP,   UP→LEFT … */

  var danger_s = isCollision(straight, board.snake) ? 1 : 0;
  var danger_r = isCollision(rightPt,  board.snake) ? 1 : 0;
  var danger_l = isCollision(leftPt,   board.snake) ? 1 : 0;

  /* food direction flags */
  var food = board.food;
  var food_left  = (food.x < head.x) ? 1 : 0;
  var food_right = (food.x > head.x) ? 1 : 0;
  var food_up    = (food.y < head.y) ? 1 : 0;
  var food_down  = (food.y > head.y) ? 1 : 0;

  return [
    danger_s, danger_r, danger_l,
    dir_l, dir_r, dir_u, dir_d,
    food_left, food_right, food_up, food_down
  ];
}

/* ── Convert DQN action index → absolute direction ──────────── */
/* action: 0=straight, 1=right-turn, 2=left-turn                 */
/* clockwise order: R(1,0) D(0,1) L(-1,0) U(0,-1)               */
var CW_DIRS = [
  { x: 1, y: 0 },  /* R */
  { x: 0, y: 1 },  /* D */
  { x:-1, y: 0 },  /* L */
  { x: 0, y:-1 },  /* U */
];

function dqnMove(board) {
  var d = board.dir;
  /* find current index in clockwise array */
  var idx = 0;
  for (var i = 0; i < CW_DIRS.length; i++) {
    if (CW_DIRS[i].x === d.x && CW_DIRS[i].y === d.y) { idx = i; break; }
  }

  var state  = dqnState(board);
  var action = dqnForward(state);

  var newIdx = idx;
  if (action === 1) newIdx = (idx + 1) % 4;  /* right-turn */
  if (action === 2) newIdx = (idx + 3) % 4;  /* left-turn */

  return CW_DIRS[newIdx];
}

/* ── BFS fallback (used only if weights are missing) ────────── */
function greedyMove(board) {
  var head  = board.snake[0];
  var food  = board.food;
  var dirs  = CW_DIRS;
  var body  = new Set(board.snake.slice(1).map(function(s) { return s.x + ',' + s.y; }));

  var queue   = [{ pos: head, path: [] }];
  var visited = new Set([head.x + ',' + head.y]);
  while (queue.length) {
    var cur  = queue.shift();
    var pos  = cur.pos;
    var path = cur.path;
    for (var di = 0; di < dirs.length; di++) {
      var d  = dirs[di];
      var nx = pos.x + d.x;
      var ny = pos.y + d.y;
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) continue;
      var k  = nx + ',' + ny;
      if (visited.has(k) || body.has(k)) continue;
      var np = path.concat([d]);
      if (nx === food.x && ny === food.y) return np[0] || board.dir;
      visited.add(k);
      queue.push({ pos: { x: nx, y: ny }, path: np });
    }
  }

  var best = null; var bestFill = -1;
  for (var i = 0; i < dirs.length; i++) {
    var dv = dirs[i];
    if (dv.x === -board.dir.x && dv.y === -board.dir.y) continue;
    var nx2 = head.x + dv.x;
    var ny2 = head.y + dv.y;
    if (nx2 < 0 || nx2 >= GRID || ny2 < 0 || ny2 >= GRID) continue;
    if (body.has(nx2 + ',' + ny2)) continue;
    var fill = floodFill(nx2, ny2, body);
    if (fill > bestFill) { bestFill = fill; best = dv; }
  }
  return best || board.dir;
}

function floodFill(sx, sy, body) {
  var q   = [{ x: sx, y: sy }];
  var vis = new Set([sx + ',' + sy]);
  while (q.length) {
    var cell = q.shift();
    var dirs = CW_DIRS;
    for (var i = 0; i < dirs.length; i++) {
      var nx = cell.x + dirs[i].x;
      var ny = cell.y + dirs[i].y;
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) continue;
      var k  = nx + ',' + ny;
      if (!vis.has(k) && !body.has(k)) { vis.add(k); q.push({ x: nx, y: ny }); }
    }
  }
  return vis.size;
}

/* ── Game lifecycle ──────────────────────────────────────────── */
function startGame() {
  foodSeq = buildFoodSeq(300);
  human = makeBoard(6);
  ai    = makeBoard(6);
  human.food = getFood(human);
  ai.food    = getFood(ai);
  gameState = 'running';
  hideResult();
  updateScores();
  loop();
}

function loop() {
  if (gameState !== 'running') return;
  tick(human, false);
  tick(ai,    true);
  drawBoard(humanCtx, human, false);
  drawBoard(aiCtx,    ai,    true);
  updateScores();
  if (human.dead && ai.dead) { endGame(); return; }
  loopTimer = setTimeout(loop, SPEEDS[currentSpeed]);
}

function tick(board, isAI) {
  if (board.dead) return;

  if (isAI) {
    /* Use DQN if weights loaded, BFS as fallback */
    board.nextDir = (typeof SNAKE_DQN_WEIGHTS !== 'undefined')
      ? dqnMove(board)
      : greedyMove(board);
  }

  board.dir = { x: board.nextDir.x, y: board.nextDir.y };
  var head = {
    x: board.snake[0].x + board.dir.x,
    y: board.snake[0].y + board.dir.y,
  };

  /* wall + self collision (no wrap) */
  if (isCollision(head, board.snake)) {
    board.dead = true;
    return;
  }

  board.snake.unshift(head);
  if (head.x === board.food.x && head.y === board.food.y) {
    board.score++;
    board.foodIdx = (board.foodIdx + 1) % foodSeq.length;
    board.food = getFood(board);
  } else {
    board.snake.pop();
  }
}

function endGame() {
  gameState = 'over';
  clearTimeout(loopTimer);
  var hs = parseInt(localStorage.getItem('snakeHS') || '0', 10);
  if (human.score > hs) localStorage.setItem('snakeHS', human.score);
  var winner;
  if (human.score > ai.score)       winner = 'You win!  ' + human.score + ' vs ' + ai.score;
  else if (ai.score > human.score)  winner = 'AI wins.  ' + ai.score + ' vs ' + human.score;
  else                               winner = 'Draw!  Both scored ' + human.score;
  showResult(winner);
}

/* ── Drawing ─────────────────────────────────────────────────── */
function css(v) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}

function drawBoard(ctx, board, isAI) {
  if (!ctx) return;
  var W       = ctx.canvas.width;
  var H       = ctx.canvas.height;
  var accent  = css('--accent');
  var soft    = css('--accent-soft');
  var surface = css('--surface');
  var border  = css('--border');

  /* Background */
  ctx.fillStyle = surface;
  ctx.fillRect(0, 0, W, H);

  /* Grid dots */
  ctx.fillStyle = border;
  for (var gx = 0; gx < GRID; gx++) {
    for (var gy = 0; gy < GRID; gy++) {
      ctx.fillRect(gx * CELL + CELL/2 - 1, gy * CELL + CELL/2 - 1, 2, 2);
    }
  }

  if (!board) {
    /* Idle overlay */
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = "bold 16px 'Sora',sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(isAI ? 'AI Ready' : 'Press Start', W/2, H/2);
    return;
  }

  /* Food */
  if (board.food) {
    ctx.beginPath();
    ctx.arc(board.food.x * CELL + CELL/2, board.food.y * CELL + CELL/2, CELL/2 - 2, 0, Math.PI*2);
    ctx.fillStyle = '#FF6B6B';
    ctx.fill();
  }

  /* Snake */
  board.snake.forEach(function(seg, i) {
    var alpha = i === 0 ? 1 : Math.max(0.3, 1 - i * 0.04);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = i === 0 ? accent : soft;
    if (board.dead) ctx.fillStyle = '#888';
    roundRect(ctx, seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, 4);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  /* Dead overlay */
  if (board.dead) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = "bold 18px 'Sora',sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', W/2, H/2 - 10);
    ctx.font = "14px 'Inter',sans-serif";
    ctx.fillText('Score: ' + board.score, W/2, H/2 + 12);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

/* ── Scores & result UI ──────────────────────────────────────── */
function updateScores() {
  var hs = document.getElementById('humanScore');
  var as = document.getElementById('aiScore');
  if (hs) hs.textContent = human ? human.score : 0;
  if (as) as.textContent = ai    ? ai.score    : 0;
}

function showResult(text) {
  var el = document.getElementById('snakeResult');
  if (!el) return;
  el.classList.add('show');
  var rt = el.querySelector('.result-text');
  if (rt) rt.textContent = text;
}

function hideResult() {
  var el = document.getElementById('snakeResult');
  if (el) el.classList.remove('show');
}

/* ── Resize canvases to match CSS ────────────────────────────── */
function resizeCanvas(c) {
  if (!c) return;
  var sz = c.clientWidth;
  if (sz < 1) return;
  c.width  = sz;
  c.height = sz;
  CELL = Math.floor(sz / GRID);
}

/* ── Init ────────────────────────────────────────────────────── */
function initSnake() {
  humanCanvas = document.getElementById('humanCanvas');
  aiCanvas    = document.getElementById('aiCanvas');
  if (!humanCanvas || !aiCanvas) return;

  humanCtx = humanCanvas.getContext('2d');
  aiCtx    = aiCanvas.getContext('2d');

  resizeCanvas(humanCanvas);
  resizeCanvas(aiCanvas);

  /* Draw idle state */
  drawBoard(humanCtx, null, false);
  drawBoard(aiCtx,    null, true);

  /* Controls */
  document.getElementById('snakeStart')
    ?.addEventListener('click', function() { clearTimeout(loopTimer); startGame(); });
  document.getElementById('snakeRestart')
    ?.addEventListener('click', function() { clearTimeout(loopTimer); startGame(); });

  var pauseBtn = document.getElementById('snakePause');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', function() {
      if (gameState === 'running') {
        gameState = 'paused'; clearTimeout(loopTimer);
        pauseBtn.textContent = '▶ Resume';
      } else if (gameState === 'paused') {
        gameState = 'running'; pauseBtn.textContent = '⏸ Pause'; loop();
      }
    });
  }

  /* Speed buttons */
  document.querySelectorAll('.speed-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      currentSpeed = btn.dataset.speed;
      document.querySelectorAll('.speed-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });

  /* Keyboard */
  document.addEventListener('keydown', function(e) {
    if (!human || human.dead) return;
    var map = {
      ArrowUp:    { x:0, y:-1 }, w: { x:0, y:-1 }, W: { x:0, y:-1 },
      ArrowDown:  { x:0, y:1  }, s: { x:0, y:1  }, S: { x:0, y:1  },
      ArrowLeft:  { x:-1, y:0 }, a: { x:-1, y:0 }, A: { x:-1, y:0 },
      ArrowRight: { x:1, y:0  }, d: { x:1, y:0  }, D: { x:1, y:0  },
    };
    if (map[e.key]) {
      e.preventDefault();
      var nd = map[e.key];
      /* block 180° reversal */
      if (nd.x !== -human.dir.x || nd.y !== -human.dir.y) human.nextDir = nd;
    }
  });

  /* D-pad */
  var dmap = { dUp: { x:0,y:-1 }, dDown: { x:0,y:1 }, dLeft: { x:-1,y:0 }, dRight: { x:1,y:0 } };
  Object.keys(dmap).forEach(function(id) {
    var btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', function() {
      if (!human || human.dead) return;
      var nd = dmap[id];
      if (nd.x !== -human.dir.x || nd.y !== -human.dir.y) human.nextDir = nd;
    });
  });

  /* Resize observer */
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function() {
      resizeCanvas(humanCanvas);
      resizeCanvas(aiCanvas);
      if (gameState === 'idle') {
        drawBoard(humanCtx, null, false);
        drawBoard(aiCtx,    null, true);
      }
    });
    ro.observe(humanCanvas);
  }
}
