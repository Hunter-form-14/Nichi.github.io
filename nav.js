(() => {
  const bar = document.querySelector(".topbar");
  if (!bar) return;

  let lastY = window.scrollY || 0;
  let acc = 0;
  let raf = 0;

  function show() {
    bar.classList.remove("topbar--hidden");
  }

  function hide() {
    bar.classList.add("topbar--hidden");
  }

  function onScroll() {
    raf = 0;
    const y = window.scrollY || 0;
    const dy = y - lastY;
    lastY = y;

    if (Math.abs(dy) < 2) return;

    // Don’t hide at very top.
    if (y < 70) {
      acc = 0;
      show();
      return;
    }

    // Accumulate direction to avoid jitter.
    acc = clamp(acc + dy, -120, 120);

    if (acc > 26) hide();
    if (acc < -18) show();
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!raf) raf = window.requestAnimationFrame(onScroll);
    },
    { passive: true }
  );

  // Initial state.
  show();
})();

