const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const MasterSettings = sequelize.define(
    'master_settings',
    {
        master_setting_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        master_setting_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            allowNull: false,
        },
        meta_key: { type: Sq.STRING, allowNull: false },
        meta_value_one: Sq.STRING,
        meta_value_two: Sq.STRING,
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

module.exports = MasterSettings;
