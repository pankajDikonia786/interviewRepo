const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const CompanyInductions = sequelize.define(
    'company_inductions',
    {
        company_induction_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },

        function_assignment_uuid: { type: Sq.UUID, },//client function assignment_uuid
        // project_uuid: { type: Sq.UUID, },
        company_ind_name: { type: Sq.STRING },
        company_ind_desc: { type: Sq.TEXT },
        company_ind_valid_days: { type: Sq.STRING },
        company_ind_status: {
            type: Sq.ENUM("active", "draft", "archived"),
            defaultValue: "draft", allowNull: false
        },
        company_ind_publish_date: { type: Sq.DATE },
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

module.exports = CompanyInductions;
