const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./User');

const DriveSchema = new mongoose.Schema({
    description: {type: String, required:false, max:31},
    customer: {type: Schema.Types.ObjectId, ref: User, required: true, unique: true},
    price: {type: Number, required: true, min:0},
    pos1_lat: {type: Number, required: true},
    pos1_lng: {type: Number, required: true},
    pos2_lat: {type: Number, required: true},
    pos2_lng: {type: Number, required: true},
    driver: {type: Schema.Types.ObjectId, ref: User, required: false, unique: false, default:null},
    startPoint: {type:String, required:true},
    finishPoint: {type:String, required:true},
    driveTime:{type:Number, required:true},
});

const Drive = new mongoose.model("Drive", DriveSchema);

module.exports = Drive;