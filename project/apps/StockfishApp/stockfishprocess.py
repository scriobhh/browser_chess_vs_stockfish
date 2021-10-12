import subprocess
import io
import os
import sys
import pathlib
import errno
import warnings
import logging

# set logging config when module loads
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO
)

_DEFAULT_CONFIG = {
    'depth': 10,
    'difficulty': 5,
}


class StockfishProcess():
    """wrapper for a process running the Stockfish chess engine"""

    def __init__(self, stockfish_path, config=None):
        path = pathlib.Path(stockfish_path)

        # this app relies on having a stockfish executable, so raise exception if app can't find path
        if not stockfish_path or not path.exists():
            raise FileNotFoundError(
                errno.ENOENT,
                os.strerror(errno.ENOENT),
                str(stockfish_path)
            )

        if not config:
            config = _DEFAULT_CONFIG.copy()  # use copy to prevent changing state of shared object

        self._config = {
            **config
        }

        try:
            self._process = subprocess.Popen(
                [str(path)],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT
            )
        except:
            raise RuntimeError(f'Failed to create process\npath: {str(path)}')

        # TextIOWrappers around process's stdin and stdout to avoid need to constantly encode and decode bytes objects
        self._proc_in = io.TextIOWrapper(
            self._process.stdin,
            encoding='utf-8'
        )

        self._proc_out = io.TextIOWrapper(
            self._process.stdout,
            encoding='utf-8'
        )

        # get initial line from stockfish out of the way
        self._proc_out.readline()

        self._uci()
        if self._isready() != 'readyok\n':
            raise RuntimeError('\'isready\' check failed')

        self.set_difficulty(self._config['difficulty'])
        self._ucinewgame()

        logging.info(f'INITIALIZED NEW STOCKFISH PROCESS {self._process.pid}')

    # TODO: learn the methods and objects used in this method better
    def __del__(self):
        """closes input and output pipes and terminates the process"""
        pid = self._process.pid
        self._proc_in.close()  # .close() flushes the stream before closing it, so .flush() is not required
        self._proc_out.close()
        self._process.terminate()  # https://stackoverflow.com/questions/19206124/difference-between-killed-and-terminated
        exit_code = self._process.wait()  # https://stackoverflow.com/questions/55052055/why-do-i-get-subprocess-resource-warnings-despite-the-process-being-dead

        logging.info(f'TERMINATED PROCESS {pid} WITH EXIT CODE {exit_code}')

    def __str__(self):
        return f'Stockfish process {self._process.pid}'

    def _write_to_proc(self, arg):
        assert arg[-1] == '\n'  # commands won't run unless they end with a newline

        self._proc_in.write(arg)
        self._proc_in.flush()

    def _d(self):
        """runs 'd' command, returns dict of board_string, fenstring and key"""
        self._write_to_proc('d\n')

        board = []
        while (line := self._proc_out.readline())[0:3] != 'Fen':
            board.append(line)

        fen = line[5:]
        key = self._proc_out.readline()[5:]
        self._proc_out.readline()  # gets 'checkers: ' output out of pipe

        return {
            'board': board,
            'fen': fen,
            'key': key
        }

    def _uci(self):
        """runs 'uci' command and waits for 'uciok' output to initialize engine"""
        self._write_to_proc('uci\n')

        # skip over all outputs until 'uciok'
        while self._proc_out.readline() != 'uciok\n':
            pass

    def _isready(self):
        """runs 'isready' command, returns 'readyok'"""
        self._write_to_proc('isready\n')
        return self._proc_out.readline()

    def _ucinewgame(self):
        """runs 'ucinewgame' stockfish command, returns None"""
        self._write_to_proc('ucinewgame\n')

    def _go(self, depth=None):
        """runs the 'go' stockfish command, returns a dict with 'bestmove' and 'ponder'"""
        if depth is None:
            depth = self._config['depth']

        self._write_to_proc(f'go depth {depth}\n')

        # skip over all the 'info depth...' lines in the output, stops when gets to 'best move ... ponder ...' line
        while (line := self._proc_out.readline())[0:4] != 'best':
            pass

        try:
            ponder_index = line.index('ponder')  # index() instead of find() because index() raises error if the arg is not found
            output = {
                'bestmove': line[9 : (ponder_index - 1)],
                'ponder': line[ponder_index+7 : -1]
            }
        except:
            output = {
                'bestmove': line[9:13],
                'ponder': ''
            }

        return output

    def _position(self, arg):
        """inputs the 'position' command to stockfish with an input string, returns None"""
        self._write_to_proc(f'position {arg}\n')

    def get_next_move(self, pos):
        """runs the position command, returns the 'bestmove' output

        Parameters:
            pos (gamestate.Position): represents the game state
        Returns:
            (str): the 'bestmove' output of stockfish. e.g. 'e2e4'
        """
        self._position(str(pos))
        next_move = self._go()['bestmove']

        return next_move

    def _set_option(self, **options):
        """runs 'setoption' command, returns None"""
        for key, val in options.items():
            key = key.replace('_', ' ')
            self._write_to_proc(f'setoption name {key} value {val}\n')

    def set_difficulty(self, lvl):
        """
        sets the Skill Level option for the browser, returns None

        Parameters:
            lvl (int): an int from 1 to 5 representing the difficulty
        """
        if int(lvl) < 1 or int(lvl) > 5:
            warnings.warn('difficulty not set: the \'lvl\' parameter of set_difficulty() must be between 1 and 5 (inclusive)')
            return

        skill_level = (int(lvl) * 5) - 5  # maps lvl to 0, 5, 10, 15, 20
        self._config['difficulty'] = skill_level

        self._set_option(Skill_Level=self._config['difficulty'])

    def new_game(self):
        self._ucinewgame()

# for debugging purposes
# print(StockfishProcess(r'..\..\..\Stockfish\Windows\stockfish_20011801_x64.exe').set_difficulty(0))