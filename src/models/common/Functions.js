const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const Functions = sequelize.define(
    'functions',
    {
        function_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        function_name: Sq.STRING,
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

module.exports = Functions;
