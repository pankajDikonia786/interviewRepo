const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const NotesAttachments = sequelize.define(
    'note_attachments',
    {
        note_attachment_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        note_uuid: { type: Sq.UUID, allowNull: false },
        note_attachment: Sq.TEXT,

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

module.exports = NotesAttachments;
