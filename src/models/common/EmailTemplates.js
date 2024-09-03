const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const EmailTemplates = sequelize.define(
    'email_templates',
    {
        email_template_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },

        template_name: { type: Sq.STRING },
        template_subject: { type: Sq.STRING },
        template_content: { type: Sq.TEXT },
        template_type: {
            type: Sq.ENUM("admin_client",
                "admin_provider",
                "admin_worker",
                "client",
                "provider"), allowNull: false
        },

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
EmailTemplates.beforeDestroy(async (emailTemplates, option) => {
    await EmailTemplates.update({
        deleted_by: option.login_user.user_uuid
    }, { paranoid: false, where: { email_template_uuid: emailTemplates.email_template_uuid } })

});

module.exports = EmailTemplates;
