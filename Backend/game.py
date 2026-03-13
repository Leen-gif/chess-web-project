from __future__ import annotations

import shutil

import chess
import chess.engine


BOT_LEVELS = {
    "easy": {
        "skill_level": 1,
        "limit": chess.engine.Limit(depth=4),
    },
    "medium": {
        "skill_level": 8,
        "limit": chess.engine.Limit(depth=10),
    },
    "hard": {
        "skill_level": 18,
        "limit": chess.engine.Limit(depth=16),
    },
}


class Game:

    def __init__(self, mode, bot_level=None):
        self.board = chess.Board()
        self.mode = mode  # Spielt man gegen einen Bot oder PVP
        self.bot_level = bot_level  # Welches von den 3 Level wurde gewaehlt

    def make_move(self, uci: str):
        try:
            move = chess.Move.from_uci(uci)  # UCI = Schachsprache
        except ValueError:
            return False

        # Pruefung ob der Move legal ist
        if move in self.board.legal_moves:
            self.board.push(move)
            return True
        return False

    def get_state(self):
        return {
            "fen": self.board.fen(),  # FEN = Darstellung einer Brettstellung
            "turn": "white" if self.board.turn == chess.WHITE else "black",
            "game_over": self.board.is_game_over(),
            "outcome": str(self.board.outcome()) if self.board.is_game_over() else None,
        }

    def reset(self):
        self.board = chess.Board()

    def bot_move(self, engine_path: str | None = None):
        if self.mode != "bot":
            return None

        if self.board.is_game_over():
            return None

        bot_profile = BOT_LEVELS.get(self.bot_level or "")
        if bot_profile is None:
            raise ValueError("invalid bot level")

        resolved_engine_path = engine_path or shutil.which("stockfish")
        if not resolved_engine_path:
            raise RuntimeError(
                "Stockfish engine not found. Set STOCKFISH_PATH or install stockfish in PATH."
            )

        with chess.engine.SimpleEngine.popen_uci(resolved_engine_path) as engine:
            engine.configure({"Skill Level": bot_profile["skill_level"]})
            result = engine.play(self.board, bot_profile["limit"])

        self.board.push(result.move)
        return result.move.uci()


# Main Game
if __name__ == "__main__":
    game = Game(mode="pvp")

    while not game.board.is_game_over():
        print(game.board)
        state = game.get_state()
        print(f"Turn: {state['turn'].capitalize()}")

        uci_input = input("What is your move (e.g. e2e4): ").strip()

        if game.make_move(uci_input):
            print("Move accepted!\n")
        else:
            print("Illegal move, try again.\n")

    print("Game over!")
    print("Outcome:", game.get_state()["outcome"])
