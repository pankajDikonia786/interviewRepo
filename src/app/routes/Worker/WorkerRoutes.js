/* All Common Controller */
const {
    GetAllDocumentTypeList,
    UpdateUserPassword,
    GetWorkerProfileById
} = require('../../controllers/Common/CommonController');

/* Common worker documents Controller */
const {
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
    GetSpecificWorkerNotes
} = require('../../controllers/Common/CommonWorker/CommonWorkerController');


module.exports = (app) => {

    const { authenticateToken } = require('../../../middlewares/AuthMiddleware');
    const { upload } = require('../../../middlewares/File-UploadMiddleware');

    /****************All Portal Common Routes (Admin Portal)**************** */
    app.get('/api/worker/GetAllDocumentTypeList', authenticateToken, upload.none(), GetAllDocumentTypeList);
    app.patch('/api/worker/UpdateUserPassword', authenticateToken, upload.none(), UpdateUserPassword);
    app.get('/api/worker/GetWorkerProfileById', authenticateToken, upload.none(), GetWorkerProfileById);


    /*************** Common Worker document routes ********************/
    app.get('/api/worker/GetWorkerrDocById', authenticateToken, upload.none(), GetWorkerrDocById);
    app.put('/api/worker/UpdateWorkerDoc', authenticateToken, upload.single("doc_file"), UpdateWorkerDoc);
    app.delete('/api/worker/DeleteWorkerDoc', authenticateToken, upload.none(), DeleteWorkerDoc);
    app.get('/api/worker/GetWorkerDocHistoryById', authenticateToken, upload.none(), GetWorkerDocHistoryById);

    /******************** Common Worker Routes *****************************/

    app.put('/api/worker/UpdateWorkerProfileSetting', authenticateToken, upload.single("avatar"), UpdateWorkerProfileSetting);
    app.get('/api/worker/GetAllProvidersOfWorker', authenticateToken, upload.none(), GetAllProvidersOfWorker);
    app.get('/api/worker/GetWorkerSiteLogs', authenticateToken, upload.none(), GetWorkerSiteLogs);
    app.post('/api/worker/CreateWorkerNote', authenticateToken, upload.array("note_attach"), CreateWorkerNote);
    app.get('/api/worker/GetSpecificWorkerNotes', authenticateToken, upload.none(), GetSpecificWorkerNotes);


};
