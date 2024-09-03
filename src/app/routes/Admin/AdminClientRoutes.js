const { DashboardAllClientsCompanyInd,
    DashboardGetAllClientsStatusChart

} = require('../../controllers/_Admin-Portal/APClient/APClientsMainDashboard');

//Common all api's Controller
const {
    GetClientOverviewProfileById,
    GetAllProviderTypesList,
    GetAllDocumentTypeList,
    GetAllIndividualListForInvite,
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
    UpdateOrgStatus,


} = require("../../controllers/Common/CommonController");

//Client>Site>Worker (Admin Portal) Routes Api's Controller
const {
    GetWorkerSiteLogsByClient,
    GetIndStatusOfWorkerByClient,
    GetWorkerTrainingInduction,
    GetSubmissionDocsOfWorker,

} = require("../../controllers/Common/CommonProvider/CommonProviderWorkerController")

/* Common Client Dashboard Api's Controller */
const {
    DashboardClientCompanyInductions
} = require('../../controllers/Common/CommonClient/CommonClientDashboardController');

//(Admin Portal) Client Controller
const {
    GetAllParentClientList,
    AddClient,
    GetAllProvidersOfClient,
    AdminGetAllClients,
    UpdateClientAccreditations,

} = require('../../controllers/_Admin-Portal/APClient/APClientController');
//-----------------make commmon this api's of user's
//Common (Admin Portal) Client User Api's Controller
const { // RemoveClientUser
} = require('../../controllers/Common/CommonClient/CommonClientUserController');

//Common All (Admin Portal) client User Setting Api's Controller
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

//Common All (Admin Portal) Email Api's Controller
const {

    GetAllSpecificEmailTemplates,
    EmailToIndividual,
    GetAllIndividualForEmail,

} = require('../../controllers/Common/CommonEmailController');

// Common (Admin Portal) Client Api's Controller 
const {
    GetAllProvidersPrimaryList,
    GetAllInvitedProvidersOfClient,
    GetAllIndividualListForContact,
    AddClientContact,
    GetAllClientContacts,
    GetClientContactById,
    UpdateClientContact,
    DeleteClientContact,
    GetClientOtherDetailsById,

} = require('../../controllers/Common/CommonClient/CommonClientController');

// Common (Admin Portal) Client Compliace Doc Api's Controller
const {

    CreateComplianceChecklist,
    AddChecklistDoc,
    GetAllComplianceChecklistOfClient,
    GetComplianceChecklistById,
    UpdateComplianceChecklist,
    ArchiveChecklist,
    ArchiveComplianceDoc,

} = require('../../controllers/Common/CommonClient/CommonComplianceController');
//Common (Admin Portal) Client Company Induction  Api's Controller 
const {
    CreateCompanyInductionForClient,
    UpdateCompanyInduction,
    CreateCompanyInductionModule,
    GetCompanyInductionModuleById,
    UpdateCompanyInductionModule,
    GetAllInductionOfSpecificCompany,
    GetCompanyInductionAndModulesbyId,
    ExportInductionModulePdfRange,
    DeleteCompanyIndModuleFileById,
    DeleteCompanyInductionModuleById,
    DeleteCompanyIndModuleQuesAnsByid,
    DeleteCompanyIndModuleAnsByid,
    UpdateCompanyInductionStatus,
    DeleteCompanyInduction,
} = require('../../controllers/Common/CommonClient/CommonCompanyIndController');

// Client (Admin Portal) Site Induction Api's Controller
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
    UpdateSiteInductionStatus,
    DeleteSite,
    DeleteSiteInduction,
    UpdateSiteActiveStatus,
    GetClientSiteAllInductees,
    DeleteInducteeSiteDetails,
    GetSpecificSiteLogs,
    GetClientContactsForSiteList,
    AssignCompChecklistToWorker,

} = require('../../controllers/Common/CommonClient/CommonClientSiteController');

// Client (Admin Portal) >Site>worker Api's Controllers
const {
    GetSpecificClientDetailsById,
    GetAlreadyExistingOrgCheck,
    UpdateClientDetails,
    UpdateComplianceChecklistReviewDate,
} = require('../../controllers/Common/CommonClient/CommonClientSettingController');

// Client (Admin Portal) Settings Api's Controller
const {
    GetSubmissionDocsOrChecklist
} = require('../../controllers/Common/CommonClient/CommonClientProviderController');


