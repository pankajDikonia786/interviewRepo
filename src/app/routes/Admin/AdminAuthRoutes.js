const { RegisterAdmin,
} = require('../../controllers/_Admin-Portal/APAuthController');
module.exports = (app) => {
    const { upload } = require('../../../middlewares/File-UploadMiddleware');
    app.post('/api/admin/RegisterAdmin', upload.none(), RegisterAdmin);

};
