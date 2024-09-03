const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const LoginHistory = sequelize.define(
    'login_history',
    {
        login_history_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },

        user_uuid: { type: Sq.UUID, allowNull: false },
        login_date: { type: Sq.DATE },
        ip_address: { type: Sq.STRING },

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

module.exports = LoginHistory;
