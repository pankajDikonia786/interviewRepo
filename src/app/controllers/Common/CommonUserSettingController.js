
const Sq = require("sequelize");
const sequelize = require('../../../../src/config/DbConfig');
const { SUCCESS, GETSUCCESS, INVALIDRESPONSE, ALREADYEXISTREPONSE, } = require('../../../../src/constants/ResponseConstants');
const { InviteOrgUserEmailLink } = require("../../../services/UserServices");
const { sendInviteUserEmail } = require('../../../utils/EmailUtils');
const { commonAttributes, CommonGetIndividualQuery } = require("../../../../src/services/Helper");
const { Individuals, IndividualOrg, Invite, Users, FAUserPermissions, Workers } = require("../../../models/common");
const {sendNotification} =require("../../../services/SocketHandlers")

const InviteOrgUser = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const inviteDetails = req.body;
        let { function_assignment_uuid, individual_uuid, trading_name, first_name, last_name, email,
            user_perm_data, user_uuid, contact_type_uuid, invited_user_type,organisation_uuid} = inviteDetails;

        !user_uuid ? delete inviteDetails.user_uuid : "";
        inviteDetails.created_by = login_user.user_uuid;
        inviteDetails.invite_date = new Date();

        sequelize.transaction(async (transaction) => {
            let inviteRes;
            if (individual_uuid === "" || !individual_uuid) {
                delete inviteDetails.individual_uuid;
                //create individual
                const individualRes = await Individuals.create(inviteDetails, { transaction });
                inviteDetails.individual_uuid = individualRes.individual_uuid;
                //create invite
                inviteRes = await Invite.create(inviteDetails, { transaction });

            };
            //if individual has already invited in existing client 
            if (individual_uuid) {

                // await IndividualOrg.findOne({ where: { organisation_uuid, individual_uuid } })
                let [inviteResponse, inviteCreated] = await Invite.findOrCreate({
                    where: {
                        function_assignment_uuid, individual_uuid, invited_user_type,
                    },
                    defaults: {
                        ...inviteDetails
                    }, transaction
                });
                if (!inviteCreated) {
                    return ALREADYEXISTREPONSE(res, "This user has already exists !");
                };
                inviteRes = inviteResponse;

            };
            //parse
            user_perm_data = JSON.parse(user_perm_data);

            user_perm_data.created_by = login_user.user_uuid;
            user_perm_data.invite_uuid = inviteRes.invite_uuid;
            user_perm_data.function_assignment_uuid = function_assignment_uuid;
            user_perm_data.org_function_type = invited_user_type === "client_user" ? "client" : "provider";
            //create invited permissions
            await FAUserPermissions.create(user_perm_data, { transaction });

            const emailDetails = {
                trading_name: trading_name,//client or provider organisation trading name
                user_name: first_name + " " + last_name,
                email
            };
            const { org_function_type } = user_perm_data;
            const url = await InviteOrgUserEmailLink(inviteRes.invite_uuid, contact_type_uuid, org_function_type);

            sendInviteUserEmail(emailDetails, url);
            SUCCESS(res, "Invite sent successfully!");
            sendNotification(`New mamber join the orgnization :${trading_name}`,[`org_${organisation_uuid}`,"support_team"], "")
        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const ReinviteOrgUser = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const { invite_uuid, trading_name, first_name, last_name, email, contact_type_uuid, invited_user_type } = req.body;

        if (!invite_uuid || !trading_name || !first_name || !last_name || !email) {
            return INVALIDRESPONSE(res, "Bad request!");
        };
        await Invite.update({ updated_by: login_user.user_uuid }, { where: { invite_uuid } });
        const emailDetails = {
            client_name: trading_name,
            user_name: first_name + " " + last_name,
            email
        };

        const org_function_type = invited_user_type === "client_user" ? "client" : "provider";
        const url = await InviteOrgUserEmailLink(invite_uuid, contact_type_uuid, org_function_type);
        sendInviteUserEmail(emailDetails, url);

        SUCCESS(res, "Invite sent successfully!");

    } catch (error) {
        console.log(error);
        next(error);

    };
};

