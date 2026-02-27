import { ChessConsole, LocalPlayer, RandomPlayer } from '.node_modules/chess-console/src/chess-console.js';

const context = document.getElementById('chess-console');
const player = { type: LocalPlayer, name: 'Player 1', props: {} };
const opponent = { type: RandomPlayer, name: 'Player 2', props: {} };

const chessConsole = new ChessConsole(context, player, opponent, {
    locale: 'en',
    playerColor: 'w',
    pgn: undefined,
    accessible: false
});