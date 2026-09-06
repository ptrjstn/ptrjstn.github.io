(() => {
  const storageKey = "theme";
  const root = document.documentElement;
  const supportsMatchMedia = typeof window.matchMedia === "function";
  const colorSchemeMedia = supportsMatchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const systemDark = colorSchemeMedia && colorSchemeMedia.matches;
  const isWongdoody = window.location.pathname.includes("/wongdoody");

  const readStoredTheme = () => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored === "dark" || stored === "light" ? stored : null;
    } catch (error) {
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
    } catch (error) {
      // Ignore storage failures, the theme still applies for this session.
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
      const nextTheme = getCurrentTheme() === "dark" ? "light" : "dark";
      setTheme(nextTheme);
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

  if (colorSchemeMedia && colorSchemeMedia.addEventListener) {
    colorSchemeMedia.addEventListener("change", syncWithSystemTheme);
  } else if (colorSchemeMedia && colorSchemeMedia.addListener) {
    colorSchemeMedia.addListener("change", syncWithSystemTheme);
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

    // script.js used to build its own version of the word. Normalize the heading
    // first so there is only one layout/interaction system left on the page.
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
        font-family: "iA Writer Quattro", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
        font-weight: 700 !important;
        font-style: normal;
        line-height: .98;
        letter-spacing: -.045em;
        white-space: nowrap;
      }

      .thanks-glyph {
        position: relative;
        display: inline-grid;
        place-items: center;
        flex: 0 0 auto;
        min-width: 0;
        min-height: .94em;
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        font-family: inherit;
        font-size: inherit;
        font-weight: 700;
        font-style: normal;
        line-height: .98;
        letter-spacing: inherit;
        cursor: pointer;
        vertical-align: baseline;
        overflow: visible;
        -webkit-tap-highlight-color: transparent;
        transition: width 110ms ease;
      }

      .thanks-glyph__text {
        grid-area: 1 / 1;
        display: block;
        width: max-content;
        font: inherit;
        opacity: 1;
        transition: opacity 80ms ease;
      }

      .thanks-glyph__image {
        position: absolute;
        left: 50%;
        top: 50%;
        display: block;
        width: auto;
        height: .88em;
        max-width: none;
        max-height: none;
        opacity: 0;
        transform: translate(-50%, -50%);
        transform-origin: center center;
        object-fit: contain;
        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;
        transition: opacity 80ms ease;
      }

      .thanks-glyph--exclamation .thanks-glyph__image {
        height: .78em;
      }

      .thanks-glyph.is-preview .thanks-glyph__text,
      .thanks-glyph.is-pinned .thanks-glyph__text {
        opacity: 0;
      }

      .thanks-glyph.is-preview .thanks-glyph__image,
      .thanks-glyph.is-pinned .thanks-glyph__image {
        opacity: 1;
      }

      .thanks-glyph:focus-visible {
        outline: 1px dotted currentColor;
        outline-offset: .06em;
      }

      @media (prefers-reduced-motion: reduce) {
        .thanks-glyph,
        .thanks-glyph__text,
        .thanks-glyph__image {
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

    const word = "danke!";
    const fragment = document.createDocumentFragment();
    const glyphStates = [];

    [...word].forEach((character) => {
      const variantCount = getVariantCount(character);
      if (!variantCount) return;

      const button = document.createElement("button");
      const text = document.createElement("span");
      const image = document.createElement("img");
      let pinned = false;
      let previewing = false;
      let variant = 0;
      let loadToken = 0;
      let hoverSessionActive = false;
      let hoverResetTimer = 0;

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

      const textWidth = () => text.getBoundingClientRect().width || 0;
      const graphicWidth = () => image.getBoundingClientRect().width || textWidth();

      const syncWidth = () => {
        const showingGraphic = pinned || previewing;
        const width = showingGraphic ? graphicWidth() : textWidth();
        if (width > 0) button.style.width = `${width.toFixed(2)}px`;
      };

      const setVariant = (nextVariant, callback) => {
        variant = nextVariant;
        const token = ++loadToken;
        image.src = getGraphicSrc(character, variant);

        const done = () => {
          if (token !== loadToken) return;
          syncWidth();
          if (callback) callback();
        };

        if (image.complete && image.naturalWidth) {
          done();
        } else {
          image.addEventListener("load", done, { once: true });
          image.addEventListener("error", done, { once: true });
        }
      };

      const showPreview = (fresh) => {
        if (pinned) return;
        previewing = true;
        button.classList.add("is-preview");
        if (fresh || variant === 0) {
          setVariant(randomVariant(variantCount, variant));
        } else {
          syncWidth();
        }
      };

      const hidePreview = () => {
        if (pinned) return;
        previewing = false;
        button.classList.remove("is-preview");
        syncWidth();
      };

      const handlePointerEnter = () => {
        window.clearTimeout(hoverResetTimer);
        if (pinned) return;

        // Width changes can briefly fire pointerleave/pointerenter again. Keep the
        // same preview during that tiny layout bounce, but use a new random graphic
        // for every real hover session.
        const fresh = !hoverSessionActive;
        hoverSessionActive = true;
        showPreview(fresh);
      };

      const handlePointerLeave = () => {
        hidePreview();
        window.clearTimeout(hoverResetTimer);
        hoverResetTimer = window.setTimeout(() => {
          hoverSessionActive = false;
        }, 140);
      };

      const handleClick = () => {
        if (!pinned) {
          // First click pins exactly the graphic that is already visible.
          // Only generate one when there has not been a preview at all.
          if (variant === 0) {
            previewing = true;
            button.classList.add("is-preview");
            setVariant(randomVariant(variantCount, variant));
          }

          pinned = true;
          previewing = false;
          button.classList.remove("is-preview");
          button.classList.add("is-pinned");
          button.setAttribute("aria-pressed", "true");
          syncWidth();
          return;
        }

        // From the second click onward, cycle through variants.
        const next = (variant % variantCount) + 1;
        setVariant(next);
        syncWidth();
      };

      button.addEventListener("pointerenter", handlePointerEnter);
      button.addEventListener("pointerleave", handlePointerLeave);
      button.addEventListener("focus", () => {
        if (pinned || previewing) return;
        showPreview(variant === 0);
      });
      button.addEventListener("blur", () => {
        if (!hoverSessionActive) hidePreview();
      });
      button.addEventListener("click", handleClick);

      button.append(text, image);
      fragment.appendChild(button);
      glyphStates.push({ syncWidth });
    });

    heading.replaceChildren(fragment);

    const syncAllWidths = () => glyphStates.forEach(({ syncWidth }) => syncWidth());
    requestAnimationFrame(syncAllWidths);
    window.addEventListener("resize", syncAllWidths);
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