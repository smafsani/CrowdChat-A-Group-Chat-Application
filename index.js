require("dotenv").config();
const express = require("express");
const path = require("path");
const cookie = require("cookie");
const bodyParser = require('body-parser');
const Users = require("./modules/User");
const Messages = require("./modules/Message");
const mongoose = require("mongoose");
const http = require("http");
const url = require("url");
const socketio = require('socket.io');
const formatMessage = require("./utils/messages");
const jwt = require("jsonwebtoken");
const checkLogin = require("./middlewares/checkLogin");
const cookieParser = require("cookie-parser");
const checkLoginCookie = require('./middlewares/checkLoginCookie');
const moment = require('moment');
// const Qs = require('qs');
const app = express();

server = http.createServer(app);
const io = socketio(server);

app.set('socketio', io);

let full_name = "Username";

function getDecodedName(data_token){
    // console.log(data_token);
    try {
        let decodedToken = jwt.verify(data_token, process.env.JWT_SECRET);
        // console.log(decodedToken);
        let decodedName = decodedToken.name;
        decodedName = decodedName;
        let decodedEmail = decodedToken.email;
        
        if(decodedName.length < 1){
            decodedName = "Unknown";
        }
        return {decodedName, decodedEmail};
    } catch (error) {
        return "Unknown";
    }
}
let room_id = "Asd23dc";
io.on("connection", socket=>{
    socket.on("joinRoom", ({room}) => {
        socket.join(room);
    });

    socket.on("chatMessage", async (data) => {
        msg = data.msg;
        data_token = data.data_token;
        const query_room = url.parse(socket.handshake.headers.referer, true).query.room;
        if(query_room){
            room_id = query_room;
        }
        // console.log(msg, data_token);
        const {decodedName, decodedEmail} = getDecodedName(data_token);
        const decodedNameHalf = decodedName.split(' ')[0];
        const timeNow = moment().format("YYYY-MM-DD h:mm a");

        let messagesList = await Messages.find({room_id: room_id}).lean();
       
        messagesList = messagesList[0]['messages'];
        const newMessage = [
            decodedEmail,
            decodedName,
            msg,
            timeNow
        ];
        messagesList.push(newMessage);
        let MessagesUpdate = await Messages.updateOne(
            {room_id: room_id},
            {$set: {messages: messagesList}});
        // console.log(socket.rooms);
        socket.emit("message", {message: formatMessage(decodedNameHalf, msg), side: "right-side"});
        socket.broadcast.to(room_id).emit("message", {message: formatMessage(decodedNameHalf, msg), side: "left-side"});
    });

    socket.on("userDisconnected", ()=>{
        const data_token = getTokenFromCookie(socket);
        const decodedName = getDecodedName(data_token).decodedName;
        const query_room = url.parse(socket.handshake.headers.referer, true).query.room;
        let room_id = "";
        if(query_room){
            room_id = query_room;
        }
        socket.to(room_id).emit("message", {message: formatMessage("CrowdChat", "You had left the chat"), side: "right-side"});
        socket.broadcast.to(room_id).emit("message", {message: formatMessage("CrowdChat", `${decodedName} has left the chat`), side: "left-side"});
    });
});

function getTokenFromCookie(socket){
    try {
        let cookie_ = socket.handshake.headers.cookie;
        // console.log("\n\n"+(typeof cookie_)+"\n\n");
        if(typeof cookie_ !== 'string')
            cookie_ = " ";
        const cookies = cookie.parse(cookie_);
        data_token = cookies[process.env.TOKEN_NAME];
        // console.log(data_token);
        return data_token;   
    } catch (error) {
        console.log(error);
        return "";
    }
}

const PORT = process.env.PORT || 3000;
const DB_CONENCTION = process.env.DB_CONENCTION;

let loginError = 0;
let loginErrorMessage = "";
let registerError = 0;
let registerErrorMsg = "";
let loginErrorEmail = "";

app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(express.static(__dirname+'/views'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

const chatRoute = require("./routes/chat");
const User = require("./modules/User");
app.use("/chat", chatRoute);

app.get("/", checkLoginCookie, (req, res) => {
    if(req.verified == 1){
        res.redirect('/chat');
    }else{
        res.render("index", {loginError:loginError, loginErrorMessage:loginErrorMessage, loginErrorEmail:loginErrorEmail});
    }
});
app.post("/login", async (req, res) =>{
    
    try {
        const email = req.body.email;
        const password = req.body.password;
        const loginUser = await Users.findOne({email, password}).lean();
        
        if(loginUser == null){
            //res.status(400).send("User Not Found");
            loginError = 1;
            loginErrorMessage = "Invalid email or password";
            res.redirect('/');
        }
        else if(loginUser.email === email && loginUser.password === password ){
            const user_ID = loginUser._id;
            const token = jwt.sign({
                email: loginUser.email,
                userID: loginUser._id,
                name: loginUser.name
            }, process.env.JWT_SECRET, {
                expiresIn: '1h'
            });
            full_name = loginUser.name;
            
            const updateUserToken = await Users.updateOne(
            {_id: user_ID},
            {$set: {token: token}}
            );
            
            res.cookie(process.env.TOKEN_NAME, token, {
                expires: new Date(Date.now() + 3600000),
                httpOnly: false
            });
            res.cookie(process.env.USER_NAME, full_name, {
                expires: new Date(Date.now() + 3600000),
                httpOnly: false
            });
            res.status(200).redirect(`chat`);
        }
        else{
            //res.status(400).send("User Not Found");
            loginError = 1;
            loginErrorMessage = "Invalid email or password!";
            res.redirect('/');
        }
        
    } catch (error) {
        //res.status(400).send("Unknown Error Occurred!");
        loginError = 1;
            loginErrorMessage = "Unknown Error Occurred!";
            res.redirect('/');
    }
});

app.get("/register", checkLoginCookie, (req, res)=>{
    if(req.verified == 1){
        res.redirect('/chat');
    }else{
        res.render("register", {registerError, registerErrorMsg});
    }
});

app.post("/register", async (req, res)=>{
    try {
        const userE = req.body.email;
        const userFN = req.body.fullname;
        const userP = req.body.password;

        const isRegistered = await Users.find({email: userE});
        if(isRegistered.length > 0){
            registerError = 1;
            registerErrorMsg = "This email is already registered.";
            res.redirect("/register")
        }
        else if(userP.length < 8){
            registerError = 1;
            registerErrorMsg = "Password must contain atleast 8 characters.";
            res.redirect("/register");
        }
        else{
            const newUser = new Users({
                name: userFN,
                email: userE,
                password: userP
            });
            const savedUser = await newUser.save();
            // console.log(savedUser);
            res.redirect("/");
        }

    } catch (error) {
        registerError = 1;
            registerErrorMsg = "Authentication Error.";
            res.redirect("/register");
    }

});

app.get("/logout", (req, res) => {
    res.clearCookie(process.env.TOKEN_NAME);
    res.clearCookie(process.env.USER_NAME);
    res.redirect("/");
});

const errorHandler = (err, req, res, next) => {
    if(res.headersSent){
        return next(err);
    }
    if(err[0] == 101){
        res.redirect("/");
    }else{
        res.status(500).send(err);
    }
};
app.use(errorHandler);

mongoose.connect(process.env.DB_CONNECTION, 
    {useNewUrlParser: true},
    ()=>{console.log("Connected to DB!");
});

server.listen(PORT, () => {
    console.log(`Server is listening at http://127.0.0.1:${PORT}`);
});