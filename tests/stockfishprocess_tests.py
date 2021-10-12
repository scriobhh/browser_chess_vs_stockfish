import unittest
import warnings
from project.apps.StockfishApp.stockfishprocess import StockfishProcess
from project.apps.StockfishApp.gamestate import Position

class ProcessClassTestCase(unittest.TestCase):
    # NOTE: unittest runs this constructor once for each test case, so there
    #def __init__(self, *args, **kwargs):
    #    super(ProcessClassTestCase, self).__init__(*args, **kwargs)
    #    self.process = process_class.StockfishProcess()

    def setUp(self):
        self.proc = StockfishProcess(r'..\Stockfish\stockfish.exe')

    def tearDown(self):
        del self.proc

    def test_example(self):
        pass

    def test_write_to_proc(self):
        with self.assertRaises(AssertionError):
            self.proc._write_to_proc('abc')

        with self.assertRaises(AssertionError):
            self.proc._write_to_proc('n')

        with self.assertRaises(AssertionError):
            self.proc._write_to_proc('\\')

        self.assertIsNone(self.proc._write_to_proc('\n'))

        self.assertIsNone(self.proc._write_to_proc('abc\n'))

    def test_d(self):
        self.assertIsInstance(
            self.proc._d(),
            dict
        )

        self.assertIsInstance(
            self.proc._d()['board'],
            list
        )

        self.assertIsInstance(
            self.proc._d()['fen'],
            str
        )

        self.assertIsInstance(
            self.proc._d()['key'],
            str
        )

    def test_uci(self):
        self.assertIsNone(self.proc._uci())

    def test_isready(self):
        self.assertEqual(
            self.proc._isready(),
            'readyok\n'
        )

    def test_ucinewgame(self):
        self.assertIsNone(self.proc._ucinewgame())

    def test_go(self):

        self.assertIsInstance(
            self.proc._go(),
            dict
        )

        self.assertRegex(
            self.proc._go()['bestmove'],
            '[a-h][1-8][a-h][1-8]'
        )

        self.assertRegex(
            self.proc._go()['ponder'],
            '[a-h][1-8][a-h][1-8]'
        )

    def test_position(self):
        self.assertIsNone(
            self.proc._position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
        )

    def test_get_next_move(self):
        pos = Position(
            'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            ['c2c3', 'c7c6', 'e2e4', 'e7e5']
        )
        self.assertRegex(
            self.proc.get_next_move(pos),
            '[a-h][1-8][a-h][1-8]'
        )

        pos = Position('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
        self.assertRegex(
            self.proc.get_next_move(pos),
            '[a-h][1-8][a-h][1-8]'
        )

        pos = Position(moves=['c2c3', 'c7c6', 'e2e4', 'e7e5'])
        self.assertRegex(
            self.proc.get_next_move(pos),
            '[a-h][1-8][a-h][1-8]'
        )

        pos = Position()
        self.assertRegex(
            self.proc.get_next_move(pos),
            '[a-h][1-8][a-h][1-8]'
        )

    def test_set_option(self):
        self.assertIsNone(
            self.proc._set_option()
        )

    def test_set_difficulty(self):
        # warnings.simplefilter('always')
        for ind in range(-10, 10):
            if ind >= 1 and ind <= 5:
                self.assertIsNone(self.proc.set_difficulty(ind))
            else:
                with self.assertWarns(UserWarning):
                    self.proc.set_difficulty(ind)


if __name__ == '__main__':
    unittest.main()
