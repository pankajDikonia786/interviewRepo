const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");
const IndividualOrg = sequelize.define(
    'individual_org',
    {
        individual_org_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        individual_uuid: { type: Sq.UUID, allowNull: false },
        organisation_uuid: { type: Sq.UUID, allowNull: false },
        // function_assignment_uuid: { type: Sq.UUID, allowNull: false },
        job_title: Sq.STRING,
        //if type name of provider contact or client contact and is user:true then this relate to user and
        //if user:false then it is related to only contact of client or provider
        // contact_type:{type:Sq.type:},
        contact_type_uuid: { type: Sq.UUID, },
        is_client_site_contact: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        is_user: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        ...modelCommonAttributes
    },
    {
        indexes: [
            {
                unique: true,
                fields: ['individual_uuid', "organisation_uuid", "contact_type_uuid", "is_user"]
            }
        ],

        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes

    },
);

module.exports = IndividualOrg;
