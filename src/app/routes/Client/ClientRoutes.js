
//Common all Routes controller (Client Portal)
const {
    GetAllDocumentTypeList,
    GetAllIndividualListForInvite,
    UpdateUserPassword,
    GetUserOrganisationsList,
    GetAllComplianceListOfClient,
    InviteSpecificProvider,
    ReinviteProvider,
    InviteProvidersCsvView,
    InviteProviderFromCsv,
    CreateOrgNote,
    GetSpecificOrgNotes,
    UpdateModuleSortingOrder,
    UpdateModuleQuesSortingOrder,
    UpdateModuleAnsSortingOrder,
    GetAllProviderTypesList,
    UpdateProviderDocStatus,
    GetWorkerProfileById


} = require('../../controllers/Common/CommonController');

/* Common Client Dashboard Api's Controller */
const {
    DashboardClientCompanyInductions
} = require('../../controllers/Common/CommonClient/CommonClientDashboardController');

// Common (Client Portal) Client Api's Controller 
const {
    GetAllProvidersPrimaryList,
    GetAllInvitedProvidersOfClient,
    GetAllIndividualListForContact,
    AddClientContact,
    GetAllClientContacts,
    GetClientContactById,
    UpdateClientContact,
    DeleteClientContact,
    GetClientOtherDetailsById
} = require('../../controllers/Common/CommonClient/CommonClientController');

//Common Email Api's Controller
const {
    GetAllSpecificEmailTemplates,
    EmailToIndividual,
    GetAllIndividualForEmail,
} = require('../../controllers/Common/CommonEmailController');

//Common (Client Portal) Client User Api's Controller
const { } = require('../../controllers/Common/CommonClient/CommonClientUserController');

//Common All (Admin Portal) Client User Setting Api's Controller
const {
    InviteOrgUser,
    ReinviteOrgUser,
    GetAllSpecificOrgUsers,
    GetAllSpecificOrgInvites,
    GetOrgUserPermById,
    UpdateOrgUserPerm,
    RemoveOrgUserInvitation,
    RemoveOrgUser
} = require('../../controllers/Common/CommonUserSettingController');

//Common (Client Portal) Client Compliance Doc Api's Controller 
const {
    CreateComplianceChecklist,
    AddChecklistDoc,
    GetAllComplianceChecklistOfClient,
    GetComplianceChecklistById,
    UpdateComplianceChecklist,
    ArchiveChecklist,
    ArchiveComplianceDoc

} = require('../../controllers/Common/CommonClient/CommonComplianceController');

//Common (Client Portal) Client Company Induction Api's Controller 
const {
    CreateCompanyInductionForClient,
    CreateCompanyInductionModule,
    UpdateCompanyInduction,
    GetCompanyInductionModuleById,
    ExportInductionModulePdfRange,
    UpdateCompanyInductionModule,
    GetAllInductionOfSpecificCompany,
    GetCompanyInductionAndModulesbyId,
    DeleteCompanyIndModuleFileById,
    DeleteCompanyInductionModuleById,
    DeleteCompanyIndModuleQuesAnsByid,
    DeleteCompanyIndModuleAnsByid,
    UpdateCompanyInductionStatus,
    DeleteCompanyInduction
} = require('../../controllers/Common/CommonClient/CommonCompanyIndController');

//Common (Client Portal) Client Site and Site induction api's Controller
const {
    CreateSite,
    GetClientSiteById,
    UpdateClientSite,
    DeleteSiteEvacuationDiagramById,
    RemoveClientSiteById,
    GetAllSitesOfClient,
    CreateSiteInduction,
    UpdateSiteInductionModule,
    UpdateSiteInduction,
    GetSiteInductionModuleById,
    GetSiteInductionAndModulesbyId,
    CreateSiteInductionModule,
    GetSiteInductionRequiredDoc,
    GetAllInductionsOfSpecificSite,
    RemoveInductionModuleQuesById,
    DeleteSiteInductionModuleById,
    DeleteSiteIndModuleQuesAnsByid,
    DeleteSiteIndModuleAnsByid,
    DeleteSite,
    DeleteSiteInduction,
    UpdateSiteInductionStatus,
    UpdateSiteActiveStatus,
    GetClientSiteAllInductees,
    DeleteInducteeSiteDetails,
    GetSpecificSiteLogs,
    GetClientContactsForSiteList,
    AssignCompChecklistToWorker,

} = require('../../controllers/Common/CommonClient/CommonClientSiteController');

