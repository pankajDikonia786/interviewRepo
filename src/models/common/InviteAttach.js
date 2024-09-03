const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const InviteAttach = sequelize.define(
    'invite_attach',
    {
        invite_attach_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        invite_provider_uuid: { type: Sq.UUID, allowNull: false, },
        attach_url: { type: Sq.TEXT },
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


module.exports = InviteAttach;
