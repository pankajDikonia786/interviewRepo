const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const SiteInductions = sequelize.define(
    'site_inductions',
    {
        site_induction_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },

        // site_project_uuid: Sq.UUID,
        site_uuid: Sq.UUID,//
        // contractor_site_uuid: Sq.UUID,
        site_ind_name: Sq.STRING,
        site_ind_desc: Sq.TEXT,
        site_ind_status: { type: Sq.ENUM("active", "draft", "archived"), defaultValue: "draft" },
        // project_no: Sq.STRING,
        is_site_ind_active: { type: Sq.BOOLEAN, defaultValue: true, allowNull: false },

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

module.exports = SiteInductions;
