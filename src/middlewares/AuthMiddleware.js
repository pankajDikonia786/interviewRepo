const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;
const { Users, Individuals } = require("../models/common")

const generateAccessToken = (payload, expiresIn) => {
    console.log("emailexpire-------------", expiresIn)
    return jwt.sign(payload, SECRET, { expiresIn: expiresIn || '365d' });
};

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null)
        return res.json({ status: 401, success: false, message: 'Unauthorized' });
    console.log(token)
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {

        if (err) {
            console.log(err, 'err');
            return res.sendStatus(403);
        };
        const user = await Users.findOne({
            where: {
                user_uuid: decoded.user_uuid,
            },
            include: { model: Individuals }
        });
        if (!user)
            return res.json({ status: 401, success: false, message: 'Unauthorized' });

        req.login_user = user;
        next();
    });
};

module.exports = {
    generateAccessToken,
    authenticateToken,
};
