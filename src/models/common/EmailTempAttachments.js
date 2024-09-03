const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const EmailTempAttachments = sequelize.define(
    'email_temp_attachments',
    {
        email_temp_attachment_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        email_template_uuid: { type: Sq.UUID, allowNull: false },
        email_temp_doc: Sq.TEXT,
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
EmailTempAttachments.beforeDestroy(async (emailTempAttachments, option) => {
    await EmailTempAttachments.update({
        deleted_by: option.login_user.user_uuid
    }, { paranoid: false, where: { email_template_uuid: emailTempAttachments.email_template_uuid } })

});
module.exports = EmailTempAttachments;
