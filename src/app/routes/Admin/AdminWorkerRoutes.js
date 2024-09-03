/* All Common Controller */
const {
    GetAllProviderList,
    GetAllClientsOfProviderList,
    GetAllDocumentTypeList,
    GetAllIndividualListForWorkerInvites,
    GetWorkerProfileById,
} = require('../../controllers/Common/CommonController');

/* Common invite (Admin Portal) Worker api' Controller */
const {
    InviteWorker
} = require('../../controllers/Common/CommonInviteWorkerController');

//Common All worker(Admin Portal) Email Api's Controller
const {
    GetAllSpecificEmailTemplates,
    EmailToIndividual,
    GetAllIndividualForEmail,

} = require('../../controllers/Common/CommonEmailController');

/* Common worker documents Controller */
const {
    CreateWorkerDoc,
    GetAllDocsOfWorker,
    GetWorkerrDocById,
    UpdateWorkerDoc,
    DeleteWorkerDoc,
    GetWorkerDocHistoryById,

} = require('../../controllers/Common/CommonWorker/CommonWorkerDocController');

/* Common worker Controller */
const {
    UpdateWorkerProfileSetting,
    GetAllProvidersOfWorker,
    GetWorkerSiteLogs,
    CreateWorkerNote,
    GetSpecificWorkerNotes,
    GetAllClientsOfWorkerByProvider
} = require('../../controllers/Common/CommonWorker/CommonWorkerController');

/* Admin Worker Controller */
const {
    AdminGetAllWorkers,
} = require('../../controllers/_Admin-Portal/APWorker/APWorkerController');

const {
    inviteWorkerCsvView,
} = require("../../controllers/Common/CommonProvider/CommonProviderWorkerController");

module.exports = (app) => {

    const { authenticateToken } = require('../../../middlewares/AuthMiddleware');
    const { upload, uploadLocal } = require('../../../middlewares/File-UploadMiddleware');

    /****************All Portal Common Routes (Admin Portal)**************** */
    app.get('/api/admin/worker/GetAllDocumentTypeList', authenticateToken, upload.none(), GetAllDocumentTypeList);
    app.get('/api/admin/worker/GetAllIndividualListForWorkerInvites', authenticateToken, upload.none(), GetAllIndividualListForWorkerInvites);
    app.get('/api/admin/worker/GetAllProviderList', authenticateToken, upload.none(), GetAllProviderList);
    app.get('/api/admin/worker/GetAllClientsOfProviderList', authenticateToken, upload.none(), GetAllClientsOfProviderList);
    app.get('/api/admin/worker/GetWorkerProfileById', authenticateToken, upload.none(), GetWorkerProfileById);

    /* Invite worker Route (Admin Portal) */

    app.post('/api/admin/worker/inviteWorkerCsvView', authenticateToken, uploadLocal.single("invite_worker_csv"), inviteWorkerCsvView);
    app.post('/api/admin/worker/InviteWorker', authenticateToken, upload.none(), InviteWorker);

    /* Worker Email Routes (Admin Portal) */
    app.get('/api/admin/worker/GetAllSpecificEmailTemplates', authenticateToken, upload.none(), GetAllSpecificEmailTemplates);
    app.get('/api/admin/worker/GetAllIndividualForEmail', authenticateToken, upload.none(), GetAllIndividualForEmail);
    app.post('/api/admin/worker/EmailToIndividual', authenticateToken, upload.array("email_doc"), EmailToIndividual);

    /*************** Common Worker document routes ********************/

    app.post('/api/admin/worker/CreateWorkerDoc', authenticateToken, upload.single("doc_file"), CreateWorkerDoc);
    app.get('/api/admin/worker/GetAllDocsOfWorker', authenticateToken, upload.none(), GetAllDocsOfWorker);

    app.get('/api/admin/worker/GetWorkerrDocById', authenticateToken, upload.none(), GetWorkerrDocById);
    app.put('/api/admin/worker/UpdateWorkerDoc', authenticateToken, upload.single("doc_file"), UpdateWorkerDoc);
    app.delete('/api/admin/worker/DeleteWorkerDoc', authenticateToken, upload.none(), DeleteWorkerDoc);
    app.get('/api/admin/worker/GetWorkerDocHistoryById', authenticateToken, upload.none(), GetWorkerDocHistoryById);

    /******************** Common Worker Routes *****************************/

    app.put('/api/admin/worker/UpdateWorkerProfileSetting', authenticateToken, upload.none(), UpdateWorkerProfileSetting);
    app.get('/api/admin/worker/GetAllProvidersOfWorker', authenticateToken, upload.none(), GetAllProvidersOfWorker);
    app.get('/api/admin/worker/GetWorkerSiteLogs', authenticateToken, upload.none(), GetWorkerSiteLogs);
    app.post('/api/admin/worker/CreateWorkerNote', authenticateToken, upload.array("note_attach"), CreateWorkerNote);
    app.get('/api/admin/worker/GetSpecificWorkerNotes', authenticateToken, upload.none(), GetSpecificWorkerNotes);
    app.get('/api/admin/worker/GetAllClientsOfWorkerByProvider', authenticateToken, upload.none(), GetAllClientsOfWorkerByProvider);


    /********************Admin-Worker Routes *****************************/
    app.get('/api/admin/worker/AdminGetAllWorkers', authenticateToken, upload.none(), AdminGetAllWorkers);


};
