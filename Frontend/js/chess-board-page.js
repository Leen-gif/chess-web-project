(function () {
  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const PIECE_NAMES = {
    p: "Pawn",
    n: "Knight",
    b: "Bishop",
    r: "Rook",
    q: "Queen",
    k: "King",
  };

  function squareName(fileIndex, rank) {
    return FILES[fileIndex] + String(rank);
  }

  function fenToPositionMap(fen) {
    const boardSection = (fen || "").split(" ")[0] || "";
    const rows = boardSection.split("/");
    const board = {};

    rows.forEach(function (row, rowIndex) {
      let fileIndex = 0;
      const rank = 8 - rowIndex;

      row.split("").forEach(function (char) {
        const emptyCount = Number(char);
        if (!Number.isNaN(emptyCount)) {
          fileIndex += emptyCount;
          return;
        }

        const color = char === char.toUpperCase() ? "w" : "b";
        board[squareName(fileIndex, rank)] = color + char.toLowerCase();
        fileIndex += 1;
      });
    });

    return board;
  }

  function pieceAlt(code, square) {
    const color = code[0] === "w" ? "White" : "Black";
    const piece = PIECE_NAMES[code[1]] || "Piece";
    return color + " " + piece + " " + square;
  }

  function createChessBoardPage(config) {
    const boardElement = document.getElementById(config.boardId);
    const overlay = document.getElementById(config.overlayId);
    const checkmateText = document.getElementById(config.checkmateTextId);
    const moveLog = document.getElementById(config.moveLogId);
    const statusEl = document.getElementById(config.statusId);
    const resetBtn = document.getElementById(config.resetBtnId);
    const sessionEl = document.getElementById(config.sessionIdElementId);
    const subtitleEl = config.subtitleId ? document.getElementById(config.subtitleId) : null;

    const captureSound = new Audio("Chess_sounds/capture.mp3");
    const queenCaptureSound = new Audio("Chess_sounds/queen_capture.mp3");
    captureSound.preload = "auto";
    queenCaptureSound.preload = "auto";

    const boardSquares = new Map();
    let selectedSquare = "";
    let draggedFrom = "";
    let currentPieces = {};
    let currentGameId = config.gameId || "";
    let moveCount = 0;

    function setStatus(text, tone) {
      statusEl.textContent = text;
      statusEl.style.color =
        tone === "danger" ? "var(--danger)" : tone === "success" ? "#7ad97a" : "var(--muted)";
    }

    function clearSelection() {
      if (selectedSquare && boardSquares.get(selectedSquare)) {
        boardSquares.get(selectedSquare).classList.remove("selected");
      }
      selectedSquare = "";
    }

    function selectSquare(square) {
      clearSelection();
      selectedSquare = square;
      const squareEl = boardSquares.get(square);
      if (squareEl) squareEl.classList.add("selected");
    }

    function getPieceOnSquare(square) {
      return currentPieces[square] || "";
    }

    function playCaptureSound(code) {
      const sound = code.endsWith("q") ? queenCaptureSound : captureSound;
      sound.cloneNode().play().catch(function () {});
    }

    function appendLog(text) {
      moveCount += 1;
      const item = document.createElement("li");
      item.textContent = moveCount + ". " + text;
      moveLog.appendChild(item);
      moveLog.scrollTop = moveLog.scrollHeight;
    }

    function resetLog() {
      moveCount = 0;
      moveLog.innerHTML = "";
    }

    function updateSessionLabel() {
      sessionEl.textContent = currentGameId ? "Session: " + currentGameId : "Session: nicht verbunden";
    }

    function renderBoardFromFen(fen) {
      currentPieces = fenToPositionMap(fen);
      boardSquares.forEach(function (squareEl, square) {
        squareEl.innerHTML = "";
        const code = currentPieces[square];
        if (!code) return;

        const piece = document.createElement("img");
        piece.className = "board-piece";
        piece.src = "chess_pieces/" + code + ".png";
        piece.alt = pieceAlt(code, square);
        piece.draggable = true;

        piece.addEventListener("click", function (event) {
          event.stopPropagation();
          handlePieceClick(square);
        });

        piece.addEventListener("dragstart", function (event) {
          draggedFrom = square;
          selectSquare(square);
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", square);
        });

        piece.addEventListener("dragend", function () {
          draggedFrom = "";
          clearSelection();
        });

        squareEl.appendChild(piece);
      });
    }

    function showOutcome(state) {
      if (!state.game_over) {
        overlay.classList.remove("show");
        return;
      }

      overlay.classList.add("show");
      checkmateText.textContent = state.outcome || "Spiel beendet";
      setStatus("Spiel beendet", "danger");
    }

    async function refreshGame() {
      if (!currentGameId) return;
      const state = await window.ChessApi.getGame(currentGameId);
      renderBoardFromFen(state.fen);
      updateSessionLabel();
      showOutcome(state);
      if (!state.game_over) {
        setStatus(state.turn === "white" ? "Weiss am Zug" : "Schwarz am Zug");
      }
    }

    async function handleMove(fromSquare, toSquare) {
      if (!currentGameId || !fromSquare || fromSquare === toSquare) {
        clearSelection();
        return;
      }

      try {
        setStatus("Sende Zug...");
        const captured = getPieceOnSquare(toSquare);
        const moveUci = fromSquare + toSquare;
        const state = await window.ChessApi.move(currentGameId, moveUci);

        if (captured) playCaptureSound(captured);
        appendLog(moveUci);
        if (state.bot_move) appendLog("Bot: " + state.bot_move);

        renderBoardFromFen(state.fen);
        showOutcome(state);
        if (!state.game_over) {
          setStatus(state.turn === "white" ? "Weiss am Zug" : "Schwarz am Zug", "success");
        }
      } catch (error) {
        setStatus(error.message || "Zug fehlgeschlagen", "danger");
      } finally {
        draggedFrom = "";
        clearSelection();
      }
    }

    function handlePieceClick(square) {
      const code = getPieceOnSquare(square);
      if (!code) {
        clearSelection();
        return;
      }

      if (selectedSquare && selectedSquare !== square) {
        handleMove(selectedSquare, square);
        return;
      }

      if (selectedSquare === square) {
        clearSelection();
        return;
      }

      selectSquare(square);
    }

    function handleSquareClick(square) {
      if (!selectedSquare) return;
      handleMove(selectedSquare, square);
    }

    function buildBoardShell() {
      boardElement.innerHTML = "";
      boardSquares.clear();

      for (let rank = 8; rank >= 1; rank -= 1) {
        for (let fileIndex = 0; fileIndex < 8; fileIndex += 1) {
          const square = document.createElement("div");
          const name = squareName(fileIndex, rank);
          const isDark = (rank + fileIndex) % 2 === 0;
          square.className = "board-square " + (isDark ? "dark" : "light");
          square.dataset.square = name;

          square.addEventListener("click", function () {
            handleSquareClick(name);
          });

          square.addEventListener("dragover", function (event) {
            event.preventDefault();
          });

          square.addEventListener("drop", function (event) {
            event.preventDefault();
            handleMove(draggedFrom, name);
          });

          boardSquares.set(name, square);
          boardElement.appendChild(square);
        }
      }
    }

    async function startGameSession() {
      try {
        setStatus("Verbinde API...");
        await window.ChessApi.health();

        if (!currentGameId) {
          const created = await window.ChessApi.createGame(config.createPayload());
          currentGameId = created.game_id;
          const nextUrl = window.ChessState.setQueryParams(
            window.location.pathname,
            config.buildQueryParams(created.game_id)
          );
          window.history.replaceState({}, "", nextUrl);
          resetLog();
        }

        if (subtitleEl && typeof config.getSubtitle === "function") {
          subtitleEl.textContent = config.getSubtitle();
        }

        await refreshGame();
      } catch (error) {
        updateSessionLabel();
        setStatus(error.message || "API nicht erreichbar", "danger");
      }
    }

    resetBtn.addEventListener("click", async function () {
      if (!currentGameId) {
        await startGameSession();
        return;
      }

      try {
        setStatus("Setze Partie zurueck...");
        const state = await window.ChessApi.resetGame(currentGameId);
        resetLog();
        renderBoardFromFen(state.fen);
        overlay.classList.remove("show");
        setStatus("Neue Partie gestartet", "success");
      } catch (error) {
        setStatus(error.message || "Reset fehlgeschlagen", "danger");
      }
    });

    buildBoardShell();
    updateSessionLabel();
    startGameSession();
  }

  window.createChessBoardPage = createChessBoardPage;
})();
