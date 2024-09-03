const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const Users = sequelize.define(
    'users',
    {
        user_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        individual_uuid: { type: Sq.UUID, allowNull: false, },
        password: Sq.STRING,
        user_otp: { type: Sq.STRING, },
        otp_created_date: { type: Sq.DATE, },
        two_factor_auth: { type: Boolean, defaultValue: false, allowNull: false },
        last_login: { type: Sq.DATE },
        is_worker: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        is_default_login_as_worker: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },

        ...modelCommonAttributes
    },
    {
        indexes: [{
            unique: true,
            fields: ['individual_uuid']
        }],
        paranoid: true,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes,
        defaultScope: {
            attributes: { exclude: ["password", "user_otp"] },
        },
        scopes: {
            withPassword: { attributes: {} },
        },
    },
);
Users.beforeDestroy(async (user, option) => {
    await Users.update({
        deleted_by: option.login_user.user_uuid
    }, { paranoid: false, where: { user_uuid: user.user_uuid } });

});

module.exports = Users;
