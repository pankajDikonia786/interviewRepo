const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const AccountUsers = sequelize.define(
    'account_users',
    {
        account_user_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        user_uuid: { type: Sq.UUID, allowNull: false },
        account_uuid: { type: Sq.UUID, allowNull: false },
        admin: Sq.STRING,
        ...modelCommonAttributes
    },
    {
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes

    },
);

module.exports = AccountUsers;
