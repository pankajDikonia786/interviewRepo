/* Common all api's Controller */
const {
    GetAllProviderList,
    GetAllClientsOfProviderList,
    UpdateProviderDocStatus,
    GetClientOverviewProfileById,
    GetAllIndividualListForInvite,
    UpdateOrgStatus,
    GetAllDocumentTypeList,
    CreateOrgNote,
    GetSpecificOrgNotes,
    GetAllIndividualListForWorkerInvites,
    InviteSpecificProvider,
    GetWorkerProfileById,
    GetAllDocumentsOfWorker
} = require("../../controllers/Common/CommonController");

/* Common Email Provider Api's Controller */
const {
    GetAllSpecificEmailTemplates,
    EmailToIndividual,
    GetAllIndividualForEmail,
} = require('../../controllers/Common/CommonEmailController');

/* Common All (Admin Portal) Provider User Setting Api's Controller */
const {
    InviteOrgUser,
    ReinviteOrgUser,
    GetAllSpecificOrgUsers,
    GetAllSpecificOrgInvites,
    GetOrgUserPermById,
    UpdateOrgUserPerm,
    RemoveOrgUserInvitation
} = require('../../controllers/Common/CommonUserSettingController');

/* Common Provider-worker api's Contsroller */
const {
    GetProviderWorkersInvite,
    DeleteWorkerInvite,
    RemoveWorkerOfProvider,
    inviteWorkerCsvView,
    InviteWorkerFromCsvDetails,
    GetAllWorkersOfProvider,
    CreateAssignWorkersToClient,
    RemoveWorkerAssignedClients,
    CreateAndSubmitWorkerOtherDoc,
    GetAllDocsOfWorkerByDocType,
    SubmitWorkerDocToClient,
    GetIndStatusOfWorkerByClient,
    GetClientsAssignedToWorkerByProvider,
    GetSubmissionDocsOfWorker,
    GetWorkerSiteLogsByClient,
    GetWorkerTrainingInduction
    // GetWorkerDocForProvider
} = require("../../controllers/Common/CommonProvider/CommonProviderWorkerController");

/* Common invite (Admin Portal) Worker api' Controller */
const {
    InviteWorker,
    ReinviteWorker
} = require('../../controllers/Common/CommonInviteWorkerController');

const {
    GetProviderDetailsById,
    UpdateProviderOrgDetails,
    UpdateProviderOrgOtherDetails,
} = require("../../controllers/Common/CommonProvider/CommonProviderSettingController");

/* Common (Admin Portal) Provider clients Controller  */
const {
    GetAllClientsOfProvider,
    GetProviderAllClientInvites,
    GetSubmissionDocsOfProvider,
    GetAllDocsOfProviderByDocType,
    SubmitExistingDocToClient,
    GetAllAssignedWorkerToClient,
    CreateAndSubmitOtherDoc
} = require("../../controllers/Common/CommonProvider/CommonProviderClientController")

/* Admin Portal provider api's Controller  */
const {
    GetAllProviders,

} = require('../../controllers/_Admin-Portal/APProvider/APProviderController');

/* Common (Admin Portal) provider api's Controller  */
const { } = require("../../controllers/Common/CommonProvider/CommonProviderController");

/* Common (Admin Portal) provider Docuemnt Controller */
const {

    CreateProviderDoc,
    GetAllDocumentsOfProvider,
    GetProviderDocById,
    UpdateProviderDoc,
    DeleteProviderDoc,
    GetDocumentHistoryById,
} = require("../../controllers/Common/CommonProvider/CommonProviderDocController");
/* Common (Admin Portal) provider Contacts Controller */
const {
    GetAllIndividualListForProviderContact,
    AddProviderContact,
    GetAllContactsOfProvider,
    GetProviderInternalOrClientContacts,
    GetProviderInternalContactById,
    GetProviderClientContactById,
    UpdateProviderContact,
    UpdateProviderClientContact,
    DeleteProviderContact,
} = require("../../controllers/Common/CommonProvider/CommonProviderContactController");

/* Common (Admin Portal ) Provider -> worker documents Controller */
const {
    CreateWorkerDoc,
    GetWorkerDocHistoryById,
} = require('../../controllers/Common/CommonWorker/CommonWorkerDocController');


/* Provider Worker api */
// const {
//     GetWorkerSiteLogs
// } = require("../../controllers/Common/CommonWorker/CommonWorkerController");


