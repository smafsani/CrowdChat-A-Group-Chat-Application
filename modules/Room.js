const mongoose = require("mongoose");

const roomSchema = mongoose.Schema({
    room_id: {
        type: String,
        required: true
    },
    room_name: {
        type: String
    },
    secret_key: {
        type: String
    },
    joined: {
        type: [String]
    }
});

module.exports = mongoose.model("Rooms", roomSchema);