// Common Client (Client Portal) Settings Api's Controller
const {
    GetSpecificClientDetailsById,
    GetAlreadyExistingOrgCheck,
    UpdateClientDetails,
    UpdateComplianceChecklistReviewDate,
} = require('../../controllers/Common/CommonClient/CommonClientSettingController');

//Client (Client Portal) Routes Api's Controller
const {
    GetClientUserDetailsById,
    UpdateClientUserProfile,
    ClientSupportEmailSend
} = require("../../controllers/_Client-Portal/ClientController");

//Client (Client Portal) Provider Api's Controller
const {
    GetAllProvidersOfClientAndDetails,
    GetAllGlobalProvidersForClient,
    GetProviderOverviewForClient,
    GetAllWorkersOfProviderByClient,
    GetProviderApprovalDocbyId,
    GetAllAssignedChecklistOfProvider
} = require("../../controllers/_Client-Portal/ClientProviderController");

//Client>Provider (Client Portal) Routes Api's Controller
const {
    GetProviderDocsAgainstClient,
    GetProviderDocTypeAgainstClientList,
    GetSubmissionDocsOrChecklist

} = require("../../controllers/Common/CommonClient/CommonClientProviderController");

//Client>Provider (Client portal) Routes Api's Controller
const {
    GetDocumentHistoryById,
} = require("../../controllers/Common/CommonProvider/CommonProviderDocController");

//Client>Provider>Worker (Client Portal) Routes Api's Controller
const {
    GetWorkerSiteLogsByClient,
    GetIndStatusOfWorkerByClient,
    GetWorkerTrainingInduction,
    GetSubmissionDocsOfWorker,
} = require("../../controllers/Common/CommonProvider/CommonProviderWorkerController");

//Client>Provider>Contact (Client Portal) Routes Api's Controller
const {
    GetProviderInternalOrClientContacts,

} = require("../../controllers/Common/CommonProvider/CommonProviderContactController");


/* Common (Client Portal ) Provider -> worker documents Controller */
const {
    GetWorkerDocHistoryById
} = require('../../controllers/Common/CommonWorker/CommonWorkerDocController');


