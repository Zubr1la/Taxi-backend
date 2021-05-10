const express = require('express');
const router = express.Router();
const Drive = require('../models/Drive');
const Money = require('../models/Money');
const validate = require('../middleware/validate');

router.post('/', validate(),async (req, res) => {

    const {description,price, pos1_lat, pos1_lng, pos2_lat, pos2_lng, startPoint, finishPoint, time} = req.body;

    const userData = req.userdata;

    if (userData.userLevel !== 2){
        await res.send({
            success:false,
            message:"You can not book a trip!"
        });
        return;
    }

    const existsBank = await Money.findOne({userID: userData.id});
    if (!existsBank){
        await res.json({
            success: false,
            message: "No card information found!"
        });
        return;
    }

    if(existsBank.balance<price){
        await res.json({
            success: false,
            message: "You do not have enough money to book a trip!"
        });
        return;
    }

    const exists = await Drive.findOne({customer: userData.id});
    if (exists){
        await res.json({
            success: false,
            message: "You have already registered a trip! You can see it in the section 'Panel'"
        });
        return;
    }

    if (description.length > 30){
        await res.send({
            success: false,
            message: "Comment can not be longer than 30 symbols!"
        });
        return;
    }


    if (!pos1_lat || !pos1_lng || !pos2_lat || !pos2_lng){
        await res.send({
            success: false,
            message: "No location data found!"
        });
        return;
    }
    const newDrive = new Drive({
        description: description,
        customer:userData.id,
        price:price,
        pos1_lat:pos1_lat,
        pos1_lng: pos1_lng,
        pos2_lat: pos2_lat,
        pos2_lng: pos2_lng,
        startPoint: startPoint,
        finishPoint: finishPoint,
        driveTime: time,

    });
    newDrive.save( function (err, doc) {
        if (err){
                res.send({
                    success: false,
                    message: "Error saving the trip!"
                });
                console.log(err);
                return
            }

        if (doc){
            res.send({
                success: true,
                message: "Trip saved! Driver will contact you soon!"
            })
        }
    });
});

