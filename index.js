const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const passwordValidator = require('password-validator');
require('dotenv').config();
const validate = require("./middleware/validate");

const User = require('./models/User');
const Money = require('./models/Money');
const Drive = require('./models/Drive');
const Message = require('./models/Message');

const driveRoute = require('./routes/drive');
const moneyRoute = require('./routes/money');
const messageRoute = require('./routes/message');

const app = express();
const port = 4200;
const cookieAge = 3600000;
const saltRounds = 15;

app.use(helmet());

app.use(bodyParser.json({limit:'50mb'}));
app.use(bodyParser.urlencoded({extended:true, limit:'50mb'}));

const options = {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
};

mongoose.connect(process.env.DB, options, (err, success) => {
    if (success){
        console.log('Connected to the DB!');
    } else if (err){
        console.log("Could not connect to the database!");
        console.error(err);
    }
});

app.set('trust proxy', 1);

app.use(session({
    secret: process.env.COOKIE_SECRET,
    saveUninitialized: false,
    name: 'session',
    resave: false,
    rolling: true,
    cookie:{
        expires: new Date(Date.now() + cookieAge),
        maxAge: cookieAge,
        secure: false
    }
}));

app.use('/api/drive', driveRoute);
app.use('/api/money', moneyRoute);
app.use('/api/message', messageRoute);

app.listen(port, () => console.log(`Taxi-backend PORT: ${port}`));

app.get('/api/validation', validate(), async (req,res)=>{
    const user = req.userdata;

    if(user===null){
        await res.json({
            success:false,
            message:"You have not logged in!"
        })
    }else {
        await res.json({
            success: true,
            message: user.userName,
            userLevel:user.userLevel,
            userID:user._id
        })
    }


});

app.get('/api/logout', validate(), (req) => {
    req.session.destroy((err) => {
        if(err) {
            return console.log(err);
        }
    });
});


app.post('/api/login', async (req, res) => {
    const {username, password} = req.body;

    const resp = await User.findOne({userName: username});
    if(!resp) {
        await res.json({
            success: false,
            message: "User not found!"
        });
        return;
    }

    const match = await bcrypt.compare(password, resp.password);
    if(match){
        req.session.userName = resp.userName;
        req.session.name = resp.name;
        req.session.password = resp.password;
        req.session.save();

        console.log("Logged in: "+resp.userName);

        await res.json({
            success: true
        });
        return;
    }
    await res.json({
        success: false,
        message: "Invalid username and/or password!"
    });
});

app.post('/api/register', async (req, res) => {
    const {username, password, cPassword, firstname, lastname, userLevel} = req.body;

    const exists = await User.findOne({userName: username});
    if (exists){
        await res.json({
            success: false,
            message: "User with such username already exists!"
        });
        return;
    }
    if (password !== cPassword){
        await res.json({
            success: false,
            message: "Passwords does not match!"
        });
        return
    }
    if (!validateStringLength(username, 6)){
        await res.json({
            success: false,
            message: "Username should be at least 6 symbols in length!"
        });
        return
    }
    if (!validateStringLength(firstname, 3)){
        await res.json({
            success: false,
            message: "Name should be at least 3 symbols in length!"
        });
        return
    }
    if (!validateStringLength(lastname, 3)){
        await res.json({
            success: false,
            message: "Surname should be at least 3 symbols in length!"
        });
        return
    }

    if (!validateStringLength(password, 8)){
        await res.json({
            success: false,
            message: "Password should be at least 8 symbols in length!!"
        });
        return
    }

    const salt = await bcrypt.genSaltSync(saltRounds);
    let hash = await bcrypt.hashSync(password, salt);
    const user = new User({
        userName: username,
        password: await hash,
        firstName: firstname,
        lastName: lastname,
        userLevel:userLevel,
    });
    await user.save();
    await res.json({
        success: true,
        message: "Registration successful!"
    });

});

