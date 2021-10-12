import { Pawn, Rook, Bishop, Knight, Queen, King, EnPassant, SightLinePiece } from './pieces.mjs';
import { Move } from './gamestate.mjs';

let REVERSE_COLOR = {
    'black': 'white',
    'white': 'black',
};


class Board{

    constructor(boardState, pieces){
        this._pieces = pieces;
        this._boardState = boardState;

        this._kings = {
            'black': this.getPiece('e8'),
            'white': this.getPiece('e1'),
        };

        this._attackingMoves = {
            'black': new Set(),
            'white': new Set(),
        };

        this._validMoves = {
            'black': new Set(),
            'white': new Set(),
        };
        
        this._checkingPieces = {
            'black': [],
            'white': [],
        };

        this._sightLinePieces = [];

        // initialize all pieces and populate _sightLinePieces from _pieces
        Object.values(this._pieces).forEach((pieceArray) => {
            pieceArray.forEach(piece => {
                piece.updatePiece(this._boardState);

                if(piece instanceof SightLinePiece) this._sightLinePieces.push(piece);
            });
        });
    }

    isValidMove(move){
        let piece = move.pieceMoved;
        return piece.isValidMove(move);
    }

    // accepts Move object or move in the form 'e2e4'
    update(move){
        if(!this.isValidMove(move)){
            throw new Error('invalid move');
        }

        // if a piece is captured: removes piece from relevant class variables and moves it into this._boardstate.captured
        this._handlePieceCapture(move);


        // updates _boardstate by moving moved piece
        this._movePiece(move);

        // move rook into new square if it was a castling move
        this._movePieceCastle(move)

        // update position of piece that was moved (this is necessary for updating piece validmoves/attackingmoves/sightlines)
        move.pieceMoved.updatePosition(move);
        // updates rook position too if it was a castling move
        if(move.castle && move.castle['piece']){
            move.castle['piece'].updatePosition(move);
        }


        // check for enPassant's and remove them (new enpassants are added after this loop, so enpassants only last for a single move)
        this._removeEnpassantPieces();

        // check for en passant and piece promotion if piece is a pawn
        this._pawnUpdates(move);


        // UPDATING BOARD STATE
        //   all pieces update their validmoves/attackingmoves/sightlines and this._attackingmoves is populated
        //   kings validmoves and check status are updated (dependency on the above)
        //   look for game ending conditions (dependency on above)

        this._updateAttackingMoves();

        // remove non-valid moves from pinned pieces
        this._updatePinnedPieces();

        // do check updates on kings (update isCheck and remove any moves that would self-checkmate)
        this._updateKingsCheckStatus();

        // if king is in check, remove all moves that would not prevent the check, then check for checkmate
        this._updateCheckMate();

        // stalemate is checked next, but since it requires knowledge of who's turn it is, it is handled by the game object

    }

    _handlePieceCapture(move){
        if(move.captured){
            // making the captured piece return its' own reference in an array allows enPassant pieces to return their pawn so both can be removed
            let capturedArray = move.captured.getCaptured();

            // set each captured piece (and enpassant piece) to -1 in boardstate, and update this._pieces and this._boarstate['captured']
            capturedArray.forEach(capturedPiece => {
                let letter = capturedPiece.position[0],
                    num = parseInt(capturedPiece.position[1]);
                
                this._boardState[letter][num -1] = -1;
                capturedPiece.capture();

                if( !(capturedPiece instanceof EnPassant) ){
                    this._boardState['captured'].push(capturedPiece);
                    removeValueFromArray(this._pieces[capturedPiece.color], capturedPiece);

                    if(capturedPiece instanceof SightLinePiece) removeValueFromArray(this._sightLinePieces, capturedPiece);
                }
            });
        }
    }

    _movePiece(move){
        // clear previous square
        let letter = move.oldSquare[0],
            row = move.oldSquare[1];
        this._boardState[letter][row -1] = -1;

        // move piece to new square
        letter = move.newSquare[0];
        row = move.newSquare[1];
        this._boardState[letter][row -1] = move.pieceMoved;
    }

    _movePieceCastle(move){
        if(move.castle && move.castle['piece']){
            let letter = move.castle['oldSquare'][0],
                row = parseInt(move.castle['oldSquare'][1]);
            this._boardState[letter][row -1] = -1;

            letter = move.castle['newSquare'][0];
            row = parseInt(move.castle['newSquare'][1]);
            this._boardState[letter][row -1] = move.castle['piece'];
        }
    }

