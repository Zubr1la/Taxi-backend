const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./User');

const MoneySchema = new mongoose.Schema({
    userID: {type: Schema.Types.ObjectId, ref: User, required: true, unique: true},
    balance: {type: Number, required: true, default:0},
    cardNo:{type: String, required:true, length: 16},
});

const Money = new mongoose.model("Money", MoneySchema);

module.exports = Money;