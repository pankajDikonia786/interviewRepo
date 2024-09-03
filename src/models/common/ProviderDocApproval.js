const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const ProviderDocApproval = sequelize.define(
    'provider_doc_approval',
    {
        provider_doc_appr_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        provider_org_uuid: { type: Sq.UUID, allowNull: false, },
        document_uuid: { type: Sq.UUID, allowNull: false },//provider document
        client_org_uuid: { type: Sq.UUID, allowNull: false },
        checklist_doc_uuid: { type: Sq.UUID, allowNull: false },//client compliance doc
        approval_status: {
            type: Sq.ENUM(
                'approved',
                'client_approved_action',
                'client_approval_req',
                'admin_reject',
                'client_reject',
                'pending'
            ),
            allowNull: false, defaultValue: "pending"
        },

        message: { type: Sq.TEXT },
        reviewed_by: { type: Sq.UUID },
        reviewed_date: { type: Sq.DATE },

        ...modelCommonAttributes
    },
    {
        indexes: [
            {
                unique: true,
                fields: ['document_uuid', "checklist_doc_uuid"]
            }
        ],
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);

module.exports = ProviderDocApproval;
