module.exports = (app) => {
    /* Auth Controller */
    const {
        SignIn,
        SignInVerify,
        ResendSignInOtp,
        ForgotPassword,
        ResetPassword,
    } = require("../controllers/AuthController");

    const { authenticateToken } = require('../../middlewares/AuthMiddleware');
    const { upload } = require('../../middlewares/File-UploadMiddleware');
    
    //Auth Api's
    app.post('/api/SignIn', upload.none(), SignIn);
    app.post('/api/SignInVerify', upload.none(), SignInVerify);
    app.post('/api/ResendSignInOtp', upload.none(), ResendSignInOtp);
    app.post('/api/ForgotPassword', upload.none(), ForgotPassword);
    app.put('/api/ResetPassword', upload.none(), ResetPassword);

};