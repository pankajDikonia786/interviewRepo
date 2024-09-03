const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const ModuleQuestions = sequelize.define(
    'module_questions',
    {
        module_question_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },

        module_uuid: { type: Sq.UUID },
        question_type_uuid: { type: Sq.UUID },
        question: { type: Sq.TEXT },
        sort_order: { type: Sq.INTEGER },

        ...modelCommonAttributes
    },
    {
        indexes: [
            {
                unique: false,
                fields: ['module_uuid']
            }
        ],
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);

// ModuleQuestions.beforeDestroy(async (moduleQuestions, option) => {
//     ModuleQuestions.update({
//         deleted_by: option.login_user.user_uuid
//     }, { paranoid: false, where: { module_question_uuid: moduleQuestions.module_question_uuid } })

// });
module.exports = ModuleQuestions;
