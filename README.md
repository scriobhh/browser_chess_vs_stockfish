# BrowserChessVsStockfish
An app that lets you play chess in the browser vs the stockfish chess engine.

### Installation:
- Python 3.8
- Django 3.0.8
- Requires a stockfish executable named 'stockfish.exe' inside the Stockfish folder
- Put the path to this stockfish.exe file in consts.py
- Put a new secret key in settings.py (django.core.management.utils.get_random_secret_key())

### Credits:
- Cburnett's svg images (https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces)
- Stockfish chess engine (https://github.com/official-stockfish/Stockfish)
- Django framework (https://github.com/django/django)
