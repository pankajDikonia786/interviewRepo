const Sq = require("sequelize");
const bcrypt = require("bcrypt");
const path = require('path');
const sequelize = require('../../../config/DbConfig.js');
const {
    SUCCESS,
    GETSUCCESS,
    NOTFOUND,
    CUSTOMRESPONSE,
    ALREADYEXISTREPONSE,
    UNAUTHORISEDRESPONSE,
} = require('../../../constants/ResponseConstants.js');
const { InviteConserveUserEmailLink } = require("../../../services/UserServices.js");
const { generateAccessToken, } = require('../../../middlewares/AuthMiddleware.js');
const { commonAttributes, deleteS3BucketFile } = require("../../../services/Helper.js");
const { UserResetPasswordEmailLink } = require("../../../services/UserServices.js");
const { Users, Individuals, Invite, RoleAssignments } = require("../../../models/common/index.js");
const { Roles } = require("../../../models/public/index.js")
// const {sendNotification} =require("../_Admin-Portal/socketHandlers.js")
const {sendNotification} =require("../../../services/SocketHandlers.js")
const {
    sendConserveUserInviteEmail,
    sendUserResetPasswordEmail,
    sendRemoveAdminUserEmail,
    sendAdminUserWelcomeEmail
} = require("../../../utils/EmailUtils.js");

//role pending
const InviteUser = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const inviteDetails = req.body;
        const { email } = inviteDetails;
        inviteDetails.created_by = login_user.user_uuid;
        inviteDetails.invite_date = new Date();
        inviteDetails.invited_user_type = "conserve_team";
        inviteDetails.is_conserve_team = true;
        sequelize.transaction(async (transaction) => {
            if (await Individuals.findOne({ where: { email }, })) {

                return ALREADYEXISTREPONSE(res, 'Email already exists. Please try a different Email addresss.');
            };
            //create individual
            const individualRes = await Individuals.create(inviteDetails, { transaction });
            inviteDetails.individual_uuid = individualRes.individual_uuid;
            const  individual_name =`${individualRes.first_name} ${individualRes.last_name}`

            //create invite
            const inviteRes = await Invite.create(inviteDetails, { transaction });

            //Send user invitation
            const emailDetails = {
                inviter_first_name: login_user.individual.first_name,
                email
            };
            const url =  InviteConserveUserEmailLink(inviteRes.invite_uuid);
             sendNotification(`${individual_name} successfully invited`, ["super admin", "client service team"], "");

            sendConserveUserInviteEmail(emailDetails, url);

            SUCCESS(res, "Invite sent successfully!")
        });
    } catch (error) {
        console.log(error);
        next(error);

    };
};

//for check in status(invite) at the time of submit invitations
const GetInvitationById = async (req, res, next) => {
    try {
        const { invite_uuid } = req.query;

        const inviteRes = await Invite.findOne({
            where: { invite_uuid }, attributes: { exclude: commonAttributes },
            include: { model: Individuals, attributes: { exclude: commonAttributes } },
        });

        GETSUCCESS(res, inviteRes);

    } catch (error) {
        console.log(error);
        next(error);
    }
};
//submit invitation and set new password
const SubmitAdminUserInvitation = async (req, res, next) => {
    try {
        let { invite_uuid, password, individual_uuid, role_uuid } = req.body;

        if (await Users.findOne({ where: { individual_uuid, }, })) {

            return ALREADYEXISTREPONSE(res, 'User already exist!');
        };
        await sequelize.transaction(async (transaction) => {

            //bcrypt the password
            password = await bcrypt.hash(password, 10);
            //Create user
            const userRes = await Users.create({ individual_uuid, password, }, { transaction });

            await Invite.update({ invite_status: "Active", user_uuid: userRes.user_uuid }, { where: { invite_uuid }, transaction });
            const [, IndividualData] = await Individuals.update(
                { user_uuid: userRes.user_uuid },
                { where: { individual_uuid }, returning: true, plain: true, transaction });
            //create role assignment(role )
            await RoleAssignments.create({ user_uuid: userRes.user_uuid, role_uuid });

            // Send welcome email 
            const emailDetails = {
                email: IndividualData.email
            };
        
            await sendNotification(`${IndividualData.first_name} ${IndividualData.last_name} has joined the platform`, ["super admin"], "");
            sendAdminUserWelcomeEmail(emailDetails);

            SUCCESS(res, "Password created successfully!");
        });

    } catch (error) {
        console.log(error);
        next(error);

    };
};

const ReinviteAdminUser = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const { invite_uuid, email,fullName } = req.body;
        if (!invite_uuid || !email) {
            return INVALIDRESPONSE(res, "Bad request!");
        };
        await Invite.update({ updated_by: login_user.user_uuid }, { where: { invite_uuid } });

        //Send user invitation
        const emailDetails = {
            inviter_first_name: login_user.individual.first_name,
            email
        };
        const url = await InviteConserveUserEmailLink(invite_uuid);
        //send email
        sendConserveUserInviteEmail(emailDetails, url);
        await sendNotification(`${fullName} successfully reinvited`, ["super admin","client service team"], "");

        SUCCESS(res, "Invite sent successfully!");

    } catch (error) {
        console.log(error);
        next(error);

    };
};

