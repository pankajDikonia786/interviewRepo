const fs = require("fs");
/* Auth url links */
const verificationLink = (email, randomHash) => {
    return `${process.env.APP_BUILD_URL}confirm-account/${email}/${randomHash}`;
};

const forgotPasswordLink = (email, randomHash) => {
    return `${process.env.APP_BUILD_URL}forgot-password/${email}/${randomHash}`;
};

const login2faVerificationEmailLink = (email, otp) => {
    return `${process.env.APP_BUILD_URL}/2fa-verify?email=${email}&otp=${otp}`;

};
const forgotPasswordEmailLink = (email) => {
    return `${process.env.APP_BUILD_URL}/set-new-password?email=${email}`;
};
/* Provider url links */
const registrationVerifyEmailLink = (email, AccessToken) => {

    return `${process.env.APP_BUILD_URL}/verification-email/${email}/${AccessToken}`;
};
//provider signup continue later link
const signUpContinueEmailLink = (registrationType, provider_temp_regist_uuid) => {
    const regisUrl = `/provider-registration${registrationType ? '-' + registrationType : ''}`;
    return `${process.env.APP_BUILD_URL}${regisUrl}?provider_temp_regist_uuid=${provider_temp_regist_uuid}`;
};
//when admin send client approval to client of doc.
const ProviderDocApprovalReqLink = (provider_doc_appr_uuid, client_org_uuid) => {
    return process.env.APP_BUILD_URL + `/client/provider-doc-approval?provider_doc_appr_uuid=${provider_doc_appr_uuid}&client_org_uuid=${client_org_uuid}`;

};
//for when client update approval status of provider doc 
const ProviderDocApprovalInfoToAdminLink = (provider_doc_appr_uuid) => {
    return process.env.APP_BUILD_URL + `/admin/provider/provider-doc-status?provider_doc_appr_uuid=${provider_doc_appr_uuid}`;
};
/* Common client or provider invite user url links */
const InviteOrgUserEmailLink = (invite_uuid, contact_type_uuid, org_function_type) => {
    return `${process.env.APP_BUILD_URL}/${org_function_type}-user-invite?invite_uuid=${invite_uuid}&contact_type_uuid=${contact_type_uuid}`;
};
//for CSV and single invite provider
const InviteClientProviderEmailLink = (invite_provider_uuid,trading_name,client_org_uuid) => {
    return `${process.env.APP_BUILD_URL}/provider-invite?invite_provider_uuid=${invite_provider_uuid}&trading_name=${trading_name}&client_org_uuid =${client_org_uuid}`

};
const InviteAcceptProviderViewProfileLink = (function_assignment_uuid) => {
    //provider function_assignment_uuid
    return `${process.env.APP_BUILD_URL}/provider-invite-accept?function_assignment_uuid=${function_assignment_uuid}`
};
//for CSV invite provider (reject)
const RejectInviteClientProviderEmailLink = (invite_provider_uuid,trading_name,client_org_uuid) => {
    return `${process.env.APP_BUILD_URL}/provider-reject-invite?invite_provider_uuid=${invite_provider_uuid}&trading_name=${trading_name}&client_org_uuid=${client_org_uuid}`

};
/*Admin user (conserve admins) url links */
const InviteConserveUserEmailLink = (invite_uuid) => {
    return `${process.env.APP_BUILD_URL}/admin/user-invite?invite_uuid=${invite_uuid}`;

};
const UserResetPasswordEmailLink = (user_uuid) => {
    return `${process.env.APP_BUILD_URL}/admin/reset-password?user_uuid=${user_uuid}`;

};

/* Admin invite provider worker */
const InviteProviderWorkerEmailLink = (invite_uuid,provider_org_uuid,trading_name,inviter_name) => {
    return `${process.env.APP_BUILD_URL}/admin/provider/invite-worker?invite_uuid=${invite_uuid}&provider_org_uuid=${provider_org_uuid}&trading_name=${trading_name}$inviter_name=${inviter_name}`;
};
const WorkerAcceptInviteManageProfileLink = (worker_uuid) => {
    return `${process.env.APP_BUILD_URL}/admin/provider/worker?worker_uuid=${worker_uuid}`;
};

/* Crone Users (Client) Compliance Doc  Review  */
const ReviewComplianceChecklistEmailLink = (userData) => {
    const { user_uuid, function_assignment_uuid, organisation_uuid } = userData;
    return `${process.env.APP_BUILD_URL}/client/compliance-checklist?function_assignment_uuid=${function_assignment_uuid}&organisation_uuid=${organisation_uuid}&user_uuid=${user_uuid}`
};

//Delete file
const deleteFile = async (filepath) => {
    if (filepath) {
        fs.access(filepath, fs.constants.F_OK | fs.constants.W_OK, (err) => {
            if (!err) {
                fs.unlink(filepath, function (error) {
                    if (error) {
                        console.log("Delete File error---------", error);
                    } else {
                        console.log("Delete File file deleted successfully");
                    };
                });
            };
        });
    };
};
module.exports = {
    verificationLink,
    forgotPasswordLink,
    registrationVerifyEmailLink,
    signUpContinueEmailLink,
    login2faVerificationEmailLink,
    forgotPasswordEmailLink,
    ProviderDocApprovalReqLink,
    ProviderDocApprovalInfoToAdminLink,
    InviteOrgUserEmailLink,
    InviteClientProviderEmailLink,
    InviteAcceptProviderViewProfileLink,
    RejectInviteClientProviderEmailLink,
    InviteConserveUserEmailLink,
    UserResetPasswordEmailLink,
    InviteProviderWorkerEmailLink,
    WorkerAcceptInviteManageProfileLink,
    ReviewComplianceChecklistEmailLink,
    deleteFile,

};