    _removeEnpassantPieces(){
        // checks row 3 and row 6 since they are the only rows which can contain enpassant
        ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].forEach(letter => {
            [3, 6].forEach(num => {
                const piece = this._boardState[letter][num -1];

                if(piece instanceof EnPassant){
                    this._boardState[letter][num -1] = -1;
                }
            });
        });
    }

    _pawnUpdates(move){
        if(move.pieceMoved.type === 'pawn'){
            // handle enpassant moves
            const enPassant = move.enPassant;

            if(enPassant){
                const letter = enPassant.position[0],
                    num = parseInt(enPassant.position[1]);
                this._boardState[letter][num -1] = enPassant;
            }

            // handle promotion moves
            const promotionClass = move.promotion;

            if(promotionClass){
                const letter = move.newSquare[0],
                    num = parseInt(move.newSquare[1]);
                const position = `${letter}${num}`;
                const color = move.pieceMoved.color;

                // add new piece to board (replacing old piece)
                const newPiece = new promotionClass(position, color);
                this._boardState[letter][num -1] = newPiece
                
                // remove old piece from this._pieces and this._sightLinePieces
                removeValueFromArray(this._pieces[color], move.pieceMoved);
                if(move.pieceMoved instanceof SightLinePiece) removeValueFromArray(this._sightLinePieces, move.pieceMoved);

                // add new piece to this._pieces and this._sightLinePieces;
                this._pieces[color].push(newPiece);
                if(newPiece instanceof SightLinePiece) this._sightLinePieces.push(newPiece);
            }
        }
    }

    _updateAttackingMoves(){

        this._attackingMoves['black'].clear();
        this._attackingMoves['white'].clear();
        this._validMoves['black'].clear();
        this._validMoves['white'].clear();

        this._checkingPieces['black'] = [];
        this._checkingPieces['white'] = [];


        Object.entries(this._pieces).forEach(([color, pieceArray], _) => {

            const enemyKing = this._kings[ REVERSE_COLOR[color] ];

            pieceArray.forEach((piece) => {

                if(piece.isCaptured) throw new Error('captured piece is still in this._pieces');

                // update this._attackingmoves
                const pieceAttackingMoves = piece.updatePiece(this._boardState, null, enemyKing);
                setConcatInPlace(this._attackingMoves[color], pieceAttackingMoves);

                // update this._validmoves
                setConcatInPlace(this._validMoves[color], piece.getValidMoves());
                
                // update array of pieces which are currently checking a king
                if(piece.isChecking) this._checkingPieces[color].push(piece);

            });

        });

    }

    _updatePinnedPieces(){
        this._sightLinePieces.forEach(SLPiece => {
            // piece has no sightline that has a king on it
            if(!SLPiece.getCheckLine()) return;

            // get count of pieces on the checkline and store the pinned piece on the checkline (pinnedPiece is irrelevant if there are more than one pinned pieces)
            let count = 0;
            let pinnedPiece = null;

            // note that the set of sightline squares does not include the square that the sightline piece is on
            SLPiece.getCheckLine().forEach(square => {
                let piece = this.getPiece(square);
                
                if(piece !== -1
                && !(piece instanceof King && piece.color !== SLPiece.color)){
                    count++;
                    pinnedPiece = (piece.color !== SLPiece.color) ? piece : null;
                }
            });

            // check if piece is pinned -> call .makePinned() on it 
            // note that this doesn't need to check if the pinned piece is not the same color as the pinning piece because that is already determined on assignment of pinnedPiece
            if(count === 1
            && pinnedPiece){
                let safeMoves = new Set(SLPiece.getCheckLine());
                safeMoves.add(SLPiece.position);
                pinnedPiece.makePinned(safeMoves);
            }
        });
    }

    _updateKingsCheckStatus(){
        Object.entries(this._kings).forEach(([color, king], _) => {
            const attackingMoves = this._attackingMoves[ REVERSE_COLOR[color] ];

            // this is a workaround for the fact that the attackingmoves for sightlinepieces doesn't include all the squares that come after a king but are still on the sightline (which creates a bug where the king can move away from the checking piece onto a square that still causes a check)
            let checkSquareSet = new Set(attackingMoves);
            Object.entries(this._checkingPieces).forEach(([color, pieceArr]) => {
                pieceArr.forEach(piece => {
                    if(piece instanceof SightLinePiece && piece.getCheckLine())
                        checkSquareSet = setConcat(checkSquareSet, piece.getCheckLine());
                });
            });

            king.updateWithCheckMoves(checkSquareSet);

            // updateCastleMoves should not need the extra checking squares from checkSquareSet
            king.updateCastleMoves(this._boardState, attackingMoves);
        });
    }

    _updateCheckMate(){
        Object.entries(this._kings).forEach(([color, king], _) => {
            if(!king.isCheck) return;

            // loop through checking pieces adding safe moves which is used to update same color as king pieces
                // count number of checking pieces (to be used in checkmate calculation)
                // if SLP
                    // safemoves are: block checkLine or capture piece
                // else (non-SLP) (note: enemy king can't get close enough to check)
                    // safemoves are: capture piece
            // loop through non-kings of same color and call removeValidMoves(safeMoves)

            let safeMoves = new Set();  // moves that could stop the check (these are not necesserily valid moves)
            let checkingPieceCount = 0;

            this._checkingPieces[ REVERSE_COLOR[color] ].forEach(enemyPiece => {

                checkingPieceCount++;

                if(enemyPiece instanceof SightLinePiece && enemyPiece.getCheckBlockingSquares()){
                    //enemyPiece.getCheckBlockingSquares().forEach(square => { safeMoves.add(square); });
                    safeMoves = setConcat(safeMoves, enemyPiece.getCheckBlockingSquares());
                }

                safeMoves.add( enemyPiece.position );
                
            });
            
            let validAntiCheckMoves = [];

            this._pieces[color].forEach(piece => {
                if(piece instanceof King)
                    return;

                let pieceValidMoves = piece.updateWithSafeMoves(safeMoves);

                if(pieceValidMoves.size > 0)  // prevents empty sets from being added and counted in checkmate conditions
                    validAntiCheckMoves.push(pieceValidMoves);

            });

            // checkmate conditions:
            //   king can't move and there is at least one checking piece and there are no anti-checking moves
            //   or king can't move and there are multiple checking pieces
            // stalemate conditions:
            //   a side doesn't have any valid moves, but their king isn't in check
            // NOTE: when debugging, the gamestate is updated before the GUI on stockfish moves, so executing may get here without the GUI showing the actual game state yet
            if(king.getValidMoves().size === 0 && 
            ((checkingPieceCount > 0 && validAntiCheckMoves.length === 0) || (checkingPieceCount > 1))){
                king.isCheckMate = true;

                console.warn(`CHECKMATE, ${king.color} LOSES`);
                //endGame( {'didPlayerWin': true} );

            }

        });
    }

    getValidMoves(){
        return this._validMoves;
    }

    // TODO: update getPiece and getPieceType to be faster (add a this._pieces dict that maps piece class to the piece instances in board state, initialize this in createBoardState)
    // takes position string e.g. 'e2'
    getPiece(pos){
        let letter = pos[0];
        let num = parseInt(pos[1]);

        return this._boardState[letter][num -1];
    }

    getPieceType(type){

        let pieces = [];
        // TODO: replace this with looping through this._pieces
        Object.values(this._boardState).forEach((row, _) => {

            row.forEach((piece, _) => {
                if(piece === -1) { return; }

                if(piece instanceof type){
                    pieces.push(piece);
                }

            });

        });

        return pieces;

    }

    // returns new board state that swaps out columns with rows
    getRotatedBoardState(){
        let rotated = [[],[],[],[],[],[],[],[]];

        let columns = Object.values(this._boardState).slice(0, 8);

        columns.forEach((column) => {

            column.forEach((piece, rowInd) => {
                rotated[rowInd].push(piece);
            });

        });

        rotated.reverse();
        return rotated;
    }

    getKings(){
        return this._kings;
    }

}


