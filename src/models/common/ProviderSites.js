const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");
//not used
const ProviderSites = sequelize.define(
    'provider_sites',
    {
        provider_site_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        provider_org_uuid: Sq.UUID,
        client_org_uuid: Sq.UUID,
        site_uuid: Sq.UUID,
        is_active: { type: Sq.BOOLEAN, defaultValue: true, allowNull: false },
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

module.exports = ProviderSites;
