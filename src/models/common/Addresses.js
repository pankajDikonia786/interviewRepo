const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const Addresses = sequelize.define(
    'addresses',
    {
        address_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        country_id: Sq.INTEGER,
        country_name: Sq.STRING,
        state_id: Sq.INTEGER,
        state_name: Sq.STRING,
        address_one: Sq.STRING,
        address_two: Sq.STRING,
        suburb: Sq.STRING,
        zipcode: Sq.STRING(20),
        address_type: { type: Sq.ENUM('business', 'mailing') },
        ...modelCommonAttributes
    },
    {
        
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes,

    },
);

module.exports = Addresses;
