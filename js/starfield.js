/* starfield.js — 은하수/별 배경 캔버스 애니메이션 (가볍게) */
(function () {
  "use strict";
  const canvas = document.getElementById("starfield");
  if (!canvas) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = canvas.getContext("2d");
  let w, h, dpr, stars, band, raf;

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";

    const count = Math.min(220, Math.floor((innerWidth * innerHeight) / 7000));
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: rand(0.4, 1.7) * dpr,
        a: rand(0.2, 0.9),
        tw: rand(0.004, 0.02),
        ph: Math.random() * Math.PI * 2,
        gold: Math.random() < 0.18,
      });
    }
    // 은하수 띠 (대각선 부드러운 구름)
    band = [];
    for (let i = 0; i < 60; i++) {
      const t = i / 60;
      band.push({
        x: t * w + rand(-40, 40) * dpr,
        y: h * (0.15 + t * 0.7) + rand(-60, 60) * dpr,
        r: rand(60, 150) * dpr,
        a: rand(0.015, 0.05),
      });
    }
  }

  function draw(time) {
    ctx.clearRect(0, 0, w, h);

    // 은하수 띠
    band.forEach((c) => {
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
      g.addColorStop(0, "rgba(150,170,255," + c.a + ")");
      g.addColorStop(1, "rgba(150,170,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 별
    stars.forEach((s) => {
      const a = reduce ? s.a : s.a * (0.55 + 0.45 * Math.sin(time * s.tw + s.ph));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.gold
        ? "rgba(255,209,102," + a + ")"
        : "rgba(230,238,255," + a + ")";
      ctx.fill();
    });

    if (!reduce) raf = requestAnimationFrame(draw);
  }

  function start() {
    build();
    cancelAnimationFrame(raf);
    if (reduce) draw(0);
    else raf = requestAnimationFrame(draw);
  }

  let to;
  addEventListener("resize", () => {
    clearTimeout(to);
    to = setTimeout(start, 150);
  });
  start();
})();
