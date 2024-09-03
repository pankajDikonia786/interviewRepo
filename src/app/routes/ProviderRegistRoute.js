module.exports = (app) => {
    //Provider Registration Controller
    const {
        SignupProviderEmailVerification,
        ResendEmailVerification,
        VerifyEmail,
        SetNewPassword,
        SignupProviderForClient,
        RegisterExistingProviderForClient,
        CreateProviderRegisTempData,
        UpdateProviderRegisTempData,
        SignupProviderForYourself,
        GetProviderRegisSaveAndContinueById,
        DeleteProviderTempRegisfile,
        GetProviderInvitationById,
        RejectProviderInvitation,
        ProviderAcceptInvitationConfirm,
        CreateInvitedProviderPrimaryUser,

        AddProviderDocsAndSubmit


    } = require('../controllers/RegistrationController');

    /* Common (Admin Portal) Provider clients Controller  */
    const { GetAllDocsOfProviderByDocType, } = require("../controllers/Common/CommonProvider/CommonProviderClientController")

    const { authenticateToken } = require('../../middlewares/AuthMiddleware');
    const { upload } = require('../../middlewares/File-UploadMiddleware');

    //Provider Registration Api's
    app.post('/api/SignupProviderEmailVerification', upload.none(), SignupProviderEmailVerification)
    app.post('/api/ResendEmailVerification', upload.none(), ResendEmailVerification);
    app.patch('/api/VerifyEmail', upload.none(), VerifyEmail);
    app.put('/api/SetNewPassword', upload.none(), SetNewPassword);

    app.post('/api/SignupProviderForClient', upload.fields([{ name: "msaDoc", maxCount: 1 }, { name: "engagementDoc", maxCount: 1 }]), SignupProviderForClient);
    app.post('/api/RegisterExistingProviderForClient', upload.none(), RegisterExistingProviderForClient);

    app.post('/api/CreateProviderRegisTempData', upload.fields([{ name: "tempMsaDoc", maxCount: 1 }, { name: "tempEngagementDoc", maxCount: 1 }]), CreateProviderRegisTempData);
    app.put('/api/UpdateProviderRegisTempData', upload.fields([{ name: "tempMsaDoc", maxCount: 1 }, { name: "tempEngagementDoc", maxCount: 1 }]), UpdateProviderRegisTempData);

    app.post('/api/SignupProviderForYourself', upload.single("msa_doc"), SignupProviderForYourself);
    app.get('/api/GetProviderRegisSaveAndContinueById', upload.none(), GetProviderRegisSaveAndContinueById);
    app.delete('/api/DeleteProviderTempRegisfile', upload.none(), DeleteProviderTempRegisfile);
    app.get('/api/GetProviderInvitationById', upload.none(), GetProviderInvitationById);
    app.put('/api/RejectProviderInvitation', upload.none(), RejectProviderInvitation);
    app.put('/api/ProviderAcceptInvitationConfirm', authenticateToken, upload.none(), ProviderAcceptInvitationConfirm);
    app.post('/api/CreateInvitedProviderPrimaryUser', upload.none(), CreateInvitedProviderPrimaryUser);

    app.post('/api/AddProviderDocsAndSubmit', authenticateToken, upload.any(), AddProviderDocsAndSubmit);//current token not applied
    app.get('/api/GetAllDocsOfProviderByDocType', authenticateToken, upload.none(), GetAllDocsOfProviderByDocType);

};