router.get('/list', validate(), async (req, res) => {

    if(req.userdata.userLevel!==1){
        res.send({
            success:false,
            message: "You do not have permission to use this!"
        });
        return
    }

    Drive.aggregate([
        {$match:{driver:null}},
        {
            $lookup: {
                localField: "customer",
                from: "Users",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $unwind:{path: "$user"}
        },
        {
            $project: {
                driver:1,
                description:1,
                customer:1,
                price:1,
                pos1_lat:1,
                pos1_lng:1,
                pos2_lat:1,
                pos2_lng:1,
                startPoint:1,
                finishPoint:1,
                driveTime:1,
                "firstName":"$user.firstName",
                "lastName":"$user.lastName",
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

router.get('/listuserdrive', validate(), async (req, res) => {

    if(req.userdata.userLevel!==2){
        res.send({
            success:false,
            message: "You do not have permission!"
        });
        return
    }
    const findDrive = await Drive.findOne({customer:req.userdata.id});
    if (!findDrive){
        res.send({
            success:false,
            message:"No active trip found!"
        });
        return
    }
    Drive.findOne({customer: req.userdata.id}, function (err, docs) {
        if (err){
            console.log(err);
            res.send({
                success:false,
                message:"Error getting active trip data!"
            });
            return
        }
        if (docs){
            res.send({docs})
        }
    })
});

router.get('/listdriverdrive', validate(), async (req, res) => {

    if(req.userdata.userLevel!==1){
        res.send({
            success:false,
            message: "No permission!"
        });
        return
    }

    const findDrive = await Drive.findOne({driver:req.userdata.id});

    if (!findDrive){
        res.send({
            success:false,
            message:"You do not have accepted drive!"
        });
        return
    }

  Drive.findOne({driver: req.userdata.id}, function (err, docs) {
        if (err){
            console.log(err);
            res.send({
                success:false,
                message:"Error getting accepted trip data!"
            });
            return
        }
        if (docs){
            res.send({docs})
        }
    })
});

router.post('/delete',validate(), async (req,res) =>{
    const {_id} =  req.body;

    if(req.userdata.userLevel>2){
        res.send({
            success:false,
            message: "No permission!"
        });
        return
    }

    if (!_id){
        res.send({
            success:false,
            message: "Drive ID not found!"
        });
        return
    }

    const findDrive = await Drive.findOne({_id:_id});
    if (!findDrive){
        res.send({
            success:false,
            message:"Drive with such drive ID does not exist!"
        });
        return
    }

    if(findDrive.driver!==null){
        res.send({
            success:false,
            message:"Driver already has accepted this drive! Contact the driver to cancel it!"
        });
        return
    }

    if(findDrive.customer.toString()!==req.userdata.id){
        res.send({
            success:false,
            message:"You can not cancel this drive!"
        });
        return
    }

    Drive.findOneAndRemove({_id: _id}, function (err, docs) {
        if (err){
            console.log(err);
            res.send({
                success:false,
                message:"Error deleting the trip!"
            });
            return
        }
        if (docs){
            res.send({
                success:true,
                message:"Drive deleted!"
            })
        }
    })
});

router.post('/finishdrive',validate(), async (req,res) =>{

    const {_id} =  req.body;
    if(req.userdata.userLevel!==1){
        res.send({
            success:false,
            message: "No permission!"
        });
        return
    }

    if (!_id){
        res.send({
            success:false,
            message: "Fault with drive ID!"
        });
        return
    }

    const findDrive = await Drive.findOne({_id:_id});
    if (!findDrive){
        res.send({
            success:false,
            message:"No drive found with such ID!"
        });
        return
    }

    if(findDrive.driver.toString()!==req.userdata.id.toString()){
        res.send({
            success:false,
            message:"Faulty drive, can not accept!"
        });
        return
    }

    const findDriverMoney = await Money.findOne({userID:req.userdata.id});
    let balToUpdate;
    if (!findDriverMoney) {
        res.send({
            success: false,
            message: "Error with driver bank card data!"
        });
        return;
    }else {
        balToUpdate = (parseFloat(findDriverMoney.balance)+parseFloat(findDrive.price)).toFixed(2);
    }

    Money.findOneAndUpdate({userID:req.userdata.id},{balance: balToUpdate}, [],function (err) {
        if (err){
            console.log(err);
            res.send({
                success:false,
                message:"Trip payment transaction error!"
            });
        }
    });

    const findClientMoney = await Money.findOne({userID:findDrive.customer});
    let balToUpdateClient;
    if (!findClientMoney) {
        res.send({
            success: false,
            message: "Error with client bank card data!"
        });
        return;
    }else {
        balToUpdateClient = (parseFloat(findClientMoney.balance)-parseFloat(findDrive.price)).toFixed(2);
    }

    Money.findOneAndUpdate({userID:findDrive.customer},{balance: balToUpdateClient}, [],function (err) {
        if (err){
            console.log(err);
            res.send({
                success:false,
                message:"Error with trip payment transaction"
            });
        }
    });

    Drive.findOneAndRemove({_id: _id}, function (err, docs) {
        if (err){
            console.log(err);
            res.send({
                success:false,
                message:"Failed to finish the drive!"
            });
            return
        }
        if (docs){
            res.send({
                success:true,
                message:"Trip finished!"
            })

        }

    })
});

router.post('/adddriver', validate(), async function(req, res){
    const {_id} = req.body;
    const userData = req.userdata;
    if(userData.userLevel!==1){
        res.send({
            success: false,
            message: "No permission!"
        });
        return
    }

    const existsBank = await Money.findOne({userID: userData.id});
    if (!existsBank){
        await res.json({
            success: false,
            message: "No bank card data information!"
        });
        return;
    }

    const findDrive = await Drive.findOne({_id:_id});
    if (!findDrive) {
        res.send({
            success: false,
            message: "No drive with such ID found!"
        });
        return;
    }else if(findDrive.driver!==null){
        res.send({
            success: false,
            message: "Drive already has a dedicated driver!"
        });
        return
    }

    const findDriveUsed = await Drive.findOne({driver:userData.id});

    if(findDriveUsed){
        res.send({
            success: false,
            message: "You already have active drive!!"
        });
        return
     }

     Drive.findOneAndUpdate({_id: _id},{driver: userData.id}, [],function (err) {
        if (err){
            res.send({
                success:false,
                message:"Error accepting drive!"
            });
            return
        }
        res.send({
            success: true,
            message: "Drive accepted!"
        })
     })
});

router.post('/removedriver', validate(), async function(req, res){
    const {_id} = req.body;
    const userData = req.userdata;
    if(userData.userLevel!==1){
        res.send({
            success: false,
            message: "No permission!"
        });
        return
    }

    const findDrive = await Drive.findOne({_id:_id});
    if (!findDrive) {
        res.send({
            success: false,
            message: "No drive found with such ID!"
        });
        return;
    }else if(findDrive.driver===null){
        res.send({
            success: false,
            message: "Trip does not have a driver!  "
        });
        return
    }else if(findDrive.driver.toString()!==userData.id.toString()){
        res.send({
            success: false,
            message: "You can not cancel this drive!"
        });
        return
    }

    Drive.findOneAndUpdate({_id: _id},{driver: null}, [],function (err) {
        if (err){
            res.send({
                success:false,
                message:"Error cancelling the drive!"
            });
            return
        }
        res.send({
            success: true,
            message: "Drive cancelled!"
        })
    })
});

router.post('/driveinfo', validate() ,async (req,res) => {
    const {_id} = req.body;
    const userData = req.userdata;
    if (userData.userLevel !== 1){
        await res.send({
            success:false,
            message:"No permission to get the drive data!"
        });
        return;
    }
    Drive.findOne({_id:_id}, function (err, docs) {
        if (!err) {
            res.send({docs})
        } else {
            res.send({
                success:false,
                message:"Error getting drive data!"
            });
            console.log(err)
        }
    })
});

module.exports = router;