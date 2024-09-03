const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const DocumentTypes = sequelize.define(
    'document_types',
    {
        document_type_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },

        doc_type_name: { type: Sq.STRING },
        recipient_type: { type: Sq.ENUM('provider', 'worker') },
        allow_expiry: { type: Sq.BOOLEAN, allowNull: false },
        req_issuer: { type: Sq.BOOLEAN, allowNull: false, defaultValue: false },
        req_policy_no: { type: Sq.BOOLEAN, allowNull: false, defaultValue: false },
        req_amount_insured: { type: Sq.BOOLEAN, allowNull: false, defaultValue: false },
        req_expiry_date_notes: { type: Sq.BOOLEAN, allowNull: false, defaultValue: false },
        custom_fields: {
            type: Sq.ARRAY(Sq.STRING),
            set(value) {
                if (value.length > 0 && Array.isArray(value)) {
                    value = value.map(field => field.toLowerCase().replace(/\s+/g, ' '));
                    // Replace multiple spaces with a single space
                };
                this.setDataValue('custom_fields', value);
            }
        },
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

module.exports = DocumentTypes;