function createBoardState(){
    // -1 represents an empty square
    // allows square lookups of the form 'boardState['e'][4 -1]' for position 'e4'
    let boardState = {
        'a': [-1, -1, -1, -1, -1, -1, -1, -1],
        'b': [-1, -1, -1, -1, -1, -1, -1, -1],
        'c': [-1, -1, -1, -1, -1, -1, -1, -1],
        'd': [-1, -1, -1, -1, -1, -1, -1, -1],
        'e': [-1, -1, -1, -1, -1, -1, -1, -1],
        'f': [-1, -1, -1, -1, -1, -1, -1, -1],
        'g': [-1, -1, -1, -1, -1, -1, -1, -1],
        'h': [-1, -1, -1, -1, -1, -1, -1, -1],
        'captured': [],
    };

    let pieces = {
        'black': [],
        'white': [],
    };

    ['white', 'black'].forEach((color, ind) => {

        let nums = (color === 'white')
                        ? [2, 1]  // 2 and 1 are backwards cause row of pawns will be created first
                        : [7, 8];

        
        let letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

        // create pawns on squares a2-h2 or a7-h7
        letters.forEach((letter, ind) => {
            let num = nums[0];
            let pos = `${letter}${num}`;

            let pawn = new Pawn(pos, color);

            boardState[letter][num -1] = pawn;
            pieces[color].push(pawn);

        });

        // create other pieces on square a1-h1 or a8-h8
        let pieceNameClassMap = {
            'rook': Rook,
            'knight': Knight,
            'bishop': Bishop,
            'queen': Queen,
            'king': King,
        }

        let pieceNames = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

        pieceNames.forEach((name, ind) => {
            let letter = letters[ind];
            let num = nums[1];
            let position = `${letter}${num}`;

            let piece = new pieceNameClassMap[name](position, color);

            boardState[letter][num -1] = piece;
            pieces[color].push(piece);

        });

    });

    return {
        'pieces': pieces,
        'boardState': boardState,
    };

}


function removeValueFromArray(arr, val){

    for(let i=0; i<arr.length; i++){
        if(arr[i] === val){
            return arr.splice(i, 1);
        }
    }

    return false;

}

function setConcat(firstSet, secondSet){
    const temp = new Set(firstSet);

    Array.from(secondSet).forEach(item => {
        temp.add(item);
    });

    return temp;
}

function setConcatInPlace(firstSet, secondSet){
    Array.from(secondSet).forEach(item => {
        firstSet.add(item);
    });
}

export { createBoardState, Board };
