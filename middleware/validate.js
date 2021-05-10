const User = require('../models/User');

module.exports = function () {
    return async function (req, res, next) {
        const user = await User.findOne({userName: req.session.userName});
        if (!user){
            res.send({
                success: false,
                loggedIn: false,
                message:"You have not logged in!"
            });
            return
        }
        req.userdata = user;
        next()
    };
};

