module.exports = (app) => {
    const {
        TestStripe,
        TestCreateSubscription,
        testOldDatabaseConserve,
        TestContractorPaypalSubscription
    } = require('../controllers/TestController');

    const { upload } = require('../../middlewares/File-UploadMiddleware');

    app.post('/api/TestStripe', upload.none(), TestStripe);
    // app.post('/api/TestCreateSubscription', upload.none(), TestCreateSubscription);
    // app.get('/api/testOldDatabaseConserve', upload.none(), testOldDatabaseConserve);
    // app.post('/api/TestContractorPaypalSubscription', upload.none(), TestContractorPaypalSubscription);


};
