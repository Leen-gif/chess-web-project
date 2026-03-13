from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import get_stockfish_path
from game import BOT_LEVELS, Game


app = FastAPI(title="Chess API", version="1.0.0")

# Keeps dev simple while frontend/backend run on different ports.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GAMES: dict[str, Game] = {}
STOCKFISH_PATH = get_stockfish_path()


class CreateGameRequest(BaseModel):
    mode: str = "pvp"
    bot_level: str | None = None


class MoveRequest(BaseModel):
    uci: str


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "bot_levels": list(BOT_LEVELS.keys()),
        "stockfish_configured": bool(STOCKFISH_PATH),
    }


@app.post("/api/games")
def create_game(payload: CreateGameRequest):
    mode = payload.mode.lower().strip()
    if mode not in {"pvp", "bot"}:
        raise HTTPException(status_code=400, detail="mode must be 'pvp' or 'bot'")

    bot_level = payload.bot_level.lower().strip() if payload.bot_level else None
    if mode == "bot":
        if bot_level is None:
            raise HTTPException(
                status_code=400,
                detail="bot_level is required for bot mode: easy, medium or hard",
            )
        if bot_level not in BOT_LEVELS:
            raise HTTPException(
                status_code=400,
                detail="bot_level must be one of: easy, medium, hard",
            )
    else:
        bot_level = None

    game = Game(mode=mode, bot_level=bot_level)
    game_id = str(uuid4())
    GAMES[game_id] = game

    return {
        "game_id": game_id,
        "mode": game.mode,
        "bot_level": game.bot_level,
        **game.get_state(),
    }


@app.get("/api/games/{game_id}")
def get_game(game_id: str):
    game = GAMES.get(game_id)
    if game is None:
        raise HTTPException(status_code=404, detail="game not found")

    return {
        "game_id": game_id,
        "mode": game.mode,
        "bot_level": game.bot_level,
        **game.get_state(),
    }


@app.post("/api/games/{game_id}/move")
def make_move(game_id: str, payload: MoveRequest):
    game = GAMES.get(game_id)
    if game is None:
        raise HTTPException(status_code=404, detail="game not found")

    move_ok = game.make_move(payload.uci.strip().lower())
    if not move_ok:
        raise HTTPException(status_code=400, detail="illegal or invalid move")

    bot_move = None
    if game.mode == "bot" and not game.board.is_game_over():
        try:
            bot_move = game.bot_move(engine_path=STOCKFISH_PATH)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "game_id": game_id,
        "mode": game.mode,
        "bot_level": game.bot_level,
        "bot_move": bot_move,
        **game.get_state(),
    }


@app.post("/api/games/{game_id}/reset")
def reset_game(game_id: str):
    game = GAMES.get(game_id)
    if game is None:
        raise HTTPException(status_code=404, detail="game not found")

    game.reset()
    return {
        "game_id": game_id,
        "mode": game.mode,
        "bot_level": game.bot_level,
        **game.get_state(),
    }
