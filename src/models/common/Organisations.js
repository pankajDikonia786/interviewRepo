const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const Organisations = sequelize.define(
    'organisations',
    {
        organisation_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        function_uuid: { type: Sq.UUID, allowNull: false },
        function_assignment_uuid: { type: Sq.UUID, },
        org_name: Sq.STRING,
        org_type: { type: Sq.ENUM('pty_ltd', 'sole_traders', 'other') },

        trading_name: Sq.STRING,
        abn_nzbn: Sq.STRING,
        acn: Sq.STRING,
        website_url: Sq.STRING,
        org_phone: Sq.STRING(20),
        org_fax: Sq.STRING,
        logo: Sq.TEXT,
        is_org_active: { type: Sq.BOOLEAN, defaultValue: true, allowNull: false },

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

module.exports = Organisations;
