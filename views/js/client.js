const chatForm = document.getElementById('send-message');
const chatMessages = document.querySelector(".messages");
const joinForm = document.getElementById("join-room-form-id");


const socket = io();

const {room} = Qs.parse(location.search, {
    ignoreQueryPrefix: true
});
// Join Chatroom
socket.emit("joinRoom", {room});


let cookeiOfToken = document.cookie;
// document.cookie = "nansadsd=asdasd";
let data_token = "";
cookeiOfToken = cookeiOfToken.split(";");
cookeiOfToken.forEach(element => {
    element = element.split('=');
    if(element[0].replace(' ', '') == 'akejmbnaskld'){
        data_token = element[1];
    }
});
// console.log(data);
socket.on("message", (data) => {
    message = data['message'];
    side = data['side'];
    // console.log(message, side);
    outputMessageFormat(message, side);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = e.target.elements.messageInput.value;
    
    if(msg.length > 0){
        socket.emit("chatMessage", {msg, data_token});

        e.target.elements.messageInput.value = "";
    }
    e.target.elements.messageInput.focus();
});

function outputMessageFormat(message, side){
    // console.log(message);
    let div = document.createElement("div");
    div.classList.add("message-box", side);
    div.innerHTML = 
        `<div class="msg">
            <p class="msg-info"><span class="name">${message.username}</span><span class="time">${message.time}</span></p>
            <p class="msg-p">${message.text.replace(/\n/g, "<br/>")}</p>
        </div>`;
    chatMessages.appendChild(div);
}
window.onload = ()=>{
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
