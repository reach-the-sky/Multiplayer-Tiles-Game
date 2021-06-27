let clientId = null;
let gameId = null;
let playerColor = null;
let ballCount = 0;
let clientsColorName = {};

const ws = new WebSocket("ws://localhost:8080", "echo-protocol")

const inputGameId = document.getElementById("textGameId")
const frame1 = document.getElementById("frame1")
const frame2 = document.getElementById("frame2")
const frame3 = document.getElementById("frame3")


const buttonCreate = document.getElementById("create")
const buttonJoin = document.getElementById("join")
const buttonLeave = document.getElementById("leave")
const divPlayers = document.getElementById("players")
const divBoard = document.getElementById("board")
const buttonStart = document.getElementById("start")
const buttonReset = document.getElementById("reset")
const textTimer = document.getElementById("timer")


buttonCreate.addEventListener("click", e => {
    const payload = {
        "method": "create",
        "clientId": clientId
    }
    ws.send(JSON.stringify(payload))
    buttonStart.disabled = false
    buttonReset.disabled = true
})

buttonJoin.addEventListener("click", e => {
    console.log(gameId)
    gameId = inputGameId.value;
    if (gameId == null)
        gameId = inputGameId.value
    const payload = {
        "method": "join",
        "clientId": clientId,
        "gameId": gameId,
        "userName": document.getElementById("username").value
    }
    ws.send(JSON.stringify(payload))
    console.log("Join request sent to server")
})

buttonLeave.addEventListener("click",e => {
    const payload = {
        "method":"leave",
        "clientId":clientId,
        "gameId":gameId
    }
    ws.send(JSON.stringify(payload))
    location.reload()
})

buttonStart.addEventListener("click", e => {
    if (gameId == null) {
        alert("Create a new game.")
        return
    }
    const payload = {
        "method": "start",
        "gameId": gameId,
        "start": true
    }
    ws.send(JSON.stringify(payload))
})

buttonReset.addEventListener("click",e => {
    if(gameId == null){
        alert("The Game has been stopped, Create a new game.")
    }
    const payload = {
        "method": "reset",
        "gameId": gameId
    }
    ws.send(JSON.stringify(payload))
    console.log("Reset request sent")
})

ws.onmessage = message => {
    const response = JSON.parse(message.data);

    // connect
    if (response.method === "connect") {
        clientId = response.clientId;
        console.log("Client ID: " + clientId)
    }

    //create
    if (response.method === "create") {
        gameId = response.gameId.id;
        inputGameId.value = gameId;
        console.log("Game Created with id " + gameId + " with " + response.gameId.balls + " balls")

        // Change frame
        frame1.style.display = "none";
        frame2.style.display = "grid";
    }

    // join
    if (response.method === "join") {
        console.log("join accept from server")
        document.querySelector(".Container").style.display = "none";
        frame3.style.display = "unset";
        
        console.log("Join method received")
        const game = response.game


        divPlayers.innerHTML = "<h1>Players</h1>"
        let playerCount = 1
        game.clients.forEach(c => {
            if (c.clientId === clientId){
                divPlayers.innerHTML += `<div style="color:${c.color}"><p>You - Player${playerCount}</p></div>`
            }
            else{
                divPlayers.innerHTML += `<div style="color:${c.color}"><p>${c.userName} - Player${playerCount}</p></div>`
            }
            
            playerCount++;
            clientsColorName[c.color] = c.userName
            console.log(c.clientId)
            if (c.clientId === clientId)
                playerColor = c.color;
        });

        textTimer.innerHTML = "Time - " + Math.round(response.game.timer);

        divBoard.innerHTML = ""
        while (ballCount < game.balls) {
            const b = document.createElement("button");
            b.id = "ball" + ballCount
            b.className = "ball"
            b.tag = ballCount
            // b.textContent = ballCount
            b.addEventListener("click", e => {
                console.log("Client Clicked the button")
                const payload = {
                    "method": "play",
                    "clientId": clientId,
                    "gameId": gameId,
                    "ballId": b.tag,
                    "color": playerColor
                }
                ws.send(JSON.stringify(payload))
            });
            divBoard.append(b);
            ballCount += 1
        }
        ballCount = 0;
    }

    // update
    if (response.method == "update") {
        const state = response.game.state;
        if (!response.game.state)
            return
        textTimer.innerHTML = "Time - " + Math.round(response.game.timer);
        // console.log(`state: ${state}`)
        for (const b of Object.keys(state)) {
            const tempColor = state[b]
            document.getElementById("ball" + b).style.backgroundColor = tempColor;
        }
    }

    if (response.method === "winner") {
        const ranks = response.ranking;
        divPlayers.innerHTML = `<h1>Score</h1>`
        for (const r of Object.keys(ranks)) {
            const username = clientsColorName[r];
            if(ranks[r][1] == clientId){
                divPlayers.innerHTML += `<div style="color:${r}"><p>You - ${ranks[r][0]}</p></div>`;
                continue;    
            }
            divPlayers.innerHTML += `<div style="color:${r}"><p>${username} - ${ranks[r][0]}</p></div>`
        }
        buttonReset.disabled = false;
    }

}

function frame1Join(){
    frame1.style.display = "none";
    frame2.style.display = "grid";
}

function copy(){
    inputGameId.select();
    inputGameId.setSelectionRange(0,99999);
    document.execCommand("copy");
}