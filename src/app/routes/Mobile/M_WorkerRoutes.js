module.exports = (app) => {

    /* Common all Controller */
    const { UpdateUserPassword } = require('../../controllers/Common/CommonController');
    /* Mobile Worker Controller */
    const { GetWorkerDetailsById, UpdateWorkerProfile } = require('../../controllers/Mobile/Mobile-Worker/M_WorkerController');
    /* Mobile Worker Site Induction Controller */
    const {
        GetAllClientsForWorkerSiteInd,
        GetAllSitesAndIndStatusOfClientById,
        GetTrainingSiteIndAndModulesbyId,
        SaveTrainingModuleQuesDetails,
        PassTrainingSiteIndModule,
        UpdateTrainingSiteIndStatus,
        GetWorkerPastTrainingSiteIndById,
        SavePastTrainingModuleQuesDetails,
        GetAllManageDocsOfWorker,
        CreateWorkerClockInOut,
        GetCurrentClockInOutStatus
    } = require('../../controllers/Mobile/Mobile-Worker/M_WorkerSiteIndController');

    const { upload } = require('../../../middlewares/File-UploadMiddleware');
    const { authenticateToken } = require('../../../middlewares/AuthMiddleware');

    /* Common all Routes */
    app.put('/api-mobile/worker/UpdateUserPassword', upload.none(), UpdateUserPassword);

    /* Mobile Worker Routes */
    app.get('/api-mobile/worker/GetWorkerDetailsById', authenticateToken, upload.none(), GetWorkerDetailsById);
    app.put('/api-mobile/worker/UpdateWorkerProfile', authenticateToken, upload.single("avatar"), UpdateWorkerProfile);

    /* Mobile Worker Site Induction */
    app.get('/api-mobile/worker/GetAllClientsForWorkerSiteInd', authenticateToken, upload.none(), GetAllClientsForWorkerSiteInd);
    app.get('/api-mobile/worker/GetAllSitesAndIndStatusOfClientById', authenticateToken, upload.none(), GetAllSitesAndIndStatusOfClientById);
    app.get('/api-mobile/worker/GetTrainingSiteIndAndModulesbyId', authenticateToken, upload.none(), GetTrainingSiteIndAndModulesbyId);
    app.post('/api-mobile/worker/SaveTrainingModuleQuesDetails', authenticateToken, upload.none(), SaveTrainingModuleQuesDetails);
    app.patch('/api-mobile/worker/PassTrainingSiteIndModule', authenticateToken, upload.none(), PassTrainingSiteIndModule);
    app.patch('/api-mobile/worker/UpdateTrainingSiteIndStatus', authenticateToken, upload.none(), UpdateTrainingSiteIndStatus);
    app.get('/api-mobile/worker/GetWorkerPastTrainingSiteIndById', authenticateToken, upload.none(), GetWorkerPastTrainingSiteIndById);
    app.post('/api-mobile/worker/SavePastTrainingModuleQuesDetails', authenticateToken, upload.none(), SavePastTrainingModuleQuesDetails);
    app.get('/api-mobile/worker/GetAllManageDocsOfWorker', authenticateToken, upload.none(), GetAllManageDocsOfWorker);
    app.post('/api-mobile/worker/CreateWorkerClockInOut', authenticateToken, upload.single("photo"), CreateWorkerClockInOut);
    app.get('/api-mobile/worker/GetCurrentClockInOutStatus', authenticateToken, upload.none(), GetCurrentClockInOutStatus);


}; 
