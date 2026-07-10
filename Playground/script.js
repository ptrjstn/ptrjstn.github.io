(() => {
  const body = document.body;
  if (!body) return;

  const canvas = document.createElement("canvas");
  canvas.className = "grain-layer";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "1";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.opacity = "0.14";
  canvas.style.mixBlendMode = "multiply";

  body.insertBefore(canvas, body.firstChild);

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const tileSize = 160;
  const tileCanvas = document.createElement("canvas");
  tileCanvas.width = tileSize;
  tileCanvas.height = tileSize;
  const tileCtx = tileCanvas.getContext("2d", { willReadFrequently: true });
  if (!tileCtx) return;

  const tileImage = tileCtx.createImageData(tileSize, tileSize);
  const data = tileImage.data;

  let frame = 0;
  let rafId = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let pattern = null;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.floor(window.innerWidth * dpr));
    height = Math.max(1, Math.floor(window.innerHeight * dpr));
    canvas.width = width;
    canvas.height = height;
    pattern = ctx.createPattern(tileCanvas, "repeat");
  };

  const generateTile = () => {
    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.floor(Math.random() * 255);
      const alpha = noise < 210 ? 0 : Math.floor((noise - 210) * 2.8);
      const value = 34 + Math.floor(Math.random() * 30);
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = alpha;
    }
    tileCtx.putImageData(tileImage, 0, 0);
    pattern = ctx.createPattern(tileCanvas, "repeat");
  };

  const draw = () => {
    frame += 1;
    if (frame % 3 === 0) {
      generateTile();
    }

    ctx.clearRect(0, 0, width, height);
    if (pattern) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = pattern;
      ctx.translate((frame % 12) * 1.2, (frame % 8) * 1.2);
      ctx.fillRect(-24, -24, width + 48, height + 48);
      ctx.restore();
    }

    rafId = window.requestAnimationFrame(draw);
  };

  const start = () => {
    resize();
    generateTile();
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = window.requestAnimationFrame(draw);
  };

  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
      return;
    }
    if (!rafId) {
      generateTile();
      rafId = window.requestAnimationFrame(draw);
    }
  });

  start();
})();
