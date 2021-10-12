import { Game, Move } from './gamestate.mjs';
import { Queen, Knight, Rook, Bishop } from './pieces.mjs';


const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const PIECE_CLASS_TO_LINK = {
    'Queen': 'queen',
    'Knight': 'knight',
    'Rook': 'rook',
    'Bishop': 'bishop',
};

const END_GAME_TEXT = {
    'checkmated': {
        'player': {'heading': 'Checkmate for stockfish', 'body': 'You lost!'},
        'stockfish': {'heading': 'Checkmate', 'body': 'You won!'},
    },
    'stalemated': {
        'player': {'heading': 'Stalemate', 'body': 'You have no valid moves'},
        'stockfish': {'heading': 'Stalemate', 'body': 'Stockfish has no valid moves'},
    }
};

let pieces = document.querySelectorAll('.piece');

let bottomLeftSquare = document.querySelector('#a1');
let squareWidth = bottomLeftSquare.clientWidth;
let squareHeight = bottomLeftSquare.clientHeight;

let dragged;
let initialSquare;
let prevSquare;
let prevSquareColor;
let offX;
let offY;

let GAME;

function addBoardListeners(game){

    GAME = game;

    pieces.forEach((piece, ind) => {
        // the drag and drop API has some problems for this use case so custom drag and drop handling is necessary

        // prevents default drag behaviour which would conflict with custom behaviour
        piece.addEventListener('ondragstart', (event) => {
            return false;
            // event.preventDefault();
        });

        piece.addEventListener('mousedown', (event) => {

            dragged = event.currentTarget;
            offX = event.offsetX;
            offY = event.offsetY;

            prevSquare = dragged.parentNode;
            prevSquareColor = prevSquare.style.backgroundColor;

            initialSquare = dragged.parentNode;

            dragged.setAttribute('style', 'cursor: grabbing;');

            document.addEventListener('mousemove', _drag);
            document.addEventListener('mouseup', _drop);

        });

    });

}

function _drag(event){

    let bLSquareRect = bottomLeftSquare.getBoundingClientRect();

    let bottomLeftX = bLSquareRect.left;
    let bottomLeftY = bLSquareRect.bottom;
    
    let squareColumn = Math.floor((event.clientX - bottomLeftX) / squareWidth);
    let squareRow = Math.floor((bottomLeftY - event.clientY) / squareHeight);

    ////////////////////////

    // checks that mouse is over the board while dragging piece
    if(squareColumn >= 0 && squareColumn <= 7
        && squareRow >= 0 && squareRow <= 7){
        
        // get current square under mouse
        let letter = LETTERS[squareColumn];
        let num = squareRow +1;
        let square = document.querySelector(`#${letter}${num}`);

        // sets prevSquare which is important for checking when the mouse has moved over a new square
        if(!prevSquare){
            prevSquare = square;
        }

        // checks if mouse has moved to a new square
        if(square !== prevSquare){
            prevSquare.setAttribute('style', `background-color: ${prevSquareColor};`);
            prevSquareColor = square.style.backgroundColor;

            prevSquare = square;
        }

        square.setAttribute('style', 'background-color: #3cc13c;');

    } 
    else if(prevSquare){ // mouse has left the board, unassign prevSquare
        prevSquare.setAttribute('style', `background-color: ${prevSquareColor};`);
        prevSquare = null;
        prevSquareColor = null;
    }

    ////////////////////////
    
    let posX = event.pageX - offX;
    let posY = event.pageY - offY;

    let widthInPixels = dragged.clientWidth;
    let heightInPixels = dragged.clientHeight;

    let position = `position: absolute; left: ${posX}px; top: ${posY}px; width: ${widthInPixels}px; height: ${heightInPixels}px; cursor: grabbing;`;

    dragged.setAttribute('style', position);
}

