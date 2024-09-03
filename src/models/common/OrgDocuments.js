const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const OrgDocuments = sequelize.define(
    'org_documents',
    {
        org_document_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        document_uuid: { type: Sq.UUID, allowNull: false },
        organisation_uuid: { type: Sq.UUID, allowNull: false },//provider organisation uuid

        ...modelCommonAttributes
    },
    {
        indexes: [{
            unique: true,
            fields: ['document_uuid', 'organisation_uuid']
        }],

        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);

module.exports = OrgDocuments;
