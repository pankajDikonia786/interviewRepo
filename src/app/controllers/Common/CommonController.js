const Sq = require("sequelize");
const fs = require("fs");
const ParseCsv = require("csv-parse").parse;
const ABN_Validator = require("au-bn-validator");
const NZBN_Validator = require("@fnzc/nz-ird-validator");
const sequelize = require('../../../config/DbConfig');
const { convert_key_array } = require("../../../services/Helper");
const bcrypt = require("bcrypt");
const { SUCCESS, ALREADYEXISTREPONSE, INVALIDRESPONSE, GETSUCCESS } = require('../../../constants/ResponseConstants');
const { commonAttributes, CommonGetIndividualQuery, supportTeamQuery } = require("../../../services/Helper");
const { deleteFile, InviteProviderWorkerEmailLink, InviteClientProviderEmailLink, RejectInviteClientProviderEmailLink,
    ProviderDocApprovalReqLink, ProviderDocApprovalInfoToAdminLink } = require("../../../services/UserServices");
const { sendInviteProviderWorkerEmail, sendInviteClientProviderEmail, sendProviderDocApprovalEmail
} = require('../../../utils/EmailUtils');
const {sendNotification,sendNotificationPersonally} = require("../../../services/SocketHandlers")
const {
    ProviderDocApproval,
    DocHistory,
    ProivderTypes,
    Users,
    FAUserPermissions,
    FunctionAssignments,
    FARelations,
    Organisations,
    NotesAttachments,
    Notes,
    Individuals,
    IndividualOrg,
    Modules,
    ModuleQuestions,
    ModuleAnswers,
    DocumentTypes,
    InviteAttach,
    Workers,
    InviteProvider,
    States,
    Addresses,
    Countries,
    Documents,
    IndividualDocuments,
    ComplianceChecklist,
    InviteProviderCompliance,
    WorkerDocApproval

} = require("../../../models/common");


