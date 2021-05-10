const express = require('express');
const router = express.Router();
const Money = require('../models/Money');
const validate = require('../middleware/validate');

router.post('/', validate(),async (req, res) => {
    const {cardno, secret, name, lastName, option} = req.body;
    const userData = req.userdata;

    const exists = await Money.findOne({userID: userData.id});
    if (exists&&option===0){
        await res.json({
            success: false,
            message: "You already have bank card information added!"
        });
        return;
    }

    if (!exists&&option===1){
        await res.json({
            success: false,
            message: "No bank card information added!"
        });
        return;
    }

    if (cardno.length!==16){
        await res.send({
            success: false,
            message: "Card number should be 16 symbols in length!"
        });
        return;
    }

    if (secret.length!==3){
        await res.send({
            success: false,
            message: "Security code should be 3 symbols in length!"
        });
        return;
    }


    if (!name || !lastName || !cardno || !secret){
        await res.send({
            success: false,
            message: "All fields should be filled in!"
        });
        return;
    }
    if(option===0){
        const newMoney = new Money({
            userID:userData.id,
            cardNo:cardno,
            secretNum:secret,
            name:name,
            lastName:lastName

        });
        newMoney.save( function (err, doc) {
            if (err){
                res.send({
                    success: false,
                    message: "Error adding bank card information!"
                });
                console.log(err);
                return
            }

            if (doc){
                res.send({
                    success: true,
                    message: "Card information added!"
                })
            }
        });
    }else if(option===1){
        Money.findOneAndUpdate({userID:userData.id},{cardNo: cardno,secretNum:secret, name:name, lastName:lastName }, [],function (err) {
            if (err){
                console.log(err);
                res.send({
                    success:false,
                    message:"Error editing bank card data!"
                });
                return
            }
            res.send({
                success: true,
                message: "Card data edited successfully!"
            })
        })
    }
});

router.post('/addmoney', validate(), async function(req, res){
    const {moneyTop} = req.body;
    const userData = req.userdata;
    let balToUpdate;
    const findMoney = await Money.findOne({userID:userData.id});
    if (!findMoney) {
        res.send({
            success: false,
            message: "You dont have bank card data added!"
        });
        return;
    }else {
        balToUpdate = (parseFloat(findMoney.balance)+parseFloat(moneyTop)).toFixed(2);
    }

    Money.findOneAndUpdate({userID:userData.id},{balance: balToUpdate}, [],function (err) {
        if (err){
            console.log(err);
            res.send({
                success:false,
                message:"Error depositing money!"
            });
            return
        }
        res.send({
            success: true,
            message: "Money deposited!"
        })
    })
});

router.get('/getbalance', validate(), async function(req, res){

    const userData = req.userdata;

    const findMoney = await Money.findOne({userID:userData.id});
    if (!findMoney) {
        res.send({
            success: false,
            message: "No bank card data added!",
            balance:0,
        });
        return;
    }

    Money.findOne({userID:userData.id}, {cardNo:0,secretNum:0,userID:0,name:0,lastName:0}, [],function (err, docs) {
        if (err){
            res.send({
                success:false,
                message:"Error getting money balance!"
            });
            return
        }
        res.send({
            docs
        })
    })
});

router.post('/take', validate(), async function(req, res){

    const userData = req.userdata;

    const findMoney = await Money.findOne({userID:userData.id});
    if (!findMoney) {
        res.send({
            success: false,
            message: "No bank card data added!",
            balance:0,
        });
        return;
    }

    const balanceOut = findMoney.balance;

    Money.findOneAndUpdate({userID:userData.id},{balance: 0}, [],function (err) {
        if (err){
            res.send({
                success:false,
                message:"Error withdrawing money!"
            });
            return
        }
        res.send({
            success: true,
            message: "Withdrawn: " + balanceOut + " Euro!"
        })
    })
});

router.get('/checkdata', validate(), async function(req, res) {
    const userData = req.userdata;
    const findMoney = await Money.findOne({userID: userData.id});
    if (!findMoney) {
        res.send({
            success: false,
            message: "No bank card data added!",
        });
    }else{
        res.send({
            success: true,
        });
    }
});

module.exports = router;

