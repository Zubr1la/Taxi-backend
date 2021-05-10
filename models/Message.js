const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./User');

const MessageSchema = new mongoose.Schema({
    senderID: {type: Schema.Types.ObjectId, ref: User, required: true, unique: false},
    receiverID: {type: Schema.Types.ObjectId, ref: User, required: true, unique: false},
    data:{type: String, required:true, max:255},
    senderDel:{type:Boolean, required:false, default:false},
    receiverDel:{type:Boolean, required:false, default:false},
    date_created: {type: Date, default: Date.now}

});

const Message = new mongoose.model("Message", MessageSchema);

module.exports = Message;