const mongoose = require("mongoose");

const messagesSchema = mongoose.Schema({
    room_id: {
        type:String,
        required:true
    },
    messages: {
        type: [[String]]
    }
});

module.exports = mongoose.model("Messages", messagesSchema);