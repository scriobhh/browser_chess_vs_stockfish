const baseUrl = window.location.href;

// from Django docs:
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const csrftoken = getCookie('csrftoken');


// send ajax request to server and return Stockfish's bestmove response
async function getStockfishNextMove(difficulty, fen) {
    let nextmove;

    let response = await fetch(`${baseUrl}get_move/`, {
        method: 'POST',
        headers: {
            'X-REQUESTED-WITH': 'XMLHttpRequest',
            'X-CSRFToken': csrftoken,
            'Content-Type': 'text/json'
        },
        body: JSON.stringify({
            'difficulty': difficulty,
            'fen': fen,
        }),
    });
    
    let json = await response.json();

    nextmove = json.nextmove;

    console.log(json);

    return nextmove;
}


export { getStockfishNextMove };
