const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");
const ClientSiteContacts = sequelize.define(
    'client_site_contacts',
    {
        site_contact_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        site_uuid: { type: Sq.UUID, allowNull: false },
        individual_uuid: { type: Sq.UUID, allowNull: false },
        client_fa_uuid: { type: Sq.UUID, allowNull: false },
        ...modelCommonAttributes
    },
    {
        indexes: [
            {
                unique: true,
                fields: ['site_uuid', "individual_uuid",]
            }
        ],

        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes

    },
);

module.exports = ClientSiteContacts;
