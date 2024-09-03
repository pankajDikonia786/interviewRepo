const bcrypt = require("bcrypt");
const sequelize = require('../../config/DbConfig');
const Sq = require('sequelize');
const { SUCCESS, GETSUCCESS, INVALIDRESPONSE, LINKEXPIREDRESPONSE } = require('../../constants/ResponseConstants');
const { commonAttributes, } = require("../../services/Helper");
const { Countries, States, Cities } = require('../../models/public');
const { WorkerAcceptInviteManageProfileLink } = require("../../services/UserServices");
const { sendWorkerAcceptedInviteEmail } = require('../../utils/EmailUtils');

const { Functions,
    ContactTypes,
    FunctionAssignments,
    Organisations,
    OrgAddressContacts,
    MasterSettings,
    Individuals,
    Invite,
    Users,
    FAUserPermissions,
    IndividualOrg,
    Workers,
    InviteProviderCompliance,
    ChecklistDocs,
    DocumentTypes,
    InviteProvider,
    ProviderChecklistAssign,
    FunctionMainUsers,
    WorkerAssign,
    InviteWorkerClientAssign
} = require('../../models/common');
const { Roles } = require("../../models/public");


const GetAllCountries = async (req, res, next) => {
    try {
        const countriesRes = await Countries.findAll({
            attributes: ['country_id', 'name'],
        });
        SUCCESS(res, countriesRes);
    } catch (error) {
        console.log('error', error);
        next(error);
    };
};
const GetAllStatesbyCountryId = async (req, res, next) => {
    const { country_id } = req.query;

    try {
        const resp = await States.findAll({
            where: { country_id },
            attributes: ['state_id', 'state_name'],
        });
        SUCCESS(res, resp);
    } catch (error) {
        console.log('error', error);
        next(error);
    };
};
const GetAllCountriesAndStates = async (req, res, next) => {
    try {
        const Resp = await Countries.findAll({

            attributes: ['country_id', 'name'],
            include: { model: States, attributes: ["state_id", "state_name"] }
        });
        SUCCESS(res, Resp);
    } catch (error) {
        console.log('error', error);
        next(error);
    };

};
const GetAllCitiesByStateId = async (req, res, next) => {
    const { state_id } = req.query;
    try {
        const resp = await Cities.findAll({
            where: { state_id },
            attributes: ['city_id', 'city_name'],
        });
        SUCCESS(res, resp);
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetAllOrgServiceTypeList = async (req, res, next) => {

    try {
        const serviceTypeRes = await MasterSettings.findAll({
            where: { meta_key: "org_service_type" },
            attributes: ["master_setting_uuid", "meta_value_one"]

        });
        return GETSUCCESS(res, serviceTypeRes, 'Get all Service Types Successfully!');

    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetAllOrgIndustryTypeList = async (req, res, next) => {
    try {
        const serviceTypeRes = await MasterSettings.findAll({
            where: { meta_key: "industry_type" },
            attributes: ["master_setting_uuid", "meta_value_one"],
            order: [["meta_value_one", "ASC"]]
        });
        return GETSUCCESS(res, serviceTypeRes, 'Get all Industry Types Successfully!');

    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetHighRiskActivityList = async (req, res, next) => {
    try {
        const serviceTypeRes = await MasterSettings.findAll({
            where: { meta_key: "high_risk_work_type" },
            attributes: ["master_setting_uuid", "meta_value_one"]

        });
        return GETSUCCESS(res, serviceTypeRes, 'Get all Industry Types Successfully!');

    } catch (error) {
        console.log(error);
        next(error);
    };
};

const GetAllFunctions = async (req, res, next) => {
    try {

        const functionsRes = await Functions.findAll({
            attributes: { exclude: commonAttributes }
        });
        return GETSUCCESS(res, functionsRes, 'Get All function details successfully!');

    } catch (error) {

        console.log(error);
        next(error);
    };
};
const GetAllContactTypes = async (req, res, next) => {
    try {
        const contactTypesRes = await ContactTypes.findAll({
            attributes: { exclude: commonAttributes }
        });

        return GETSUCCESS(res, contactTypesRes, 'Get All contact types successfully!');

    } catch (error) {
        console.log(error);
        next(error);
    };
};

const GetAllClientList = async (req, res, next) => {

    const { function_uuid, search } = req.query;
    try {

        let where_obj = { function_uuid, is_org_active: true };

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("abn_nzbn"), { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.col("trading_name"), { [Sq.Op.iLike]: `%${search}%` }),
                ]
            };
        };
        const organisationsRes = await Organisations.findAll(
            {
                where: where_obj,
                attributes: [
                    "organisation_uuid",
                    "function_assignment_uuid",
                    "org_name", "trading_name",
                    "abn_nzbn",
                ],
            }
        );
        return GETSUCCESS(res, organisationsRes, 'Get All Client list successfully!!');

    } catch (error) {
        console.log(error);
        next(error);
    };

};
const GetAllRoleByFunctionId = async (req, res, next) => {
    try {
        const { function_uuid } = req.query;
        const rolesRes = await Roles.findAll({ where: { function_uuid } });
        SUCCESS(res, rolesRes);
    } catch (error) {
        console.log('error', error);
        next(error);
    };
};
const GetIndividualByEmail = async (req, res, next) => {
    try {
        const { email } = req.query;

        const individualRes = await Individuals.findOne({
            where: { email: Sq.where(Sq.fn('LOWER', Sq.col('email')), email.toLowerCase()) },
            attributes: ["individual_uuid", "user_uuid", "first_name", "last_name",
                "email", "is_conserve_team"],
        });
        return GETSUCCESS(res, individualRes, "Get individual by email successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetOrgUserInvitationById = async (req, res, next) => {
    try {
        const { invite_uuid } = req.query;

        const inviteRes = await Invite.findOne({
            where: { invite_uuid },
            include: [
                {//check also is individual is also a user
                    model: Individuals, attributes: { exclude: commonAttributes },
                },
                {//get org. uuid (for client user or worker or provider user org.)
                    model: FunctionAssignments, as: "invite_fun_assign", attributes:
                        ["function_assignment_uuid", "organisation_uuid"],
                    include: { model: Organisations, as: "org_data", attributes: ["trading_name"] }
                },
            ],
        });

        GETSUCCESS(res, inviteRes);
    } catch (error) {
        console.log(error);
        next(error);
    };
};

//For Client and Provider users
const SubmitUserInvitation = async (req, res, next) => {
    try {
        let { invite_uuid, password, individual_uuid, organisation_uuid, contact_type_uuid } = req.body;
        let userRes;
        console.log(req.body)
        // Find if the individual exists as a user
        const user = await Users.findOne({ where: { individual_uuid } });

        await sequelize.transaction(async (transaction) => {
            const promises = [];

            if (user) {
                // Update invite status
                promises.push(Invite.update({ invite_status: "Active", user_uuid: user.user_uuid }, { where: { invite_uuid }, transaction }));
            } else {
                // Bcrypt the password
                password = await bcrypt.hash(password, 10);
                // Create user junctin
                userRes = await Users.create({ individual_uuid, password }, { transaction });
                // Update invite status
                promises.push(Invite.update({ invite_status: "Active", user_uuid: userRes.user_uuid }, { where: { invite_uuid }, transaction }));
                // Update individual
                promises.push(Individuals.update({ user_uuid: userRes.user_uuid }, { where: { individual_uuid }, transaction }));
            };
            // Create individual org. jun.
            promises.push(IndividualOrg.create({ organisation_uuid, individual_uuid, contact_type_uuid, is_user: true }, { transaction }));
            // Update add user uuid in the permissionsa and active (specific permissions according to user org.)
            promises.push(FAUserPermissions.update({ is_user_perm_active: true, user_uuid: user ? user.user_uuid : userRes.user_uuid }, { where: { invite_uuid }, transaction }));

            // Use Promise.all to execute all promises concurrently
            await Promise.all(promises);

            SUCCESS(res, `${user ? "Invitation submitted successfully!" : "Password created successfully!"}`);
        });

    } catch (error) {
        console.error(error);
        next(error);
    };

};

// need to move is_worker from individual to user
const SubmitWorkerInvitation = async (req, res, next) => {
    try {
        sequelize.transaction(async (transaction) => {
            let { invite_uuid, created_by, password, individual_uuid,
                state_id, country_id, phone, worker_job_title, organisation_uuid } = req.body;
            const fileData = req.file;

            //if user (worker) already exists and assigned clients
            const [user, inviteWorkerAssignRes] = await Promise.all([
                Users.findOne({ where: { individual_uuid } }),
                InviteWorkerClientAssign.findAll({ where: { invite_uuid }, attributes: ['client_org_uuid'] })
            ])
            let userRes;
            let workerRes;
            const operations = [];
            if (user) {
                const user_uuid = user.user_uuid;
                operations.push(
                    Invite.update({ invite_status: "Active", user_uuid, updated_by: user_uuid }, { where: { invite_uuid }, transaction }),
                    workerRes = await Workers.create({ provider_org_uuid: organisation_uuid, worker_job_title, individual_uuid }, { transaction })
                );
                operations.push(Users.update({ is_worker: true }, { where: { user_uuid } }));//is worker:true

            } else {
                password = await bcrypt.hash(password, 10);
                userRes = await Users.create({ individual_uuid, password, is_worker: true });
                const { user_uuid } = userRes;
                operations.push(
                    Invite.update({ invite_status: "Active", user_uuid, updated_by: user_uuid }, { where: { invite_uuid }, transaction }),
                    workerRes = await Workers.create({ individual_uuid, worker_job_title, provider_org_uuid: organisation_uuid }, { transaction })
                );
            };
            const individualUpdate = { updated_by: userRes?.user_uuid, is_worker: true };
            if (country_id || state_id || phone || userRes) {

                if (phone) individualUpdate.phone = phone;
                if (state_id) individualUpdate.state_id = state_id;
                if (country_id) individualUpdate.country_id = country_id;
                if (userRes) individualUpdate.user_uuid = userRes.user_uuid || user.user_uuid;
                if (fileData?.location) individualUpdate.avatar = fileData.location;

            };
            //create assign worker to clients in main table
            if (inviteWorkerAssignRes.length > 0) {
                let workerAssingArr = [];
                for (let inviteWorkerClient of inviteWorkerAssignRes) {
                    workerAssingArr.push({ client_org_uuid: inviteWorkerClient.client_org_uuid, worker_uuid: workerRes.worker_uuid });
                };
                //create bulk assign
                operations.push(WorkerAssign.bulkCreate(workerAssingArr, { transaction }));
            };

            operations.push(Individuals.update(individualUpdate, { where: { individual_uuid }, transaction }));
            //get inviter individual email
            let individualPromise = Individuals.findOne({ where: { user_uuid: created_by } });
            operations.push(individualPromise);

            const results = await Promise.all(operations);
            const { email } = results[results.length - 1];//inviter email address
            req.body.email = email;
            const url = await WorkerAcceptInviteManageProfileLink(workerRes.worker_uuid);
            sendWorkerAcceptedInviteEmail(req.body, url);
            
            SUCCESS(res, `${user ? "Invitation submitted successfully!" : "Password created successfully!"}`);
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

const GetInvitedProviderChecklist = async (req, res, next) => {
    try {
        const { invite_provider_uuid, isRejectAttempt } = req.query;

        // Run the InviteProvider query immediately
        const inviteRes = await InviteProvider.findOne({
            where: { invite_provider_uuid },
            attributes: { exclude: commonAttributes },
            include: [
                {
                    model: FunctionAssignments,
                    as: "provInviteClient",
                    attributes: ["function_assignment_uuid"],
                    include: {
                        model: Organisations,
                        as: "org_data",
                        attributes: ["organisation_uuid", "trading_name"]
                    }
                },
                {
                    model: Individuals,
                    as: "invitedProvider",
                    attributes: [
                        'individual_uuid', 'user_uuid', 'first_name', 'last_name', 'user_uuid', 'email',
                        'phone', 'phone_optional', 'is_provider_primary'
                    ]
                },
                {//for client contact data
                    model: Individuals,
                    as: "ProvInvitedBy",
                    // attributes: [
                    //     [Sq.fn("concat", Sq.col("ProvInvitedBy.first_name"), " ", Sq.col("ProvInvitedBy.last_name")), "inviteBy"]
                    // ]
                }
            ],
        });

        // Define additional queries, which will be run only if necessary
        let faUserPermPromise = null;
        let inviteProvCompPromise = null;

        // if (isRejectAttempt === 'true' || isRejectAttempt === true) {
        //Check if user not remain the part of any org user or as worker (but user login exist)
        if (inviteRes.invitedProvider?.user_uuid) {
            faUserPermPromise = Users.findOne({
                where: {
                    user_uuid:
                        //  inviteRes.invitedProvider?.individual_uuid||
                        inviteRes.invitedProvider?.user_uuid
                },
                attributes: [
                    "is_worker", "user_uuid", 'individual_uuid',
                    [Sq.col('userPerm.fa_user_permission_uuid'), 'fa_user_permission_uuid']
                ],
                include: {
                    model: FAUserPermissions,
                    where: { is_user_perm_active: true },
                    as: 'userPerm', attributes: [],
                    required: false,
                }
            });
        };

        // Early return if the invitation is not valid
        if (!inviteRes || inviteRes.invite_status === "Rejected" || inviteRes.is_regis_started) {
            return LINKEXPIREDRESPONSE(res, "This link no longer exists!");
        };

        // };
        //also if primary contact is not already a provider check (if exist then not required this data)
        if ((!isRejectAttempt || isRejectAttempt === 'false') && inviteRes.invitedProvider.is_provider_primary == false

        ) {
            inviteProvCompPromise = InviteProviderCompliance.findAll({
                where: { invite_provider_uuid },
                include: {
                    model: ChecklistDocs,
                    as: 'inviteProviComp',
                    attributes: [
                        'checklist_doc_uuid',
                        'checklist_uuid',
                        'other_doc_name',
                        'is_doc_mandatory',
                        'is_other_doc'
                    ],
                    required: false,
                    include: {
                        model: DocumentTypes,
                        attributes: ['document_type_uuid', 'doc_type_name'],
                    }
                }
            });
        };

        // Await promises concurrently
        const [faUserPermRes, inviteProvCompRes] = await Promise.all([
            faUserPermPromise,
            inviteProvCompPromise
        ]);

        //response data
        const respData = {
            inviteData: inviteRes,
            provChecklist: inviteProvCompRes,
        };

        if (faUserPermRes) {
            respData.userValidate = faUserPermRes;
        };

        return GETSUCCESS(res, respData, 'Provider invite details retrieved successfully!');
    } catch (error) {
        console.error(error);
        next(error);
    };
};
//for provider registration
const GetProviderPrimaryUserCheck = async (req, res, next) => {
    try {
        const { user_uuid } = req.query;

        const functionMainUserRes = await FunctionMainUsers.findOne({
            where: {
                user_uuid,
                is_primary_user: true
            }, attributes: ['function_user_uuid', 'provider_org_uuid']
        });

        GETSUCCESS(res, functionMainUserRes, 'Get Provider primary successfully!');

    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetProviderChecklistByClient = async (req, res, next) => {
    try {
        const { client_org_uuid, provider_org_uuid } = req.query;

        const response = await ProviderChecklistAssign.findAll({
            where: { client_org_uuid, provider_org_uuid },
            include: {
                model: ChecklistDocs, as: 'ProvCheckDoc',
                attributes: [
                    'checklist_doc_uuid',
                    'checklist_uuid',
                    'other_doc_name',
                    'is_doc_mandatory',
                    'is_other_doc'
                ],
                required: false,
                include: {
                    model: DocumentTypes, attributes: { exclude: commonAttributes },
                },
            }
        });

        GETSUCCESS(res, response, 'Get Provider checklist by client successfully!');

    } catch (error) {
        console.log(error);
        next(error);
    };
};
//-------------------working changed provider details function_assignment_uuid to provider_org_uuid to get
//Provider get signup continue registration data api
// const GetContractorSignupContinueById = async (req, res, next) => {
//     const { organisation_uuid } = req.query;
//     try {
//         //organisation 
//         const orgRes = await Organisations.findOne({
//             where: {
//                 organisation_uuid: organisation_uuid,
//             },
//             attributes: { exclude: commonAttributes },
//             include: [
//                 {
//                     //individual data
//                     model: Individuals,
//                     as: "individual_data",
//                     attributes: { exclude: commonAttributes },
//                     through: { attributes: [] },
//                     //user data
//                     include: [{ model: Users, as: "user_data" },]
//                 },
//                 {//function assignment
//                     model: FunctionAssignments,
//                     attributes: { exclude: commonAttributes },
//                     // provider details
//                     include: [
//                         { model: ProviderOrgDetails },
//                         {//function assignment relation (by child uuid)
//                             model: FARelations, as: "fa_relation_child", attributes:
//                                 { exclude: commonAttributes },
//                         },
//                         { model: Functions, attributes: { exclude: commonAttributes }, }]
//                 },
//                 { //address details
//                     model: Addresses, as: "org_address_data",
//                     through: { attributes: ["org_address_uuid"] },
//                     attributes: { exclude: commonAttributes },
//                 },
//             ]
//         });
//         return GETSUCCESS(res, orgRes, 'Signup continue details successfully!');

//     } catch (error) {
//         console.log(error);
//         next(error);
//     }
// };
//review this api pending
// const DeleteIndividualContactById = async (req, res, next) => {
//     const { individual_uuid } = req.query;
//     try {
//         await Individuals.destroy({ where: { individual_uuid } });
//         await IndividualOrg.destroy({ where: { individual_uuid } });
//         await OrgAddressContacts.destroy({ where: { individual_uuid } });
//         return SUCCESS(res, 'Contact deleted successfully!');

//     } catch (error) {

//         console.log(error);
//         next(error);
//     };
// };

module.exports = {
    GetAllCountries,
    GetAllStatesbyCountryId,
    GetAllCountriesAndStates,
    GetAllCitiesByStateId,
    GetAllOrgServiceTypeList,
    GetAllOrgIndustryTypeList,
    GetHighRiskActivityList,
    GetAllFunctions,
    GetAllContactTypes,
    GetAllClientList,
    GetAllRoleByFunctionId,
    GetIndividualByEmail,
    SubmitUserInvitation,
    GetOrgUserInvitationById,
    SubmitWorkerInvitation,
    GetInvitedProviderChecklist,
    GetProviderPrimaryUserCheck,
    GetProviderChecklistByClient
    // DeleteIndividualContactById
};