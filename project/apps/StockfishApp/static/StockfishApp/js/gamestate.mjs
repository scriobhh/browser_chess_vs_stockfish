import { getStockfishNextMove } from './stockfish.mjs';
import { Pawn, Rook, Bishop, Knight, Queen, King, EnPassant, SightLinePiece } from './pieces.mjs';
import { movePiece, endGame } from './gui.mjs';
import { makeBoardUnclickable, makeBoardClickable } from './gui.mjs';


const REVERSE_COLOR = {
    'black': 'white',
    'white': 'black',
};

const PIECE_TYPE_TO_FEN_REPRESENTATION = {
    'pawn':     'p',
    'rook':     'r',
    'bishop':   'b',
    'knight':   'n',
    'queen':    'q',
    'king':     'k',
};

const CASTLE_COLUMN_TO_FEN_REPRESENTATION = {
    'c': 'q',
    'g': 'k',
};

// maps stockfish promotion string to piece class
// could be errors here, couldn't find information on what string means what piece
const PROMOTION_STRING_MAP = {
    'q': Queen,
    'r': Rook,
    'n': Knight,
    'b': Bishop,
}

class Game{
    constructor(board){
        this._board = board;

        this._colorToMove = 'pending';
        this._playerColor = 'pending';

        // int val from 0 to 5
        this._difficulty = 0;

        this._moveCount = 0;
        this._halfMoveClock = 0;

        this._check = {
            'black': false,
            'white': false,
        };

        this._checkMate = {
            'black': false,
            'white': false,
        };

    }

    setDifficulty(difficulty){
        this._difficulty = difficulty;
    }

    setColorToMove(color){
        this._colorToMove = color;
    }

    setPlayerColor(color){
        this._playerColor = color;
    }

    async update(move){
        if(!this.isValidMove(move)) return false;

        if(move.pieceMoved.color === this._playerColor){
            this._playerUpdate(move);

            makeBoardUnclickable();
            
            if(this._endGameCheck()) return;

            // get stockfish move from server
            let fen = this.toFenString();
            let stockfishMoveStr = await getStockfishNextMove(this._difficulty, fen);
            let stockfishMove = this.convertMoveStrToMove(stockfishMoveStr)

            this._stockfishUpdate( stockfishMove );

            // updates the GUI with the new move
            movePiece(stockfishMove);

            if(this._endGameCheck()) return;

            makeBoardClickable();

            return true;
        }
        
        return false;
    }

    _playerUpdate(move){
        this._board.update(move);

        this._updateMoveCounters(move);

        this._colorToMove = REVERSE_COLOR[ this._colorToMove ];
    }

    _stockfishUpdate(move){
        this._board.update(move);

        this._updateMoveCounters(move);

        this._colorToMove = REVERSE_COLOR[ this._colorToMove ];
    }

    _endGameCheck(){
        
        const endGameInfo = {
            'checkmated': this._getCheckMatePlayer(), // false if no checkmate, 'player' if player is checkmated 'stockfish' if stockfish is checkmated
            'stalemated': this._getStaleMatePlayer(), // false if no stalemate, 'player' if player is checkmated 'stockfish' if stockfish is checkmated
        }

        if(endGameInfo.checkmate || endGameInfo.stalemate){
            endGame(endGameInfo);
            return true;
        }

        return false;

    }

    _getCheckMatePlayer(){
        const kings = this._board.getKings();
        let ret = false;

        Object.entries(kings).forEach(([color, king]) => {
            if(king.isCheckMate) {
                ret = this._getPlayer(color);
                return;
            }
        });

        return ret;

    }

    _getStaleMatePlayer(){
        const kings = this._board.getKings();
        let ret = false;

        if(this._board.getValidMoves()[this._colorToMove].size === 0
        && !kings[this._colorToMove].isCheck){
            return this._getPlayer( this._colorToMove );
        }

        return false;

    }

    _getPlayer(color){
        return (color === this._playerColor) ? 'player' : 'stockfish';
    }

    // updates moveCount and halfMoveClock
    _updateMoveCounters(move){

        this._moveCount++;

        if(move.pieceMoved instanceof Pawn || move.captured)
            this._halfMoveClock = 0;
        else
            this._halfMoveClock++;

    }

