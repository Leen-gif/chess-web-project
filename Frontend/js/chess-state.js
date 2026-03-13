(function () {
  const BOT_DIFFICULTY_KEY = "botDifficulty";

  function getDifficulty() {
    return (window.localStorage.getItem(BOT_DIFFICULTY_KEY) || "").trim().toLowerCase();
  }

  function setDifficulty(value) {
    window.localStorage.setItem(BOT_DIFFICULTY_KEY, value);
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function setQueryParams(path, params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        query.set(key, value);
      }
    });

    return path + (query.toString() ? "?" + query.toString() : "");
  }

  window.ChessState = {
    getDifficulty,
    setDifficulty,
    getQueryParam,
    setQueryParams,
  };
})();
