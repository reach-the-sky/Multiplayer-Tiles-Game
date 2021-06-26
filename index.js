const http = require("http");
const app = require("express")();
const WebSocketServer = require("websocket").server;
let connection;
let clients = {};
let games = {};

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html")
})

app.listen(8081, () => { console.log("listening on 8081") })

const httpServer = http.createServer();

httpServer.listen(8080, () => { console.log("Http server created at 8080") })

const webSocket = new WebSocketServer({
    "httpServer": httpServer
})

webSocket.on("request", request => {
    connection = request.accept("echo-protocol", request.origin);
    console.log(`request origin ${request.origin}`)

    connection.on("open", () => { console.log("Connection open") })
    connection.on("close", () => {
        console.log(`Connection Closed`)

    })
    connection.on("message", message => {
        const request = JSON.parse(message.utf8Data)

        // create
        if (request.method === "create") {
            const clientId = request.clientId
            const gameId = guid()

            console.log("Client Requested to create a game")

            games[gameId] = {
                "id": gameId,
                "balls": 21,
                "start": false,
                "timer": 30,
                "state":{},
                "clients": []
            }

            const payload = {
                "method": "create",
                "gameId": games[gameId],
            }

            const con = clients[clientId].connection;
            con.send(JSON.stringify(payload))
        }

        // join
        if (request.method === "join") {
            const clientId = request.clientId;
            const gameId = request.gameId;
            const game = games[gameId];

            if (game.clients.length == 3) {
                return
            }

            const color = { 0: "Red", 1: "Green", 2: "Blue" }[game.clients.length]

            game.clients.push({
                "clientId": clientId,
                "userName": request.userName,
                "color": color
            });

            const payload = {
                "method": "join",
                "game": game
            }

            game.clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payload))
            });
            updateState();
        }

        // play
        if (request.method === "play") {
            console.log("Play request received from client");
            if (games[request.gameId].start) {
                const gameId = request.gameId;
                const ballId = request.ballId;
                const game = games[gameId];
                const playerColor = request.color;

                let state = game.state;
                state[ballId] = playerColor;
                games[gameId].state = state;
            }
        }

        // start
        if (request.method === "start") {
            console.log("Start game request received");
            games[request.gameId].start = request.start;
        }
    })

    // connect
    const clientId = guid();
    clients[clientId] = {
        "connection": connection
    };

    const payload = {
        "method": "connect",
        "clientId": clientId
    }
    connection.send(JSON.stringify(payload))
})

function updateState() {
    for (const g of Object.keys(games)) {
        const game = games[g];

        if (game.start) {
            const payload = {
                "method": "update",
                "game": game,
            }
            if (game.clients.length == 0)
                continue
            game.clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payload))
            })
            game.timer -= 0.05;
            if(games[g].timer < 0){
                games[g].start = false
                decideWinner(g);
            }
        }
    }
    setTimeout(updateState, 100);
}


function decideWinner(g){
    let colorCount = {}
    const state = games[g].state;
    for(const col of Object.keys(state)){
        if(!colorCount[state[col]])
        colorCount[state[col]] = 0
        colorCount[state[col]] += 1
    }

    // communication
    games[g].clients.forEach(c => {
        const payload = {
            "method": "winner",
            "ranking": colorCount
        }
        clients[c.clientId].connection.send(JSON.stringify(payload))
    })
}


function S4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

// then to call it, plus stitch in '4' in the third group
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();