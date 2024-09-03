const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const OrgAddresses = sequelize.define(
    'org_addresses',
    {
        org_address_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        address_uuid: { type: Sq.UUID, allowNull: false },
        organisation_uuid: { type: Sq.UUID, allowNull: false },
    },
    {
        indexes: [
            {
                unique: false,
                fields: ['address_uuid', "organisation_uuid",]
            }
        ],

        paranoid: false,
        timestamps: false,
        freezeTableName: true,
        schema: 'common',

    },
);


module.exports = OrgAddresses;
