const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const WorkerDocApproval = sequelize.define(
    'worker_doc_approval',
    {
        worker_doc_appr_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        worker_uuid: { type: Sq.UUID, allowNull: false },
        provider_org_uuid: { type: Sq.UUID, allowNull: false },
        document_uuid: { type: Sq.UUID, allowNull: false },
        client_org_uuid: { type: Sq.UUID, allowNull: false },
        checklist_doc_uuid: { type: Sq.UUID, allowNull: false },
        site_induction_uuid: { type: Sq.UUID, },//?

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

        client_message: { type: Sq.TEXT },
        admin_message: { type: Sq.TEXT },
        reviewed_by: { type: Sq.UUID },
        reviewed_date: { type: Sq.DATE },

        ...modelCommonAttributes
    },
    {
        indexes: [
            {
                unique: true,
                fields: ['document_uuid', "client_org_uuid", "worker_uuid",'checklist_doc_uuid']
            }
        ],
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);

module.exports = WorkerDocApproval;
