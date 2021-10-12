let PIECE_TYPES = new Set([
    'pawn',
    'rook',
    'bishop',
    'knight',
    'queen',
    'king',
]);

let SIGHT_LINE_PIECE_TYPES = new Set([
    'bishop', 
    'rook', 
    'queen',
]);

let COLORS = new Set([
    'black',
    'white',
]);

let POSITIONS = new Set([
    'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8',
    'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7',
    'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
    'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5',
    'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
    'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
    'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
    'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1',
]);

// used to convert column letters to and from numbers
// so that maths operations can be done on column letters
let LETTERS = [0, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
let LETTER_INDEX_MAP = {
    'a': 1,
    'b': 2,
    'c': 3,
    'd': 4,
    'e': 5,
    'f': 6,
    'g': 7,
    'h': 8,
};


// base class for all pieces
class Piece{

    constructor(type, position, color){
        if(!COLORS.has(color)){
            throw new Error('Invalid piece color');
        }
        if(!PIECE_TYPES.has(type)){
            throw new Error('Invalid piece type');
        }
        if(!POSITIONS.has(position)){
            throw new Error('Invalid position');
        }

        this.type = type;
        this.position = position;  // piece needs to know its' position so it can determine next valid moves
        this.color = color;
        this.isCaptured = false;
        //this.isBlockingCheck = false;
        this.isChecking = false;
        this.isPinned = false;

        // represents valid moves for a piece
        // is updated through observer pattern every time Board is updated
        // is used to check if a move is valid with isValidMove() method
        this._validMoves = new Set();
        this._attackingMoves = new Set();

    }

    // this needs to be overridden by sub-classes
    // uses position and boardState object to calculate valid moves and updates _validMoves set
    // uses boardState to update validMoves and attackingMoves sets
    // returns AttackingMoves set to be used in Board for kings to determine which squares will cause checks
    updatePiece(boardState){
        throw new Error('UPDATE PIECE NOT IMPLEMENTED');
    }

    // only gets called if this piece has been moved
    updatePosition(move){
        if(!move || move['pieceMoved'] !== this) { throw new Error('Move sent to wrong piece'); }
        if(move.newSquare === this.position) { return; }
        this.position = move.newSquare;
    }

    clearValidMoves(){
        
        if(!safeMoveSet){
            this._validMoves.clear();
            return;
        }

    }

    makePinned(safeMoveSet){
        this.isPinned = true;

        return this.updateWithSafeMoves(safeMoveSet);

    }

    // removes moves that aren't in safeMoveSet from validMoves
    updateWithSafeMoves(safeMoveSet){

        // note sure why I put this here but I'm scared to remove it in case it breaks something...
        if(!safeMoveSet) return;

        this._validMoves.forEach(square => {
            if(!safeMoveSet.has(square))
                this._validMoves.delete(square);
        });

        return this._validMoves;

    }

    isValidMove(move){
        // return true;
        return this._validMoves.has(move.newSquare);
    }

    getCaptured(){
        return [ this ];
    }

    getValidMoves(){
        return this._validMoves;
    }

    getAttackingMoves(){
        return this._attackingMoves;
    }

    capture(){
        this._validMoves.clear();
        this._attackingMoves.clear();
        this.position = '';
        this.isCaptured = true;
    }

    // used to avoid code duplication
    // for loop should break if this function returns false
    _addSquareToValidMoves(letter, num, boardState){
        let square = `${letter}${num}`;
        let piece = boardState[letter][num -1];

        if(!POSITIONS.has(square)){
            return false;
        }

        if(piece !== -1 
        && piece.color === this.color 
        && !(piece instanceof EnPassant)){
            this._attackingMoves.add(square);
            return false;
        }

        this._validMoves.add(square);
        this._attackingMoves.add(square);
        
        if(piece !== -1
        && piece.color !== this.color
        && !(piece instanceof EnPassant)){ 
            return false;
        }

        return true;
    }
    
}

// sub-type of piece for pieces with sight lines (bishops, queens and rooks)
// this is important for game rules about pieces blocking check and checkmate moves
class SightLinePiece extends Piece{

    constructor(type, position, color){
        if(!SIGHT_LINE_PIECE_TYPES.has(type)){
            throw new Error('Invalid sightline piece type');
        }

        super(type, position, color);

        // will hold sets that contain squares in each sightline of the piece
        this._sightLines = [];

        // line set that is checking, and line set that has squares which can block the check
        this._checkLine = null;
        this._checkBlockingSquares = null;
    }

    updatePiece(boardState, move, enemyKing){
        this._checkLine = null;
        this._sightLines = [];
        this.isPinned = false;

        this.updateSightLines(boardState);
        this.updateMoves(boardState);

        if(enemyKing)
            this.isChecking = this._attackingMoves.has( enemyKing.position );

        return this._attackingMoves;
    }

    getCheckLine(){
        return this._checkLine;
    }

    getCheckBlockingSquares(){
        return this._checkBlockingSquares;
    }

    getSightLines(){
        return this._sightLines;
    }

    updateSightLines(){
        throw new Error(`updateSightLines() not implemented for ${this.type} at ${this.position}`);
    }

    _updateSightLinesHorizontalVertical(boardState){
        let pos = this.position;
        let letter = pos[0],
            row = parseInt(pos[1]);

        // horizontal
        [-1, 1].forEach(diff => {
            let letterInd = LETTER_INDEX_MAP[ letter ];
            const sightLine = new Set();
            let isCheckLine = false;

            while(true){
                letterInd += diff;
                const tempLetter = LETTERS[ letterInd ];
                const square = `${tempLetter}${row}`;

                if(!POSITIONS.has(square)) break;

                const squarePiece = boardState[tempLetter][row -1];
                if(squarePiece instanceof King
                && squarePiece.color !== this.color){
                    isCheckLine = true;
                    this._checkBlockingSquares = new Set(sightLine);
                }

                sightLine.add(square);
            }

            this._sightLines.push( new Set(sightLine) );
            this._checkLine = (isCheckLine) ? new Set(sightLine) : this._checkLine;

        });

        // vertical
        [-1, 1].forEach(diff => {
            let tempRow = row;
            const sightLine = new Set();
            let isCheckLine = false;

            while(true){
                tempRow += diff;
                const square = `${letter}${tempRow}`;

                if(!POSITIONS.has(square)) break;

                const squarePiece = boardState[letter][tempRow -1];
                if(squarePiece instanceof King
                && squarePiece.color !== this.color){
                    isCheckLine = true;
                    this._checkBlockingSquares = new Set(sightLine);
                }

                sightLine.add(square);
            }

            this._sightLines.push( new Set(sightLine) );
            this._checkLine = (isCheckLine) ? new Set(sightLine) : this._checkLine;

        });

    }

    _updateSightLinesDiagonal(boardState){
        let letter = this.position[0],
            row = parseInt(this.position[1]);

        // to top left      -1,1
        // to bottom right  1,-1
        // to top right     1,1
        // to bottom left   -1,-1
        [[-1,1], [1,-1], [1,1], [-1,-1]].forEach(([letterDiff, rowDiff]) => {
            let letterInd = LETTER_INDEX_MAP[ letter ];
            let tempRow = row;
            const sightLine = new Set();
            let isCheckLine = false;

            while(true){
                letterInd+=letterDiff, tempRow+=rowDiff;
                const tempLetter = LETTERS[ letterInd ];
                const square = `${tempLetter}${tempRow}`;

                if(!POSITIONS.has(square)) break;

                const squarePiece = boardState[tempLetter][tempRow -1];
                if(squarePiece instanceof King
                && squarePiece.color !== this.color){
                    isCheckLine = true;
                    this._checkBlockingSquares = new Set(sightLine);
                }

                sightLine.add(square);
            }

            this._sightLines.push( new Set(sightLine) );
            this._checkLine = (isCheckLine) ? new Set(sightLine) : this._checkLine;

        });

    }

    _updateMovesHorizontalVertical(boardState){

        let pos = this.position;
        let letter = pos[0],
            row = parseInt(pos[1]);
        
        let colIndex = LETTER_INDEX_MAP[letter];

        // horizontal
        for(let i=colIndex+1; i<=8; i++){
            
            let letter = LETTERS[i];

            if(!this._addSquareToValidMoves(letter, row, boardState)){
                break;
            }
            
        }
        for(let i=colIndex-1; i>=1; i--){

            let letter = LETTERS[i];
            
            if(!this._addSquareToValidMoves(letter, row, boardState)){
                break;
            }

        }

        // vertical
        for(let i=row+1; i<=8; i++){

            if(!this._addSquareToValidMoves(letter, i, boardState)){
                break;
            }

        }
        for(let i=row-1; i>=1; i--){

            if(!this._addSquareToValidMoves(letter, i, boardState)){
                break;
            }

        }

    }

    _updateMovesDiagonal(boardState){

        let col = this.position[0],
            row = parseInt(this.position[1]);

        let colIndex = LETTER_INDEX_MAP[col];

        // right side diagonals
        [-1, 1].forEach((sign, _) => {

            for(let i=colIndex+1; i<=8; i++){

                let diff = Math.abs( colIndex - i );
                let letter = LETTERS[i],
                    num = row + diff*sign;

                if(!this._addSquareToValidMoves(letter, num, boardState)){
                    break;
                }

            }

        });

        // left side diagonals
        [-1, 1].forEach((sign, _) => {

            for(let i=colIndex-1; i>=1; i--){

                let diff = Math.abs( colIndex - i );
                let letter = LETTERS[i],
                    num = row + diff*sign;

                if(!this._addSquareToValidMoves(letter, num, boardState)){
                    break;
                }

            }

        });

    }

    capture(){
        super.capture();
        this._sightLines = null;
        this._checkLine = null;
        this._checkBlockingSquares = null;
    }

}

class Pawn extends Piece{

    constructor(position, color){
        super('pawn', position, color);

        this._firstMove = true;
        this.enPassant = null;  // holds the square that can be captured en passant

    }

    updatePiece(boardState, move, enemyKing){

        this.isPinned = false;
        
        this._validMoves.clear();
        this._attackingMoves.clear();
        

        let pos = this.position;

        // mirrored array so it can be given index which represents progress towards end of board and still work for both pawn colors
        let rows = (this.color === 'white')
                    ? [0, 1, 2, 3, 4, 5, 6, 7, 8]
                    : [0, 8, 7, 6, 5, 4, 3, 2, 1];
        let letter = pos[0];
        let row = parseInt(this.position[1]);
        // tracks progress towards opposite end of board
        let index = (this.color === 'white') ? row : 9-row;

        // check squares 1 and 2 ahead of piece
        if(index <= 7 
        && boardState[letter][ rows[index+1] -1] === -1){
            this._validMoves.add(`${letter}${rows[index+1]}`);

            // TODO: change this, only possible 2 square move is the first move from index=2
            // second square is free (this is dependant on first square being free)
            if(this._firstMove
            && index <= 6 
            && boardState[letter][ rows[index+2] -1] === -1){

                this._validMoves.add(`${letter}${rows[index+2]}`);
            }
        }

        //
        if(index <= 7){

            [-1, 1].forEach((sign, _) => {

                let letterIndex = LETTER_INDEX_MAP[letter] + sign;

                if(letterIndex < 1 || letterIndex > 8)
                    return;

                let sideLetter = LETTERS[ letterIndex ];

                let square = `${sideLetter}${rows[index+1]}`;
                let piece = boardState[ square[0] ][ parseInt(square[1]) -1];
                
                if(piece !== -1
                && piece.color !== this.color){
                    this._validMoves.add(square);
                }

                this._attackingMoves.add(square);

            });

        }

        if(enemyKing)
            this.isChecking = this._attackingMoves.has( enemyKing.position );

        return this._attackingMoves;

    }

    getEnPassant(move){
        
        let oldRow = parseInt(move.oldSquare[1]);
        let newRow = parseInt(move.newSquare[1]);
        let moveDist = Math.abs( oldRow - newRow );

        if(moveDist === 2){
            let diff = (move.pieceMoved.color === 'white') ? -1 : 1;
            let passantPos = `${move.newSquare[0]}${newRow + diff}`;

            return new EnPassant(passantPos, this, this.color);
        }

        return null;

    }

    updatePosition(move){
        super.updatePosition(move);
        this._firstMove = false;
    }
    
    getPromotion(move){

        let newRow = parseInt(move.newSquare[1]);
        let promotionRow = (this.color === 'black') ? 1 : 8;

        return (newRow === promotionRow) ? 'pending' : null;
        
    }

}

class EnPassant{

    constructor(position, pawn, color){
        this.position = position;
        this.linkedPawn = pawn;
        this.type = 'enpassant';
        this.color = color;
    }

    // TODO: this is part of a small workaround in Board.update(), can be improved on
    capture(){
        
    }

    getCaptured(){
        return [ this, this.linkedPawn ];
    }
}

class Rook extends SightLinePiece{
    
    constructor(position, color){
        super('rook', position, color);
        this.isCastleable = true;
    }

    updateSightLines(boardState){
        this._updateSightLinesHorizontalVertical(boardState);
        
    }

    updateMoves(boardState){
        this._validMoves.clear();
        this._attackingMoves.clear();

        this._updateMovesHorizontalVertical(boardState);

    }

    updatePosition(move){

        if(!move || move.pieceMoved !== this)
            if(!move.castle || move.castle['piece'] !== this)
                throw new Error('Move sent to wrong piece'); 

        if(move.newSquare === this.position) { return; }

        this.position = (move.castle && move.castle['piece'] === this)
                            ? move.castle['newSquare']
                            : move.newSquare;

        this.isCastleable = false;

    }

    isCastleable(){
        return this.isCastleable;
    }

}

class Bishop extends SightLinePiece{
    
    constructor(position, color){
        super('bishop', position, color);
    }

    updateSightLines(boardState){
        this._updateSightLinesDiagonal(boardState);

    }

    updateMoves(boardState){
        this._validMoves.clear();
        this._attackingMoves.clear();

        this._updateMovesDiagonal(boardState);

    }

}

class Queen extends SightLinePiece{
    
    constructor(position, color){
        super('queen', position, color);
    }

    updateSightLines(boardState){
        this._updateSightLinesDiagonal(boardState);
        this._updateSightLinesHorizontalVertical(boardState);

    }

    updateMoves(boardState){
        this._validMoves.clear();
        this._attackingMoves.clear();
        
        this._updateMovesDiagonal(boardState);
        this._updateMovesHorizontalVertical(boardState);

    }

}

class Knight extends Piece{
    
    constructor(position, color){
        super('knight', position, color);
    }

    updatePiece(boardState, move, enemyKing){
        this._validMoves.clear();
        this._attackingMoves.clear();
        this.isPinned = false;

        let pos = this.position;

        let colIndex = LETTER_INDEX_MAP[ pos[0] ],
            rowIndex = parseInt( pos[1] );

        
        //TODO: CODE REUSE

        // left/right
        [-2, 2].forEach((diff, _) => {

            let column = colIndex + diff;

            [-1, 1].forEach((sign, _) => {

                let row = rowIndex + sign;

                let letter = LETTERS[column];
                let square = `${letter}${row}`;
                // TODO: cleanup this if check
                if(POSITIONS.has(square)){

                    this._attackingMoves.add(square);

                    if(boardState[letter][row -1] === -1 
                        || boardState[letter][row -1].color !== this.color 
                        || boardState[letter][row -1] instanceof EnPassant){

                        this._validMoves.add(square);

                    }

                }

            });
            
        });


        [-2, 2].forEach((diff, _) => {
            
            let row = rowIndex + diff

            let signs = [-1, 1];
            signs.forEach((sign, _) => {

                let column = colIndex + sign;

                let letter = LETTERS[column];
                let square = `${letter}${row}`;
                // TODO: cleanup
                if(POSITIONS.has(square)){

                    this._attackingMoves.add(square);

                    if(boardState[letter][row -1] === -1 
                        || boardState[letter][row -1].color !== this.color 
                        || boardState[letter][row -1] instanceof EnPassant){

                        this._validMoves.add(square);

                    }

                }

            });

        });

        if(enemyKing)
            this.isChecking = this._attackingMoves.has( enemyKing.position );

        return this._attackingMoves;

    }

}

class King extends Piece{
    
    constructor(position, color, castleSquares){
        super('king', position, color);
        this.isCastleable = true;
        
        this.isCheck = false;
        this.isCheckMate = false;
        
    }

    updatePiece(boardState){
        this._validMoves.clear();
        this._attackingMoves.clear();

        let colIndex = LETTER_INDEX_MAP[ this.position[0] ];
        let rowIndex = parseInt(this.position[1]);

        /*
            maps the following pairs of values to the squares around
            the king, the king sits at 0,0:

            -1,1    0,1    1,1
            -1,0    0,0    1,0
            -1,-1   0,-1   1,-1
        */

        let offsets = [-1, 0, 1];

        offsets.forEach((col, _) => {

            offsets.forEach((row, _) => {

                // king is at 0, 0 so skip that square
                if(col === 0
                && row === 0){
                    return;
                }

                let c = colIndex + col,
                    r = rowIndex + row;
 
                if(c < 1 || c > 8)
                    return;

                let letter = LETTERS[c];

                this._addSquareToValidMoves(letter, r, boardState);

            });

        });

        return this._attackingMoves;

    }

    // updates this._validMoves to look for check
    updateWithCheckMoves(attackedSquareSet){

        this.isCheck = false;

        // remove squares that would self-checkmate
        attackedSquareSet.forEach((square, _) => {
            this.isCheck = (this.isCheck || (square === this.position));
            this._validMoves.delete(square);
        });

    }

    updateCastleMoves(boardState, attackedSquareSet){

        if(!this.isCastleable) return;

        let row = this.position[1];

        [`g${row}`, `c${row}`].forEach((square) => {
            if(this._isValidCastleSquare( square, boardState, attackedSquareSet ))
                this._validMoves.add( square );
        });

    }

    _isValidCastleSquare(square, boardState, attackedSquareSet){
        
        // king side castle:
        //  king is not under check
        //  rook is in 'h' square and is castleable
        //  square 'f' and 'g' is not under attack
        //  square 'f' and 'g' is empty

        // queen side castle:
        //  king is not under check
        //  rook is in 'a' square and is castleable
        //  square 'c' and 'd' is not under attack
        //  square 'b', 'c' and 'd' is empty

        let row = this.position[1];

        if(this.isCheck || (square !== `c${row}` && square !== `g${row}`))
            return false;

        let castleSide = (square[0] === 'c') 
                            ? 'queenSide' 
                            : 'kingSide';

        let castleVals = {
            'kingSide': {
                'rookSquare': `h${row}`,
                'safeSquares': [`f${row}`, `g${row}`],
                'emptySquares': [`f${row}`, `g${row}`],
            },
            'queenSide': {
                'rookSquare': `a${row}`,
                'safeSquares': [`c${row}`, `d${row}`],
                'emptySquares': [`b${row}`, `c${row}`, `d${row}`],
            },
        };

        let rookCol = castleVals[ castleSide ][ 'rookSquare' ][0];
        let rook = boardState[ rookCol ][ row -1];

        if(rook === -1 || !rook.isCastleable)
            return false;

        let safeSq = castleVals[ castleSide ][ 'safeSquares' ];

        for(let i=0; i<safeSq.length; i++)
            if(attackedSquareSet.has( safeSq[i] ))
                return false;

        let emptySq = castleVals[ castleSide ][ 'emptySquares' ];

        for(let i=0; i<emptySq.length; i++){
            let col = emptySq[i][0],
                row = emptySq[i][1];

            if(boardState[col][row -1] !== -1)
                return false;
        }

        return true;
        
    }

    getCastleSquares(){
        // returns a set of castling validmoves
        // don't need to do anything fancy here, just check validmoves for 'cX' and 'gX' where X is starting row
        
        let castleSquares = new Set();

        // return early if !isCastleable, otherwise non-castle valid moves to cX or gX will be returned
        if(!this.isCastleable) return castleSquares;

        let row = this.position[1];
        
        [`c${row}`, `g${row}`].forEach((square) => {
            if(this._validMoves.has(square))
                castleSquares.add(square);
        });

        return castleSquares;
        
    }

    updatePosition(move){
        super.updatePosition(move);

        // castling is only allowed if king has not moved yet
        this.isCastleable = false;

    }

    isCastleable(){
        return this.isCastleable;
    }

}


export { Pawn, Rook, Bishop, Knight, Queen, King, EnPassant, SightLinePiece };
