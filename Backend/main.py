from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from game import Game


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


class CreateGameRequest(BaseModel):
    mode: str = "pvp"
    bot_level: int | None = None


class MoveRequest(BaseModel):
    uci: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/games")
def create_game(payload: CreateGameRequest):
    mode = payload.mode.lower().strip()
    if mode not in {"pvp", "bot"}:
        raise HTTPException(status_code=400, detail="mode must be 'pvp' or 'bot'")

    game = Game(mode=mode, bot_level=payload.bot_level)
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

    if game.mode == "bot":
        raise HTTPException(status_code=501, detail="bot mode is not implemented yet")

    move_ok = game.make_move(payload.uci.strip().lower())
    if not move_ok:
        raise HTTPException(status_code=400, detail="illegal or invalid move")

    return {
        "game_id": game_id,
        "mode": game.mode,
        "bot_level": game.bot_level,
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