app.post('/api/deleteuser', validate(), async (req, res) => {
    const userData = req.userdata;
    const user = await User.findOne({_id: userData.id});
    if (!user){
        res.send({
            success:false,
            message:"Error getting user data!"
        });
        return
    }


    if(userData.userLevel===1){
        const findDrive = await Drive.findOne({driver:userData.id});
        if (findDrive){
            res.send({
                success:false,
                message:"Need to cancel active trip!"
            });
            return
        }

    }else if(userData.userLevel===2){
        const findDrive = await Drive.findOne({customer:userData.id});
        if (findDrive){
            res.send({
                success:false,
                message:"Need to cancel active drive!"
            });
            return
        }
    }else {
        res.send({
            success:false,
            message:"Error deleting user data!"
        });
        return
    }

    const findSentMessage = await Message.findOne({senderID:userData.id, senderDel:false});
    if (findSentMessage){
        res.send({
            success:false,
            message:"Need to delete all sent messages!"
        });
        return
    }
    const findReceivedMessage = await Message.findOne({receiverID:userData.id, receiverDel:false});
    if (findReceivedMessage){
        res.send({
            success:false,
            message:"Need to remove all received messages!"
        });
        return
    }


    Money.findOneAndDelete({userID:userData.id}, function (err) {
        if (err){
            res.send({
                success:false,
                message:"Error removing money module!"
            });
            return
        }
    });



    User.findOneAndDelete({_id:userData.id}, function (err, docs) {
        if (err){
            console.log(err);
            res.send({
                success:false,
                message:"Error deleting user profile!"
            });
            return
        }
        if (docs){
            req.session.destroy((err) => {
                if(err) {
                    return console.log(err);
                }
            });
            res.send({
                success:true,
                message:"Profile deleted!"
            });
        }
    });

});

app.post('/api/getuser', validate(),async (req,res) => {
    const {_id} = req.body;
    User.findOne({_id: _id},{password:0, userLevel:0, userName:0}, function (err, docs) {
        if(!err){
            res.send(docs)
        } else {
            console.log(err);
        }
    })
});

app.post('/api/updateuser', validate(),async (req,res) => {
    const {firstName, lastName} = req.body;
    const userData = req.userdata;

    const user = await User.findOne({_id: userData.id});
    if (!user){
        res.send({
            success:false,
            message:"Error getting user data!"
        });
        return
    }

    if (!validateStringLength(firstName, 3)){
        await res.json({
            success: false,
            message: "Name should be at least 3 symbols in length!"
        });
        return
    }
    if (!validateStringLength(lastName, 3)){
        await res.json({
            success: false,
            message: "Surname should be at least 3 symbols in length!"
        });
        return
    }


    User.findOneAndUpdate({_id:userData.id},{firstName: firstName, lastName:lastName}, [],function (err) {
        if (err){
            console.log(err);
            res.send({
                success:false,
                message:"Error editing user data!"
            });
            return
        }
        res.send({
            success: true,
            message: "User data edited!"
        })
    })

});


app.post('/api/updatepassword', validate(),async (req,res) => {
    const {password, newPassword} = req.body;
    const userData = req.userdata;

    const userE = await User.findOne({_id: userData.id});
    if (!userE){
        res.send({
            success:false,
            message:"Error finding user data!"
        });
        return
    }

    if (!validateStringLength(password, 8)){
        await res.json({
            success: false,
            message: "Password should be at least 8 symbols in length!"
        });
        return
    }

    if (!validateStringLength(newPassword, 8)){
        await res.json({
            success: false,
            message: "Password should be at least 8 symbols in length!"
        });
        return
    }

    const matchPassword = await bcrypt.compare(password, userE.password);
    if(matchPassword){

        const salt = await bcrypt.genSaltSync(saltRounds);
        let hash = await bcrypt.hashSync(newPassword, salt);

        User.findOneAndUpdate({_id:userData.id},{password: await hash}, [],function (err) {
            if (err){
                res.send({
                    success:false,
                    message:"Error saving new password!"
                });
            }else {
                res.send({
                    success: true,
                    message: "Password changed!"
                })
            }
        })
    }else {
        await res.json({
            success: false,
            message: "Wrong current password!"
        });
    }

});

function validateStringLength(string, length){
    const schema = new passwordValidator();
    schema.is().min(length);
    return schema.validate(string)
}
