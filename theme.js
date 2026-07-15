(() => {
  const storageKey = "theme";
  const root = document.documentElement;
  const supportsMatchMedia = typeof window.matchMedia === "function";
  const colorSchemeMedia = supportsMatchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const systemDark = colorSchemeMedia && colorSchemeMedia.matches;

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
    toggleButton.textContent = theme === "dark" ? "☀" : "☾";
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
    colorSchemeMedia.addListener(syncWithSystemTheme);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountToggle, { once: true });
  } else {
    mountToggle();
  }
})();
