const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const Roles = sequelize.define(
    'roles',
    {
        role_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },

        function_uuid: { type: Sq.UUID, allowNull: false },
        role_name: { type: Sq.STRING, allowNull: false },
        ...modelCommonAttributes
    },
    {
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'public',
        ...modelRenameDateAttributes
    },
);

module.exports = Roles;
