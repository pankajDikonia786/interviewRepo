const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const SiteIndModule = sequelize.define(
    'site_ind_module',
    {
        site_ind_module_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },

        site_induction_uuid: { type: Sq.UUID, allowNull: false },
        module_uuid: { type: Sq.UUID, allowNull: false },
        // document_uuid: { type: Sq.UUID, allowNull: false },
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

module.exports = SiteIndModule;
