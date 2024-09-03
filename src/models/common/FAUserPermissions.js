const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const FAUserPermissions = sequelize.define(
    'fa_user_permissions',
    {
        fa_user_permission_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        function_assignment_uuid: { type: Sq.UUID, allowNull: false },//provider or client
        invite_uuid: { type: Sq.UUID, },
        user_uuid: { type: Sq.UUID, },
        is_user_perm_active: { type: Sq.BOOLEAN, allowNull: false, defaultValue: false },//default false
        is_default_preferred_login: { type: Sq.BOOLEAN, allowNull: false, defaultValue: true },//for login as default by org.
        org_function_type: { type: Sq.ENUM('client', 'provider'), allowNull: false },
        //client user portal
        provider_view: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        provider_write: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        compliance_view: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        compliance_write: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        induction_view: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        induction_write: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        sites_view: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        sites_write: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },

        //provider user portal
        documents_view: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        documents_write: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        client_view: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        client_write: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        workers_view: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        workers_write: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },

        //common provider user and client user portal permissions
        notes_view: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        notes_write: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        support_view: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        support_write: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        dashboard_view: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        dashboard_write: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        users_view: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        users_write: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        reporting_view: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        reporting_write: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        contacts_view: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        contacts_write: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        messages_view: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        messages_write: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        invoices_view: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        invoices_write: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        settings_view: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        settings_write: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },

        ...modelCommonAttributes
    },
    {
        indexes: [{
            unique: true,
            fields: ['function_assignment_uuid', 'user_uuid']
        }],
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);
//working---------------
// FAUserPermissions.beforeDestroy(async (faUserPermissions, option) => {
//     let updateCondition;
//     if (faUserPermissions.user_uuid && faUserPermissions.is_user_perm_active) {
//         updateCondition = {
//         };
//     };

//     await FAUserPermissions.update({
//         deleted_by: option.login_user.user_uuid
//     }, { paranoid: false, where: { user_uuid: user.user_uuid } });

// });

module.exports = FAUserPermissions;