/* Common  (Client Portal ) Client -> Messages */
const {
    GetOrgEmailLogs,
    GetEmailLogById,
    ForwardEmail
} = require('../../controllers/Common/CommonEmailController');
module.exports = (app) => {

    const { authenticateToken } = require('../../../middlewares/AuthMiddleware');
    const { upload, uploadMemo, uploadLocal, } = require('../../../middlewares/File-UploadMiddleware');

    /*------------------------------- All Portal Common Routes (Client Portal) ------------------------ */
    app.get('/api/client/GetAllIndividualListForInvite', authenticateToken, upload.none(), GetAllIndividualListForInvite);
    app.patch('/api/client/UpdateUserPassword', authenticateToken, upload.none(), UpdateUserPassword);
    app.get('/api/client/GetUserOrganisationsList', authenticateToken, upload.none(), GetUserOrganisationsList);
    app.post('/api/client/CreateOrgNote', authenticateToken, upload.array("note_attach"), CreateOrgNote);
    app.get('/api/client/GetSpecificOrgNotes', authenticateToken, upload.none(), GetSpecificOrgNotes);
    app.patch('/api/client/UpdateModuleSortingOrder', authenticateToken, upload.none(), UpdateModuleSortingOrder);
    app.patch('/api/client/UpdateModuleQuesSortingOrder', authenticateToken, upload.none(), UpdateModuleQuesSortingOrder);
    app.patch('/api/client/UpdateModuleAnsSortingOrder', authenticateToken, upload.none(), UpdateModuleAnsSortingOrder);
    app.post('/api/client/InviteProvidersCsvView', authenticateToken, uploadLocal.single("provider_invite_csv"), InviteProvidersCsvView)
    app.post('/api/client/InviteProviderFromCsv', authenticateToken, upload.array("invite_attach"), InviteProviderFromCsv);
    app.put('/api/client/ReinviteProvider', authenticateToken, upload.none(), ReinviteProvider);
    app.get('/api/client/GetAllProviderTypesList', authenticateToken, upload.none(), GetAllProviderTypesList);
    app.put('/api/client/UpdateProviderDocStatus', authenticateToken, upload.none(), UpdateProviderDocStatus);
    app.get('/api/client/GetWorkerProfileById', authenticateToken, upload.none(), GetWorkerProfileById);

    /* ------------------------------- Common Route Client Portal ----------------------------------*/
    /* Common (Client Portal) Client Dashboard Routes */
    app.get('/api/client/DashboardClientCompanyInductions', authenticateToken, upload.none(), DashboardClientCompanyInductions);

    /* Common (Client Portal) Client Routes*/
    app.get('/api/client/GetAllProvidersPrimaryList', authenticateToken, upload.none(), GetAllProvidersPrimaryList);
    app.post('/api/client/InviteSpecificProvider', authenticateToken, upload.array("invite_attach"), InviteSpecificProvider);
    app.get('/api/client/GetAllComplianceListOfClient', authenticateToken, upload.none(), GetAllComplianceListOfClient);
    app.get('/api/client/GetAllInvitedProvidersOfClient', authenticateToken, upload.none(), GetAllInvitedProvidersOfClient);

    app.get('/api/client/GetAllIndividualListForContact', authenticateToken, upload.none(), GetAllIndividualListForContact);
    app.post('/api/client/AddClientContact', authenticateToken, upload.none(), AddClientContact);
    app.get('/api/client/GetAllClientContacts', authenticateToken, upload.none(), GetAllClientContacts);
    app.get('/api/client/GetClientContactById', authenticateToken, upload.none(), GetClientContactById);
    app.put('/api/client/UpdateClientContact', authenticateToken, upload.none(), UpdateClientContact);
    app.delete('/api/client/DeleteClientContact', authenticateToken, upload.none(), DeleteClientContact);

    app.get('/api/client/GetAllSpecificEmailTemplates', authenticateToken, upload.none(), GetAllSpecificEmailTemplates);
    app.get('/api/client/GetAllIndividualForEmail', authenticateToken, upload.none(), GetAllIndividualForEmail);
    app.post('/api/client/EmailToIndividual', authenticateToken, upload.array("email_doc"), EmailToIndividual);
    app.get('/api/client/GetClientOtherDetailsById', authenticateToken, upload.none(), GetClientOtherDetailsById);

    /* Common all (Client Portal) Client User Setting Api's Routes  */
    app.post('/api/client/InviteOrgUser', authenticateToken, upload.none(), InviteOrgUser);
    app.put('/api/client/ReinviteOrgUser', authenticateToken, upload.none(), ReinviteOrgUser);
    app.get('/api/client/GetAllSpecificOrgUsers', authenticateToken, upload.none(), GetAllSpecificOrgUsers);
    app.get('/api/client/GetAllSpecificOrgInvites', authenticateToken, upload.none(), GetAllSpecificOrgInvites);
    app.get('/api/client/GetOrgUserPermById', authenticateToken, upload.none(), GetOrgUserPermById);
    app.put('/api/client/UpdateOrgUserPerm', authenticateToken, upload.none(), UpdateOrgUserPerm);
    app.delete('/api/client/RemoveOrgUserInvitation', authenticateToken, upload.none(), RemoveOrgUserInvitation);
    app.delete('/api/client/RemoveOrgUser', authenticateToken, upload.none(), RemoveOrgUser);

    /* Common (Client Portal) Client Compliance Doc Routes */
    app.get('/api/client/GetAllDocumentTypeList', authenticateToken, upload.none(), GetAllDocumentTypeList);
    app.post('/api/client/CreateComplianceChecklist', authenticateToken, upload.any(), CreateComplianceChecklist);
    app.post('/api/client/AddChecklistDoc', authenticateToken, upload.single('checklistDoc'), AddChecklistDoc);
    app.get('/api/client/GetAllComplianceChecklistOfClient', authenticateToken, upload.none(), GetAllComplianceChecklistOfClient);
    app.get('/api/client/GetComplianceChecklistById', authenticateToken, upload.none(), GetComplianceChecklistById);
    app.patch('/api/client/UpdateComplianceChecklist', authenticateToken, upload.none(), UpdateComplianceChecklist);
    app.delete('/api/client/ArchiveChecklist', authenticateToken, upload.none(), ArchiveChecklist);
    app.delete('/api/client/ArchiveComplianceDoc', authenticateToken, upload.none(), ArchiveComplianceDoc);

    /* Common (Client Portal) Client Company Induction Routes */
    app.post('/api/client/CreateCompanyInductionForClient', authenticateToken, upload.none(), CreateCompanyInductionForClient);
    app.get('/api/client/GetAllInductionOfSpecificCompany', authenticateToken, upload.none(), GetAllInductionOfSpecificCompany);
    app.post('/api/client/CreateCompanyInductionModule', authenticateToken, upload.single("company_ind_file"), CreateCompanyInductionModule);
    app.put('/api/client/UpdateCompanyInduction', authenticateToken, upload.none(), UpdateCompanyInduction);
    app.get('/api/client/GetCompanyInductionModuleById', authenticateToken, upload.none(), GetCompanyInductionModuleById);
    app.put('/api/client/ExportInductionModulePdfRange', authenticateToken, upload.none(), ExportInductionModulePdfRange);
    app.put('/api/client/UpdateCompanyInductionModule', authenticateToken, upload.single("company_ind_file"), UpdateCompanyInductionModule);
    app.get('/api/client/GetCompanyInductionAndModulesbyId', authenticateToken, upload.none(), GetCompanyInductionAndModulesbyId);
    app.delete('/api/client/DeleteCompanyIndModuleFileById', authenticateToken, upload.none(), DeleteCompanyIndModuleFileById);
    app.delete('/api/client/DeleteCompanyIndModuleQuesAnsByid', authenticateToken, upload.none(), DeleteCompanyIndModuleQuesAnsByid);
    app.delete('/api/client/DeleteCompanyInductionModuleById', authenticateToken, upload.none(), DeleteCompanyInductionModuleById);
    app.delete('/api/client/DeleteCompanyIndModuleAnsByid', authenticateToken, upload.none(), DeleteCompanyIndModuleAnsByid);
    app.put('/api/client/UpdateCompanyInductionStatus', authenticateToken, upload.none(), UpdateCompanyInductionStatus)
    app.delete('/api/client/DeleteCompanyInduction', authenticateToken, upload.none(), DeleteCompanyInduction);

    /* Common (Client Portal) Client Site Induction Routes */
    app.post('/api/client/CreateSite', authenticateToken, upload.array("evacuation_diagram"), CreateSite);
    app.get('/api/client/GetClientSiteById', authenticateToken, upload.none(), GetClientSiteById);
    app.put('/api/client/UpdateClientSite', authenticateToken, upload.array("evacuation_diagram"), UpdateClientSite);
    app.delete('/api/client/DeleteSiteEvacuationDiagramById', authenticateToken, upload.none(), DeleteSiteEvacuationDiagramById);
    app.get('/api/client/GetAllSitesOfClient', authenticateToken, upload.none(), GetAllSitesOfClient);
    app.delete('/api/client/RemoveClientSiteById', authenticateToken, upload.none(), RemoveClientSiteById);
    app.post('/api/client/CreateSiteInduction', authenticateToken, upload.none(), CreateSiteInduction);
    app.put('/api/client/UpdateSiteInductionModule', authenticateToken, upload.single("site_induction_file"), UpdateSiteInductionModule);
    app.put('/api/client/UpdateSiteInduction', authenticateToken, upload.none(), UpdateSiteInduction);
    app.get('/api/client/GetSiteInductionModuleById', authenticateToken, upload.none(), GetSiteInductionModuleById);
    app.get('/api/client/GetSiteInductionAndModulesbyId', authenticateToken, upload.none(), GetSiteInductionAndModulesbyId);
    app.post('/api/client/CreateSiteInductionModule', authenticateToken, upload.single("site_induction_file"), CreateSiteInductionModule);
    app.get('/api/client/GetSiteInductionRequiredDoc', authenticateToken, upload.none(), GetSiteInductionRequiredDoc);
    app.get('/api/client/GetAllInductionsOfSpecificSite', authenticateToken, upload.none(), GetAllInductionsOfSpecificSite);
    app.delete('/api/client/RemoveInductionModuleQuesById', authenticateToken, upload.none(), RemoveInductionModuleQuesById);
    app.delete('/api/client/DeleteSiteInductionModuleById', authenticateToken, upload.none(), DeleteSiteInductionModuleById);
    app.delete('/api/client/DeleteSiteIndModuleQuesAnsByid', authenticateToken, upload.none(), DeleteSiteIndModuleQuesAnsByid);
    app.delete('/api/client/DeleteSiteIndModuleAnsByid', authenticateToken, upload.none(), DeleteSiteIndModuleAnsByid);
    app.delete('/api/client/DeleteSite', authenticateToken, upload.none(), DeleteSite);
    app.delete('/api/client/DeleteSiteInduction', authenticateToken, upload.none(), DeleteSiteInduction);

    app.put('/api/client/UpdateSiteInductionStatus', authenticateToken, upload.none(), UpdateSiteInductionStatus);
    app.put('/api/client/UpdateSiteActiveStatus', authenticateToken, upload.none(), UpdateSiteActiveStatus);
    app.get('/api/client/GetClientSiteAllInductees', authenticateToken, upload.none(), GetClientSiteAllInductees);
    app.delete('/api/client/DeleteInducteeSiteDetails', authenticateToken, upload.none(), DeleteInducteeSiteDetails);
    app.get('/api/client/GetSpecificSiteLogs', authenticateToken, upload.none(), GetSpecificSiteLogs);
    app.get('/api/client/GetClientContactsForSiteList', authenticateToken, upload.none(), GetClientContactsForSiteList);

    /* Common (Client Portal) Client Setting Routes */
    app.get('/api/client/GetSpecificClientDetailsById', authenticateToken, upload.none(), GetSpecificClientDetailsById);
    app.get('/api/client/GetAlreadyExistingOrgCheck', authenticateToken, upload.none(), GetAlreadyExistingOrgCheck);
    app.put('/api/client/UpdateClientDetails', authenticateToken, upload.single("logo"), UpdateClientDetails);
    app.put('/api/client/UpdateComplianceChecklistReviewDate', authenticateToken, upload.none(), UpdateComplianceChecklistReviewDate);

    /* --------------------------------- Client Portal Specific Routes ----------------------------------*/
    /* Client (Client Portal) Provider Routes */
    app.get('/api/client/GetAllProvidersOfClientAndDetails', authenticateToken, upload.none(), GetAllProvidersOfClientAndDetails);
    app.get('/api/client/GetAllGlobalProvidersForClient', authenticateToken, upload.none(), GetAllGlobalProvidersForClient);
    app.get('/api/client/GetProviderOverviewForClient', authenticateToken, upload.none(), GetProviderOverviewForClient);
    app.get('/api/client/GetProviderApprovalDocbyId', authenticateToken, upload.none(), GetProviderApprovalDocbyId);
    app.get('/api/client/GetSubmissionDocsOrChecklist', authenticateToken, upload.none(), GetSubmissionDocsOrChecklist);
    app.post('/api/client/AssignCompChecklistToWorker', authenticateToken, upload.none(), AssignCompChecklistToWorker);
    app.get('/api/client/GetAllAssignedChecklistOfProvider', authenticateToken, upload.none(), GetAllAssignedChecklistOfProvider);

    /* Client (Client Portal) Routes */
    app.put('/api/client/UpdateClientUserProfile', authenticateToken, upload.single("avatar"), UpdateClientUserProfile);
    app.get('/api/client/GetClientUserDetailsById', authenticateToken, upload.none(), GetClientUserDetailsById);
    app.post('/api/client/ClientSupportEmailSend', authenticateToken, uploadMemo.array("support_email_attach"), ClientSupportEmailSend);

    /* --------------------------------- Client Portal Specfic Provider Routes---------------------*/
    app.get('/api/client/GetProviderDocsAgainstClient', authenticateToken, upload.none(), GetProviderDocsAgainstClient);
    app.get('/api/client/GetProviderDocTypeAgainstClientList', authenticateToken, upload.none(), GetProviderDocTypeAgainstClientList);
    app.get('/api/client/GetDocumentHistoryById', authenticateToken, upload.none(), GetDocumentHistoryById);
    app.get('/api/client/GetProviderInternalOrClientContacts', authenticateToken, upload.none(), GetProviderInternalOrClientContacts);

    /* --------------------------------- Commmon for Client Portal Specfic Provider->Worker and  Client->Site->inductees ---------------------*/
    /* Client (Client Portal) Provider-> Worker Routes */
    app.get('/api/client/GetAllWorkersOfProviderByClient', authenticateToken, upload.none(), GetAllWorkersOfProviderByClient);

    // Client->Site->inductees 
    app.get('/api/client/GetWorkerSiteLogsByClient', authenticateToken, upload.none(), GetWorkerSiteLogsByClient);
    app.get('/api/client/GetIndStatusOfWorkerByClient', authenticateToken, upload.none(), GetIndStatusOfWorkerByClient);
    app.get('/api/client/GetWorkerTrainingInduction', authenticateToken, upload.none(), GetWorkerTrainingInduction);
    app.get('/api/client/GetSubmissionDocsOfWorker', authenticateToken, upload.none(), GetSubmissionDocsOfWorker);
    app.get('/api/client/GetWorkerDocHistoryById', authenticateToken, upload.none(), GetWorkerDocHistoryById);

    /* Common  (Client Portal) Client -> Messages Routes */
    app.get('/api/client/GetOrgEmailLogs', authenticateToken, upload.none(), GetOrgEmailLogs);
    app.get('/api/client/GetEmailLogById', authenticateToken, upload.none(), GetEmailLogById);
    app.post('/api/client/ForwardEmail', authenticateToken, upload.none(), ForwardEmail);

};