const GetAllSpecificOrgUsers = async (req, res, next) => {

    try {
        const { individual_uuid } = req.login_user.individual;
        const { organisation_uuid, search } = req.query;

        let where_obj = { organisation_uuid, is_user: true, individual_uuid: { [Sq.Op.ne]: individual_uuid } };
        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("org_individual.email"), { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.fn("concat", Sq.col("org_individual.first_name"), " ", Sq.col("org_individual.last_name")), { [Sq.Op.iLike]: `%${search}%` }),
                ]
            };
        };

        const individualOrgRes = await IndividualOrg.findAll({
            where: where_obj,
            attributes: { exclude: commonAttributes },
            include: {
                model: Individuals, as: "org_individual",
                attributes: ["individual_uuid", "first_name", "last_name", "email"],
                where: {
                    is_conserve_team: false,
                }, include:
                    { model: Users, as: "user_data", attributes: ["user_uuid", "last_login"] }
            },
        });

        GETSUCCESS(res, individualOrgRes, "Get all user's of specific Organisation successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetAllSpecificOrgInvites = async (req, res, next) => {

    try {
        //invited_user_type=client_user||provider_user
        const { function_assignment_uuid, search, invited_user_type } = req.query;

        let where_obj = { function_assignment_uuid, invite_status: "Invited", invited_user_type };
        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("invite_individual.email"), { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.fn("concat", Sq.col("invite_individual.first_name"), " ", Sq.col("invite_individual.last_name")), { [Sq.Op.iLike]: `%${search}%` }),
                ]
            };
        };

        const inviteRes = await Invite.findAll({
            where: where_obj,
            include: {
                model: Individuals, as: "invite_individual", attributes: {
                    exclude: commonAttributes
                }
            }
        });
        GETSUCCESS(res, inviteRes, "Get all Invited for specific Organisation successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };

};
const GetOrgUserPermById = async (req, res, next) => {
    try {
        const { user_uuid, function_assignment_uuid } = req.query;

        const faUserPermissionsRes = await FAUserPermissions.findOne({
            where: { user_uuid, function_assignment_uuid },
            attributes: { exclude: commonAttributes }
        });
        GETSUCCESS(res, faUserPermissionsRes, "Get User Permissions by id successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};
const UpdateOrgUserPerm = async (req, res, next) => {
    try {
        const { user_uuid } = req.login_user;
        const userPermDetails = req.body;
        const { fa_user_permission_uuid } = userPermDetails;
        userPermDetails.updated_by = user_uuid;
        await FAUserPermissions.update(userPermDetails, { where: { fa_user_permission_uuid } });

        SUCCESS(res, "User permissions update successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const RemoveOrgUserInvitation = async (req, res, next) => {
    try {
        const { invite_uuid, function_assignment_uuid } = req.body;

        await Invite.destroy({
            where: { invite_uuid, }, force: true
        },);
        await FAUserPermissions.destroy({
            where:
                { function_assignment_uuid, invite_uuid },
        });
        SUCCESS(res, "Organisation user invitation deleted successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};
//direct provider registration user as provider case check
//other all delte permanent commented---
//working discuss pending delete user need to revisit-------------may delete other related data delete pending also
//-----user can be already invited or be a Provider and need to handle login message also
//not to remove user 
const RemoveOrgUser = async (req, res, next) => {
    try {

        const login_user = req.login_user;
        const { individual_uuid, individual_org_uuid, function_assignment_uuid, user_uuid, } = req.body;
        let workersRes;
        //delete permissions
        await FAUserPermissions.destroy({
            where: { function_assignment_uuid, user_uuid },
        });
        await IndividualOrg.destroy({
            where: { individual_org_uuid },
        });

        //check if user are exist in other org. also 
        // const faUserPermissionRes = await FAUserPermissions.findOne(
        //     {
        //         where: {
        //             user_uuid,
        //             function_assignment_uuid: { [Sq.Op.ne]: function_assignment_uuid },
        //             is_user_perm_active: true
        //         }
        //     });
        //delete user invite
        await Invite.destroy({
            where: {
                function_assignment_uuid, individual_uuid,
                invited_user_type: { [Sq.Op.or]: ['client_user', 'provider_user'] }
            }, force: true,
        });

        // if (!faUserPermissionRes || faUserPermissionRes === null) {
        //     workersRes = await Workers.findOne({ where: { individual_uuid } });
        // };
        // if (!workersRes && !faUserPermissionRes) {
        //     await Users.destroy({
        //         where: { user_uuid },
        //         individualHooks: true, login_user: login_user,
        //     });
        //     await Individuals.update({ user_uuid: null, updated_by: login_user.user_uuid },
        //         { where: { individual_uuid } });
        // };

        SUCCESS(res, "Client User removed successfully!");
    } catch (error) {
        console.log(error);
        next(error);

    };
};


module.exports = {
    InviteOrgUser,
    ReinviteOrgUser,
    GetAllSpecificOrgUsers,
    GetAllSpecificOrgInvites,
    GetOrgUserPermById,
    UpdateOrgUserPerm,
    RemoveOrgUserInvitation,
    RemoveOrgUser

};