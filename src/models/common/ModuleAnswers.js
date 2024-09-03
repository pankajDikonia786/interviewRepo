const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const ModuleAnswers = sequelize.define(
    'module_answers',
    {
        module_answer_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },

        module_question_uuid: { type: Sq.UUID },
        answer: { type: Sq.TEXT },
        is_correct_answer: { type: Sq.BOOLEAN, allowNull: false },
        sort_order: { type: Sq.INTEGER },
        ...modelCommonAttributes
    },
    {
        indexes: [
            {
                unique: false,
                fields: ['module_question_uuid']
            }
        ],
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);

module.exports = ModuleAnswers;
