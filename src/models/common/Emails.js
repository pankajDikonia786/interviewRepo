const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const Emails = sequelize.define(
    'emails',
    {
        email_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        email_template_uuid: { type: Sq.UUID, },
        organisation_uuid: { type: Sq.UUID, },// (Provider or Client) section or portal
        individual_uuid: { type: Sq.UUID },//for worker section, worker portal and admin (direct forward from email log) 

        email_to: { type: Sq.ARRAY(Sq.TEXT) },
        email_cc: { type: Sq.ARRAY(Sq.TEXT) },
        email_bcc: { type: Sq.ARRAY(Sq.TEXT) },
        email_subject: { type: Sq.STRING },
        email_content: { type: Sq.TEXT },
        email_attach_docs: { type: Sq.ARRAY(Sq.TEXT) },
        email_reply_to: { type: Sq.STRING },

        ...modelCommonAttributes
    },
    {
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);


module.exports = Emails;
