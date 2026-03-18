// water.js — 水面上部を背景色Canvasで覆い、波形シェイプを表現
(() => {
  const section = document.querySelector('.water-section');
  if (!section) return;

  const oldCanvas = document.getElementById('waterCanvas');
  if (oldCanvas) oldCanvas.style.display = 'none';

  // セクション自体の背景を透明にし、要素の重なり順を独立させる
// セクション自体の背景を透明にし、要素の重なり順を独立させる
  section.style.clipPath = 'none';
  section.style.overflow = 'visible'; 
  section.style.background = 'transparent';
  section.style.boxShadow = 'none';
  section.style.isolation = 'isolate';

  const CANVAS_H = 120;       // 波が上に突き出る最大高さ(px)
  const CANVAS_BOTTOM = 100;  // キャンバスが下方向にカバーする高さ(px)
  const TOTAL_H = CANVAS_H + CANVAS_BOTTOM; 

  // ── 1. 下層の背景グラデーション（波より下の青い部分）を生成 ──
  // 波が凹んだときに直線の境界線が見えないよう、開始位置をCANVAS_BOTTOM分だけ下にズラします
  const bgDiv = document.createElement('div');
  bgDiv.style.cssText = `
    position: absolute;
    top: ${CANVAS_BOTTOM}px;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(180deg, #5bb6e6 0%, #1e6fa7 60%, #0e355a 100%);
    background-position: 0 -${CANVAS_BOTTOM}px;
    background-size: 100% calc(100% + ${CANVAS_BOTTOM}px);
    z-index: -1;
    pointer-events: none;
  `;
  section.style.position = 'relative';
  section.insertBefore(bgDiv, section.firstChild);

  // ── 2. 水面上に被せるCanvas（波を描画する部分） ──
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position: absolute;
    top: -${CANVAS_H}px; 
    left: 0;
    width: 100%;
    pointer-events: none;
    z-index: -1;
    display: block;
  `;
  section.insertBefore(canvas, section.firstChild);

  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W   = section.offsetWidth;
    canvas.width  = Math.floor(W * dpr);
    canvas.height = Math.floor(TOTAL_H * dpr);
    canvas.style.width  = W + 'px';
    canvas.style.height = TOTAL_H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ── バネ粒子（波の動き） ──────────────────────────────────
  const COLS     = 140;
  const SPRING_K = 0.032;
  const DAMPING  = 0.986;
  const SPREAD   = 0.16;

  const pos = new Float32Array(COLS + 1);
  const vel = new Float32Array(COLS + 1);

  function splat(xRatio, force) {
    const ci     = Math.round(xRatio * COLS);
    const radius = Math.round(COLS * 0.06);
    for (let i = -radius; i <= radius; i++) {
      const idx = ci + i;
      if (idx < 0 || idx > COLS) continue;
      vel[idx] -= force * Math.exp(-(i * i) / (radius * radius * 0.4));
    }
  }

  function simulate() {
    for (let i = 0; i <= COLS; i++) {
      vel[i] = vel[i] * DAMPING - SPRING_K * pos[i];
      pos[i] += vel[i];
    }
    for (let iter = 0; iter < 2; iter++) {
      const snap = pos.slice();
      for (let i = 1; i < COLS; i++) {
        vel[i] += SPREAD * (snap[i - 1] + snap[i + 1] - 2 * snap[i]);
      }
    }
    pos[0]    *= 0.4;
    pos[COLS] *= 0.4;
  }

  // ── マウス判定 ──────────────────────────────────────────
  let prevX = -1, prevY = -1, prevT = performance.now();

  document.addEventListener('mousemove', (e) => {
    const rect   = section.getBoundingClientRect();
    const localY = e.clientY - rect.top;
    
    const now   = performance.now();
    const dt    = Math.max(1, now - prevT);

    if (localY > -CANVAS_H && localY < CANVAS_BOTTOM) {
      if (prevX !== -1) {
        // スピードの算出
        const speed = Math.hypot(e.clientX - prevX, e.clientY - prevY) / dt * 16;
        if (speed > 1) {
          const force = Math.min(speed * 0.3, 3);
          splat((e.clientX - rect.left) / section.offsetWidth, force);
        }
      }
    }
    
    prevX = e.clientX;
    prevY = e.clientY;
    prevT = now;
  });

  // ── 描画 ───────────────────────────────────────────────
  function draw() {
    const W = section.offsetWidth;
    const H = section.offsetHeight;
    ctx.clearRect(0, 0, W, TOTAL_H);

    // 【重要】波本体を描画する（上の空間は何も描かないため完全な透明になる）
    ctx.beginPath();
    ctx.moveTo(0, TOTAL_H);
    for (let i = 0; i <= COLS; i++) {
      const x = (i / COLS) * W;
      const y = CANVAS_H + pos[i];
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, TOTAL_H);
    ctx.closePath();
    
    // .water-section と全く同じグラデーションを生成してシームレスに繋ぐ
    const grad = ctx.createLinearGradient(0, CANVAS_H, 0, CANVAS_H + H);
    grad.addColorStop(0, '#5bb6e6');
    grad.addColorStop(0.6, '#1e6fa7');
    grad.addColorStop(1, '#0e355a');
    ctx.fillStyle = grad; 
    ctx.fill();

    // 水面エッジ（光るライン）
    const maxDisp = Math.max(...Array.from(pos).map(v => Math.abs(v)));
    const glow    = Math.min(1, maxDisp / 30);

    ctx.beginPath();
    for (let i = 0; i <= COLS; i++) {
      const x = (i / COLS) * W;
      const y = CANVAS_H + pos[i];
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(${140 + glow * 60}, ${215 + glow * 25}, 255, ${0.55 + glow * 0.45})`;
    ctx.lineWidth   = 1.5 + glow * 2;
    ctx.shadowColor = '#7dd4f8';
    ctx.shadowBlur  = 6 + glow * 14;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // 飛沫パーティクル
    for (let i = 0; i <= COLS; i++) {
      const disp = -pos[i];
      if (disp > 12) { // 飛び散る敷居値を少し上げて細かい飛沫を抑制
        const x = (i / COLS) * W;
        const y = CANVAS_H + pos[i];
        const r = Math.min(disp * 0.09, 3.5);
        const a = Math.min(disp / 35, 0.75);
        ctx.beginPath();
        ctx.arc(x, y - disp * 0.25, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(190, 235, 255, ${a})`;
        ctx.fill();
      }
    }
  }

  // ── ループ ───────────────────────────────────────────────
  function frame() {
    simulate();
    draw();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();