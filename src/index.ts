import {WebSocketServer,WebSocket} from "ws"
import {createClient} from "redis"

const publishClient = createClient(); 
publishClient.connect();

const subscribeClient =createClient(); 
subscribeClient.connect();

 
const port:number = 8081
const wss = new WebSocketServer({port})

console.log(`port number -> ${port}`)

const subscription:{[key:string]:{
    ws:WebSocket,
    rooms:string[]
}} = {
    
}

//setInterval(()=>{
//    console.log(subscription);
//},5000)

wss.on('connection',function connection(ws){
    const id = randomId();
    subscription[id] = {
        ws,
        rooms:[]
    }
    ws.on('message',function message(data:string){
        const parsedMessage = JSON.parse(data as  string) 
        if(parsedMessage.type === "SUBSCRIBE"){
            subscription[id].rooms.push(parsedMessage.room) 
            if(oneUserSubscribeTo(parsedMessage.room)){
                console.log(`subscribed on the pubsub to room ${parsedMessage.room}`)
                subscribeClient.subscribe(parsedMessage.room,(message)=>{
                    const parsedMessage = JSON.parse(message)
                    Object.keys(subscription).forEach((userId)=>{
                        const {ws,rooms} = subscription[userId];
                        if(rooms.includes(parsedMessage.roomId)){
                            ws.send(parsedMessage.message)
                        }
                    })
                }) 
            } 
        }

        if(parsedMessage.type === "UNSUBSCRIBED"){
            subscription[id].rooms = subscription[id].rooms.filter(x => x !== parsedMessage.room)
            if(lastPersonLeftRoom(parsedMessage.room)){ 
                console.log(`unsubscribed on the pubsub to room ${parsedMessage.room}`)
                subscribeClient.unsubscribe(parsedMessage.room)
            }
        }
        if(parsedMessage.type === "sendMessage"){
            const message = parsedMessage.message;
            const roomId = parsedMessage.roomId;
            
            publishClient.publish(roomId,JSON.stringify({
                type:"sendMessage",
                roomId,
                message
            }))
        }
    })
})

function randomId(){
return Math.random()
}

function oneUserSubscribeTo(roomId:string){
    let totalInterestedPeople = 0;
    Object.keys(subscription).map(userId=>{
        if(subscription[userId].rooms.includes(roomId)){
           totalInterestedPeople++; 
        }
    })
    if(totalInterestedPeople === 1){
        return true;
    }
    else{
        return false;
    }
}

function lastPersonLeftRoom(roomId:string){
    let totalInterestedPeople = 0;
    Object.keys(subscription).map(userId=>{
        if(subscription[userId].rooms.includes(roomId)){
           totalInterestedPeople++; 
        }
    })
    if(totalInterestedPeople === 0){
        return true;
    }
    else{
        return false;
    }
}
