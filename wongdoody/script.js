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

  const letterVariantCounts = {
    A: 55, B: 26, C: 28, D: 25, E: 32, F: 25, G: 31, H: 23, I: 23,
    J: 21, K: 22, L: 22, M: 28, N: 32, O: 26, P: 21, Q: 19, R: 33,
    S: 50, T: 25, U: 22, V: 20, W: 22, X: 18, Y: 24, Z: 21
  };

  const coverName = document.querySelector('[data-cover-name]');
  const coverTitle = document.querySelector('.cover-title');
  const coverWord = 'PETER';
  let coverResizeFrame;

  function randomVariant(letter, currentVariant = 0) {
    const count = letterVariantCounts[letter];
    let nextVariant = currentVariant;

    while (nextVariant === currentVariant) {
      nextVariant = Math.floor(Math.random() * count) + 1;
    }

    return nextVariant;
  }

  function setCoverLetterVariant(button, variant) {
    const letter = button.dataset.letter;
    const image = button.querySelector('img');
    const number = String(variant).padStart(2, '0');

    button.dataset.variant = String(variant);
    image.src = `../assets/letters/${letter}/${letter}_${number}.webp`;
  }

  function randomizeCoverLetterPosition(button) {
    const isMobile = window.matchMedia('(max-width: 700px)').matches;
    const y = Math.round((Math.random() - 0.5) * (isMobile ? 4 : 12));
    const tilt = (Math.random() - 0.5) * (isMobile ? 1.6 : 2.4);
    const scale = isMobile
      ? 0.97 + Math.random() * 0.04
      : 0.96 + Math.random() * 0.06;

    button.style.setProperty('--letter-x', '0px');
    button.style.setProperty('--letter-y', `${y}px`);
    button.style.setProperty('--letter-tilt', `${tilt}deg`);
    button.style.setProperty('--letter-scale', scale.toFixed(3));
  }

  function randomizeCoverStacking(buttons) {
    const shuffled = [...buttons];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    shuffled.forEach((button, index) => {
      button.style.setProperty('--letter-z', String(index + 1));
    });
  }

  function bringCoverLetterToFront(button, buttons) {
    const currentMaxZ = Math.max(
      ...buttons.map((item) => Number(item.style.getPropertyValue('--letter-z') || 0))
    );
    button.style.setProperty('--letter-z', String(currentMaxZ + 1));
  }

  function fitCoverName() {
    if (!coverName || !coverTitle) return;

    const images = [...coverName.querySelectorAll('.cover-letter img')];
    if (!images.length || images.some((image) => !image.naturalWidth || !image.naturalHeight)) return;

    const titleFontSize = parseFloat(getComputedStyle(coverTitle).fontSize) || 80;
    const gap = Math.max(1, titleFontSize * 0.012);
    const targetHeight = Math.min(70, Math.max(30, titleFontSize * 0.56));
    const aspectRatios = images.map((image) => image.naturalWidth / image.naturalHeight);
    const widths = aspectRatios.map((ratio) => targetHeight * ratio);

    images.forEach((image, index) => {
      const button = image.parentElement;
      const width = widths[index];
      button.style.width = `${width.toFixed(2)}px`;
      button.style.height = `${targetHeight.toFixed(2)}px`;
      image.style.width = `${width.toFixed(2)}px`;
      image.style.height = `${targetHeight.toFixed(2)}px`;
    });

    coverName.style.gridTemplateColumns = widths.map((width) => `${width.toFixed(2)}px`).join(' ');
    coverName.style.columnGap = `${gap.toFixed(2)}px`;
    coverName.style.width = `${(widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1)).toFixed(2)}px`;
  }

  function scheduleCoverFit() {
    window.cancelAnimationFrame(coverResizeFrame);
    coverResizeFrame = window.requestAnimationFrame(fitCoverName);
  }

  async function renderCoverName() {
    if (!coverName) return;

    coverName.classList.remove('is-ready');

    const fragment = document.createDocumentFragment();
    const imageReadyPromises = [];
    const buttons = [...coverWord].map((letter) => {
      const button = document.createElement('button');
      const image = document.createElement('img');

      button.className = 'cover-letter';
      button.type = 'button';
      button.dataset.letter = letter;
      button.setAttribute('aria-label', `Buchstabe ${letter} austauschen`);
      image.alt = '';
      image.draggable = false;
      image.addEventListener('load', scheduleCoverFit);

      imageReadyPromises.push(new Promise((resolve) => {
        let retries = 0;

        const done = () => {
          image.removeEventListener('error', retry);
          resolve();
        };

        const retry = () => {
          if (retries < 2) {
            retries += 1;
            setCoverLetterVariant(button, randomVariant(letter, Number(button.dataset.variant)));
          } else {
            done();
          }
        };

        image.addEventListener('load', done, { once: true });
        image.addEventListener('error', retry);
      }));

      button.appendChild(image);
      randomizeCoverLetterPosition(button);
      setCoverLetterVariant(button, randomVariant(letter));

      button.addEventListener('click', () => {
        const currentVariant = Number(button.dataset.variant);
        setCoverLetterVariant(button, randomVariant(letter, currentVariant));
        randomizeCoverLetterPosition(button);
        bringCoverLetterToFront(button, buttons);
      });

      fragment.appendChild(button);
      return button;
    });

    await Promise.all(imageReadyPromises);
    await Promise.all(
      buttons.map((button) => button.querySelector('img').decode().catch(() => {}))
    );

    coverName.replaceChildren(fragment);
    randomizeCoverStacking(buttons);
    fitCoverName();

    window.requestAnimationFrame(() => {
      coverName.classList.add('is-ready');
    });
  }

  window.addEventListener('resize', scheduleCoverFit);

  if (typeof ResizeObserver === 'function' && coverTitle) {
    const coverObserver = new ResizeObserver(scheduleCoverFit);
    coverObserver.observe(coverTitle);
  }

  renderCoverName();
  setCurrent(0);
})();
