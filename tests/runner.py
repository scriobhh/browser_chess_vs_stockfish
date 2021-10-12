# TODO: find out why this seems to run multiple test suites

import unittest

from tests import gamestate_tests
from tests import stockfishprocess_tests

loader = unittest.TestLoader()
suite = unittest.TestSuite()

suite.addTests(loader.loadTestsFromModule(gamestate_tests))
suite.addTests(loader.loadTestsFromModule(stockfishprocess_tests))

runner = unittest.TextTestRunner(verbosity=3)
runner.run(suite)