module.exports = (app) => {

    const { authenticateToken } = require('../../../middlewares/AuthMiddleware');
    const { upload, uploadMemo, uploadLocal } = require('../../../middlewares/File-UploadMiddleware');

    /* Admin Client Main Dashboard Routes */
    app.get('/api/admin/client/DashboardAllClientsCompanyInd', authenticateToken, upload.none(), DashboardAllClientsCompanyInd);
    app.get('/api/admin/client/DashboardGetAllClientsStatusChart', authenticateToken, upload.none(), DashboardGetAllClientsStatusChart);

    // https://conserve.dikonia.in
    /*------------------------------- All Portal Common Routes (Admin-Client Portal) ------------------------ */
    app.get('/api/admin/client/GetClientOverviewProfileById', authenticateToken, upload.none(), GetClientOverviewProfileById);
    app.get('/api/admin/client/GetAllProviderTypesList', authenticateToken, upload.none(), GetAllProviderTypesList);
    app.patch('/api/admin/client/UpdateOrgStatus', authenticateToken, upload.none(), UpdateOrgStatus);
    app.get('/api/admin/client/GetAllDocumentTypeList', authenticateToken, upload.none(), GetAllDocumentTypeList);
    app.get('/api/admin/client/GetAllIndividualListForInvite', authenticateToken, upload.none(), GetAllIndividualListForInvite);
    app.post('/api/admin/client/CreateOrgNote', authenticateToken, upload.array("note_attach"), CreateOrgNote);
    app.get('/api/admin/client/GetSpecificOrgNotes', authenticateToken, upload.none(), GetSpecificOrgNotes);
    app.patch('/api/admin/client/UpdateModuleSortingOrder', authenticateToken, upload.none(), UpdateModuleSortingOrder);
    app.patch('/api/admin/client/UpdateModuleQuesSortingOrder', authenticateToken, upload.none(), UpdateModuleQuesSortingOrder);
    app.patch('/api/admin/client/UpdateModuleAnsSortingOrder', authenticateToken, upload.none(), UpdateModuleAnsSortingOrder);

    /*** Common (Client Portal) Client Dashboard Routes ***/
    app.get('/api/admin/client/DashboardClientCompanyInductions', authenticateToken, upload.none(), DashboardClientCompanyInductions);

    /******* Client Routes (Admin Portal) ********/
    app.get('/api/admin/client/GetAllParentClientList', authenticateToken, upload.none(), GetAllParentClientList);
    app.post('/api/admin/client/AddClient', authenticateToken, upload.single("logo"), AddClient);
    app.get('/api/admin/client/AdminGetAllClients', authenticateToken, upload.none(), AdminGetAllClients);

    app.get('/api/admin/client/GetAllProvidersOfClient', authenticateToken, upload.none(), GetAllProvidersOfClient);
    app.put('/api/admin/client/UpdateClientAccreditations', authenticateToken, upload.none(), UpdateClientAccreditations);

    // Clent Compliance checklist ruotes (Admin Portal)
    app.get('/api/admin/client/GetAllProviderTypesList', authenticateToken, upload.none(), GetAllProviderTypesList);
    app.post('/api/admin/client/CreateComplianceChecklist', authenticateToken, upload.any(), CreateComplianceChecklist);
    app.post('/api/admin/client/AddChecklistDoc', authenticateToken, upload.single('checklistDoc'), AddChecklistDoc);
    app.get('/api/admin/client/GetAllComplianceChecklistOfClient', authenticateToken, upload.none(), GetAllComplianceChecklistOfClient);
    app.get('/api/admin/client/GetComplianceChecklistById', authenticateToken, upload.none(), GetComplianceChecklistById);
    app.patch('/api/admin/client/UpdateComplianceChecklist', authenticateToken, upload.none(), UpdateComplianceChecklist);
    app.delete('/api/admin/client/ArchiveChecklist', authenticateToken, upload.none(), ArchiveChecklist);
    app.delete('/api/admin/client/ArchiveComplianceDoc', authenticateToken, upload.none(), ArchiveComplianceDoc);

    /* Common All (Admin Portal) Client User Setting Api's Routes   */
    app.post('/api/admin/client/InviteOrgUser', authenticateToken, upload.none(), InviteOrgUser);
    app.put('/api/admin/client/ReinviteOrgUser', authenticateToken, upload.none(), ReinviteOrgUser);
    app.get('/api/admin/client/GetAllSpecificOrgUsers', authenticateToken, upload.none(), GetAllSpecificOrgUsers);
    app.get('/api/admin/client/GetAllSpecificOrgInvites', authenticateToken, upload.none(), GetAllSpecificOrgInvites);
    app.get('/api/admin/client/GetOrgUserPermById', authenticateToken, upload.none(), GetOrgUserPermById);
    app.put('/api/admin/client/UpdateOrgUserPerm', authenticateToken, upload.none(), UpdateOrgUserPerm);
    app.delete('/api/admin/client/RemoveOrgUserInvitation', authenticateToken, upload.none(), RemoveOrgUserInvitation);
    app.delete('/api/admin/client/RemoveOrgUser', authenticateToken, upload.none(), RemoveOrgUser);

    /* Common (Admin Portal) Client  Routes*/
    app.get('/api/admin/client/GetAllProvidersPrimaryList', authenticateToken, upload.none(), GetAllProvidersPrimaryList);
    app.get('/api/admin/client/GetAllComplianceListOfClient', authenticateToken, upload.none(), GetAllComplianceListOfClient);
    app.post('/api/admin/client/InviteSpecificProvider', authenticateToken, upload.array("invite_attach"), InviteSpecificProvider);
    app.get('/api/admin/client/GetAllInvitedProvidersOfClient', authenticateToken, upload.none(), GetAllInvitedProvidersOfClient);
    app.put('/api/admin/client/ReinviteProvider', authenticateToken, upload.none(), ReinviteProvider);
    app.post('/api/admin/client/InviteProvidersCsvView', authenticateToken, uploadLocal.single("provider_invite_csv"), InviteProvidersCsvView);
    app.post('/api/admin/client/InviteProviderFromCsv', authenticateToken, upload.array("invite_attach"), InviteProviderFromCsv);

    app.get('/api/admin/client/GetAllIndividualListForContact', authenticateToken, upload.none(), GetAllIndividualListForContact);
    app.post('/api/admin/client/AddClientContact', authenticateToken, upload.none(), AddClientContact);
    app.get('/api/admin/client/GetAllClientContacts', authenticateToken, upload.none(), GetAllClientContacts);
    app.get('/api/admin/client/GetClientContactById', authenticateToken, upload.none(), GetClientContactById);
    app.put('/api/admin/client/UpdateClientContact', authenticateToken, upload.none(), UpdateClientContact);
    app.delete('/api/admin/client/DeleteClientContact', authenticateToken, upload.none(), DeleteClientContact);

    app.get('/api/admin/client/GetAllSpecificEmailTemplates', authenticateToken, upload.none(), GetAllSpecificEmailTemplates);
    app.get('/api/admin/client/GetAllIndividualForEmail', authenticateToken, upload.none(), GetAllIndividualForEmail);
    app.post('/api/admin/client/EmailToIndividual', authenticateToken, upload.array("email_doc"), EmailToIndividual);

    app.get('/api/admin/client/GetClientOtherDetailsById', authenticateToken, upload.none(), GetClientOtherDetailsById);

    /* Common (Admin Portal) Client Company Induction Routes */
    app.post('/api/admin/client/CreateCompanyInductionForClient', authenticateToken, upload.none(), CreateCompanyInductionForClient);
    app.put('/api/admin/client/UpdateCompanyInduction', authenticateToken, upload.none(), UpdateCompanyInduction);

    app.get('/api/admin/client/GetAllInductionOfSpecificCompany', authenticateToken, upload.none(), GetAllInductionOfSpecificCompany);
    app.post('/api/admin/client/CreateCompanyInductionModule', authenticateToken, upload.single("company_ind_file"), CreateCompanyInductionModule);
    app.get('/api/admin/client/GetCompanyInductionModuleById', authenticateToken, upload.none(), GetCompanyInductionModuleById);

    app.put('/api/admin/client/UpdateCompanyInductionModule', authenticateToken, upload.single("company_ind_file"), UpdateCompanyInductionModule);
    app.get('/api/admin/client/GetCompanyInductionAndModulesbyId', authenticateToken, upload.none(), GetCompanyInductionAndModulesbyId);
    app.put('/api/admin/client/ExportInductionModulePdfRange', authenticateToken, upload.none(), ExportInductionModulePdfRange);
    app.delete('/api/admin/client/DeleteCompanyIndModuleFileById', authenticateToken, upload.none(), DeleteCompanyIndModuleFileById);
    app.delete('/api/admin/client/DeleteCompanyInductionModuleById', authenticateToken, upload.none(), DeleteCompanyInductionModuleById);

    app.delete('/api/admin/client/DeleteCompanyIndModuleQuesAnsByid', authenticateToken, upload.none(), DeleteCompanyIndModuleQuesAnsByid);
    app.delete('/api/admin/client/DeleteCompanyIndModuleAnsByid', authenticateToken, upload.none(), DeleteCompanyIndModuleAnsByid);
    app.put('/api/admin/client/UpdateCompanyInductionStatus', authenticateToken, upload.none(), UpdateCompanyInductionStatus);
    app.delete('/api/admin/client/DeleteCompanyInduction', authenticateToken, upload.none(), DeleteCompanyInduction);

    /* Common (Admin Portal) Client Site Induction Routes */
    app.post('/api/admin/client/CreateSite', authenticateToken, upload.array("evacuation_diagram"), CreateSite);
    app.get('/api/admin/client/GetClientSiteById', authenticateToken, upload.none(), GetClientSiteById);
    app.put('/api/admin/client/UpdateClientSite', authenticateToken, upload.array("evacuation_diagram"), UpdateClientSite);
    app.delete('/api/admin/client/DeleteSiteEvacuationDiagramById', authenticateToken, upload.none(), DeleteSiteEvacuationDiagramById);
    app.get('/api/admin/client/GetAllSitesOfClient', authenticateToken, upload.none(), GetAllSitesOfClient);
    app.delete('/api/admin/client/RemoveClientSiteById', authenticateToken, upload.none(), RemoveClientSiteById);
    app.post('/api/admin/client/CreateSiteInduction', authenticateToken, upload.none(), CreateSiteInduction);
    app.get('/api/admin/client/GetSiteInductionModuleById', authenticateToken, upload.none(), GetSiteInductionModuleById);
    app.put('/api/admin/client/UpdateSiteInductionModule', authenticateToken, upload.single("site_induction_file"), UpdateSiteInductionModule);
    app.put('/api/admin/client/UpdateSiteInduction', authenticateToken, upload.none(), UpdateSiteInduction);
    app.get('/api/admin/client/GetSiteInductionAndModulesbyId', authenticateToken, upload.none(), GetSiteInductionAndModulesbyId);
    app.post('/api/admin/client/CreateSiteInductionModule', authenticateToken, upload.single("site_induction_file"), CreateSiteInductionModule);
    app.get('/api/admin/client/GetSiteInductionRequiredDoc', authenticateToken, upload.none(), GetSiteInductionRequiredDoc);
    app.get('/api/admin/client/GetAllInductionsOfSpecificSite', authenticateToken, upload.none(), GetAllInductionsOfSpecificSite);
    app.delete('/api/admin/client/RemoveInductionModuleQuesById', authenticateToken, upload.none(), RemoveInductionModuleQuesById);
    app.delete('/api/admin/client/DeleteSiteInductionModuleById', authenticateToken, upload.none(), DeleteSiteInductionModuleById);

    app.delete('/api/admin/client/DeleteSiteIndModuleQuesAnsByid', authenticateToken, upload.none(), DeleteSiteIndModuleQuesAnsByid);
    app.delete('/api/admin/client/DeleteSiteIndModuleAnsByid', authenticateToken, upload.none(), DeleteSiteIndModuleAnsByid);
    app.put('/api/admin/client/UpdateSiteInductionStatus', authenticateToken, upload.none(), UpdateSiteInductionStatus);
    app.delete('/api/admin/client/DeleteSite', authenticateToken, upload.none(), DeleteSite);
    app.delete('/api/admin/client/DeleteSiteInduction', authenticateToken, upload.none(), DeleteSiteInduction);

    app.put('/api/admin/client/UpdateSiteActiveStatus', authenticateToken, upload.none(), UpdateSiteActiveStatus);
    app.get('/api/admin/client/GetClientSiteAllInductees', authenticateToken, upload.none(), GetClientSiteAllInductees);
    app.delete('/api/admin/client/DeleteInducteeSiteDetails', authenticateToken, upload.none(), DeleteInducteeSiteDetails);

    app.get('/api/admin/client/GetSpecificSiteLogs', authenticateToken, upload.none(), GetSpecificSiteLogs);
    app.get('/api/admin/client/GetClientContactsForSiteList', authenticateToken, upload.none(), GetClientContactsForSiteList);
    app.post('/api/admin/client/AssignCompChecklistToWorker', authenticateToken, upload.none(), AssignCompChecklistToWorker);
    app.get('/api/admin/client/GetSubmissionDocsOrChecklist', authenticateToken, upload.none(), GetSubmissionDocsOrChecklist);

    app.get('/api/admin/client/GetWorkerSiteLogsByClient', authenticateToken, upload.none(), GetWorkerSiteLogsByClient);
    app.get('/api/admin/client/GetIndStatusOfWorkerByClient', authenticateToken, upload.none(), GetIndStatusOfWorkerByClient);
    app.get('/api/admin/client/GetWorkerTrainingInduction', authenticateToken, upload.none(), GetWorkerTrainingInduction);
    app.get('/api/admin/client/GetSubmissionDocsOfWorker', authenticateToken, upload.none(), GetSubmissionDocsOfWorker);

    /* Common (Admin Portal) Client Setting Routes */
    app.get('/api/admin/client/GetSpecificClientDetailsById', authenticateToken, upload.none(), GetSpecificClientDetailsById);
    app.get('/api/admin/client/GetAlreadyExistingOrgCheck', authenticateToken, upload.none(), GetAlreadyExistingOrgCheck);
    app.put('/api/admin/client/UpdateClientDetails', authenticateToken, upload.single("logo"), UpdateClientDetails);
    app.put('/api/admin/client/UpdateComplianceChecklistReviewDate', authenticateToken, upload.none(), UpdateComplianceChecklistReviewDate);

};