async function _drop(event){

    let moveStr = null,
        move = null;

    // no prev square means the piece was dropped while off the board
    if(prevSquare){
        moveStr = `${initialSquare.getAttribute('id')}${prevSquare.getAttribute('id')}`;
        move = GAME.convertMoveStrToMove(moveStr);

        // reset color of square under piece
        prevSquare.setAttribute('style', `background-color: ${prevSquareColor};`);
    }

    if(move && GAME.isValidMove(move)){

        initialSquare.removeChild(dragged);
        prevSquare.appendChild(dragged);

    }

    prevSquare = null;
    prevSquareColor = null;

    dragged.removeAttribute('style');  // sends the piece to its' position set by the html and css
    
    initialSquare = null;

    document.removeEventListener('mousemove', _drag);
    document.removeEventListener('mouseup', _drop);

    if(move && GAME.isValidMove(move)){

        // if promotion: put up promotion dialogue and add promotion to move object
        // then replace img element of promoted piece
        if(move.promotion){

            move.promotion = await getPromotionPiece(move);

            let color = dragged.getAttribute('class').split(' ')[1];

            let svgLink = `/static/StockfishApp/assets/pieces/${color}/${PIECE_CLASS_TO_LINK[ move.promotion.name ]}.svg`;
            dragged.setAttribute('src', svgLink);

        }

        if(move.castle){
            console.log('CASTLE MOVE');
            // get <img> at id move.castle['oldSquare']
            // remove it from id move.castle['oldSquare']
            // move it to id move.castle['newSquare']

            let castleOldSquare = document.querySelector(`#${ move.castle['oldSquare'] }`);
            let castleNewSquare = document.querySelector(`#${ move.castle['newSquare'] }`);
            let rookPiece = castleOldSquare.children[0];

            castleOldSquare.removeChild(rookPiece);
            castleNewSquare.appendChild(rookPiece);
        }


        if(move.captured){

            let capturedContainer = document.querySelector(`#captured-${move.captured.color}`);

            let capturedSquare = (move.captured.type === 'enpassant') 
                                ? document.querySelector(`#${move.captured.linkedPawn.position}`)
                                : document.querySelector(`#${move.captured.position}`);

            let piece = capturedSquare.children[0]

            capturedSquare.removeChild(piece);
            capturedContainer.appendChild(piece);

        }

        await GAME.update(move)

    }

    dragged = null;

}

async function getPromotionPiece(move){

    // put dialogue on screen and set pointer-events: none; for rest of page
    let dialogueIdString = `#piece-select-dialogue-${ move.pieceMoved.color }`;
    let buttonsContainerString = `${ dialogueIdString }>.buttons-container`;

    let dialogue = document.querySelector( dialogueIdString );
    let buttonArr = document.querySelectorAll(`${buttonsContainerString}>.piece-select`);
    let buttonIdToClassMap = {
        'queen-button': Queen,
        'knight-button': Knight,
        'rook-button': Rook,
        'bishop-button': Bishop
    };

    // make board unclickable while waiting for user to select piece from dialogue
    document.querySelector('#board-container').setAttribute('style', 'pointer-events: none;');
    dialogue.setAttribute('style', 'pointer-events: auto;');

    // wait for user to select piece
    function resolveOnClick(){}  // function declared here so that it's name can be used outside the scope of the listen promise

    let listen = new Promise((resolve, reject) => {

        resolveOnClick = function(event){
            let buttonId = event.currentTarget.getAttribute('class').split(' ')[1];
            resolve( buttonIdToClassMap[buttonId] );
        }

        buttonArr.forEach((button) => {
            button.addEventListener('click', resolveOnClick);
        });

    })

    let promotionClass = await listen;

    // take down dialogue and set pointer-event: auto; for rest of page
    buttonArr.forEach((button) => {
        button.removeEventListener('click', resolveOnClick);
    });

    document.querySelector('#board-container').setAttribute('style', 'pointer-events: auto;');
    dialogue.setAttribute('style', 'display: none;');

    return promotionClass;

}

