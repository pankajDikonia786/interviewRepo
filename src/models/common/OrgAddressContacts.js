const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const OrgAddressContacts = sequelize.define(
    'org_address_contacts',
    {
        org_address_contact_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        individual_uuid: { type: Sq.UUID, allowNull: false },
        org_address_uuid: { type: Sq.UUID, allowNull: false },
        contact_type_uuid: { type: Sq.UUID, allowNull: false },
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

module.exports = OrgAddressContacts;
