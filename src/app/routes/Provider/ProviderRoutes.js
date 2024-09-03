/* Common all api's Controller */
const {
    GetAllClientsOfProviderList,
    UpdateOrgStatus,
    GetAllDocumentTypeList,
    CreateOrgNote,
    GetSpecificOrgNotes,
    GetAllIndividualListForWorkerInvites,
    UpdateUserPassword,
    GetAllIndividualListForInvite,
    GetClientOverviewProfileById,
    GetWorkerProfileById
} = require("../../controllers/Common/CommonController");

//Common All (Admin Portal) Client User Setting Api's Controller
const {
    InviteOrgUser,
    ReinviteOrgUser,
    GetAllSpecificOrgUsers,
    GetAllSpecificOrgInvites,
    GetOrgUserPermById,
    UpdateOrgUserPerm,
    RemoveOrgUserInvitation
} = require('../../controllers/Common/CommonUserSettingController');

/* Common provider-worker api's Controller */
const {
    GetProviderWorkersInvite,
    inviteWorkerCsvView,
    InviteWorkerFromCsvDetails,
    GetAllWorkersOfProvider,
    DeleteWorkerInvite,
    CreateAssignWorkersToClient,
    RemoveWorkerAssignedClients,
    RemoveWorkerOfProvider,
    GetSubmissionDocsOfWorker,
    GetIndStatusOfWorkerByClient,
    GetWorkerSiteLogsByClient,
    GetClientsAssignedToWorkerByProvider,
    GetWorkerTrainingInduction,
    GetAllDocsOfWorkerByDocType,
    CreateAndSubmitWorkerOtherDoc,
    SubmitWorkerDocToClient
} = require("../../controllers/Common/CommonProvider/CommonProviderWorkerController");

/* Common invite (Provider Portal) Worker api' Controller */
const {
    InviteWorker,
    ReinviteWorker
} = require('../../controllers/Common/CommonInviteWorkerController');

/* Common Provider setting Api's Controller */
const {
    GetProviderUserDetailsById,
    GetProviderDetailsById,
    UpdateProviderOrgDetails,
    UpdateProviderOrgOtherDetails,
    UpdateProviderUserProfile
} = require("../../controllers/Common/CommonProvider/CommonProviderSettingController");

/* Common Email Controller */
const {
    GetAllSpecificEmailTemplates,
    EmailToIndividual,
    GetAllIndividualForEmail,
} = require('../../controllers/Common/CommonEmailController');

/* Common (provider Portal) provider api's Controller  */
const { } = require("../../controllers/Common/CommonProvider/CommonProviderController");

/* Common (provider Portal) provider Document Controller */
const {
    CreateProviderDoc,
    GetAllDocumentsOfProvider,
    GetProviderDocById,
    UpdateProviderDoc,
    DeleteProviderDoc,
    GetDocumentHistoryById,
} = require("../../controllers/Common/CommonProvider/CommonProviderDocController");

/* Common (provider Portal) provider Contacts Controller */
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

/* Common (Providal Portal) Provider->clients Controller  */
const {
    GetAllClientsOfProvider,
    GetProviderAllClientInvites,
    GetSubmissionDocsOfProvider,
    GetAllDocsOfProviderByDocType,
    SubmitExistingDocToClient,
    GetAllAssignedWorkerToClient,
    CreateAndSubmitOtherDoc

} = require("../../controllers/Common/CommonProvider/CommonProviderClientController");

/* Common (Provider Portal ) Provider -> worker documents Controller */
const {
    CreateWorkerDoc,
    GetWorkerDocHistoryById,
} = require('../../controllers/Common/CommonWorker/CommonWorkerDocController');

/* Common (Provider Portal ) Provider -> Messages */
const {
    GetOrgEmailLogs,
    GetEmailLogById,
    ForwardEmail
} = require('../../controllers/Common/CommonEmailController');


