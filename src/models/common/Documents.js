const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");
//The document can be any org. or individual worker
const Documents = sequelize.define(
    'documents',
    {
        document_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        document_type_uuid: { type: Sq.UUID },
        doc_name: { type: Sq.STRING, },
        is_other_doc: { type: Sq.BOOLEAN, allowNull: false, defaultValue: false },
        doc_file: { type: Sq.TEXT, allowNull: false },
        expiry_date: { type: Sq.DATE, },
        issuer: { type: Sq.STRING, },
        policy_no: { type: Sq.STRING, },
        amount_insured: { type: Sq.DECIMAL(10, 2), defaultValue: 0 },
        expiry_date_notes: { type: Sq.TEXT, },
        doctype_fields_data: { type: Sq.JSONB },
        ...modelCommonAttributes
    },
    {
        indexes: [
            {
                unique: false,
                fields: ['document_type_uuid']
            }
        ],
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);

module.exports = Documents;
