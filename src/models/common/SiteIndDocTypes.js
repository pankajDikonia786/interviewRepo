const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const SiteIndDocTypes = sequelize.define(
    'site_ind_doctypes',
    {
        site_ind_doctype_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },

        site_induction_uuid: { type: Sq.UUID, allowNull: false },
        document_type_uuid: { type: Sq.UUID, allowNull: false },
        ...modelCommonAttributes
    },
    {
        indexes: [
            {
                unique: false,
                fields: ['site_induction_uuid', "document_type_uuid",]
            }
        ],
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);

module.exports = SiteIndDocTypes;
