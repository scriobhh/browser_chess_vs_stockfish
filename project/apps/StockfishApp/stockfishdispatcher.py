# TODO: add graceful error handling for failed threads/processes, implement timeouts to catch process hanging on read
# TODO: write tests for this module

import time
import queue
import threading
import logging
from .stockfishprocess import StockfishProcess
from .consts import STOCKFISH_PATH

_MAX_PROCESS_COUNT = 10

_INPUTS = queue.Queue()

_PROCESS_POOL = queue.Queue(_MAX_PROCESS_COUNT)
for _ in range(_MAX_PROCESS_COUNT):
    _PROCESS_POOL.put(StockfishProcess(STOCKFISH_PATH))

_RETURN_VALUES = {}  # maps Position objects to return values from get_next_move
                     # use hash() on each Position to get a unique key for each position


# run() continuously loops in its' own daemon thread started in the apps.py AppConfig.ready() method
def run():
    """continuously runs in background on server, dispatches inputs to handler function"""
    while True:
        req = _INPUTS.get()
        proc = _PROCESS_POOL.get()

        threading.Thread(
            target=_input_handler,
            args=(proc, req),
            daemon=True
        ).start()

        # time.sleep(5)  # for debugging purposes


def _input_handler(proc, req):
    """
    runs get_next_move method on proc
    outputs return value to _RETURN_VAUES with unique key so that it can be retrieved
    """
    # by the time execution gets here proc and pos should be guaranteed to be accessible to one thread only
    proc.new_game()
    proc.set_difficulty(req['difficulty'])
    next_move = proc.get_next_move(req['fen'])
    _PROCESS_POOL.put(proc)
    _RETURN_VALUES[hash(req['fen'])].put(next_move)

    return  # thread ends when function returns


def get_next_move(req):
    """
    takes Position and puts it in _INPUTS queue where it will be handled in the run() function

    Parameters:
        pos (Position): position for stockfish process to calculate next move

    Returns:
        next_move (str): the 'bestmove' output of the stockfish process (e.g. 'e2e4')
    """
    _RETURN_VALUES[hash(req['fen'])] = queue.Queue(1)
    _INPUTS.put(req)
    next_move = _RETURN_VALUES[hash(req['fen'])].get()
    del _RETURN_VALUES[hash(req['fen'])]

    logging.info(f'next_move: {next_move}\n_RETURN_VALUES: {_RETURN_VALUES}')

    return next_move
