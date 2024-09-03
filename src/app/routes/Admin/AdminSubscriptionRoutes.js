const { CreateProduct,
} = require('../../controllers/_Admin-Portal/APSubscriptionController');
module.exports = (app) => {

    const { upload } = require('../../../middlewares/File-UploadMiddleware');
    app.post('/api/admin/AdminSubscriptionController', upload.none(), CreateProduct);

};
