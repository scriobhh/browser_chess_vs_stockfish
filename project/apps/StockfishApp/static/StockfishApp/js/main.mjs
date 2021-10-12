import { createBoardState, Board } from './board.mjs';
import { addBoardListeners, getGameSettings } from './gui.mjs';
import { Game } from './gamestate.mjs';

let boardState = createBoardState();

let board = new Board(boardState['boardState'], boardState['pieces']);
let game = new Game(board);

// initialize GUI
addBoardListeners(game);

// GUI window for getting player settings
getGameSettings();
