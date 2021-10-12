from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.http import HttpResponseBadRequest
from . import stockfishdispatcher
from .gamestate import Position
import json
from .exceptions import InvalidPositionException
import logging, sys

# set logging config when module loads
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO
)


# Create your views here.
def index(request):
    return render(request, 'StockfishApp/chessboard.html')

def stockfish_next_move(request):
    # make sure there is a JSON response for if the fen string failed to make a Position or if StockfishProcess failed to provide response
    # TODO: add tests for stockfishdispatcher

    # create new Position object with the fenstring from the request body
    # send new fenstring to stockfishdispatcher and wait for a response
    # package response into JsonResponse and return it to the client

    # input: {'difficulty': <1-5>, 'fen': '<FENSTRING>'}
    # output: {'nextmove': '<NEXT_MOVE>'}

    # http status 408 = method timeout
    # http status 400 = bad request

    if not request.is_ajax() or not request.method == 'POST':
        return HttpResponseBadRequest('request must be an ajax HTTP POST request with json of the form "{"fen": "<FENSTRING>"}"')

    logging.info(f'received ajax request{request.body.decode()}')
    try:
        # TODO: find out if necessary to sanitize JSON request
        data = json.loads(request.body.decode())
        difficulty = int(data['difficulty'])
        pos = Position(data['fen'])
        req = {'difficulty': difficulty, 'fen': pos}
    except json.JSONDecodeError:
        return HttpResponseBadRequest('failed to deserialize json')
    except InvalidPositionException:
        return HttpResponseBadRequest('invalid fenstring')

    next_move = stockfishdispatcher.get_next_move(req)

    res = JsonResponse(
        {
            'nextmove': next_move,
        }
    )

    print(res.content)

    return res
