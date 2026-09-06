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

  function renderCommunitySlide() {
    const stage = document.querySelector('#aufgabe-02 .community-stage');
    if (!stage) return;

    const oldStyle = document.querySelector('#community-v3-style');
    if (oldStyle) oldStyle.remove();

    const style = document.createElement('style');
    style.id = 'community-v3-style';
    style.textContent = `
      .community-stage--v3 {
        position: relative;
        flex: 1;
        min-height: 0;
        margin-top: clamp(12px, 1.6vw, 24px);
        overflow: hidden;
        isolation: isolate;
      }

      .community-stage--v3::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(to right, rgba(23,23,23,.055) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(23,23,23,.055) 1px, transparent 1px);
        background-size: 34px 34px;
        opacity: .55;
        pointer-events: none;
      }

      :root[data-theme="dark"] .community-stage--v3::before {
        background-image:
          linear-gradient(to right, rgba(242,233,220,.055) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(242,233,220,.055) 1px, transparent 1px);
      }

      .community-v3-asset {
        position: absolute;
        z-index: var(--asset-z, 3);
        transform: translate3d(var(--drag-x, 0px), var(--drag-y, 0px), 0);
        cursor: grab;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        transition: box-shadow 140ms ease, filter 140ms ease;
      }

      .community-v3-asset:hover {
        filter: brightness(1.015);
      }

      .community-v3-asset.is-dragging {
        cursor: grabbing;
        filter: none;
      }

      .community-v3-thesis {
        left: 0;
        top: 3%;
        width: 43%;
        padding: clamp(16px, 2vw, 30px);
        background: var(--wd-blue);
        color: #fff;
        box-shadow: 0 22px 48px rgba(47,85,255,.23);
      }

      .community-v3-thesis > span {
        display: block;
        margin-bottom: .85em;
        font-size: clamp(7px, .58vw, 10px);
        line-height: 1;
        letter-spacing: .09em;
        text-transform: uppercase;
        opacity: .75;
      }

      .community-v3-thesis strong,
      .community-v3-thesis em {
        display: block;
        font-weight: 400;
        font-style: normal;
      }

      .community-v3-thesis strong {
        max-width: 9.5em;
        font-size: clamp(24px, 3.5vw, 56px);
        line-height: .93;
        letter-spacing: -.058em;
      }

      .community-v3-thesis em {
        margin-top: .9em;
        font-size: clamp(9px, .82vw, 13px);
        line-height: 1.32;
        opacity: .9;
      }

      .community-v3-word {
        left: 2%;
        bottom: -3%;
        z-index: 1;
        color: var(--ink);
        font-size: clamp(78px, 12vw, 190px);
        line-height: .76;
        letter-spacing: -.09em;
        opacity: .12;
        white-space: nowrap;
      }

      .community-v3-number {
        right: 3%;
        top: 3%;
        width: 22%;
        min-height: 31%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: clamp(12px, 1.35vw, 20px);
        border: 1px solid var(--ink);
        background: var(--surface-strong);
        color: var(--ink);
        box-shadow: 0 14px 32px rgba(23,23,23,.10);
        backdrop-filter: blur(9px);
        -webkit-backdrop-filter: blur(9px);
      }

      .community-v3-number b {
        margin: 0;
        font-size: clamp(52px, 7.8vw, 122px);
        line-height: .72;
        letter-spacing: -.08em;
        font-weight: 400;
      }

      .community-v3-number p {
        margin: 0;
        max-width: 13em;
        font-size: clamp(8px, .72vw, 12px);
        line-height: 1.25;
      }

      .community-v3-flow {
        right: 27%;
        top: 10%;
        width: 25%;
        padding: clamp(9px, 1vw, 15px);
        display: grid;
        grid-template-columns: auto auto auto;
        align-items: center;
        gap: .4em;
        background: #171717;
        color: #f5efe4;
        box-shadow: 0 12px 30px rgba(23,23,23,.18);
        font-size: clamp(12px, 1.2vw, 19px);
        letter-spacing: -.04em;
      }

      .community-v3-flow strong {
        font-weight: 400;
        opacity: .55;
      }

      .community-v3-flow small {
        grid-column: 1 / -1;
        font-size: clamp(6px, .52vw, 9px);
        line-height: 1;
        letter-spacing: .06em;
        text-transform: uppercase;
        opacity: .58;
      }

      .community-v3-signal {
        width: 16.5%;
        min-height: 19%;
        padding: clamp(9px, 1.1vw, 16px);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        border: 1px solid rgba(23,23,23,.16);
        background: var(--surface-strong);
        box-shadow: 0 12px 28px rgba(23,23,23,.09);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }

      :root[data-theme="dark"] .community-v3-signal {
        border-color: rgba(242,233,220,.16);
      }

      .community-v3-signal > span {
        display: block;
        font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
        font-size: clamp(24px, 3.2vw, 48px);
        line-height: 1;
      }

      .community-v3-signal p {
        margin: 0;
        font-size: clamp(8px, .72vw, 12px);
        line-height: 1.22;
        letter-spacing: -.02em;
      }

      .community-v3-signal--a { left: 43%; top: 33%; }
      .community-v3-signal--b { left: 60.5%; top: 33%; }
      .community-v3-signal--c { right: 3%; top: 37%; }

      .community-v3-card {
        padding: clamp(10px, 1.15vw, 17px);
        border: 1px solid rgba(23,23,23,.15);
        background: var(--surface-strong);
        color: var(--ink);
        box-shadow: 0 12px 30px rgba(23,23,23,.09);
        backdrop-filter: blur(9px);
        -webkit-backdrop-filter: blur(9px);
      }

      :root[data-theme="dark"] .community-v3-card {
        border-color: rgba(242,233,220,.16);
      }

      .community-v3-card span {
        display: block;
        margin-bottom: .65em;
        font-size: clamp(6px, .5vw, 8px);
        line-height: 1;
        letter-spacing: .08em;
        text-transform: uppercase;
        opacity: .58;
      }

      .community-v3-card p {
        margin: 0;
        font-size: clamp(9px, .82vw, 13px);
        line-height: 1.28;
        letter-spacing: -.024em;
      }

      .community-v3-card--dark {
        background: #171717;
        color: #f5efe4;
        border-color: #171717;
      }

      .community-v3-card--blue {
        background: var(--wd-blue);
        color: #fff;
        border-color: var(--wd-blue);
      }

      .community-v3-card--1 { left: 0; top: 45%; width: 27%; }
      .community-v3-card--2 { left: 22%; top: 58%; width: 26%; }
      .community-v3-card--3 { left: 49%; bottom: 3%; width: 24%; }
      .community-v3-card--4 { right: 2%; bottom: 4%; width: 25%; }
      .community-v3-card--5 { left: 2%; bottom: 4%; width: 24%; }

      .community-v3-verb-strip {
        left: 29%;
        bottom: 3%;
        padding: .7em .9em;
        background: #d7ff27;
        color: #111;
        box-shadow: 0 10px 24px rgba(23,23,23,.10);
        font-size: clamp(8px, .7vw, 11px);
        line-height: 1;
        letter-spacing: -.02em;
        white-space: nowrap;
      }

      .community-v3-visible {
        right: 29%;
        bottom: 20%;
        color: var(--wd-blue);
        font-size: clamp(20px, 3vw, 46px);
        line-height: 1;
        letter-spacing: -.06em;
        white-space: nowrap;
      }

      .community-v3-hint {
        position: absolute;
        right: 0;
        bottom: 0;
        z-index: 30;
        margin: 0;
        color: var(--muted);
        font-size: clamp(6px, .48vw, 8px);
        line-height: 1;
        letter-spacing: .06em;
        text-transform: uppercase;
        pointer-events: none;
      }

      @media (max-width: 700px) {
        .community-v3-thesis {
          width: 43%;
          padding: 9px;
        }

        .community-v3-thesis > span {
          font-size: 5px;
          margin-bottom: .5em;
        }

        .community-v3-thesis strong {
          font-size: clamp(14px, 4vw, 24px);
        }

        .community-v3-thesis em {
          font-size: 5.5px;
          margin-top: .55em;
        }

        .community-v3-number {
          padding: 7px;
        }

        .community-v3-number b {
          font-size: clamp(31px, 8vw, 56px);
        }

        .community-v3-number p,
        .community-v3-signal p,
        .community-v3-card p {
          font-size: clamp(5.5px, 1.55vw, 8px);
        }

        .community-v3-signal,
        .community-v3-card {
          padding: 6px;
        }

        .community-v3-signal > span {
          font-size: clamp(15px, 3.5vw, 24px);
        }

        .community-v3-card span {
          font-size: 4.5px;
        }

        .community-v3-flow {
          padding: 6px;
          font-size: clamp(7px, 2vw, 11px);
        }

        .community-v3-flow small,
        .community-v3-hint {
          font-size: 4px;
        }

        .community-v3-verb-strip {
          font-size: 5px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .community-v3-asset {
          transition: none;
        }
      }
    `;
    document.head.appendChild(style);

    stage.className = 'community-stage community-stage--v3';
    stage.innerHTML = `
      <div class="community-v3-thesis community-v3-asset" data-draggable data-drag-id="thesis">
        <span>Arbeitshypothese</span>
        <strong>Community ist wahrscheinlich schon da.</strong>
        <em>Die Aufgabe ist, sie sichtbar zu machen.</em>
      </div>

      <div class="community-v3-word community-v3-asset" data-draggable data-drag-id="wir" aria-hidden="true">WIR</div>

      <div class="community-v3-number community-v3-asset" data-draggable data-drag-id="three">
        <b>3</b>
        <p>Signale, dass aus Publikum Community wird</p>
      </div>

      <div class="community-v3-flow community-v3-asset" data-draggable data-drag-id="flow">
        <span>1 → n</span><strong>→</strong><span>n ↔ n</span>
        <small>vom Publikum zum Netzwerk</small>
      </div>

      <div class="community-v3-signal community-v3-signal--a community-v3-asset" data-draggable data-drag-id="signal-talk">
        <span>💬</span>
        <p>Menschen antworten nicht nur dm, sondern auch einander.</p>
      </div>

      <div class="community-v3-signal community-v3-signal--b community-v3-asset" data-draggable data-drag-id="signal-return">
        <span>🔁</span>
        <p>Dieselben Menschen und Themen tauchen wieder auf.</p>
      </div>

      <div class="community-v3-signal community-v3-signal--c community-v3-asset" data-draggable data-drag-id="signal-codes">
        <span>🧩</span>
        <p>Eigene Codes, Routinen und Running Gags werden erkennbar.</p>
      </div>

      <div class="community-v3-card community-v3-card--1 community-v3-card--dark community-v3-asset" data-draggable data-drag-id="statement-1">
        <span>Statement</span>
        <p>Follower sind Reichweite. Community ist Beziehung.</p>
      </div>

      <div class="community-v3-card community-v3-card--2 community-v3-asset" data-draggable data-drag-id="statement-2">
        <span>Beobachtung</span>
        <p>Kommentare sind ein Signal – besonders dann, wenn Menschen einander antworten.</p>
      </div>

      <div class="community-v3-card community-v3-card--3 community-v3-card--blue community-v3-asset" data-draggable data-drag-id="statement-3">
        <span>Wiederkehr</span>
        <p>Wiederkehr macht aus einzelnen Reaktionen einen sozialen Zusammenhang.</p>
      </div>

      <div class="community-v3-card community-v3-card--4 community-v3-asset" data-draggable data-drag-id="statement-4">
        <span>Sichtbarkeit</span>
        <p>Gemeinsame Routinen und Codes sind oft schon da – aber im Feed kaum als Ganzes sichtbar.</p>
      </div>

      <div class="community-v3-card community-v3-card--5 community-v3-asset" data-draggable data-drag-id="statement-5">
        <span>Rolle dm</span>
        <p>dm muss nicht Mittelpunkt sein. Die Marke kann vorhandene Dynamik sammeln, spiegeln und verstärken.</p>
      </div>

      <div class="community-v3-visible community-v3-asset" data-draggable data-drag-id="visible" aria-hidden="true">SICHTBAR</div>
      <div class="community-v3-verb-strip community-v3-asset" data-draggable data-drag-id="verbs">finden → spiegeln → verbinden → verstärken</div>
      <p class="community-v3-hint">Assets verschiebbar · Doppelklick = Reset</p>
    `;

    initCommunityDragging(stage);
  }

  function initCommunityDragging(stage) {
    const assets = [...stage.querySelectorAll('[data-draggable]')];
    const storageKey = 'wongdoody-community-layout-v1';
    let saved = {};
    let zCounter = 40;

    try {
      saved = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
    } catch (error) {
      saved = {};
    }

    const persist = () => {
      const layout = {};
      assets.forEach((asset) => {
        layout[asset.dataset.dragId] = {
          x: Number(asset.dataset.dragX || 0),
          y: Number(asset.dataset.dragY || 0),
          z: Number(asset.style.getPropertyValue('--asset-z') || 3)
        };
      });

      try {
        window.localStorage.setItem(storageKey, JSON.stringify(layout));
      } catch (error) {
        // Ignore storage failures; dragging still works for the current view.
      }
    };

    assets.forEach((asset) => {
      const restored = saved[asset.dataset.dragId];
      const restoredX = Number(restored?.x || 0);
      const restoredY = Number(restored?.y || 0);
      const restoredZ = Number(restored?.z || 3);

      asset.dataset.dragX = String(restoredX);
      asset.dataset.dragY = String(restoredY);
      asset.style.setProperty('--drag-x', `${restoredX}px`);
      asset.style.setProperty('--drag-y', `${restoredY}px`);
      asset.style.setProperty('--asset-z', String(restoredZ));
      zCounter = Math.max(zCounter, restoredZ + 1);

      asset.addEventListener('pointerdown', (event) => {
        if (event.button !== undefined && event.button !== 0) return;

        event.preventDefault();
        asset.setPointerCapture?.(event.pointerId);
        asset.classList.add('is-dragging');
        asset.style.setProperty('--asset-z', String(zCounter));
        zCounter += 1;

        const stageRect = stage.getBoundingClientRect();
        const assetRect = asset.getBoundingClientRect();
        const startPointerX = event.clientX;
        const startPointerY = event.clientY;
        const startX = Number(asset.dataset.dragX || 0);
        const startY = Number(asset.dataset.dragY || 0);

        const minDeltaX = stageRect.left - assetRect.left;
        const maxDeltaX = stageRect.right - assetRect.right;
        const minDeltaY = stageRect.top - assetRect.top;
        const maxDeltaY = stageRect.bottom - assetRect.bottom;

        const move = (moveEvent) => {
          const rawDeltaX = moveEvent.clientX - startPointerX;
          const rawDeltaY = moveEvent.clientY - startPointerY;
          const deltaX = Math.max(minDeltaX, Math.min(maxDeltaX, rawDeltaX));
          const deltaY = Math.max(minDeltaY, Math.min(maxDeltaY, rawDeltaY));
          const nextX = startX + deltaX;
          const nextY = startY + deltaY;

          asset.dataset.dragX = String(nextX);
          asset.dataset.dragY = String(nextY);
          asset.style.setProperty('--drag-x', `${nextX}px`);
          asset.style.setProperty('--drag-y', `${nextY}px`);
        };

        const end = () => {
          asset.classList.remove('is-dragging');
          asset.removeEventListener('pointermove', move);
          asset.removeEventListener('pointerup', end);
          asset.removeEventListener('pointercancel', end);
          persist();
        };

        asset.addEventListener('pointermove', move);
        asset.addEventListener('pointerup', end);
        asset.addEventListener('pointercancel', end);
      });

      asset.addEventListener('dblclick', () => {
        asset.dataset.dragX = '0';
        asset.dataset.dragY = '0';
        asset.style.setProperty('--drag-x', '0px');
        asset.style.setProperty('--drag-y', '0px');
        persist();
      });
    });
  }

  window.addEventListener('resize', scheduleCoverFit);

  if (typeof ResizeObserver === 'function' && coverTitle) {
    const coverObserver = new ResizeObserver(scheduleCoverFit);
    coverObserver.observe(coverTitle);
  }

  renderCommunitySlide();
  renderCoverName();
  setCurrent(0);
})();
