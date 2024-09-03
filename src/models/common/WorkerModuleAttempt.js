const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const WorkerModuleAttempt = sequelize.define(
    'worker_module_attempt',
    {
        worker_module_attempt_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        site_uuid: { type: Sq.UUID, allowNull: false },
        module_uuid: { type: Sq.UUID, allowNull: false },
        worker_uuid: { type: Sq.UUID, allowNull: false },
        individual_uuid: { type: Sq.UUID, allowNull: false },
        is_module_pass: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        module_atttemp_date: { type: Sq.DATE },

        ...modelCommonAttributes
    },
    {
        indexes: [{
            unique: true,
            fields: ['module_uuid', 'worker_uuid', "individual_uuid"]
        }],

        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);

module.exports = WorkerModuleAttempt;
