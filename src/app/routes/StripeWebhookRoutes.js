module.exports = (app) => {
    const { StripeWebhook } = require('../controllers/StripeWebhook');

    const { upload } = require('../../middlewares/File-UploadMiddleware');

    app.post('/api/StripeWebhook', upload.none(), StripeWebhook);

    
};