module.exports = (app) => {

    const { authenticateToken } = require('../../../middlewares/AuthMiddleware');
    const { upload, uploadLocal, uploadMemo } = require('../../../middlewares/File-UploadMiddleware');

    /*------------------------------- All Portal Common Routes Admin-Provider (Admin- Portal) ------------------------ */
    // https://conserve.dikonia.in


    app.put('/api/admin/provider/UpdateProviderDocStatus', authenticateToken, upload.none(), UpdateProviderDocStatus);
    app.get('/api/admin/provider/GetClientOverviewProfileById', authenticateToken, upload.none(), GetClientOverviewProfileById);
    app.get('/api/admin/provider/GetAllIndividualListForInvite', authenticateToken, upload.none(), GetAllIndividualListForInvite);
    app.patch('/api/admin/provider/UpdateOrgStatus', authenticateToken, upload.none(), UpdateOrgStatus);
    app.get('/api/admin/provider/GetAllDocumentTypeList', authenticateToken, upload.none(), GetAllDocumentTypeList);
    app.post('/api/admin/provider/CreateOrgNote', authenticateToken, upload.array("note_attach"), CreateOrgNote);
    app.get('/api/admin/provider/GetSpecificOrgNotes', authenticateToken, upload.none(), GetSpecificOrgNotes);
    app.get('/api/admin/provider/GetAllIndividualListForWorkerInvites', authenticateToken, upload.none(), GetAllIndividualListForWorkerInvites);
    app.post('/api/admin/provider/InviteSpecificProvider', authenticateToken, upload.array("invite_attach"), InviteSpecificProvider);
    app.get('/api/admin/provider/GetWorkerProfileById', authenticateToken, upload.none(), GetWorkerProfileById);
    app.get('/api/admin/provider/GetAllDocumentsOfWorker', authenticateToken, upload.none(), GetAllDocumentsOfWorker);


    /* Common all (Admin Portal) Client User Setting Api's Routes   */
    app.post('/api/admin/provider/InviteOrgUser', authenticateToken, upload.none(), InviteOrgUser);
    app.put('/api/admin/provider/ReinviteOrgUser', authenticateToken, upload.none(), ReinviteOrgUser);
    app.get('/api/admin/provider/GetAllSpecificOrgUsers', authenticateToken, upload.none(), GetAllSpecificOrgUsers);
    app.get('/api/admin/provider/GetAllSpecificOrgInvites', authenticateToken, upload.none(), GetAllSpecificOrgInvites);
    app.get('/api/admin/provider/GetOrgUserPermById', authenticateToken, upload.none(), GetOrgUserPermById);
    app.put('/api/admin/provider/UpdateOrgUserPerm', authenticateToken, upload.none(), UpdateOrgUserPerm);
    app.delete('/api/admin/provider/RemoveOrgUserInvitation', authenticateToken, upload.none(), RemoveOrgUserInvitation);

    /* Common (Admin Portal) provider worker Routes */
    app.post('/api/admin/provider/InviteWorker', authenticateToken, upload.none(), InviteWorker);
    app.put('/api/admin/provider/ReinviteWorker', authenticateToken, upload.none(), ReinviteWorker);
    app.delete('/api/admin/provider/DeleteWorkerInvite', authenticateToken, upload.none(), DeleteWorkerInvite);
    app.delete('/api/admin/provider/RemoveWorkerOfProvider', authenticateToken, upload.none(), RemoveWorkerOfProvider);
    app.get('/api/admin/provider/GetProviderWorkersInvite', authenticateToken, upload.none(), GetProviderWorkersInvite);

    app.post('/api/admin/provider/inviteWorkerCsvView', authenticateToken, uploadLocal.single("invite_worker_csv"), inviteWorkerCsvView);
    app.post('/api/admin/provider/InviteWorkerFromCsvDetails', authenticateToken, upload.none(), InviteWorkerFromCsvDetails);
    app.get('/api/admin/provider/GetAllWorkersOfProvider', authenticateToken, upload.none(), GetAllWorkersOfProvider);
    app.get('/api/admin/provider/GetWorkerSiteLogsByClient', authenticateToken, upload.none(), GetWorkerSiteLogsByClient);
    app.post('/api/admin/provider/CreateAssignWorkersToClient', authenticateToken, upload.none(), CreateAssignWorkersToClient);
    app.get('/api/admin/provider/GetIndStatusOfWorkerByClient', authenticateToken, upload.none(), GetIndStatusOfWorkerByClient);
    app.post('/api/admin/provider/CreateAndSubmitWorkerOtherDoc', authenticateToken, upload.single("doc_file"), CreateAndSubmitWorkerOtherDoc);
    app.get('/api/admin/provider/GetAllDocsOfWorkerByDocType', authenticateToken, upload.none(), GetAllDocsOfWorkerByDocType);
    app.post('/api/admin/provider/SubmitWorkerDocToClient', authenticateToken, upload.none(), SubmitWorkerDocToClient);

    app.get('/api/admin/provider/GetAllClientsOfProviderList', authenticateToken, upload.none(), GetAllClientsOfProviderList);
    app.get('/api/admin/provider/GetClientsAssignedToWorkerByProvider', authenticateToken, upload.none(), GetClientsAssignedToWorkerByProvider);
    app.get('/api/admin/provider/GetSubmissionDocsOfWorker', authenticateToken, upload.none(), GetSubmissionDocsOfWorker);

    app.get('/api/admin/provider/GetWorkerDocHistoryById', authenticateToken, upload.none(), GetWorkerDocHistoryById);
    app.post('/api/admin/provider/CreateWorkerDoc', authenticateToken, upload.single('doc_file'), CreateWorkerDoc);

    app.delete('/api/admin/provider/RemoveWorkerAssignedClients', authenticateToken, upload.none(), RemoveWorkerAssignedClients);
    app.get('/api/admin/provider/GetWorkerTrainingInduction', authenticateToken, upload.none(), GetWorkerTrainingInduction);

    /*  Common provider (Admin Portal) setting Routes */
    app.get('/api/admin/provider/GetProviderDetailsById', authenticateToken, upload.none(), GetProviderDetailsById);
    app.put('/api/admin/provider/UpdateProviderOrgDetails', authenticateToken, upload.single("logo"), UpdateProviderOrgDetails);
    app.put('/api/admin/provider/UpdateProviderOrgOtherDetails', authenticateToken, upload.single("msa_doc"), UpdateProviderOrgOtherDetails);

    /* Common provider (Admin Portal) client routes */
    app.get('/api/admin/provider/GetAllClientsOfProvider', authenticateToken, upload.none(), GetAllClientsOfProvider);
    app.get('/api/admin/provider/GetProviderAllClientInvites', authenticateToken, upload.none(), GetProviderAllClientInvites);
    app.get('/api/admin/provider/GetSubmissionDocsOfProvider', authenticateToken, upload.none(), GetSubmissionDocsOfProvider);
    app.get('/api/admin/provider/GetAllDocsOfProviderByDocType', authenticateToken, upload.none(), GetAllDocsOfProviderByDocType);
    app.post('/api/admin/provider/SubmitExistingDocToClient', authenticateToken, upload.none(), SubmitExistingDocToClient);
    app.get('/api/admin/provider/GetAllAssignedWorkerToClient', authenticateToken, upload.none(), GetAllAssignedWorkerToClient);
    app.post('/api/admin/provider/CreateAndSubmitOtherDoc', authenticateToken, upload.single("doc_file"), CreateAndSubmitOtherDoc);

    /* provider (Admin Portal) Routes */
    app.get('/api/admin/provider/GetAllProviders', authenticateToken, upload.none(), GetAllProviders);
    app.get('/api/admin/provider/GetAllProviderList', authenticateToken, upload.none(), GetAllProviderList);

    /* Common Email (Admin Portal) provider Routes */
    app.get('/api/admin/provider/GetAllSpecificEmailTemplates', authenticateToken, upload.none(), GetAllSpecificEmailTemplates);
    app.get('/api/admin/provider/GetAllIndividualForEmail', authenticateToken, upload.none(), GetAllIndividualForEmail);
    app.post('/api/admin/provider/EmailToIndividual', authenticateToken, upload.array("email_doc"), EmailToIndividual);

    /* Common (Admin Portal) provider documents Routes */

    app.post('/api/admin/provider/CreateProviderDoc', authenticateToken, upload.single("doc_file"), CreateProviderDoc);
    app.get('/api/admin/provider/GetAllDocumentsOfProvider', authenticateToken, upload.none(), GetAllDocumentsOfProvider);
    app.get('/api/admin/provider/GetProviderDocById', authenticateToken, upload.none(), GetProviderDocById);
    app.put('/api/admin/provider/UpdateProviderDoc', authenticateToken, upload.single("doc_file"), UpdateProviderDoc);
    app.delete('/api/admin/provider/DeleteProviderDoc', authenticateToken, upload.none(), DeleteProviderDoc);
    app.get('/api/admin/provider/GetDocumentHistoryById', authenticateToken, upload.none(), GetDocumentHistoryById);

    /* Common (Admin Portal) provider Contacts Routes */
    app.get('/api/admin/provider/GetAllIndividualListForProviderContact', authenticateToken, upload.none(), GetAllIndividualListForProviderContact);
    app.post('/api/admin/provider/AddProviderContact', authenticateToken, upload.none(), AddProviderContact);
    app.get('/api/admin/provider/GetAllContactsOfProvider', authenticateToken, upload.none(), GetAllContactsOfProvider);
    app.get('/api/admin/provider/GetProviderInternalOrClientContacts', authenticateToken, upload.none(), GetProviderInternalOrClientContacts);
    app.get('/api/admin/provider/GetProviderInternalContactById', authenticateToken, upload.none(), GetProviderInternalContactById);
    app.get('/api/admin/provider/GetProviderClientContactById', authenticateToken, upload.none(), GetProviderClientContactById);
    app.put('/api/admin/provider/UpdateProviderContact', authenticateToken, upload.none(), UpdateProviderContact);
    app.put('/api/admin/provider/UpdateProviderClientContact', authenticateToken, upload.none(), UpdateProviderClientContact);
    app.delete('/api/admin/provider/DeleteProviderContact', authenticateToken, upload.none(), DeleteProviderContact);


};