    toFenString(){
        let fenString = '';

        let enpassant = null;
        let rooks = {'white': [], 'black': []};
        let kings = this._board.getKings();

        // board
        let rows = Object.values(this._board.getRotatedBoardState());
        rows.forEach((row, ind) => {
            let emptySquareCount = 0;

            row.forEach(piece => {
                if(piece === -1 || piece instanceof EnPassant) {
                    enpassant = (piece instanceof EnPassant) ? piece : enpassant;
                    emptySquareCount++;
                } else {
                    fenString += (emptySquareCount > 0) ? String(emptySquareCount) : '';
                    fenString += this._getFenRepresentationOfPiece(piece);
                    emptySquareCount = 0;
                }

                if(piece instanceof Rook) 
                    rooks[ piece.color ].push(piece);
            });

            if(emptySquareCount > 0)
                fenString += String(emptySquareCount);
            
            fenString += (ind === 7) ? ' ' : '/';
        });

        // color for next move
        fenString += `${this._colorToMove[0]} `;

        // castling
        rooks['white'].reverse(), rooks['black'].reverse(); // rook arrays are in wrong order for fenstring
        let fenCastle = this._getFenRepresentationOfCastleMoves(kings, rooks);
        
        fenString += (!!fenCastle) ? `${fenCastle} ` : '- ';

        // enPassant square
        fenString += (!!enpassant) ? `${enpassant.position} ` : '- ';

        // halfmove clock
        fenString += `${String(this._halfMoveClock)} `;

        // fullmove clock
        fenString += `${this._moveCount}`;

        return fenString;
    }

    _getFenRepresentationOfPiece(piece){
        let fenPiece = PIECE_TYPE_TO_FEN_REPRESENTATION[piece.type];

        return (piece.color === 'white') ? fenPiece.toUpperCase() : fenPiece;
    }

    _getFenRepresentationOfCastleMoves(kings, rooks){
        let fenCastle = '';

        // maps rook column to castleside letter, used to figure out which castle side a rook is on
        let castleSide = {
            'a': 'q',
            'h': 'k',
        };

        let kingArr = Object.entries(kings);
        kingArr.reverse(); // kings are in wrong order for fenstring

        kingArr.forEach(([color, king], ind) => {

            if(!king.isCastleable) return;

            let temp = '';

            rooks[color].forEach(rook => {
                if(rook.isCastleable)
                    temp += castleSide[ rook.position[0] ];
            });

            fenCastle += (color === 'white') ? temp.toUpperCase() : temp;

        });

        return fenCastle;
        
    }

    isValidMove(move){
        return (move.pieceMoved.color === this._colorToMove) && (this._board.isValidMove(move));
    }

    convertMoveStrToMove(moveStr){
        const oldSquare = moveStr.substring(0, 2);
        const newSquare = moveStr.substring(2, 4);
        const promotionStr = moveStr[4];

        const pieceMoved = this._board.getPiece(oldSquare);

        let move = new Move(
            pieceMoved,
            oldSquare,
            newSquare,
        );


        let nextSquarePiece = this._board.getPiece(newSquare);
        
        let enPassantCapture = pieceMoved instanceof Pawn 
                                && nextSquarePiece instanceof EnPassant 
                                && nextSquarePiece.color !== pieceMoved.color;
        let nonEnPassantCapture = !(nextSquarePiece instanceof EnPassant)
                                    && nextSquarePiece.color !== pieceMoved.color;
        // TODO: add logic to determine enpassant captures and non-captures
        let captured = (nextSquarePiece !== -1 && (enPassantCapture || nonEnPassantCapture)) 
                            ? nextSquarePiece
                            : null;
        
        move.captured = captured;

        if(move.pieceMoved instanceof Pawn){

            move.enPassant = move.pieceMoved.getEnPassant(move);

            move.promotion = (promotionStr) ? PROMOTION_STRING_MAP[ promotionStr ] : move.pieceMoved.getPromotion(move);
        }

        if(move.pieceMoved instanceof King
        && move.pieceMoved.getCastleSquares().has(newSquare)){
            // maps king's newMove column to column of rook piece
            let castleRookOldColumn = {
                'c': 'a',
                'g': 'h'
            };

            // maps king's newMove column to column that rook piece will move to
            let castleRookNewColumn = {
                'c': 'd',
                'g': 'f'
            };

            let col = newSquare[0],
                row = newSquare[1];

            let rookOldSquare = `${ castleRookOldColumn[col] }${ row }`;
            let rookNewSquare = `${ castleRookNewColumn[col] }${ row }`;

            move.castle = {};
            move.castle['piece'] = this._board.getPiece(rookOldSquare);
            move.castle['oldSquare'] = rookOldSquare;
            move.castle['newSquare'] = rookNewSquare;

        }
        
        return move;
        
    }

}

// move class allows information about moves to be passed between Gui, Board and Piece objects
// 
//  pieceMoved = piece_ref,
//  oldSquare = e.g. 'e2',
//  newSquare = e.g. 'e4',
//  captured = piece_ref || null,
//  enPassant = enPassantPiece_ref,
//  promotion = piece_class || null,
//  castle = {
//              'piece': piece_ref || null,     // pieceMoved will already have a reference to the King
//              'oldSquare': 'aX' || 'hX',      // X is the row
//              'newSquare': 'dX' || 'fX'   
//           }
// 
class Move{
    constructor(pieceMoved, oldSquare, newSquare, captured=null, enPassant=null, promotion=null, castle=null){
        this.pieceMoved = pieceMoved;
        this.oldSquare  = oldSquare;
        this.newSquare  = newSquare;
        this.captured   = captured;
        this.enPassant  = enPassant;
        this.promotion  = promotion;
        this.castle     = castle;
    }
}

export { Game, Move };