module.exports = (app) => {

    const { authenticateToken } = require('../../../middlewares/AuthMiddleware');
    const { upload, uploadLocal, uploadMemo } = require('../../../middlewares/File-UploadMiddleware');

    /*------------------------------- All Portal Common Routes (provider-Portal) ------------------------ */
    // https://conserve.dikonia.in

    app.patch('/api/provider/UpdateOrgStatus', authenticateToken, upload.none(), UpdateOrgStatus);
    app.get('/api/provider/GetAllDocumentTypeList', authenticateToken, upload.none(), GetAllDocumentTypeList);
    app.post('/api/provider/CreateOrgNote', authenticateToken, upload.array("note_attach"), CreateOrgNote);
    app.get('/api/provider/GetSpecificOrgNotes', authenticateToken, upload.none(), GetSpecificOrgNotes);
    app.get('/api/provider/GetAllIndividualListForWorkerInvites', authenticateToken, upload.none(), GetAllIndividualListForWorkerInvites);
    app.patch('/api/provider/UpdateUserPassword', authenticateToken, upload.none(), UpdateUserPassword);
    app.get('/api/provider/GetAllIndividualListForInvite', authenticateToken, upload.none(), GetAllIndividualListForInvite);
    app.get('/api/provider/GetClientOverviewProfileById', authenticateToken, upload.none(), GetClientOverviewProfileById);
    app.get('/api/provider/GetWorkerProfileById', authenticateToken, upload.none(), GetWorkerProfileById);

    /* Common all (Provider Portal) Client User Setting Api's Routes  */
    app.post('/api/provider/InviteOrgUser', authenticateToken, upload.none(), InviteOrgUser);
    app.put('/api/provider/ReinviteOrgUser', authenticateToken, upload.none(), ReinviteOrgUser);
    app.get('/api/provider/GetAllSpecificOrgUsers', authenticateToken, upload.none(), GetAllSpecificOrgUsers);
    app.get('/api/provider/GetAllSpecificOrgInvites', authenticateToken, upload.none(), GetAllSpecificOrgInvites);
    app.get('/api/provider/GetOrgUserPermById', authenticateToken, upload.none(), GetOrgUserPermById);
    app.put('/api/provider/UpdateOrgUserPerm', authenticateToken, upload.none(), UpdateOrgUserPerm);
    app.delete('/api/provider/RemoveOrgUserInvitation', authenticateToken, upload.none(), RemoveOrgUserInvitation);

    /* Common (provider Portal) provider worker Routes */

    app.post('/api/provider/InviteWorker', authenticateToken, upload.none(), InviteWorker);
    app.put('/api/provider/ReinviteWorker', authenticateToken, upload.none(), ReinviteWorker);
    app.get('/api/provider/GetProviderWorkersInvite', authenticateToken, upload.none(), GetProviderWorkersInvite);

    app.post('/api/provider/inviteWorkerCsvView', authenticateToken, uploadLocal.single("invite_worker_csv"), inviteWorkerCsvView);
    app.post('/api/provider/InviteWorkerFromCsvDetails', authenticateToken, upload.none(), InviteWorkerFromCsvDetails);
    app.get('/api/provider/GetAllWorkersOfProvider', authenticateToken, upload.none(), GetAllWorkersOfProvider);
    app.delete('/api/provider/DeleteWorkerInvite', authenticateToken, upload.none(), DeleteWorkerInvite);
    app.post('/api/provider/CreateAssignWorkersToClient', authenticateToken, upload.none(), CreateAssignWorkersToClient);
    app.delete('/api/provider/RemoveWorkerAssignedClients', authenticateToken, upload.none(), RemoveWorkerAssignedClients);
    app.get('/api/provider/GetSubmissionDocsOfWorker', authenticateToken, upload.none(), GetSubmissionDocsOfWorker);
    app.delete('/api/provider/RemoveWorkerOfProvider', authenticateToken, upload.none(), RemoveWorkerOfProvider);
    app.get('/api/provider/GetIndStatusOfWorkerByClient', authenticateToken, upload.none(), GetIndStatusOfWorkerByClient);
    app.get('/api/provider/GetAllClientsOfProviderList', authenticateToken, upload.none(), GetAllClientsOfProviderList);
    app.get('/api/provider/GetWorkerSiteLogsByClient', authenticateToken, upload.none(), GetWorkerSiteLogsByClient);
    app.get('/api/provider/GetClientsAssignedToWorkerByProvider', authenticateToken, upload.none(), GetClientsAssignedToWorkerByProvider);

    app.post('/api/provider/CreateWorkerDoc', authenticateToken, upload.single("doc_file"), CreateWorkerDoc);
    app.get('/api/provider/GetWorkerDocHistoryById', authenticateToken, upload.none(), GetWorkerDocHistoryById);

    app.get('/api/provider/GetWorkerTrainingInduction', authenticateToken, upload.none(), GetWorkerTrainingInduction);
    app.get('/api/provider/GetAllDocsOfWorkerByDocType', authenticateToken, upload.none(), GetAllDocsOfWorkerByDocType);
    app.post('/api/provider/CreateAndSubmitWorkerOtherDoc', authenticateToken, upload.single("doc_file"), CreateAndSubmitWorkerOtherDoc);
    app.post('/api/provider/SubmitWorkerDocToClient', authenticateToken, upload.none(), SubmitWorkerDocToClient);

    /*  Common provider (provider Portal) setting Routes */
    app.get('/api/provider/GetProviderUserDetailsById', authenticateToken, upload.none(), GetProviderUserDetailsById);
    app.put('/api/provider/UpdateProviderUserProfile', authenticateToken, upload.single("avatar"), UpdateProviderUserProfile);
    app.get('/api/provider/GetProviderDetailsById', authenticateToken, upload.none(), GetProviderDetailsById);
    app.put('/api/provider/UpdateProviderOrgDetails', authenticateToken, upload.single("logo"), UpdateProviderOrgDetails);
    app.put('/api/provider/UpdateProviderOrgOtherDetails', authenticateToken, upload.single("msa_doc"), UpdateProviderOrgOtherDetails);

    /* Common (provider Portal) provider Routes */
    app.get('/api/provider/GetAllSpecificEmailTemplates', authenticateToken, upload.none(), GetAllSpecificEmailTemplates);
    app.get('/api/provider/GetAllIndividualForEmail', authenticateToken, upload.none(), GetAllIndividualForEmail);
    app.post('/api/provider/EmailToIndividual', authenticateToken, upload.array("email_doc"), EmailToIndividual);

    /* Common (provider Portal) provider documents Routes */
    app.post('/api/provider/CreateProviderDoc', authenticateToken, upload.single("doc_file"), CreateProviderDoc);
    app.get('/api/provider/GetAllDocumentsOfProvider', authenticateToken, upload.none(), GetAllDocumentsOfProvider);
    app.get('/api/provider/GetProviderDocById', authenticateToken, upload.none(), GetProviderDocById);
    app.put('/api/provider/UpdateProviderDoc', authenticateToken, upload.single("doc_file"), UpdateProviderDoc);
    app.delete('/api/provider/DeleteProviderDoc', authenticateToken, upload.none(), DeleteProviderDoc);
    app.get('/api/provider/GetDocumentHistoryById', authenticateToken, upload.none(), GetDocumentHistoryById);

    /* Common (provider Portal) provider Contacts Routes */
    app.get('/api/provider/GetAllIndividualListForProviderContact', authenticateToken, upload.none(), GetAllIndividualListForProviderContact);
    app.post('/api/provider/AddProviderContact', authenticateToken, upload.none(), AddProviderContact);
    app.get('/api/provider/GetAllContactsOfProvider', authenticateToken, upload.none(), GetAllContactsOfProvider);
    app.get('/api/provider/GetProviderInternalOrClientContacts', authenticateToken, upload.none(), GetProviderInternalOrClientContacts);
    app.get('/api/provider/GetProviderInternalContactById', authenticateToken, upload.none(), GetProviderInternalContactById);
    app.get('/api/provider/GetProviderClientContactById', authenticateToken, upload.none(), GetProviderClientContactById);
    app.put('/api/provider/UpdateProviderContact', authenticateToken, upload.none(), UpdateProviderContact);
    app.put('/api/provider/UpdateProviderClientContact', authenticateToken, upload.none(), UpdateProviderClientContact);
    app.delete('/api/provider/DeleteProviderContact', authenticateToken, upload.none(), DeleteProviderContact);

    /* Common provider ->client(Provider Portal) Routes */
    app.get('/api/provider/GetAllClientsOfProvider', authenticateToken, upload.none(), GetAllClientsOfProvider);
    app.get('/api/provider/GetProviderAllClientInvites', authenticateToken, upload.none(), GetProviderAllClientInvites);
    app.get('/api/provider/GetSubmissionDocsOfProvider', authenticateToken, upload.none(), GetSubmissionDocsOfProvider);
    app.get('/api/provider/GetAllDocsOfProviderByDocType', authenticateToken, upload.none(), GetAllDocsOfProviderByDocType);
    app.post('/api/provider/SubmitExistingDocToClient', authenticateToken, upload.none(), SubmitExistingDocToClient);
    app.get('/api/provider/GetAllAssignedWorkerToClient', authenticateToken, upload.none(), GetAllAssignedWorkerToClient);
    app.post('/api/provider/CreateAndSubmitOtherDoc', authenticateToken, upload.single("doc_file"), CreateAndSubmitOtherDoc);

    /* Common  (Provider portal) Provider -> Messages Routes */
    app.get('/api/provider/GetOrgEmailLogs', authenticateToken, upload.none(), GetOrgEmailLogs);
    app.get('/api/provider/GetEmailLogById', authenticateToken, upload.none(), GetEmailLogById);
    app.post('/api/provider/ForwardEmail', authenticateToken, upload.none(), ForwardEmail);

};
