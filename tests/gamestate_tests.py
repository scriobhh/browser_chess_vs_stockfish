import unittest
from project.apps.StockfishApp.gamestate import Position
from project.apps.StockfishApp.exceptions import InvalidPositionException


class PositionClassTestCase(unittest.TestCase):
    def test_str(self):
        # both args
        pos = Position(
            'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            ['c2c3', 'c7c6', 'e2e4', 'e7e5']
        )
        self.assertEqual(
            str(pos),
            'fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 moves c2c3 c7c6 e2e4 e7e5'
        )

        pos = Position(
            'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            ['c2c3']
        )
        self.assertEqual(
            str(pos),
            'fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 moves c2c3'
        )

        # fenstring only
        pos = Position(
            'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        )
        self.assertEqual(
            str(pos),
            'fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        )

        # moves only
        pos = Position(
            '',
            ['c2c3', 'c7c6', 'e2e4', 'e7e5']
        )
        self.assertEqual(
            str(pos),
            'startpos moves c2c3 c7c6 e2e4 e7e5'
        )

        # no args
        pos = Position()
        self.assertEqual(
            str(pos),
            'startpos'
        )

    def test_position_property(self):
        pos = Position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1')
        self.assertEqual(
            pos.position,
            'fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1'
        )

        pos = Position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ['c2c3', 'c7c6', 'e2e4', 'e7e5'])
        self.assertEqual(
            pos.position,
            'fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        )

        pos = Position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
        self.assertEqual(
            pos.position,
            'fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        )

        pos = Position(moves=['c2c3', 'c7c6', 'e2e4', 'e7e5'])
        self.assertEqual(
            pos.position,
            'startpos'
        )

        pos = Position()
        self.assertEqual(
            pos.position,
            'startpos'
        )

    def test_moves_property(self):
        pos = Position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ['c2c3', 'c7c6', 'e2e4', 'e7e5'])
        self.assertEqual(
            pos.moves,
            'moves c2c3 c7c6 e2e4 e7e5'
        )

        pos = Position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
        self.assertIsNone(
            pos.moves
        )

        pos = Position(moves=['c2c3', 'c7c6', 'e2e4', 'e7e5'])
        self.assertEqual(
            pos.moves,
            'moves c2c3 c7c6 e2e4 e7e5'
        )

        pos = Position()
        self.assertIsNone(
            pos.moves
        )

    def test_invalid_fen(self):
        with self.assertRaises(InvalidPositionException):
            pos = Position('rnbqkbnrr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')

        with self.assertRaises(InvalidPositionException):
            pos = Position('rnbqkbnj/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')

        with self.assertRaises(InvalidPositionException):
            pos = Position('rnbqkbnr/ppppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')

        with self.assertRaises(InvalidPositionException):
            pos = Position('rnbqkbnr/pppppppp/8/8/8/9/PPPPPPPP/RNBQKBNR w KQkq - 0 1')

        with self.assertRaises(InvalidPositionException):
            pos = Position('rnbqkbnr/pppppppp/8/8/8/8PPPPPPPP/RNBQKBNR w KQkq - 0 1')

        with self.assertRaises(InvalidPositionException):
            pos = Position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR KQkq - 0 1')

        with self.assertRaises(InvalidPositionException):
            pos = Position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w QKkq - 0 1')

        with self.assertRaises(InvalidPositionException):
            pos = Position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQqq - 0 1')

        with self.assertRaises(InvalidPositionException):
            pos = Position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq  0 1')

        with self.assertRaises(InvalidPositionException):
            pos = Position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq n9 0 1')

        with self.assertRaises(InvalidPositionException):
            pos = Position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq e9 0 1')

        with self.assertRaises(InvalidPositionException):
            pos = Position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -  1')

        with self.assertRaises(InvalidPositionException):
            pos = Position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 ')

        with self.assertRaises(InvalidPositionException):
            pos = Position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 y')

if __name__ == '__main__':
    unittest.main()