//for invite provider list (Admin-Provider,Admin-Worker)
const GetAllProviderList = async (req, res, next) => {
    try {
        //function_uuid = provider
        const { search, function_uuid, contact_type_uuid, } = req.query;
        let where_obj = { function_uuid };

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("abn_nzbn"), { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.col("trading_name"), { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.col("individual_org.org_individual.email"), { [Sq.Op.iLike]: `%${search}%` }),
                ]
            };
        };
        const functionAssignmetRes = await Organisations.findAll({
            where: where_obj,
            attributes: [
                "organisation_uuid",
                "abn_nzbn", "function_uuid",
                "trading_name", "function_assignment_uuid",
                [Sq.col("individual_org.org_individual.individual_uuid"), "individual_uuid"],
                [Sq.col("individual_org.org_individual.email"), "email"],
                [Sq.col("individual_org.org_individual.first_name"), "first_name"],
                [Sq.col("individual_org.org_individual.last_name"), "last_name"],
            ],
            include: [
                {//contact type (provider primary contact)
                    model: IndividualOrg, as: "individual_org", attributes: [],
                    where: { contact_type_uuid, is_user: true },
                    subQuery: false, duplicating: false,
                    include: { model: Individuals, as: "org_individual", attributes: [] }
                }],

        });

        return GETSUCCESS(res, functionAssignmetRes, "Get all Provider list successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetAllClientsOfProviderList = async (req, res, next) => {
    try {
        const { provider_fa_uuid, } = req.query;

        const clientsRes = await FARelations.findAll({
            where: { child_uuid: provider_fa_uuid, f_a_relation_type: 'client_provider' },
            attributes: [
                [Sq.col('fa_parent_org.organisation_uuid',), 'organisation_uuid'],
                [Sq.col('fa_parent_org.function_assignment_uuid',), 'function_assignment_uuid'],
                [Sq.col('fa_parent_org.trading_name',), 'trading_name']
            ],
            include: {
                model: Organisations, as: "fa_parent_org", where: { is_org_active: true },
                attributes: [],

            },
        });

        return GETSUCCESS(res, clientsRes, 'Get All clients of Provider list successfully!');
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//test pending
//working on email send-------------and to whom we need to send email are not confirmed yet and send reject email to admins pending
//Admin->provider->client and client portal
const UpdateProviderDocStatus = async (req, res, next) => {
    try {
        const { user_uuid, individual: { first_name, last_name, is_conserve_team } } = req.login_user;

        const DocApprovalDetails = req.body;
        const {
            provider_doc_appr_uuid,
            approval_status,
            doc_name,
            client_trading_name,
            provider_trading_name,
            // contact_email, confirm pending use or not
            message,
            // doc_file
        } = DocApprovalDetails;

        DocApprovalDetails.updated_by = user_uuid;
        !message ? DocApprovalDetails.message = '' : "";//if not in current statsu then remove previous message (if exist alrady)

        await sequelize.transaction(async (transaction) => {

            DocApprovalDetails.reviewed_by = user_uuid;
            DocApprovalDetails.reviewed_date = new Date();

            const ProviderDocApprovalRes = await ProviderDocApproval.update(DocApprovalDetails, {
                where: { provider_doc_appr_uuid },
                returning: true,
                transaction
            });
            const { document_uuid, client_org_uuid } = ProviderDocApprovalRes[1][0];

            let docStatusComment;
            //final approval will done by client in case of (client_approval_req) client approval require by admin
            switch (approval_status) {
                case "approved":
                    docStatusComment = "has approved document";
                    break;
                case "client_approval_req"://can only send by admin
                    docStatusComment = `has send to ${client_trading_name} for approval`;
                    break;
                case "client_approved_action":
                    docStatusComment = "has approved document with action";
                    break;

                case "admin_reject" || "client_reject":
                    docStatusComment = "rejected document";
                    break;
            };

            //Create doc change history
            const docChangeHistoryData = {
                action_type: "update_doc_appr",
                provider_doc_appr_uuid,
                document_uuid,
                column_names: message ? ["message"] : [],
                desc_html: [`<p>${first_name}${last_name ? " " + last_name : ""}
                    ${docStatusComment} </p>`,],//client trading_name
                new_value: ProviderDocApprovalRes[1][0],
                created_by: user_uuid
            };
            await DocHistory.create(docChangeHistoryData, { transaction });

            //-------------------Send email to the client or admins------------------//
            let url;
            let emailTemplateName;
            const clientApprStatus = ['approved', 'client_approved_action', 'client_reject', 'approved'].includes(approval_status);

            if (approval_status === "client_approval_req" || clientApprStatus && is_conserve_team === false) {
                //email data                         
                let emailDetails = {
                    provider_trading_name,//provider org. trading_name
                    doc_name,
                    message,
                    approval_status,
                    client_trading_name,//client trading_name
                    client_email: "client_user@mail.in"//client contact email (to send email) //currently static //update as pending client or admin (incase when client rejected
                };
                //if updated by admin to send client only when client_appr_req  
                if (approval_status === 'client_approval_req') {

                    emailDetails.client_email = "client_user@mail.in"//client email static
                    emailDetails.emailTemplateName = 'provider-doc-validate-to-client';//email template to send
                    url = await ProviderDocApprovalReqLink(provider_doc_appr_uuid, client_org_uuid);
                    //send to client
                    sendProviderDocApprovalEmail(emailDetails, url);
                }
                //if not admin and updated by client
                else if (clientApprStatus && is_conserve_team === false || is_conserve_team === 'false') {
                    if (approval_status === 'approved') {
                        emailTemplateName = 'provider-doc-approved-to-admin';
                    };
                    if (approval_status === 'client_reject') {
                        emailTemplateName = 'provider-doc-reject-to-admin';
                    };
                    if (approval_status === 'client_approved_action') {
                        emailTemplateName = 'provider-doc-appr-action-to-admin';
                    };

                    //email to support team of Conserve
                    url = await ProviderDocApprovalInfoToAdminLink(provider_doc_appr_uuid,);
                    //support team
                    const supportTeamDataArr = await supportTeamQuery();

                    if (supportTeamDataArr.length > 0) {
                        emailDetails.emailTemplateName = emailTemplateName;

                        for (let supportTeam of supportTeamDataArr) {

                            //support email not working------
                            emailDetails.supportEmail = supportTeam.email;//support team
                            //send to support team
                            sendProviderDocApprovalEmail(emailDetails, url);
                        };
                    };
                };

            };

            SUCCESS(res, "Provider document status updated successfully!");

        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//working-------------------------------view not available
const UpdateWorkerDocStatus = async (req, res, next) => {
    try {
        const { user_uuid, individual: { first_name, last_name, is_conserve_team } } = req.login_user;

        const DocApprovalDetails = req.body;
        const {
            worker_doc_appr_uuid,
            // contact_email, confirm pending use or not
            message,
            // doc_file
        } = DocApprovalDetails;

        DocApprovalDetails.updated_by = user_uuid;
        !message ? DocApprovalDetails.message = '' : "";//if not in current statsu then remove previous message (if exist alrady)

        await sequelize.transaction(async (transaction) => {

            DocApprovalDetails.reviewed_by = user_uuid;
            DocApprovalDetails.reviewed_date = new Date();

            const workerDocApprovalRes = await WorkerDocApproval.update(DocApprovalDetails, {
                where: { worker_doc_appr_uuid },
                returning: true,
                transaction
            });
            const { document_uuid } = workerDocApprovalRes[1][0];

            let docStatusComment;

            //Create doc change history
            const docChangeHistoryData = {
                action_type: "update_doc_appr",
                worker_doc_appr_uuid,
                document_uuid,
                column_names: message ? ["message"] : [],
                desc_html: [`<p>${first_name}${last_name ? " " + last_name : ""}
                    ${docStatusComment} </p>`,],//client trading_name
                new_value: workerDocApprovalRes[1][0],
                created_by: user_uuid
            };
            await DocHistory.create(docChangeHistoryData, { transaction });


            SUCCESS(res, "Worker document status updated successfully!");

        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};


//All common
const GetClientOverviewProfileById = async (req, res, next) => {
    try {
        const { organisation_uuid, } = req.query;//client organisation_uuid
        //get organisation and address
        const orgRes = await Organisations.findOne({
            where: { organisation_uuid },
            attributes: { exclude: commonAttributes },
            include: [{
                model: Addresses,
                as: "org_address_data",
                attributes: { exclude: commonAttributes },
                through: { attributes: [] }
            },]
        });

        GETSUCCESS(res, orgRes, "Get Client Overview profile by id successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};


const GetAllProviderTypesList = async (req, res, next) => {
    try {

        const providerTypesRes = await ProivderTypes.findAll({
            attributes: ["provider_type_uuid", "provider_type_name",],
            order: [["provider_type_name", 'ASC']]
        });

        GETSUCCESS(res, providerTypesRes, 'Get all Provider type List Successfully!!');
    } catch (error) {
        console.log(error);
        next(error);
    };
};

//for change status of Admin-client or Admin-provider org.
const UpdateOrgStatus = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const { is_org_active, organisation_uuid, function_assignment_uuid,trading_name,current_user } = req.body;
        //update org. status
        await Organisations.update({ is_org_active, updated_by: login_user.user_uuid },
            { where: { organisation_uuid } });
        //update function assignment status
        await FunctionAssignments.update({ is_f_a_active: is_org_active, updated_by: login_user.user_uuid },
            { where: { function_assignment_uuid } });
            sendNotification(`Client was ${is_org_active == true || is_org_active == "true" ? `recently activated by ${current_user}` : `recently deactivated by ${current_user}`}.`,
            ["super admin","support team","client service team"],
        "",{organisation_uuid,trading_name}
        )
        SUCCESS(res, `Client ${is_org_active == true || is_org_active == "true" ? 'Activated' : "Deactivated"} successfully`);
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//common api used for client compliace checklist and provider and worker add documents 
const GetAllDocumentTypeList = async (req, res, next) => {
    try {
        const { recipient_type, } = req.query;

        //get all specific client doc with DocumentTypes if exist
        let response = await DocumentTypes.findAll({
            where: { recipient_type },
            attributes: { exclude: commonAttributes },
            order: [["doc_type_name", "ASC"]],
        });

        return GETSUCCESS(res, response, 'Get all document types list successfully!');
    } catch (error) {
        console.log(error);
        next(error);
    };
};

/* For Add client and provider users and invites api's */
//Get all individual except conserve admins to check
const GetAllIndividualListForInvite = async (req, res, next) => {
    try {
        const { individual: { individual_uuid } } = req.login_user;
        let individualDetails = {
            individual_uuid,
            search: req.query.search
        };

        const individualRes = await CommonGetIndividualQuery(individualDetails);

        GETSUCCESS(res, individualRes, "Get all individual list for client invite successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};


//For all user(Conserve team,client user,provider user,worker and mobile) type of user password update
const UpdateUserPassword = async (req, res, next) => {
    try {
        const { user_uuid } = req.login_user;
        const { old_password, new_password } = req.body;

        const { password } = await Users.scope("withPassword").findOne({
            where: { user_uuid },
            attributes: { exclude: commonAttributes }
        });
        // Compare old password
        const isOldPasswordCorrect = await bcrypt.compare(old_password, password);

        if (isOldPasswordCorrect) {
            // Check if the new password is different from the old one
            const isNewPasswordDifferent = await bcrypt.compare(new_password, password);

            if (isNewPasswordDifferent) {
                return ALREADYEXISTREPONSE(res, "New password must be different from the old password.");
            };
            // Update password
            const bcryptPassword = await bcrypt.hash(new_password, 10);
            await Users.update({ password: bcryptPassword, updated_by: user_uuid },
                { where: { user_uuid } });

            SUCCESS(res, "Password updated successfully!");
        } else {

            INVALIDRESPONSE(res, "Old password is incorrect");
        };
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//For all user (worker,client,provider) worker can login individually also
const GetUserOrganisationsList = async (req, res, next) => {
    try {
        let { user_uuid, individual, is_worker } = req.login_user;

        const faUserPermRes = await FAUserPermissions.findAll({
            where: { user_uuid, is_user_perm_active: true }, attributes: { exclude: commonAttributes },
            include: {
                model: FunctionAssignments, as: "user_perm_fa", attributes: { exclude: commonAttributes },
                include: { model: Organisations, where: { is_org_active: true }, as: "org_data", attributes: { exclude: commonAttributes }, }
            }
        });

        GETSUCCESS(res, { worker: is_worker ? individual : "", userOrgs: faUserPermRes }, "Get User Organisations successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const UpdateDefaultPreferredUserLogin = async (req, res, next) => {
    try {
        const { user_uuid } = req.login_user;
        const { fa_user_permission_uuid, is_default_login_as_worker } = req.body;
        if (is_default_login_as_worker === false || is_default_login_as_worker === "false") {
            //By default all is_default_preferred_login is true
            await FAUserPermissions.update(
                {
                    is_default_preferred_login: Sq.literal(`
                CASE 
                  WHEN fa_user_permission_uuid = :fa_user_permission_uuid THEN true
                  ELSE false
                END
              `),
                },
                {
                    where: { user_uuid, },
                    replacements: { fa_user_permission_uuid },
                }
            );
        } else {

            await FAUserPermissions.update({ is_default_preferred_login: false },
                { where: { user_uuid, is_user_perm_active: true } });
            await Users.update({ is_default_login_as_worker: true }, { where: { user_uuid } });

        };

        SUCCESS(res, "Update user Default preferred login successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};

const GetAllComplianceListOfClient = async (req, res, next) => {
    try {
        const { client_org_uuid, recipient_type } = req.query;
        const compChecklistRes = await ComplianceChecklist.findAll({
            where: { client_org_uuid, recipient_type },
            attributes: ['checklist_uuid', 'checklist_name', 'recipient_type'],
            order: [['checklist_name', 'ASC']]
        });

        GETSUCCESS(res, compChecklistRes, 'Get Compliance List of Client Successfully!!');
    } catch (error) {
        console.log(error);
        next(error);
    };
};
/* Invite provider api Admin-client,Admin-provider,Client-portal and  */
//need to check email specifically if provider not exist already
const InviteSpecificProvider = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const inviteProviderDetails = req.body;
        let {
            client_fa_uuid,
            individual_uuid,
            first_name,
            last_name,
            trading_name,
            email,
            checklistIds,
            workerChecklistIds,
            client_org_uuid,
            current_user,
            provider_user_uuid,
            provider_org_id

        } = inviteProviderDetails;

        //file data
        const files = req.files;
        inviteProviderDetails.created_by = login_user.user_uuid;
        inviteProviderDetails.invite_date = new Date();

        inviteProviderDetails.provider_fa_uuid ? "" : delete inviteProviderDetails.provider_fa_uuid;
        inviteProviderDetails.individual_uuid ? "" : delete inviteProviderDetails.individual_uuid;

        sequelize.transaction(async (transaction) => {
            //need to check org wise of client(because provider. can signup directly for a client also)
            if (individual_uuid) {
                const response = await InviteProvider.findOne({
                    where: {
                        client_fa_uuid,//client
                        individual_uuid,
                    }
                });
                if (response) {
                    return ALREADYEXISTREPONSE(res, "This Provider is already invited!");
                };
            };
            //create individual
            if (individual_uuid === "") {
                const individualRes = await Individuals.create(inviteProviderDetails, { transaction });
                inviteProviderDetails.individual_uuid = individualRes.individual_uuid;
            };
            //to check if invited by conserver team admin or client user
            if (login_user.individual.is_conserve_team) {
                inviteProviderDetails.is_invited_by_admin = true;
            };
            //create invite provider
            const { invite_provider_uuid } = await InviteProvider.create(inviteProviderDetails, { transaction });
            let filesArr = [];
            let inviteAttachArr = [];

            if (files?.length > 0) {

                for (let file of files) {
                    filesArr.push({
                        filename: file.key,
                        path: file.location,
                    });
                    inviteAttachArr.push({ invite_provider_uuid, attach_url: file.location });
                };
                await InviteAttach.bulkCreate(inviteAttachArr, { transaction });
            };
            //add compliance checklist assignment

            console.log("-----------------", inviteProviderDetails)
            if (checklistIds.length > 0 || workerChecklistIds.length > 0) {
                //parse
                checklistIds = JSON.parse(checklistIds);

                const checklistAssignArr = [];
                //provider compliance checklist data
                if (checklistIds.length > 0) {
                    for (let checklist_uuid of checklistIds) {
                        checklistAssignArr.push({
                            checklist_uuid,
                            invite_provider_uuid,
                            check_comp_assigned_to: 1//1 for provider
                        });
                    };
                };
                //worker compliance cheklist data
                if (workerChecklistIds.length > 0) {
                    //parse
                    workerChecklistIds = JSON.parse(workerChecklistIds);

                    for (let checklist_uuid of workerChecklistIds) {
                        checklistAssignArr.push({
                            checklist_uuid,
                            invite_provider_uuid,
                            check_comp_assigned_to: 0//0 for worker
                        });
                    };
                };
                console.log("----------------", checklistAssignArr)
                await InviteProviderCompliance.bulkCreate(checklistAssignArr, { transaction });
            };

            //Send provider invitation
            const emailDetails = {
                provider_name: first_name + " " + last_name,//provider name primary use name
                client_name: trading_name,//client trading name
                invite_message: inviteProviderDetails?.invite_message || "",
                email,
                filesArr
            };
            const rejectUrl = await RejectInviteClientProviderEmailLink(invite_provider_uuid,trading_name,client_org_uuid);
            const url = await InviteClientProviderEmailLink(invite_provider_uuid,trading_name,client_org_uuid);

            //send email


            sendInviteClientProviderEmail(emailDetails, url, rejectUrl);
            sendNotification(`${first_name} ${last_name} has been invited to ${trading_name} by ${current_user}.`, [`org_${client_org_uuid}`],"",{organisation_uuid:client_org_uuid,trading_name});
            if(inviteProviderDetails.provider_fa_uuid && provider_user_uuid ){
           sendNotificationPersonally(`You are recivied an invite from ${trading_name}`,provider_user_uuid,{trading_name,organisation_uuid:provider_org_id})
          // organisation_uuid: Unique identifier for the provider's organization.
            // client_org_uuid: Unique identifier for the client organization that invited the provider.
            // provider_user_uuid: ID of the provider user if they already exist.

            }
            SUCCESS(res, "Provider Invitation sent successfully!");
        });
    } catch (error) {
        console.log(error);
        next(error);

    };
};
const ReinviteProvider = async (req, res, next) => {
    try {
        const { invite_provider_uuid, trading_name, first_name, last_name } = req.body;

        const inviteProviderRes = await InviteProvider.findOne({
            where: { invite_provider_uuid },

            include: { model: InviteAttach, as: "provInviteAttach" }
        });
        if (inviteProviderRes) {

            //Send provider invitation
            const emailDetails = {
                provider_name: first_name + " " + last_name,//provider name primary user name
                client_name: trading_name,//client trading name
                invite_message: inviteProviderRes?.invite_message || "",
                email: inviteProviderRes.email,
                filesArr: inviteProviderRes.provInviteAttach
            };
            const inviteAttachments = inviteProviderRes.provInviteAttach;
            let filesArr = [];
            if (inviteAttachments.length > 0) {
                for (let attachment of inviteAttachments) {
                    filesArr.push({
                        filename: path.basename(decodeURIComponent(attachment.attach_url)),
                        path: attachment.attach_url,
                    });
                };
                emailDetails.filesArr = filesArr;

            };
            const rejectUrl = await RejectInviteClientProviderEmailLink(invite_provider_uuid);
            const url = await InviteClientProviderEmailLink(invite_provider_uuid);
            //send email
            sendInviteClientProviderEmail(emailDetails, url, rejectUrl);

            SUCCESS(res, "Reinvite Provider successfully!");

        } else {
            NOTFOUND(res, "Data not found!");
        };
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//pending existing provider org uuid of fa uuid and retest the functionality according to requirement
const InviteProvidersCsvView = async (req, res, next) => {
    try {
        const { client_fa_uuid, function_uuid, contact_type_uuid } = req.body;
        const file = req.file;

        //invited provider details check
        const inviteProviderResPromise = InviteProvider.findAll({
            where: { client_fa_uuid: client_fa_uuid },//client function_assignment_uuid
            attributes: ["client_fa_uuid", "provider_fa_uuid", "individual_uuid",
                [Sq.fn('LOWER', Sq.col('email')), 'email']
            ]
        });
        //organisations details
        const functionAssignmentResPromise = FunctionAssignments.findAll({
            where: { function_uuid },
            attributes: ["function_assignment_uuid",
                [Sq.col("fa_individual_data.org_individual.individual_uuid"), "individual_uuid"],
                [Sq.fn('LOWER', Sq.col('fa_individual_data.org_individual.email')), "email"],
                [Sq.fn('LOWER', Sq.col('org_data.trading_name')), 'trading_name'],
                [Sq.fn('LOWER', Sq.col('org_data.abn_nzbn')), "abn_nzbn"],
            ],
            include: [{
                model: IndividualOrg, as: "fa_individual_data", attributes: ["individual_org_uuid", "organisation_uuid"],
                where: { contact_type_uuid, is_user: true },
                include: { model: Individuals, as: "org_individual", attributes: [] },
            },
            {
                model: Organisations, as: "org_data", attributes: [],
            }],
            raw: true, nest: true
        });
        //org details
        const organisationResPromise = Organisations.findAll({
            attributes: [[Sq.fn('LOWER', Sq.col('trading_name')), 'trading_name'],
            [Sq.fn('LOWER', Sq.col('abn_nzbn')), "abn_nzbn"],], raw: true,
        });
        // Function assignment relation details of client-provider
        const faRelationsResPromise = FARelations.findAll({
            where: {
                f_a_relation_type: "client_provider",
                parent_uuid: client_fa_uuid
            }
        });
        // For check if provider is new and individual is also new
        const individualResPromise = Individuals.findAll({
            attributes: [[Sq.fn('LOWER', Sq.col('email')), "email"],
                "individual_uuid", "is_conserve_team"]
        });

        // Use Promise.all to execute all promises concurrently
        let [
            inviteProviderRes,
            functionAssignmentRes,
            organisationRes,
            faRelationsRes,
            individualRes
        ] = await Promise.all([
            inviteProviderResPromise,
            functionAssignmentResPromise,
            organisationResPromise,
            faRelationsResPromise,
            individualResPromise
        ]);

        // access the results
        inviteProviderRes = convert_key_array(inviteProviderRes, "email");
        functionAssignmentRes = convert_key_array(functionAssignmentRes, "email");
        organisationRes = convert_key_array(organisationRes, "abn_nzbn");
        faRelationsRes = convert_key_array(faRelationsRes, "child_uuid");
        individualRes = convert_key_array(individualRes, "email");

        //file path
        const filePath = `${appRoot}/uploads/${file.filename}`;
        //Get CSV data
        let csv_provider_data = [];
        await fs.createReadStream(filePath)
            .pipe(ParseCsv({
                columns: true,
                relax_quotes: true,
                // relax_column_count: true,
                // escape: '\\',
                ltrim: true,
                rtrim: true,
                bom: true
            },))
            .on("data", function (row) {
                // Check if the object is empty
                if (Object.keys(row).length === 0) {
                    // Skip this empty row
                    return;
                };
                csv_provider_data.push(row);

            }).on("end", function () {
                try {
                    let invite_provider_details = [];
                    const emailSet = {};

                    for (const csv_provider of csv_provider_data) {

                        let {
                            // provider_org_name,
                            first_name,
                            last_name,
                            email,
                            provider_abn_nzbn,

                        } = csv_provider;
                        const emailValidator = /\S+@\S+\.\S+/;
                        // Check for missing fields or invalid email/ABN/NZBN
                        if (
                            // !provider_org_name ||
                            !first_name || !last_name ||
                            !provider_abn_nzbn ||
                            !email ||
                            !emailValidator.test(email) ||
                            !(NZBN_Validator.isValidIRDNumber(provider_abn_nzbn) || ABN_Validator.validateABN(provider_abn_nzbn))
                        ) {
                            // Mark as not validated and continue to the next provider
                            csv_provider.is_validated = false;
                            invite_provider_details.push(csv_provider);
                            continue;
                        };
                        //csv data lowercase
                        // provider_org_name = provider_org_name.toLowerCase();
                        email = email.toLowerCase();
                        provider_abn_nzbn = provider_abn_nzbn.toLowerCase();

                        // Check if there are multiple white spaces and remove extra spaces
                        // provider_org_name = provider_org_name.split(' ').filter(word => word !== '').join(' ');

                        // Check for duplicate email
                        if (emailSet[email]) {
                            // Mark as not validated and continue to the next provider
                            csv_provider.is_validated = false;
                            invite_provider_details.push(csv_provider);
                            continue;
                        };
                        // Add the email to the emailSet to track it as encountered
                        emailSet[email] = true;

                        // Check if the provider has already been invited (unique email for org primary contact)
                        if (inviteProviderRes[email]) {
                            // Mark as not validated and continue to the next provider
                            csv_provider.is_validated = false;
                            invite_provider_details.push(csv_provider);
                            continue;
                        };
                        //check if trading name and abn/nzbn are not already exist
                        // if (organisationRes[provider_abn_nzbn] &&
                        //     organisationRes[provider_abn_nzbn]?.trading_name === provider_org_name) {
                        //     // Mark as not validated and continue to the next provider
                        //     csv_provider.is_validated = false;
                        //     invite_provider_details.push(csv_provider);
                        //     continue;
                        // };

                        // Retrieve provider function_assignment_uuid and related data from functionAssignmentRes
                        let {
                            function_assignment_uuid: provider_fa_uuid,
                            // email, trading_name, abn_nzbn
                        } = functionAssignmentRes[email] || {};

                        /* Check if invite provider's function_assignment_uuid is the same as client's (by email)or if 
                        it already exists in client relations */

                        if (provider_fa_uuid === client_fa_uuid ||
                            faRelationsRes[provider_fa_uuid]
                            // || (!trading_name === provider_org_name && !abn_nzbn === provider_abn_nzbn &&
                            //     !email === provider_email )
                        ) {
                            // Mark as not validated and continue to the next provider
                            csv_provider.is_validated = false;
                            invite_provider_details.push(csv_provider);
                            continue;
                        };

                        // If invited provider already exists only in the system 
                        csv_provider.provider_fa_uuid = provider_fa_uuid || "";
                        //if provider exist then add individual_uuid
                        csv_provider.individual_uuid = functionAssignmentRes[email]?.individual_uuid || "";
                        csv_provider.client_fa_uuid = client_fa_uuid;

                        //when provider is not exist
                        if (!csv_provider.individual_uuid) {

                            //if individual exists
                            if (individualRes[email]) {

                                if (individualRes[email].is_conserve_team) {
                                    // Mark as not validated and continue to the next provider
                                    csv_provider.is_validated = false;
                                    invite_provider_details.push(csv_provider);
                                    continue;
                                };
                                //Add individual uuid
                                csv_provider.individual_uuid = individualRes[email]?.individual_uuid || "";
                            };
                        };
                        // Mark as validated and add to invite_provider_details
                        csv_provider.is_validated = true;
                        invite_provider_details.push(csv_provider);
                    };

                    //delete file
                    deleteFile(filePath);

                    GETSUCCESS(res, invite_provider_details, "Invite Provider Csv details view successfully!");

                } catch (error) {
                    console.log(error);
                    next(error);
                };
            });

    } catch (error) {
        console.log(error);
        next(error);
    };
};
const InviteProviderFromCsv = async (req, res, next) => {
    try {
        const { login_user, body: inviteDetails, files } = req;
        let { provider_invite_data, trading_name, invite_message, provider_type_uuid, checklistIds } = inviteDetails;

        provider_invite_data = JSON.parse(provider_invite_data);

        let filesArr = [];
        // File processing 
        if (files?.length > 0) {
            filesArr = files.map(file => ({ filename: file.key, path: file.location }));
        };

        sequelize.transaction(async (transaction) => {
            const checklistAssignArr = [];
            // Promise generation optimization using Promise.all with map
            await Promise.all(provider_invite_data.map(async inviteDetailVal => {

                inviteDetailVal.created_by = login_user.user_uuid;
                inviteDetailVal.invite_date = new Date();
                inviteDetailVal.provider_type_uuid = provider_type_uuid;
                inviteDetailVal.invite_message = invite_message;
                delete inviteDetailVal.is_validated;
                inviteDetailVal.provider_fa_uuid == "" ? delete inviteDetailVal.provider_fa_uuid : "";

                //check individual
                if (inviteDetailVal.individual_uuid == "") {
                    inviteDetailVal.individual_uuid == "" ? delete inviteDetailVal.individual_uuid : "";
                    const [individualRes] = await Individuals.findOrCreate({
                        where: {
                            email:
                                Sq.where(Sq.fn('LOWER', Sq.col('email')), inviteDetailVal.email.toLowerCase())
                        },
                        defaults: inviteDetailVal,
                        transaction
                    });
                    inviteDetailVal.individual_uuid = individualRes.individual_uuid;
                };
                //create invite provider
                const { client_fa_uuid, email, first_name, last_name } = inviteDetailVal;
                console.log(inviteDetailVal)
                const [inviteRes, created] = await InviteProvider.findOrCreate({
                    where: { client_fa_uuid, email: Sq.where(Sq.fn('LOWER', Sq.col('email')), email.toLowerCase()) },
                    defaults: inviteDetailVal,
                    transaction
                });

                // InviteProviderCompliance
                //create invite attach jun.
                if (filesArr.length > 0 && created) {
                    await Promise.all(filesArr.map(file => InviteAttach.create({
                        attach_url: file.attach_url,
                        invite_provider_uuid: inviteRes.invite_provider_uuid
                    }, { transaction })));
                };

                if (checklistIds.length > 0 && created) {
                    for (let checklist_uuid of (typeof checklistIds == "string" ? JSON.parse(checklistIds) : checklistIds)) {
                        checklistAssignArr.push({
                            checklist_uuid,
                            invite_provider_uuid: inviteRes.invite_provider_uuid
                        });
                    };
                };

                //send email
                if (created) {
                    const emailDetails = {
                        provider_name: `${first_name} ${last_name}`,
                        client_name: trading_name,
                        invite_message: invite_message || "",
                        email,
                        filesArr
                    };
                    const rejectUrl = await RejectInviteClientProviderEmailLink(inviteRes.invite_provider_uuid);
                    const url = await InviteClientProviderEmailLink(inviteRes.invite_provider_uuid);
                    sendInviteClientProviderEmail(emailDetails, url, rejectUrl);
                };

            }));
            if (checklistAssignArr.length > 0)
                await InviteProviderCompliance.bulkCreate(checklistAssignArr, { transaction });
        });

        SUCCESS(res, "Invite sent successfully!");
    } catch (error) {
        console.error(error);
        next(error);
    };
};

/* Notes Api's (for client and provider )*/
const CreateOrgNote = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const note_details = req.body;
        const{trading_name,organisation_uuid,current_user} =note_details
        const fileData = req.files;
        note_details.created_by = login_user.user_uuid;
        sequelize.transaction(async (transaction) => {
            const notesRes = await Notes.create(note_details, { transaction });
            if (fileData) {
                let attachmentsArray = [];
                for (file of fileData) {

                    attachmentsArray = [...attachmentsArray,
                    { note_attachment: file.location, note_uuid: notesRes.note_uuid }];
                };
                await NotesAttachments.bulkCreate(attachmentsArray, { transaction });
            };
    
          sendNotification(`${current_user} created a new organization note for ${trading_name}.`,["support team","client service team"],"",{trading_name,organisation_uuid})
            SUCCESS(res, "Note created successfully!");
        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetSpecificOrgNotes = async (req, res, next) => {
    try {
        const { function_assignment_uuid, page, limit, sort, order, search } = req.query;

        let where_obj = { function_assignment_uuid };
        let query_obj = {};

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("note_heading"), { [Sq.Op.iLike]: `%${search}%` }),
                ],
            }
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };
        if (sort && order) {
            query_obj.order = [[sort, order]]
        };
        const notesRes = await Notes.findAndCountAll({
            where: where_obj,
            attributes: ["note_uuid", "note_heading", "note", "created_date",
                [Sq.col("note_createdby.individual.first_name"), "first_name"],
                [Sq.col("note_createdby.individual.last_name"), "last_name"],
                [Sq.col("note_createdby.individual.avatar"), "avatar"]
            ],
            include: [
                {
                    model: NotesAttachments, as: "note_attachs", attributes:
                        ["note_attachment_uuid", "note_attachment"]
                },
                {
                    model: Users, as: "note_createdby",
                    attributes: [],
                    include: { model: Individuals, attributes: [] }
                }],
            subQuery: false,
            ...query_obj
        });

        return GETSUCCESS(res, notesRes, 'Get all notes of specific client successfully!');

    } catch (error) {
        console.log(error);
        next(error);
    };
};
//common all site induction and company induction module ordering sort api
const UpdateModuleSortingOrder = async (req, res, next) => {
    let { user_uuid } = req.login_user;
    let { moduleOrderContents } = req.body;
    //parse
    moduleOrderContents = JSON.parse(moduleOrderContents);
    try {

        for (let moduleOrderContent of moduleOrderContents) {
            let { sort_order, module_uuid } = moduleOrderContent;
            await Modules.update(
                { sort_order, updated_by: user_uuid, },
                {
                    where: {
                        module_uuid,
                    },
                }
            );
        };

        SUCCESS(res, "Module moved successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//common all site induction and company induction module ques. ordering sort api
const UpdateModuleQuesSortingOrder = async (req, res, next) => {
    let { user_uuid } = req.login_user;
    let { moduleQuesOrderContents } = req.body;
    //parse
    moduleQuesOrderContents = JSON.parse(moduleQuesOrderContents);
    try {
        for (let moduleOrderContent of moduleQuesOrderContents) {
            let { sort_order, module_question_uuid } = moduleOrderContent;

            await ModuleQuestions.update(
                { sort_order, updated_by: user_uuid, },
                {
                    where: {
                        module_question_uuid,
                    },
                }
            );
        };

        SUCCESS(res, "Question moved successfully!");
    } catch (error) {
        console.log(error);
        next(error);

    };
};
//common all site induction and company induction module Ans. ordering sort api
const UpdateModuleAnsSortingOrder = async (req, res, next) => {
    let { user_uuid } = req.login_user;
    let { moduleAnsOrderContents } = req.body;
    //parse
    moduleAnsOrderContents = JSON.parse(moduleAnsOrderContents);
    try {
        for (let moduleAnsOrderContent of moduleAnsOrderContents) {
            let { sort_order, module_answer_uuid } = moduleAnsOrderContent;

            await ModuleAnswers.update(
                { sort_order, updated_by: user_uuid, },
                {
                    where: {
                        module_answer_uuid,
                    },
                }
            );
        };

        SUCCESS(res, "Answer moved successfully!");
    } catch (error) {
        console.log(error);
        next(error);

    };
};

//Admin-Provider,Admin-Workers invites api's*/
const GetAllIndividualListForWorkerInvites = async (req, res, next) => {
    try {
        const { individual: { individual_uuid } } = req.login_user;
        const { provider_org_uuid, search } = req.query;
        //all individual except already invited
        const individualRes = await Individuals.findAll({
            where: {
                is_conserve_team: false,
                individual_uuid: { [Sq.Op.ne]: individual_uuid },
                [Sq.Op.or]: [
                    Sq.where(Sq.col('email'), { [Sq.Op.iLike]: `%${search}%` }),
                ],
                '$worker_data.provider_org_uuid$': { [Sq.Op.eq]: null }
            },
            attributes: ['individual_uuid', 'user_uuid', 'first_name',
                'last_name', 'email', 'phone', 'is_conserve_team'
            ],
            include: {
                model: Workers, as: 'worker_data', where: {
                    provider_org_uuid,
                }, attributes: ["provider_org_uuid"], required: false,
            }
        });

        GETSUCCESS(res, individualRes, "Get all individual list for worker invite successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};


//for Admin-worker and Worker portal worker setting and overview
const GetWorkerProfileById = async (req, res, next) => {
    try {
        const { individual_uuid } = req.query;

        const individualRes = await Individuals.findOne({
            where: { individual_uuid },
            attributes: ["individual_uuid", "avatar", "first_name", "last_name", "email", "phone",
                "occupation", "state_id", "country_id",
                [Sq.col("state.state_name"), "state_name"],
                [Sq.col("country.name"), "name"]
            ],
            include: [
                { model: States, attributes: [], },
                { model: Countries, attributes: [], }
            ],
        });

        GETSUCCESS(res, individualRes, "Get worker Profile Details successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//revisit 
//check if worker already as a worker for specific Provider without invite (from direct mobile) pending
//working not to make this common for provider worker invite and others portals  
// invite and create user and worker and check if invited worker is already user or not
//for worker assing client at the time of invite pending
// const InviteWorker = async (req, res, next) => {
//     try {
//         const login_user = req.login_user;
//         const inviteDetails = req.body;
//         const { first_name, } = login_user.individual;
//         const {
//             function_assignment_uuid,//provider function_assignment_uuid
//             individual_uuid,
//             provider_org_uuid,
//             trading_name,//Provider org. trading name
//             email,
//             user_uuid,
//         } = inviteDetails;

//         inviteDetails.created_by = login_user.user_uuid;
//         inviteDetails.invite_date = new Date();
//         inviteDetails.invited_user_type = "worker";
//         user_uuid ? "" : delete inviteDetails.user_uuid;

//         sequelize.transaction(async (transaction) => {
//             let inviteRes = {};
//             if (individual_uuid === "") {
//                 delete inviteDetails.individual_uuid;
//                 //create individual
//                 const individualRes = await Individuals.create(inviteDetails, { transaction });
//                 inviteDetails.individual_uuid = individualRes.individual_uuid;
//             };

//             //if individual 
//             if (individual_uuid) {
//                 inviteRes = await Invite.findOne({
//                     where: {
//                         function_assignment_uuid,//provider function_assingnment_uuid
//                         individual_uuid, invited_user_type: "worker"
//                     }
//                 });

//                 if (inviteRes) return ALREADYEXISTREPONSE(res, "This Worker has already invited !");

//                 const workersRes = await Workers.findOne({ where: { provider_org_uuid, individual_uuid } });

//                 if (workersRes) return ALREADYEXISTREPONSE(res, "This Worker has already assigned to this Provider !");
//             };

//             //Create invite
//             inviteRes = await Invite.create(inviteDetails, { transaction });
//             const emailDetails = {
//                 first_name: inviteDetails.first_name,//worker first name
//                 inviter_name: first_name,//inviter name
//                 trading_name,
//                 worker_email: email
//             };
//             //create url link
//             const url = await InviteProviderWorkerEmailLink(inviteRes.invite_uuid);
//             //send mail
//             sendInviteProviderWorkerEmail(emailDetails, url);

//             SUCCESS(res, "Worker Invite sent successfully!");
//         });

//     } catch (error) {
//         console.log(error);
//         next(error);
//     };

// };
//All and single view of doc
const GetAllDocumentsOfWorker = async (req, res, next) => {
    try {
        const { page, limit, sort, order, search, individual_uuid } = req.query;
        let where_obj = {};
        let query_obj = {};

        if (search) {
            where_obj = {
                [Sq.Op.or]: [
                    Sq.where(Sq.col("individualDoc.document_type.doc_type_name"), { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.col("individualDoc.document_type.doc_type_name"), { [Sq.Op.iLike]: `%${search}%` }),
                ],
            }
        };

        if (sort && order) {
            query_obj.order = [[sort, order]];
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };
        const orgDocumentsRes = await IndividualDocuments.findAndCountAll({
            where: { individual_uuid, ...where_obj, },
            attributes: ["individual_document_uuid",
                [Sq.col("individualDoc.document_uuid"), "document_uuid"],
                [Sq.col("individualDoc.document_type_uuid"), "document_type_uuid"],
                [Sq.col("individualDoc.expiry_date_notes"), "expiry_date_notes"],
                [Sq.col("individualDoc.doc_name"), "doc_name"],
                [Sq.col("individualDoc.expiry_date"), "expiry_date"],
                [Sq.col("individualDoc.doctype_fields_data"), "doctype_fields_data"],
                [Sq.col("individualDoc.doc_file"), "doc_file"],
                [Sq.col("individualDoc.issuer"), "issuer"],
                [Sq.col("individualDoc.amount_insured"), "amount_insured"],
                [Sq.col("individualDoc.policy_no"), "policy_no"],
                [Sq.col("individualDoc.document_type.doc_type_name"), "doc_type_name"],
                [Sq.col("individualDoc.document_type.custom_fields"), "custom_fields"]
            ],

            include: {
                model: Documents, as: "individualDoc",
                attributes: [],
                required: true,
                include:
                {
                    model: DocumentTypes, as: "document_type",
                    attributes: [],
                },
            },
            ...query_obj,
        },);

        GETSUCCESS(res, orgDocumentsRes, "Get all Documents of Worker successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};


module.exports = {
    GetAllProviderList,
    GetAllClientsOfProviderList,
    UpdateProviderDocStatus,
    GetClientOverviewProfileById,
    GetAllProviderTypesList,
    UpdateOrgStatus,
    GetAllDocumentTypeList,
    GetAllIndividualListForInvite,
    UpdateUserPassword,
    GetUserOrganisationsList,
    UpdateDefaultPreferredUserLogin,

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
    GetAllIndividualListForWorkerInvites,
    GetWorkerProfileById,
    // InviteWorker,
    GetAllDocumentsOfWorker
};
