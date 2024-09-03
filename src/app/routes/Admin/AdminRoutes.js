//Admin System Controller
const {
    AddDocumentType,
    AdminGetAllDocumentType,
    CreateEmailTemplate,
    GetEmailTemplateById,
    UpdateEmailTemplate,
    GetAllEmailTemplatesByType,
    DeleteEmailTempAttachmentById,
    DeleteEmailTemplate,
    GetallEmailLogs,
    GetAllEmailSenderList,
    GetAllEmailRecipientList,
    GetAllUsedEmailTemplatesList,
    CreateServiceType,
    GetAllServiceTypes,
    AddProviderType,
    GetAllProviderTypes,
    GetSpecificProviderTypeLogs,
    UpdateProviderType
} = require('../../controllers/_Admin-Portal/APSystemController');
//Admin User Controller
const {
    InviteUser,
    GetInvitationById,
    SubmitAdminUserInvitation,
    ReinviteAdminUser,
    GetAllConserveTeamAndInvites,
    GetUserDetailsById,
    UserResetPasswordEmail,
    UserResetPassword,
    UpdateUser,
    RemoveUser,
    RemoveAdminInviteUser,
    GetAdminProfileById,
    GetSpecificUserRole,
    TwoFactorAuth
} = require('../../controllers/_Admin-Portal/APUserController');
/* Common all controller */
const { UpdateUserPassword } = require('../../controllers/Common/CommonController');

/* Common email api controller */
const {
    GetEmailLogById,
    ForwardEmail
} = require('../../controllers/Common/CommonEmailController');



module.exports = (app) => {

    const { authenticateToken } = require('../../../middlewares/AuthMiddleware');
    const { upload } = require('../../../middlewares/File-UploadMiddleware');

    /* Admin System Routes */
    app.post('/api/admin/AddDocumentType', authenticateToken, upload.none(), AddDocumentType);
    app.get('/api/admin/AdminGetAllDocumentType', authenticateToken, upload.none(), AdminGetAllDocumentType);
    app.post('/api/admin/CreateEmailTemplate', authenticateToken, upload.array("email_temp_doc"), CreateEmailTemplate);
    app.get('/api/admin/GetEmailTemplateById', authenticateToken, upload.none(), GetEmailTemplateById);
    app.put('/api/admin/UpdateEmailTemplate', authenticateToken, upload.array("email_temp_doc"), UpdateEmailTemplate);
    app.get('/api/admin/GetAllEmailTemplatesByType', authenticateToken, upload.none(), GetAllEmailTemplatesByType);
    app.delete('/api/admin/DeleteEmailTempAttachmentById', authenticateToken, upload.none(), DeleteEmailTempAttachmentById);
    app.delete('/api/admin/DeleteEmailTemplate', authenticateToken, upload.none(), DeleteEmailTemplate);
    app.get('/api/admin/GetallEmailLogs', authenticateToken, upload.none(), GetallEmailLogs);
    app.get('/api/admin/GetEmailLogById', authenticateToken, upload.none(), GetEmailLogById);
    app.post('/api/admin/ForwardEmail', authenticateToken, upload.none(), ForwardEmail);
    app.get('/api/admin/GetAllEmailSenderList', authenticateToken, upload.none(), GetAllEmailSenderList);
    app.get('/api/admin/GetAllEmailRecipientList', authenticateToken, upload.none(), GetAllEmailRecipientList);
    app.get('/api/admin/GetAllUsedEmailTemplatesList', authenticateToken, upload.none(), GetAllUsedEmailTemplatesList);
    app.post('/api/admin/CreateServiceType', authenticateToken, upload.none(), CreateServiceType);
    app.get('/api/admin/GetAllServiceTypes', authenticateToken, upload.none(), GetAllServiceTypes);
    app.post('/api/admin/AddProviderType', authenticateToken, upload.none(), AddProviderType);
    app.get('/api/admin/GetAllProviderTypes', authenticateToken, upload.none(), GetAllProviderTypes);
    app.get('/api/admin/GetSpecificProviderTypeLogs', authenticateToken, upload.none(), GetSpecificProviderTypeLogs);
    app.put('/api/admin/UpdateProviderType', authenticateToken, upload.none(), UpdateProviderType);


    /* Admin User Routes */
    app.post('/api/admin/InviteUser', authenticateToken, upload.none(), InviteUser);

    app.get('/api/admin/GetInvitationById', upload.none(), GetInvitationById); //public
    app.post('/api/admin/SubmitAdminUserInvitation', upload.none(), SubmitAdminUserInvitation); //public
    app.put('/api/admin/ReinviteAdminUser', authenticateToken, upload.single("avatar"), ReinviteAdminUser);
    app.get('/api/admin/GetAllConserveTeamAndInvites', authenticateToken, upload.none(), GetAllConserveTeamAndInvites);
    app.get('/api/admin/GetUserDetailsById', authenticateToken, upload.none(), GetUserDetailsById);
    app.post('/api/admin/UserResetPasswordEmail', authenticateToken, upload.none(), UserResetPasswordEmail);
    app.put('/api/admin/UserResetPassword', authenticateToken, upload.none(), UserResetPassword);
    app.put('/api/admin/UpdateUser', authenticateToken, upload.single("avatar"), UpdateUser);
    app.delete('/api/admin/RemoveUser', authenticateToken, upload.none(), RemoveUser);
    app.delete('/api/admin/RemoveAdminInviteUser', authenticateToken, upload.none(), RemoveAdminInviteUser);
    app.get('/api/admin/GetAdminProfileById', authenticateToken, upload.none(), GetAdminProfileById);
    app.get('/api/admin/GetSpecificUserRole', authenticateToken, upload.none(), GetSpecificUserRole);
    app.patch('/api/admin/UpdateUserPassword', authenticateToken, upload.none(), UpdateUserPassword);
    app.patch('/api/admin/TwoFactorAuth', authenticateToken, upload.none(), TwoFactorAuth);


};
