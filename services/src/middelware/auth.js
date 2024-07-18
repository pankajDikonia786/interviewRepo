const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
require("dotenv").config



const authorize = () => {
    return function(req, res, next) {
        try {
            // Retrieve the token from the Authorization header
            const token = req.headers.authorization.split(' ')[1];

            // Check if token exists
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: "No token provided."
                });
            }

            // Verify the token
            jwt.verify(token, process.env.SECRET_KRY, async function(err, decoded) {
                if (err) {
                    console.error(err);
                    return res.status(401).json({
                        success: false,
                        message: `Failed to authenticate token. ${err.message}`
                    });
                } else {
                    // Token is valid, decode the payload and attach to req.user
                   const user = await User.findOne({_id:decoded.id})
                    req.user = user;
                    return next();
                }
            });
        } catch (error) {
            console.error("Error in authorize middelwares:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };
};

module.exports = authorize;
