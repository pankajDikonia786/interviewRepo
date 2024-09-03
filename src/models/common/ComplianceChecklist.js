const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const ComplianceChecklist = sequelize.define(
    'compliance_checklist',
    {
        checklist_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },

        client_org_uuid: { type: Sq.UUID, allowNull: false },//client 
        provider_type_uuid: { type: Sq.UUID, },
        checklist_name: { type: Sq.STRING, allowNull: false },
        recipient_type: { type: Sq.ENUM('provider', 'worker'), allowNull: false },
        checklist_renewal_date: { type: Sq.DATE },

        ...modelCommonAttributes
    },
    {
        paranoid: true,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);

module.exports = ComplianceChecklist;
