/* Common (Provider Portal ) Provider -> worker section ->documents Controller */
const {
    CreateWorkerDoc,
    GetAllDocsOfWorker,
    GetWorkerrDocById,
    GetWorkerDocHistoryById,
    UpdateWorkerDoc,
} = require('../../controllers/Common/CommonWorker/CommonWorkerDocController');

/* Common (Provider Portal) Provider -> specific worker section -> Inductions */
const {
    GetIndStatusOfWorkerByAssignedClients
} = require('../../controllers/Common/CommonWorker/CommonWorkerIndController');
/* Common (Provider Portal ) Provider -> specific worker section -> site logs */
const {
    GetWorkerSiteLogs,
    GetAllClientsOfWorkerByProvider
} = require('../../controllers/Common/CommonWorker/CommonWorkerController');

/* Common provider-worker api's Controller */
const {
    GetSubmissionDocsOfWorker,
    CreateAndSubmitWorkerOtherDoc,
    SubmitWorkerDocToClient,
    GetAllDocsOfWorkerByDocType,
    GetIndStatusOfWorkerByClient

} = require("../../controllers/Common/CommonProvider/CommonProviderWorkerController");


/* Common all api's Controller */
const {
    GetClientOverviewProfileById,
} = require("../../controllers/Common/CommonController");


module.exports = (app) => {

    const { authenticateToken } = require('../../../middlewares/AuthMiddleware');
    const { upload, uploadLocal, } = require('../../../middlewares/File-UploadMiddleware');

    /* Common provider ->Specific Worker -> Documents (Provider Portal) Routes */
    app.post('/api/provider/worker/CreateWorkerDoc', authenticateToken, upload.single('doc_file'), CreateWorkerDoc);
    app.get('/api/provider/worker/GetAllDocsOfWorker', authenticateToken, upload.none(), GetAllDocsOfWorker);
    app.get('/api/provider/worker/GetWorkerrDocById', authenticateToken, upload.none(), GetWorkerrDocById);
    app.get('/api/provider/worker/GetWorkerDocHistoryById', authenticateToken, upload.none(), GetWorkerDocHistoryById);
    app.put('/api/provider/worker/UpdateWorkerDoc', authenticateToken, upload.single("doc_file"), UpdateWorkerDoc);

    /* Common provider -> Specific Worker -> Induction (Provider Portal) Routes  */
    app.get('/api/provider/worker/GetIndStatusOfWorkerByAssignedClients', authenticateToken, upload.none(), GetIndStatusOfWorkerByAssignedClients);

    /* Common provider -> Specific Worker -> Site logs (Provider Portal) Routes  */
    app.get('/api/provider/worker/GetWorkerSiteLogs', authenticateToken, upload.none(), GetWorkerSiteLogs);
    app.get('/api/provider/worker/GetAllClientsOfWorkerByProvider', authenticateToken, upload.none(), GetAllClientsOfWorkerByProvider);
    /* Common provider -> Specific Worker -> specific client (Provider Portal) Routes  */
    app.get('/api/provider/worker/GetClientOverviewProfileById', authenticateToken, upload.none(), GetClientOverviewProfileById);
    app.get('/api/provider/worker/GetSubmissionDocsOfWorker', authenticateToken, upload.none(), GetSubmissionDocsOfWorker);
    app.post('/api/provider/worker/CreateAndSubmitWorkerOtherDoc', authenticateToken, upload.single("doc_file"), CreateAndSubmitWorkerOtherDoc);
    app.post('/api/provider/worker/SubmitWorkerDocToClient', authenticateToken, upload.none(), SubmitWorkerDocToClient);
    app.get('/api/provider/worker/GetAllDocsOfWorkerByDocType', authenticateToken, upload.none(), GetAllDocsOfWorkerByDocType);
    app.get('/api/provider/worker/GetIndStatusOfWorkerByClient', authenticateToken, upload.none(), GetIndStatusOfWorkerByClient);



};
