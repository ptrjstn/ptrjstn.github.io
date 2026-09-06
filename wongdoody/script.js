(() => {
  const slides = [...document.querySelectorAll('.deck-stop')];
  const dots = [...document.querySelectorAll('[data-go]')];
  const currentLabel = document.querySelector('[data-current]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0;

  const format = (value) => String(value).padStart(2, '0');

  function setCurrent(index) {
    current = Math.max(0, Math.min(index, slides.length - 1));
    currentLabel.textContent = format(current + 1);

    dots.forEach((dot, dotIndex) => {
      if (dotIndex === current) {
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.removeAttribute('aria-current');
      }
    });
  }

  function go(index) {
    const target = Math.max(0, Math.min(index, slides.length - 1));
    slides[target].scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start'
    });
    setCurrent(target);
  }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => go(Number(dot.dataset.go)));
  });

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;
      setCurrent(slides.indexOf(visible.target));
    },
    { threshold: [0.5, 0.72, 0.9] }
  );

  slides.forEach((slide) => observer.observe(slide));

  window.addEventListener('keydown', (event) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(event.key) || event.key === ' ') {
      event.preventDefault();
      go(current + 1);
    }

    if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      go(current - 1);
    }

    if (event.key === 'Home') {
      event.preventDefault();
      go(0);
    }

    if (event.key === 'End') {
      event.preventDefault();
      go(slides.length - 1);
    }
  });

  setCurrent(0);
})();
