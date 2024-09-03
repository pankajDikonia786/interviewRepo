const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const ChecklistDocs = sequelize.define(
    'checklist_docs',
    {
        checklist_doc_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },

        checklist_uuid: { type: Sq.UUID, allowNull: false },
        document_type_uuid: { type: Sq.UUID, allowNull: false },

        is_other_doc: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        other_doc_name: { type: Sq.STRING, },
        is_doc_mandatory: { type: Sq.BOOLEAN, defaultValue: true, allowNull: false },
        other_doc_url: { type: Sq.TEXT },
        other_doc_instruction: { type: Sq.TEXT },

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
ChecklistDocs.addHook("beforeDestroy", async (checklistDocs, options) => {
    try {
        const { checklist_doc_uuid } = checklistDocs;
        const updateDetails = { deleted_by: options.login_user.user_uuid };
        await ChecklistDocs.update(updateDetails, { paranoid: false, where: { checklist_doc_uuid } });
    } catch (error) {
        throw error;
    };
});

module.exports = ChecklistDocs;
