const express = require("express");
const router = express.Router();
const Rooms = require("../modules/Room");
const Messages = require("../modules/Message");
const checkLogin = require("../middlewares/checkLogin");
const jwt = require("jsonwebtoken");
const generateRandomString = require("../utils/generate_id");
const moment = require("moment");

let createRoom = 0, joinRoom = 0; 
let room_id = "";
let create_room_id = "";
let rooms = [];
let joined_rooms_id = []
let current_room = -1;
let current_room_users = [];
let current_room_users_name = [];
let joinError = 0;
let joinError_msg = "";

function getUserEmail(token){
    try {
        let decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        // console.log(decodedToken);
        let decodedName = decodedToken.email;
        
        if(decodedName.length < 1){
            decodedName = "";
        }
        return decodedName;
    } catch (error) {
        return "";
    }
}
router.get("/", checkLogin, async(req, res) => {
    if(createRoom == 1 && joinRoom == 1){
        createRoom = joinRoom = 0;
    }
    const token_ = req.cookies[process.env.TOKEN_NAME];
    const userEmail = getUserEmail(token_);
    // userEmail = "";
    if(userEmail == ""){
        res.status(404).send("<h1>Data Not Found</h1>");
    }
    const userRooms = await Rooms.find({joined: userEmail}, {room_id: 1, room_name: 1, _id: 0}).lean();
    // console.log(userRooms);
    rooms = Object.values(userRooms).map(value => {return value['room_name'];});
    joined_rooms_id = Object.values(userRooms).map(value => {return value['room_id'];});
    if(joined_rooms_id.length < 1){
        res.render("../views/chat", {createRoom: createRoom, RoomID: room_id, joinRoom: joinRoom, rooms: [], current_room: current_room, room_ids: [], messages: [], roomName: "", created_room_id: "", joinError: 0, joinError_msg: ""});
        return;
    }
    else{
        if(current_room == -1){
            current_room = 0;
            res.redirect(`?room=${joined_rooms_id[current_room]}`);
            return;
        }
        else{
            let current_room_id = joined_rooms_id[current_room];
            if(req.query.room){
                if(joined_rooms_id.includes(req.query.room)){
                    current_room_id = req.query.room;
                }
                else{
                    res.redirect("/");
                    return;
                }
            }
            else{
                res.redirect(`?room=${joined_rooms_id[0]}`);
                return;
            }
            let messages = await Messages.find({room_id: current_room_id}, {messages: 1, _id: 0});
            let roomName = await Rooms.findOne({room_id: current_room_id}, {room_name: 1, _id: 0});
            // roomName = Object.values(roomName).map(value => {return value;})
            roomName = roomName.get('room_name');
            if(!roomName){
                roomName = "";
            }
            let all_messages = messages[0]["messages"];
            all_messages.forEach(element => {
                if(element[0] == userEmail)
                    element[0] = 1;
                else
                    element[0] = 0;
            });
            // const nameofUSer = req.name.split(' ')[0] || "";
            res.render("../views/chat", {createRoom: createRoom, RoomID: current_room_id, joinRoom: joinRoom, rooms: rooms, current_room: current_room, room_ids: joined_rooms_id, messages: all_messages, roomName: roomName, created_room_id: create_room_id, joinError: joinError, joinError_msg: joinError_msg});
            return;
        }
    }
}); 

router.get("/create-room", async (req, res) => {
    const token = req.cookies[process.env.TOKEN_NAME];
    const userEmail = getUserEmail(token);
    let newRoomId = "";
    while(true) {
        newRoomId = (userEmail.split('@')[0])+generateRandomString();
        const roomInfo = await Rooms.find({room_id: newRoomId}).lean();
        if(roomInfo.length < 1){
            break;
        }
    }
    // console.log(newRoomId);
    create_room_id = newRoomId;
    createRoom = 1;
    res.redirect("/chat");
});

router.post("/create-new-room", async (req, res)=>{
    // console.log(create_room_id);
    const room_name = req.body.room_name;
    const room_id_new = req.body.room_id_new;
    const room_sec_key = req.body.room_password;
    const token = req.cookies[process.env.TOKEN_NAME];
    const userEmail = getUserEmail(token);
    const joined = [userEmail];
    if(room_id_new != create_room_id){
        res.status(404).send("<h1>Authentication Failed!</h1>");
    }
    else{
        const newRoom = new Rooms({
            room_id: room_id_new,
            room_name: room_name,
            secret_key: room_sec_key,
            joined: joined
        });
        const newMessage = new Messages({
            room_id: room_id_new,
            messages: [[
                "noreply@gmail.com",
                "Crowd Chat",
                `Room '${room_name}' is created.`,
                `${moment().format("YYYY-MM-DD h:mm a")}`
            ]]
        });
        try {
            const savedRoom = await newRoom.save();
            const savedMessage = newMessage.save();
            createRoom = 0;
            console.log("Saved");
            res.redirect(`/chat?room=${room_id_new}`);
        } catch (error) {
            res.status(404).send("<h1>Authentication Failed!</h1>");
        }
    }
});

router.get("/cancel-room", (req, res) => {
    room_id = "";
    createRoom = 0;
    joinRoom = 0;
    res.redirect("/chat");
});


router.get("/join-room", (req, res) => {
    joinRoom = 1;
    res.redirect("/chat");
});
router.post("/apply-join-room", async (req, res) => {
    const room_id_value = req.body.room_name2;
    const room_sec_key_value = req.body.room_password2;
    const token = req.cookies[process.env.TOKEN_NAME];
    const userEmail = getUserEmail(token);
    try {
        const checkRoom = await Rooms.find({room_id: room_id_value, joined: userEmail});
        
        if(checkRoom.length > 0){
            joinError = 1;
            joinError_msg = "You already joined in this room";
            res.redirect(`/chat?room=${room_id}`);
        }
        else{
            const searchedRoom = await Rooms.findOne({room_id: room_id_value});            
            // console.log(searchedRoom != null);
            if(searchedRoom == null || searchedRoom.secret_key != room_sec_key_value){
                joinError = 1;
                joinError_msg = "Invalid room-id or secret key.";
                res.redirect(`/chat?room=${room_id}`);
            }
            else{
                let joinedUsers = searchedRoom.joined;
                let joinedUsersList = [];
                Object.values(joinedUsers).map(value =>{
                    joinedUsersList.push(value);
                });
                joinedUsersList.push(userEmail);
                joinRoom = 0;
                joinError = 0;
                joinError_msg = "";
                const updateRoom = await Rooms.updateOne({room_id: room_id_value}, {$set: {joined: joinedUsersList}});
                res.redirect(`/chat?room=${room_id_value}`);
            }
        }
    } catch (error) {
        res.status(404).send("<h1>Authentication Error!</h1><br>"+error)
    }    

});

router.get("/leave-room", async (req, res) => {
    const token = req.cookies[process.env.TOKEN_NAME];
    const userEmail = getUserEmail(token);
    const room = req.query.room;
    
    const isValid = await Rooms.findOne({room_id: room, joined: userEmail}, {joined: 1, _id: 0});
    let newJoinedData = [];
    if(isValid != null){
        isValid['joined'].forEach(element => {
            if(element != userEmail){
                newJoinedData.push(element);
            }
        });
        const updated = await Rooms.updateOne({room_id: room}, {$set: {joined: newJoinedData}});
        res.redirect("/");
    }
    else{
        res.send("<h1>Authentication Failed!</h1>");
    }
});


module.exports = router;