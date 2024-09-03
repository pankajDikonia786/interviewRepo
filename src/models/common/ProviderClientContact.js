const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");
const ProviderClientContact = sequelize.define(
    'provider_client_contact',
    {
        provider_client_contact_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        provider_org_uuid: Sq.UUID,
        client_org_uuid: Sq.UUID,
        contact_title: { type: Sq.STRING, },
        contact_first_name: { type: Sq.STRING, allowNull: false },
        contact_last_name: { type: Sq.STRING, allowNull: false },
        contact_email: { type: Sq.STRING, },
        contact_phone: { type: Sq.STRING, },
        contact_phone_optional: { type: Sq.STRING },
        is_main_contact: { type: Sq.BOOLEAN, allowNull: false, defaultValue: false },

        ...modelCommonAttributes
    },
    {
        indexes: [
            {
                unique: false,
                fields: ['provider_org_uuid', "client_org_uuid"]
            }
        ],
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes,
    },
);

module.exports = ProviderClientContact;
