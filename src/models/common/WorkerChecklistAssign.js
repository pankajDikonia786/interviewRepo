const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const WorkerChecklistAssign = sequelize.define(
    'worker_checklist_assign',
    {
        worker_checklist_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        checklist_uuid: { type: Sq.UUID, allowNull: false },
        client_org_uuid: { type: Sq.UUID, allowNull: false },
        provider_org_uuid: { type: Sq.UUID, allowNull: false },
        worker_uuid: { type: Sq.UUID, allowNull: false },

        ...modelCommonAttributes
    },
    {
        indexes: [{
            unique: true,
            fields: ['checklist_uuid', 'worker_uuid']
        }],

        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);


module.exports = WorkerChecklistAssign;
