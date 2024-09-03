const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const Notes = sequelize.define(
    'notes',
    {
        note_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        function_assignment_uuid: { type: Sq.UUID, },//for client Org. or provider Org.
        individual_uuid: { type: Sq.UUID },//for worker
        note_heading: Sq.STRING,
        note: Sq.TEXT,

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

module.exports = Notes;
