const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const Sites = sequelize.define(
    'sites',
    {
        site_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        function_assignment_uuid: { type: Sq.UUID, allowNull: false },//client
        state_id: Sq.INTEGER,
        country_id: Sq.INTEGER,
        site_name: Sq.STRING,
        site_client_details: Sq.STRING,//not applied yet
        site_address: Sq.TEXT,
        site_address_other: Sq.TEXT,
        site_suburb: Sq.TEXT,
        site_zipcode: Sq.STRING,
        evacuation_diagram: Sq.ARRAY(Sq.TEXT),
        induction_valid_days: Sq.STRING,
        is_site_active: { type: Sq.BOOLEAN, allowNull: false, defaultValue: true },

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

module.exports = Sites;
