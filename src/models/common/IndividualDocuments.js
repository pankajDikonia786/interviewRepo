const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const IndividualDocuments = sequelize.define(
    'individual_documents',
    {
        individual_document_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        document_uuid: { type: Sq.UUID, allowNull: false },
        individual_uuid: { type: Sq.UUID, allowNull: false },//individual(worker)

        ...modelCommonAttributes
    },
    {
        indexes: [{
            unique: true,
            fields: ['document_uuid', 'individual_uuid']
        }],
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);

module.exports = IndividualDocuments;
