module.exports = (app) => {
    /* Mobile Auth Controller */
    const {
        LoginClient,
        ResendLoginOtp,
        LoginVerifyClient,
        ForgotPasswordClient,
        ResetPasswordClient,
        LoginWorker,
        ResendWorkerLoginOtp,
        LoginVerifyWorker,
        ForgotPasswordWorker,

    } = require("../../controllers/Mobile/M_AuthController");

    const { upload } = require('../../../middlewares/File-UploadMiddleware');

    /* Mobile Client Auth Api's */
    app.post('/api-mobile/client/LoginClient', upload.none(), LoginClient);
    app.post('/api-mobile/client/ResendLoginOtp', upload.none(), ResendLoginOtp);
    app.post('/api-mobile/client/LoginVerifyClient', upload.none(), LoginVerifyClient);
    app.post('/api-mobile/client/ForgotPasswordClient', upload.none(), ForgotPasswordClient);
    app.put('/api-mobile/client/ResetPasswordClient', upload.none(), ResetPasswordClient);

    /* Mobile Worker Auth Api's */
    app.post('/api-mobile/worker/LoginWorker', upload.none(), LoginWorker);
    app.post('/api-mobile/worker/ResendWorkerLoginOtp', upload.none(), ResendWorkerLoginOtp);
    app.post('/api-mobile/worker/LoginVerifyWorker', upload.none(), LoginVerifyWorker);
    app.post('/api-mobile/worker/ForgotPasswordWorker', upload.none(), ForgotPasswordWorker);

};