const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const ProviderOrgDetails = sequelize.define(
    'provider_org_details',
    {
        provider_org_detail_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },

        ind_master_setting_uuid: { type: Sq.UUID, allowNull: false },
        high_risk_master_setting_uuid: { type: Sq.UUID },
        organisation_uuid: { type: Sq.UUID },//provider
        provider_type_uuid: { type: Sq.UUID },
        no_of_emp: Sq.STRING,
        msa_info: { type: Sq.JSONB },
        whs_contact_info: { type: Sq.JSONB, allowNull: false },
        client_engagement_doc: { type: Sq.TEXT },
        msa_doc: { type: Sq.TEXT },

        high_risk_activity: { type: Sq.BOOLEAN, defaultValue: false },
        whs_system_certified: { type: Sq.BOOLEAN, defaultValue: false },
        whs_system_available: { type: Sq.BOOLEAN, defaultValue: false },
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

module.exports = ProviderOrgDetails;
