const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const WorkerQuesAttempt = sequelize.define(
    'worker_ques_attempt',
    {
        worker_ques_attempt_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        module_uuid: { type: Sq.UUID, allowNull: false },
        site_uuid: { type: Sq.UUID, allowNull: false },
        worker_uuid: { type: Sq.UUID, allowNull: false },
        module_question_uuid: { type: Sq.UUID, allowNull: false },
        is_ques_completed: { type: Sq.BOOLEAN, allowNull: false, defaultValue: false },

        ...modelCommonAttributes
    },
    {
        indexes: [{
            unique: true,
            fields: ['module_uuid', 'worker_uuid', 'module_question_uuid']
        }],

        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);

module.exports = WorkerQuesAttempt;
