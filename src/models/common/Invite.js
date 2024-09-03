const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const Invite = sequelize.define(
    'invite',
    {
        invite_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        function_assignment_uuid: Sq.UUID,//client or provider null when conserve team user
        user_uuid: { type: Sq.UUID },
        individual_uuid: Sq.UUID,
        role_uuid: Sq.UUID,//need when invites to conserve team user

        invite_status: { type: Sq.ENUM("Invited", "Active"), defaultValue: "Invited" },
        invited_user_type: { type: Sq.ENUM("conserve_team", "worker", "client_user", "provider_user",), allowNull: false },
        invite_date: { type: Sq.DATE, allowNull: false },
        ...modelCommonAttributes
    },
    {
        indexes: [
            {
                unique: true,
                fields: ['function_assignment_uuid', 'individual_uuid', "invited_user_type"]
            }
        ],
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);
// Invite.beforeDestroy(async (invite, option) => {

//     await Invite.update({
//         deleted_by: option.login_user.user_uuid
//     }, { paranoid: false, where: { invite_uuid: invite.invite_uuid } });

// });

module.exports = Invite;
