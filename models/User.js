const mongoose = require('mongoose');

const UserSchema =  new mongoose.Schema({
    userName: {type:String, trim:true, unique: true, required:true},
    password: {type: String, required: true},
    firstName: {type: String, required: true},
    lastName: {type: String, required:true},
    userLevel: {type: Number, required: true, default: 2},
    date_created: {type: Date, default: Date.now}
}, {collection: 'Users'});

const User = mongoose.model('User', UserSchema);

module.exports = User;