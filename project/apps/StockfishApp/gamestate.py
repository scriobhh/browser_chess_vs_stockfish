import re
from .exceptions import InvalidPositionException

# regex for fenstring https://regex101.com/r/ggu4ri/1
FEN_REGEX = re.compile(r'([rRnNbBqQkKpP1-8]{1,8}\/){7}[rRnNbBqQkKpP1-8]{1,8}\s[wb]\s((K{0,1}Q{0,1}k{0,1}q{0,1})|(-))\s(([a-h][1-8])+|-)\s\d+\s\d+')


def is_valid_fen(fen):
    """check if fenstring matches regex, returns None"""
    return FEN_REGEX.fullmatch(fen)  # returns a re.Match() object (evaluations to True in bool check) if fen matches, or None


class Position():
    """represents the board state in a way that can be given to the position command of stockfish"""

    _count = 1

    def __init__(self, fenstring='', moves=None):
        if fenstring:
            if not is_valid_fen(fenstring):
                # raise error because Position is invalid without valid fenstring, caller should handle this error
                # TODO: implement custom InvalidPositionException
                raise InvalidPositionException('Invalid fenstring, failed to create Position object')

        self._position = f'fen {fenstring}' if fenstring else 'startpos'
        self._moves = None

        if moves:
            self._moves = 'moves ' + ' '.join(moves)

        self._hash_val = Position._count
        Position._count += 1

    def __str__(self):
        if self._moves:
            return ' '.join([self._position, self._moves])
        else:
            return self._position

    # hash is used so that Position instances can be used as keys in dict in stockfishdispatcher
    def __hash__(self):
        return self._hash_val

    @property
    def position(self):
        return self._position

    @property
    def moves(self):
        return self._moves