// addBoardListener() must have already been run for this to work
async function getGameSettings(){
    let dialogue = document.querySelector('#select-options-dialogue');
    let colorButtons = document.querySelectorAll('.color-select>.dialogue-option');
    let difficultyButtons = document.querySelectorAll('.difficulty-select>.dialogue-option');
    let confirmButton = document.querySelector('#select-options-confirm');

    document.querySelector('#board-container').setAttribute('style', 'pointer-events: none;');
    // removes style="display: none;" from dialogue
    dialogue.removeAttribute('style');

    let difficulty,
        startingColor;

    let prevColorElement,
        prevDifficultyElement;


    function colorClick(event){
        let id = event.currentTarget.getAttribute('id');
        startingColor = idColorMap[ id ];

        if(prevColorElement)
            prevColorElement.removeAttribute('style');
        
        event.currentTarget.setAttribute('style', 'background-color: #dfdfdf;');
        prevColorElement = event.currentTarget;
    }

    function difficultyClick(event){
        difficulty = event.currentTarget.innerHTML;

        if(prevDifficultyElement)
            prevDifficultyElement.removeAttribute('style');
        
        event.currentTarget.setAttribute('style', 'background-color: #dfdfdf;');
        prevDifficultyElement = event.currentTarget;
    }


    let idColorMap = {
        'white-option': 'white',
        'black-option': 'black',
    };
    colorButtons.forEach((button) => {
        button.addEventListener('click', colorClick);
    });

    difficultyButtons.forEach((button) => {
        button.addEventListener('click', difficultyClick);
    });
    
    function confirmClick(event){}

    let settings = new Promise((resolve, reject) => {
        confirmClick = (event) => {
            
            GAME.setDifficulty(difficulty);
            GAME.setColorToMove(startingColor);
            GAME.setPlayerColor(startingColor);

            resolve();
        };

        confirmButton.addEventListener('click', confirmClick);
    });

    await settings;
    
    colorButtons.forEach((button) => {
        button.removeEventListener('click', colorClick);
    });

    difficultyButtons.forEach((button) => {
        button.removeEventListener('click', difficultyClick);
    });

    confirmButton.removeEventListener('click', confirmClick);

    dialogue.setAttribute('style', 'display: none;');
    document.querySelector('#board-container').removeAttribute('style');

}

// this is called by the gamestate (GAME) object's update function,
// this causes some game logic and the GUI to be interweaved which is probably a sign some refactoring is needed
// also this code is likely duplication of some of the drop event handling code
function movePiece(move){
    // get old square element
    const oldSquare = document.querySelector(`#${move.oldSquare}`);

    // get new square element
    const newSquare = document.querySelector(`#${move.newSquare}`);

    // move piece in old square to new square
    const piece = oldSquare.children[0];

    if(move.promotion){
        const color = move.pieceMoved.color;
        const svgLink = `/static/StockfishApp/assets/pieces/${color}/${PIECE_CLASS_TO_LINK[ move.promotion.name ]}.svg`;

        piece.setAttribute('src', svgLink);
    }

    // if capture, move piece in new square to document.querySelector('#captured-container');
    if(move.captured){
        let capturedPiece = newSquare.children[0];

        newSquare.removeChild(capturedPiece);
        document.querySelector(`#captured-${move.captured.color}`).appendChild(capturedPiece);
    }


    oldSquare.removeChild(piece);
    newSquare.appendChild(piece);

}

function endGame(endGameInfo){
    
    const endGameType = (endGameInfo.checkmate) ? 'checkmated' : 'stalemated';
    if(!endGameInfo[ endGameType ]) throw new Error('invalid input for endGame in gui.mjs');

    const text = END_GAME_TEXT[ endGameType ][ endGameInfo[endGameType] ];

    const dialogue = document.querySelector('#end-game-dialogue');

    const heading = document.querySelector('#end-game-dialogue>h1');
    const body = document.querySelector('#end-game-dialogue>p');

    heading.textContent = text['heading'];
    body.textContent = text['body'];

    dialogue.removeAttribute('style');

    document.querySelector('#board-container').setAttribute('style', 'pointer-events: none;');
    
}

function makeBoardUnclickable(){
    document.querySelector('#board-container').setAttribute('style', 'pointer-events: none;');
}

function makeBoardClickable(){
    document.querySelector('#board-container').removeAttribute('style');
}

export { addBoardListeners, getGameSettings, movePiece, endGame, makeBoardUnclickable, makeBoardClickable };
