/* 全局鼠标粒子拖尾：光标划过沿轨迹洒下彩色光点，
   随移动方向拖出尾巴、缓缓淡出缩小消失。不挡点击，尊重 prefers-reduced-motion。 */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cv = document.createElement('canvas');
  cv.id = 'fx';
  Object.assign(cv.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '90'
  });
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    cv.width = innerWidth * dpr;
    cv.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener('resize', resize);

  // 多彩调色板（不只有橙色）
  const palette = ['#ff5a1f', '#ffb020', '#ff3d77', '#22b8a6', '#5b8cff', '#a06bff'];

  let parts = [];
  let last = { x: null, y: null };

  addEventListener('mousemove', function (e) {
    const x = e.clientX, y = e.clientY;
    if (last.x === null) { last = { x, y }; return; }
    const dx = x - last.x, dy = y - last.y;
    const dist = Math.hypot(dx, dy);
    // 沿移动路径插值生成，快速移动也能连成顺滑尾巴
    const steps = Math.min(22, Math.max(1, Math.floor(dist / 4)));
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      parts.push({
        x: last.x + dx * t,
        y: last.y + dy * t,
        vx: dx * 0.05 + (Math.random() - 0.5) * 0.5,
        vy: dy * 0.05 + (Math.random() - 0.5) * 0.5,
        life: 1,
        r: 1.6 + Math.random() * 2.6,
        color: palette[(Math.random() * palette.length) | 0]
      });
    }
    last = { x, y };
    if (parts.length > 420) parts.splice(0, parts.length - 420);
  }, { passive: true });

  (function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.93; p.vy *= 0.93;
      p.life -= 0.028;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(p.life, 0) * 0.9;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.35 + 0.65 * p.life), 0, Math.PI * 2); // 随寿命缩小
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  })();
})();
