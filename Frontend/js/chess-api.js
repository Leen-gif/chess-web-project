(function () {
  const API_BASE_KEY = "apiBaseUrl";
  const DEFAULT_REMOTE_BASE = "/api";
  const DEFAULT_LOCAL_BASE = "http://127.0.0.1:8000/api";

  function getStoredApiBaseUrl() {
    const value = window.localStorage.getItem(API_BASE_KEY) || "";
    return value.trim();
  }

  function setApiBaseUrl(url) {
    const value = (url || "").trim();
    if (!value) {
      window.localStorage.removeItem(API_BASE_KEY);
      return;
    }
    window.localStorage.setItem(API_BASE_KEY, value.replace(/\/+$/, ""));
  }

  function getApiBaseUrl() {
    const stored = getStoredApiBaseUrl();
    if (stored) return stored;

    const hostname = window.location.hostname;
    const port = window.location.port;
    const isLocalPreview =
      (hostname === "127.0.0.1" || hostname === "localhost") && port && port !== "8000";

    if (isLocalPreview) {
      return DEFAULT_LOCAL_BASE;
    }

    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      return DEFAULT_REMOTE_BASE;
    }

    return DEFAULT_LOCAL_BASE;
  }

  async function request(path, options) {
    const response = await fetch(getApiBaseUrl() + path, {
      headers: {
        "Content-Type": "application/json",
        ...(options && options.headers ? options.headers : {}),
      },
      ...options,
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok) {
      const message =
        payload && typeof payload.detail === "string"
          ? payload.detail
          : "API request failed";
      const apiError = new Error(message);
      apiError.status = response.status;
      apiError.payload = payload;
      throw apiError;
    }

    return payload;
  }

  window.ChessApi = {
    getApiBaseUrl,
    setApiBaseUrl,
    health() {
      return request("/health");
    },
    createGame(payload) {
      return request("/games", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    getGame(gameId) {
      return request("/games/" + encodeURIComponent(gameId));
    },
    move(gameId, uci) {
      return request("/games/" + encodeURIComponent(gameId) + "/move", {
        method: "POST",
        body: JSON.stringify({ uci }),
      });
    },
    resetGame(gameId) {
      return request("/games/" + encodeURIComponent(gameId) + "/reset", {
        method: "POST",
      });
    },
  };
})();
