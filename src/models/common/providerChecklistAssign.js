const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const ProviderChecklistAssign = sequelize.define(
    'provider_checklist_assign',
    {
        provider_checklist_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        checklist_uuid: { type: Sq.UUID, allowNull: false },
        client_org_uuid: { type: Sq.UUID, allowNull: false },
        provider_org_uuid: { type: Sq.UUID, allowNull: false },//provider organisation uuid

        ...modelCommonAttributes
    },
    {
        indexes: [{
            unique: true,
            fields: ['checklist_uuid', 'provider_org_uuid']
        }],

        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);

module.exports = ProviderChecklistAssign;
