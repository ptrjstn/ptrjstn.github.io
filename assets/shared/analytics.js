(function () {
  "use strict";

  var endpoint = "https://hfki.org/api/analytics/visit/";
  var storageKey = "ptrjstn-analytics-session";

  function sessionId() {
    try {
      var stored = window.sessionStorage.getItem(storageKey);
      if (stored) return stored;
      var created = window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
      window.sessionStorage.setItem(storageKey, created);
      return created;
    } catch (error) {
      return String(Date.now()) + "-" + Math.random().toString(36).slice(2);
    }
  }

  function browserName() {
    var userAgent = navigator.userAgent;
    if (/Edg\//.test(userAgent)) return "Edge";
    if (/OPR\//.test(userAgent)) return "Opera";
    if (/Chrome\//.test(userAgent)) return "Chrome";
    if (/Firefox\//.test(userAgent)) return "Firefox";
    if (/Safari\//.test(userAgent)) return "Safari";
    return "Unbekannt";
  }

  function referrer() {
    if (!document.referrer) return null;
    try {
      var url = new URL(document.referrer);
      return url.origin + url.pathname;
    } catch (error) {
      return null;
    }
  }

  function parameter(name) {
    return new URLSearchParams(window.location.search).get(name) || null;
  }

  function sendVisit() {
    var payload = {
      siteId: "ptrjstn",
      sessionId: sessionId(),
      path: window.location.pathname,
      referrer: referrer(),
      browser: browserName(),
      language: navigator.language || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      screen: window.screen.width + "x" + window.screen.height,
      viewport: window.innerWidth + "x" + window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
      utmSource: parameter("utm_source"),
      utmMedium: parameter("utm_medium"),
      utmCampaign: parameter("utm_campaign")
    };

    window.fetch(endpoint, {
      method: "POST",
      mode: "cors",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(function () {
      // Analytics must never affect the page itself.
    });
  }

  sendVisit();
  window.setInterval(sendVisit, 30000);
}());
