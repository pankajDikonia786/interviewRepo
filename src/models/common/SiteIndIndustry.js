const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const SiteIndIndustry = sequelize.define(
    'site_ind_industry',
    {
        site_ind_industry_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },

        site_induction_uuid: { type: Sq.UUID, allowNUll: false },
        master_setting_uuid: { type: Sq.UUID, allowNUll: false },
        ...modelCommonAttributes
    },
    {
        indexes: [
            {
                unique: false,
                fields: ['site_induction_uuid', "master_setting_uuid",]
            }
        ],
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);

module.exports = SiteIndIndustry;