const GetAllConserveTeamAndInvites = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const { page, limit, sort, order, search, role_name, viewType } = req.query;

        let query_obj = {};
        let role_where_obj = {};

        let where_obj = { is_conserve_team: true, individual_uuid: { [Sq.Op.ne]: login_user.individual.individual_uuid } };

        if (search) {
            let typeCheck = (viewType == 'invited') ? true : false;
            where_obj = {

                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.fn("concat",
                        Sq.col(`${typeCheck == 'invited' ? 'invite_individual.first_name' : 'individuals.first_name'}`),
                        " ", Sq.col(`${typeCheck ? 'invite_individual.last_name' : 'individuals.last_name'}`)),
                        { [Sq.Op.iLike]: `%${search}%` }),

                ],
            };
        };
        if (role_name) {
            role_where_obj.role_name = role_name;
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };

        if (sort && order) {
            let sortArray = [];
            if (sort === "created_date" || (sort === "first_name" && viewType !== ('invited'))) sortArray = [[sort, order]];
            if (sort === "first_name" && viewType == 'invited') sortArray = [{ model: Individuals, as: 'invite_individual' }, sort, order];
            if (sort === "last_login" && viewType !== 'invited') {
                sortArray = [{ model: Users, as: 'user_data' }, sort, order];

            };
            query_obj.order = [sortArray];
        };
        let usersRes;

        if (viewType == 'all' || viewType == 'clientService' || viewType == 'superAdmin' || viewType == 'supportTeam') {
            usersRes = await Individuals.findAndCountAll({
                where: where_obj,
                attributes: ['individual_uuid', 'first_name', 'last_name',],
                include: [{
                    model: Users, as: "user_data", attributes: ["user_uuid", "last_login"],
                    required: true,
                    include: [{//Get assigned role details(user)
                        model: RoleAssignments, as: "role_assign",
                        attributes: ["role_assignment_uuid",],
                        required: true,
                        include: {
                            model: Roles, as: "role",
                            where: role_where_obj,//by role
                            attributes: ["role_uuid", "role_name"]
                        }
                    }]
                },
                {//invited by user
                    model: Users, as: "indCreatedBy", attributes: ["user_uuid"],
                    include: {
                        model: Individuals,
                        attributes: ["first_name", "last_name"],
                    }
                }],
                ...query_obj,
            });
        };
        if (viewType === 'invited') {

            usersRes = await Invite.findAndCountAll({
                where: { invited_user_type: "conserve_team", invite_status: 'Invited' },
                attributes: ["invite_uuid", "user_uuid", "individual_uuid", "invite_status", "created_date"],
                include:
                    [{
                        model: Individuals, as: "invite_individual", where: where_obj,
                        attributes: ["first_name", "last_name"],
                        required: true,
                    },
                    {//get role details
                        model: Roles, as: "invite_role",
                        attributes: ["role_uuid", "role_name"]
                    },
                    {//invited by user
                        model: Users, as: "invited_by", attributes: ["user_uuid"],
                        include: {
                            model: Individuals,
                            attributes: ["first_name", "last_name"],
                        }
                    }
                    ],

                ...query_obj,
            });

        };

        GETSUCCESS(res, usersRes, "Get all Conserve User's successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

const GetUserDetailsById = async (req, res, next) => {

    try {
        const { individual_uuid } = req.query;
        const individualRes = await Individuals.findOne({
            where: { individual_uuid },
            attributes: { exclude: commonAttributes },
            include: {
                model: Users, as: "user_data", attributes: ["user_uuid"],
                include: {//Get assigned role details
                    model: RoleAssignments, as: "role_assign",
                    attributes: ["role_assignment_uuid", "admin_job_title"],
                    include: {
                        model: Roles, as: "role",
                        attributes: ["role_uuid", "role_name"]
                    }
                }
            },
        });

        GETSUCCESS(res, individualRes, "Get Conserve User by id successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};
//Edit profile api of user(conserve team)
const UserResetPasswordEmail = async (req, res, next) => {
    try {
        const { user_uuid, first_name, last_name, email } = req.body;

        const url = await UserResetPasswordEmailLink(user_uuid);

        const emailDetails = {
            email,
            user_name: first_name + " " + last_name,
        };
        sendUserResetPasswordEmail(emailDetails, url);

        SUCCESS(res, "Reset password email successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};
const UserResetPassword = async (req, res, next) => {
    try {
        let { user_uuid, password } = req.body;

        const individualRes = await Users.findOne({ where: { user_uuid }, });

        if (!individualRes) return NOTFOUND(res, `User not exist!`)
        if (!password) return INVALIDRESPONSE(res, 'Password required!');

        //Hash the password
        password = await bcrypt.hash(password, 10);
        await Users.update({ password, updated_by: user_uuid }, { where: { user_uuid } });
        return CUSTOMRESPONSE(res, 'Password Updated Successfully!');

    } catch (error) {
        console.log(error);
        next(error);
    }
};

const UpdateUser = async (req, res, next) => {
    try {
        sequelize.transaction(async (transaction) => {
            const userDetails = req.body;
            const { individual_uuid, role_uuid, role_assignment_uuid, admin_job_title } = userDetails;
            delete userDetails.individual_uuid;

            const fileData = req.file;

            fileData?.location ? userDetails.avatar = fileData.location : "";

            if (typeof fileData !== "undefined" && fileData?.location) {
                //delete existing file
                const individualsRes = await Individuals.findOne({
                    where: { individual_uuid },
                });

                if (individualsRes.avatar) {
                    let fileBasename = path.basename(individualsRes.avatar);
                    await deleteS3BucketFile(fileBasename)
                };
            };

            await Individuals.update(userDetails, { where: { individual_uuid }, transaction });
            await RoleAssignments.update({ role_uuid, admin_job_title }, { where: { role_assignment_uuid }, transaction });

            SUCCESS(res, "User profile updated successfully!");
        });

    } catch (error) {
        console.log(error);
        next(error);
    };
};

//Conserve admins delete soft
const RemoveUser = async (req, res, nsext) => {
    try {
        sequelize.transaction(async (transaction) => {

            const login_user = req.login_user;
            const { individual_uuid, user_uuid, role_assignment_uuid, message } = req.body;

            const { first_name, last_name, email } = await Individuals.findOne({ where: { individual_uuid } });

            await Individuals.destroy({ where: { individual_uuid }, transaction, individualHooks: true, login_user: login_user, });
            await Users.destroy({ where: { user_uuid }, transaction, individualHooks: true, login_user: login_user, });
            await RoleAssignments.destroy({ where: { role_assignment_uuid }, transaction, individualHooks: true, login_user: login_user });

            //Send email
            const emailDetails = {
                user_name: first_name + ' ' + (last_name || ""),
                email,
                message
            };
            await sendNotification(`${first_name} ${last_name} has removed from the platform`, ["super admin","client service team","support team"], "");
            //Send confirmationm Email 
            sendRemoveAdminUserEmail(emailDetails);

            SUCCESS(res, "Conserve User removed successfully!");
        });
    } catch (error) {
        console.log(error);
        next(error);

    };
};

const RemoveAdminInviteUser = async (req, res, next) => {
    try {
        const { invite_uuid, individual_uuid,fullName } = req.body;

        sequelize.transaction(async (transaction) => {
            //delete parmanent admin invite
            await Invite.destroy({ where: { invite_uuid }, force: true, transaction });
            //delete parmanent admin user
            await Individuals.destroy({ where: { individual_uuid }, force: true, transaction });
        });
        if(fullName){
        await sendNotification(`${fullName} has removed from the platform`, ["super admin","client service team","support team"], "");
        }
        SUCCESS(res, "Invited User removed successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
// Get User Profile for update
const GetAdminProfileById = async (req, res, next) => {

    try {
        const { individual_uuid } = req.query;
        const individualRes = await Individuals.findOne({
            where: { individual_uuid },
            attributes: ["individual_uuid", "first_name", "last_name", "title", "email", "avatar",
                [Sq.col("user_data.role_assign.admin_job_title"), "admin_job_title"],
                [Sq.col("user_data.role_assign.role_assignment_uuid"), "role_assignment_uuid"]],
            include: {
                model: Users, as: "user_data", attributes: [],
                include: {//Get assigned role and admin job title
                    model: RoleAssignments, as: "role_assign",
                    attributes: [],

                }
            },
        });

        GETSUCCESS(res, individualRes, "Get Conserve User profile by id successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetSpecificUserRole = async (req, res, next) => {
    try {
        const { role_assignment_uuid } = req.query;
        const roleAssignmentsRes = await RoleAssignments.findOne({
            where: { role_assignment_uuid },
            attributes: [
                [Sq.col("role.role_name"), "role_name"],
                [Sq.col("role.role_uuid"), "role_uuid"]
            ],
            include: {
                model: Roles, as: "role",
                attributes: []
            },
        });

        GETSUCCESS(res, roleAssignmentsRes, "Get User Role successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//login user setting 2fa
const TwoFactorAuth = async (req, res, next) => {
    try {
        const { user_uuid } = req.login_user;
        const { password, two_factor_auth } = req.body;

        const user = await Users.scope("withPassword").findOne({
            where: { user_uuid },
        });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return UNAUTHORISEDRESPONSE(res, 'Username or password is incorrect');
        };

        await Users.update({ two_factor_auth }, { where: { user_uuid } });

        SUCCESS(res, `Two Factor authentication ${(two_factor_auth === true || two_factor_auth === 'true')
            ? 'Enabled' : 'Disabled'} successfully!`);

    } catch (error) {
        console.log(error);
        next(error);
    };
};
module.exports = {
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
};

