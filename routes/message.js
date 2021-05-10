const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const validate = require('../middleware/validate');
const User = require('../models/User');
const Message = require('../models/Message');

router.post('/', validate(),async (req, res) => {

    const {receiver, data} = req.body;
    const userData = req.userdata;

    if(userData.userLevel>2){
        await res.json({
            success: false,
            message: "Error with user profile!"
        });
        return;
    }

   if(data.length>255){
       await res.json({
           success: false,
           message: "Message is longer than 255 symbols!"
       });
       return;
   }

    if(!receiver || !data){
        await res.send({
            success: false,
            message: "No fields should be left empty!"
        });
        return;
    }

    const findReceiver = await User.findOne({_id:receiver});
    if (!findReceiver) {
        res.send({
            success: false,
            message: "No user found by such ID!"
        });
        return;
    }

    const newMessage = new Message({
        senderID:userData.id,
        data:data,
        receiverID:receiver,

    });
    newMessage.save( function (err, doc) {
        if (err){
            res.send({
                success: false,
                message: "Error sending message!"
            });
            console.log(err);
            return
        }

        if (doc){
            res.send({
                success: true,
                message: "Message sent!"
            })
        }
    });
});

router.get('/listsentmessages', validate(), async (req, res) => {
    const userData = req.userdata;
    Message.aggregate([
        {$match:{senderID: mongoose.Types.ObjectId(userData.id), senderDel:false}},
        {
            $lookup: {
                localField: "senderID",
                from: "Users",
                foreignField: "_id",
                as: "user"
            },
        },
        {
            $unwind:{path: "$user"}
        },

        {
            $lookup: {
                localField: "receiverID",
                from: "Users",
                foreignField: "_id",
                as: "user1"
            }
        },

        {
            $unwind:{path: "$user1"}
        },
        {
            $project: {
                senderID:1,
                receiverID:1,
                date_created:1,
                data:1,
                "firstNameRec":"$user1.firstName",
                "lastNameRec":"$user1.lastName",
                "firstName":"$user.firstName",
                "lastName":"$user.lastName"
            }

        }
    ], function (err, docs) {
        if(!err){
            res.send(docs)
        }else {
            console.log(err)
        }
    });

});

router.get('/listreceivedtmessages', validate(), async (req, res) => {
    const userData = req.userdata;
    Message.aggregate([
        {$match:{receiverID: mongoose.Types.ObjectId(userData.id), receiverDel:false}},
        {
            $lookup: {
                localField: "senderID",
                from: "Users",
                foreignField: "_id",
                as: "user"
            },

        },
        {
            $unwind:{path: "$user"}
        },

        {
            $lookup: {
                localField: "receiverID",
                from: "Users",
                foreignField: "_id",
                as: "user1"
            }
        },

        {
            $unwind:{path: "$user1"}
        },
        {
            $project: {
                senderID:1,
                receiverID:1,
                date_created:1,
                data:1,
                "firstNameRec":"$user1.firstName",
                "lastNameRec":"$user1.lastName",
                "firstName":"$user.firstName",
                "lastName":"$user.lastName"
            }

        }
    ], function (err, docs) {
        if(!err){
            res.send(docs)
        }else {
            console.log(err)
        }
    });

});

router.post('/delete', validate(), async (req,res) =>{
    const {_id} =  req.body;
    const userData = req.userdata;

    const exists = await Message.findOne({_id:_id});
    if (!exists){
        await res.json({
            success: false,
            message: "Message with such ID not found!"
        });
        return;
    }

    if(exists.senderID.toString()===userData.id.toString()){
        Message.findOneAndUpdate({_id:_id},{senderDel: true}, [],function (err) {
            if (err){
                res.send({
                    success:false,
                    message:"Error deleting message!"
                });
                return
            }
            res.send({
                success: true,
                message: "Message deleted!"
            })
        })
    }else{
        Message.findOneAndUpdate({_id:_id},{receiverDel: true}, [],function (err) {
            if (err){
                res.send({
                    success:false,
                    message:"Error deleting message!"
                });
                return
            }
            res.send({
                success: true,
                message: "Message deleted!"
            })
        })
    }

    Message.findOneAndRemove({senderDel:true, receiverDel:true}, function (err) {
        if (err){
            console.log(err)
        }
    })
});


module.exports = router;

