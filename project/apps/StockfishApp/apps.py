from django.apps import AppConfig
import threading
import logging, sys
from project.apps.StockfishApp import stockfishdispatcher

# set logging config when module loads
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO
)


class StockfishappConfig(AppConfig):
    name = 'project.apps.StockfishApp'

    def ready(self):
        dispatcher = threading.Thread(
            target=stockfishdispatcher.run,
            daemon=True
        )
        dispatcher.start()
        logging.info('STARTED STOCKFISHDISPATCHER.RUN() THREAD')
