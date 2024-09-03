module.exports = (app) => {
    const {
        GetAllCountries,
        GetAllStatesbyCountryId,
        GetAllCitiesByStateId,
        GetAllOrgServiceTypeList,
        GetAllOrgIndustryTypeList,
        GetHighRiskActivityList,
        GetAllFunctions,
        GetAllClientList,
        GetAllContactTypes,
        GetAllRoleByFunctionId,
        GetIndividualByEmail,
        GetOrgUserInvitationById,
        SubmitUserInvitation,
        SubmitWorkerInvitation,
        GetInvitedProviderChecklist,
        GetProviderChecklistByClient,
        GetProviderPrimaryUserCheck
        // DeleteIndividualContactById
    } = require('../controllers/PublicController');

    const { upload } = require('../../middlewares/File-UploadMiddleware');

    app.get('/api/GetAllCountries', upload.none(), GetAllCountries);
    app.get('/api/GetAllStatesbyCountryId', upload.none(), GetAllStatesbyCountryId);
    app.get('/api/GetAllCitiesByStateId', upload.none(), GetAllCitiesByStateId);
    app.get('/api/GetAllOrgServiceTypeList', upload.none(), GetAllOrgServiceTypeList);
    app.get('/api/GetAllOrgIndustryTypeList', upload.none(), GetAllOrgIndustryTypeList);
    app.get('/api/GetHighRiskActivityList', upload.none(), GetHighRiskActivityList);
    app.get('/api/GetAllFunctions', upload.none(), GetAllFunctions);
    app.get('/api/GetAllClientList', upload.none(), GetAllClientList);
    app.get('/api/GetAllContactTypes', upload.none(), GetAllContactTypes);
    app.get('/api/GetAllRoleByFunctionId', upload.none(), GetAllRoleByFunctionId);
    app.get('/api/GetIndividualByEmail', upload.none(), GetIndividualByEmail);
    app.get('/api/GetOrgUserInvitationById', upload.none(), GetOrgUserInvitationById);

    app.post('/api/SubmitUserInvitation', upload.none(), SubmitUserInvitation);
    app.post('/api/SubmitWorkerInvitation', upload.single("avatar"), SubmitWorkerInvitation);
    app.get('/api/GetInvitedProviderChecklist', upload.none(), GetInvitedProviderChecklist);
    app.get('/api/GetProviderChecklistByClient', upload.none(), GetProviderChecklistByClient);
    app.get('/api/GetProviderPrimaryUserCheck', upload.none(), GetProviderPrimaryUserCheck);


    // app.delete('/api/DeleteIndividualContactById', upload.none(), DeleteIndividualContactById);

};
