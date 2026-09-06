(() => {
  const storageKey = "theme";
  const root = document.documentElement;
  const supportsMatchMedia = typeof window.matchMedia === "function";
  const colorSchemeMedia = supportsMatchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
  const systemDark = Boolean(colorSchemeMedia?.matches);
  const isWongdoody = window.location.pathname.includes("/wongdoody");

  const readStoredTheme = () => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored === "dark" || stored === "light" ? stored : null;
    } catch {
      return null;
    }
  };

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  };

  const storedTheme = readStoredTheme();
  const initialTheme = storedTheme || (systemDark ? "dark" : "light");
  applyTheme(initialTheme);

  const getCurrentTheme = () => (root.dataset.theme === "dark" ? "dark" : "light");
  let toggleButton = null;

  const updateToggle = () => {
    if (!toggleButton) return;

    const theme = getCurrentTheme();

    if (isWongdoody) {
      const glyph = document.createElement("span");
      glyph.className = "control-emoji";
      glyph.textContent = theme === "dark" ? "☀️" : "🌙";
      toggleButton.replaceChildren(glyph);
    } else {
      toggleButton.textContent = theme === "dark" ? "☀" : "☾";
    }

    toggleButton.setAttribute("aria-pressed", String(theme === "dark"));
    toggleButton.setAttribute(
      "aria-label",
      theme === "dark" ? "Lightmode aktivieren" : "Darkmode aktivieren",
    );
    toggleButton.title = theme === "dark" ? "Lightmode aktivieren" : "Darkmode aktivieren";
  };

  const persistTheme = (theme) => {
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {
      // Theme still works for the current session.
    }
  };

  const setTheme = (theme) => {
    applyTheme(theme);
    persistTheme(theme);
    updateToggle();
  };

  const mountToggle = () => {
    if (toggleButton || !document.body) return;

    toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "theme-toggle";
    toggleButton.setAttribute("aria-pressed", String(initialTheme === "dark"));
    toggleButton.addEventListener("click", () => {
      setTheme(getCurrentTheme() === "dark" ? "light" : "dark");
    });

    const footer = document.querySelector(".foot, .site-footer");
    const wrap = document.querySelector(".wrap");
    (footer || wrap || document.body).append(toggleButton);
    updateToggle();
  };

  const syncWithSystemTheme = (event) => {
    if (readStoredTheme()) return;
    applyTheme(event.matches ? "dark" : "light");
    updateToggle();
  };

  if (colorSchemeMedia?.addEventListener) {
    colorSchemeMedia.addEventListener("change", syncWithSystemTheme);
  } else if (colorSchemeMedia?.addListener) {
    colorSchemeMedia.addListener(syncWithSystemTheme);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountToggle, { once: true });
  } else {
    mountToggle();
  }

  function initWongdoodyThanks() {
    if (!isWongdoody) return;

    const heading = document.querySelector(".sheet--thanks h2");
    if (!heading || heading.dataset.letterInteraction === "ready") return;

    heading.classList.remove("thanks-heading");
    heading.removeAttribute("style");
    heading.dataset.letterInteraction = "ready";
    heading.classList.add("thanks-word");
    heading.setAttribute("aria-label", "danke!");

    document.getElementById("thanks-letter-style")?.remove();

    const style = document.createElement("style");
    style.id = "thanks-letter-style";
    style.textContent = `
      @font-face {
        font-family: "iA Writer Quattro";
        src: url("https://raw.githubusercontent.com/iaolo/iA-Fonts/master/iA%20Writer%20Quattro/Webfonts/iAWriterQuattroS-Bold.woff2") format("woff2");
        font-weight: 700;
        font-style: normal;
        font-display: swap;
      }

      .sheet--thanks .thanks-word {
        display: inline-flex;
        align-items: baseline;
        justify-content: flex-start;
        gap: 0;
        margin: 0;
        font-family: "iA Writer Quattro", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
        font-weight: 700 !important;
        font-style: normal;
        line-height: .98;
        letter-spacing: 0;
        white-space: nowrap;
      }

      .sheet--thanks .thanks-glyph {
        appearance: none;
        position: relative;
        display: inline-grid;
        grid-template-areas: "glyph";
        place-items: center;
        flex: 0 0 auto;
        width: auto;
        min-width: 0;
        min-height: .94em;
        margin: 0 -.045em 0 0;
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        font-family: inherit;
        font-size: inherit;
        font-weight: 700 !important;
        font-style: normal;
        line-height: .98;
        letter-spacing: 0;
        cursor: pointer;
        vertical-align: baseline;
        overflow: visible;
        -webkit-tap-highlight-color: transparent;
      }

      .sheet--thanks .thanks-glyph:last-child {
        margin-right: 0;
      }

      .sheet--thanks .thanks-glyph__text,
      .sheet--thanks .thanks-glyph__image {
        grid-area: glyph;
        place-self: center;
      }

      .sheet--thanks .thanks-glyph__text {
        display: block;
        width: max-content;
        font: inherit;
        font-weight: 700 !important;
        color: var(--muted);
        opacity: .72;
        transition: opacity 70ms ease;
      }

      .sheet--thanks .thanks-glyph__image {
        display: block;
        width: auto;
        height: .88em;
        max-width: none;
        max-height: none;
        opacity: 0;
        visibility: hidden;
        object-fit: contain;
        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;
        transition: opacity 70ms ease;
      }

      .sheet--thanks .thanks-glyph--exclamation .thanks-glyph__image {
        height: .78em;
      }

      .sheet--thanks .thanks-glyph.is-preview .thanks-glyph__text,
      .sheet--thanks .thanks-glyph.is-pinned .thanks-glyph__text {
        opacity: 0;
      }

      .sheet--thanks .thanks-glyph.is-preview .thanks-glyph__image,
      .sheet--thanks .thanks-glyph.is-pinned .thanks-glyph__image {
        opacity: 1;
        visibility: visible;
      }

      .sheet--thanks .thanks-glyph:focus-visible {
        outline: 1px dotted currentColor;
        outline-offset: .06em;
      }

      @media (prefers-reduced-motion: reduce) {
        .sheet--thanks .thanks-glyph__text,
        .sheet--thanks .thanks-glyph__image {
          transition: none;
        }
      }
    `;
    document.head.appendChild(style);

    const letterVariantCounts = {
      A: 55, B: 26, C: 28, D: 25, E: 32, F: 25, G: 31, H: 23, I: 23,
      J: 21, K: 22, L: 22, M: 28, N: 32, O: 26, P: 21, Q: 19, R: 33,
      S: 50, T: 25, U: 22, V: 20, W: 22, X: 18, Y: 24, Z: 21,
    };
    const exclamationVariantCount = 8;

    const randomVariant = (count, current = 0) => {
      if (count <= 1) return 1;
      let next = current;
      while (next === current) {
        next = Math.floor(Math.random() * count) + 1;
      }
      return next;
    };

    const getVariantCount = (character) => (
      character === "!" ? exclamationVariantCount : letterVariantCounts[character.toUpperCase()]
    );

    const getGraphicSrc = (character, variant) => {
      const number = String(variant).padStart(2, "0");
      if (character === "!") {
        return `../assets/letters/EXCLAMATION/EXCLAMATION_${number}.webp`;
      }
      const upper = character.toUpperCase();
      return `../assets/letters/${upper}/${upper}_${number}.webp`;
    };

    const fragment = document.createDocumentFragment();

    [..."danke!"].forEach((character) => {
      const variantCount = getVariantCount(character);
      if (!variantCount) return;

      const button = document.createElement("button");
      const text = document.createElement("span");
      const image = document.createElement("img");

      let pinned = false;
      let hoverActive = false;
      let previewing = false;
      let pointerInside = false;
      let hasFocus = false;
      let variant = 0;
      let pendingVariant = 0;
      let requestToken = 0;
      let pinPending = false;
      let sessionMinWidth = 0;

      button.type = "button";
      button.className = "thanks-glyph";
      if (character === "!") button.classList.add("thanks-glyph--exclamation");
      button.setAttribute(
        "aria-label",
        character === "!" ? "Ausrufezeichen" : `Buchstabe ${character}`,
      );
      button.setAttribute("aria-pressed", "false");

      text.className = "thanks-glyph__text";
      text.textContent = character;
      text.setAttribute("aria-hidden", "true");

      image.className = "thanks-glyph__image";
      image.alt = "";
      image.draggable = false;

      const lockCurrentWidth = () => {
        const width = button.getBoundingClientRect().width;
        if (width > 0) {
          sessionMinWidth = Math.max(sessionMinWidth, width);
          button.style.minWidth = `${sessionMinWidth.toFixed(2)}px`;
        }
      };

      const clearPreview = () => {
        if (pinned) return;
        ++requestToken;
        pendingVariant = 0;
        pinPending = false;
        previewing = false;
        hoverActive = false;
        sessionMinWidth = 0;
        button.classList.remove("is-preview");
        image.removeAttribute("src");
        button.style.minWidth = "";
      };

      const waitForImage = (loader) => new Promise((resolve) => {
        if (loader.complete) {
          resolve();
          return;
        }
        const done = () => resolve();
        loader.addEventListener("load", done, { once: true });
        loader.addEventListener("error", done, { once: true });
      });

      const loadVariant = async (nextVariant, mode = "preview") => {
        const token = ++requestToken;
        pendingVariant = nextVariant;
        const src = getGraphicSrc(character, nextVariant);
        const loader = new Image();
        loader.decoding = "async";
        loader.src = src;

        try {
          if (typeof loader.decode === "function") {
            await loader.decode();
          } else {
            await waitForImage(loader);
          }
        } catch {
          await waitForImage(loader);
        }

        if (token !== requestToken || !loader.naturalWidth) {
          if (token === requestToken) pendingVariant = 0;
          return;
        }

        const shouldPin = mode === "pin" || pinPending;
        if (!shouldPin && !pointerInside && !hasFocus && !hoverActive) {
          pendingVariant = 0;
          return;
        }

        // Hold the old hitbox before the source swap. If the new graphic is narrower,
        // changing the intrinsic grid width cannot push the pointer out of the button.
        lockCurrentWidth();
        image.src = src;
        variant = nextVariant;
        pendingVariant = 0;

        if (shouldPin) {
          pinPending = false;
          pinned = true;
          previewing = false;
          hoverActive = false;
          button.classList.remove("is-preview");
          button.classList.add("is-pinned");
          button.setAttribute("aria-pressed", "true");
          // Pinned glyphs may use their natural layout width after the image is visible.
          requestAnimationFrame(() => {
            button.style.minWidth = "";
            sessionMinWidth = 0;
          });
        } else {
          previewing = true;
          button.classList.add("is-preview");
          requestAnimationFrame(lockCurrentWidth);
        }
      };

      const startFreshPreview = () => {
        if (pinned || hoverActive || previewing || pendingVariant) return;
        hoverActive = true;
        sessionMinWidth = 0;
        lockCurrentWidth();
        const next = randomVariant(variantCount, variant);
        loadVariant(next, "preview");
      };

      const pinCurrentOrPending = () => {
        if (pinned) return;

        if (previewing && variant) {
          pinned = true;
          previewing = false;
          hoverActive = false;
          button.classList.remove("is-preview");
          button.classList.add("is-pinned");
          button.setAttribute("aria-pressed", "true");
          button.style.minWidth = "";
          sessionMinWidth = 0;
          return;
        }

        if (pendingVariant) {
          pinPending = true;
          return;
        }

        pinPending = true;
        loadVariant(randomVariant(variantCount, variant), "pin");
      };

      const cyclePinned = () => {
        const next = (variant % variantCount) + 1;
        loadVariant(next, "pin");
      };

      button.addEventListener("pointerenter", () => {
        pointerInside = true;
        startFreshPreview();
      });

      button.addEventListener("pointerleave", () => {
        pointerInside = false;
        if (!hasFocus && !pinned) clearPreview();
      });

      button.addEventListener("focus", () => {
        hasFocus = true;
        if (!pointerInside) startFreshPreview();
      });

      button.addEventListener("blur", () => {
        hasFocus = false;
        if (!pointerInside && !pinned) clearPreview();
      });

      button.addEventListener("click", () => {
        if (!pinned) pinCurrentOrPending();
        else cyclePinned();
      });

      button.append(text, image);
      fragment.appendChild(button);
    });

    heading.replaceChildren(fragment);
  }

  if (isWongdoody) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initWongdoodyThanks, { once: true });
    } else {
      initWongdoodyThanks();
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    const link = target instanceof Element
      ? target.closest('a[href="https://hfki.org"]')
      : null;

    if (!link || typeof window.va !== "function") return;

    window.va("event", {
      name: "hfki",
      data: { destination: "hfki.org" },
    });
  });
})();
