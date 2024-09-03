const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const FunctionAssignments = sequelize.define(
    'function_assignments',
    {
        function_assignment_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },

        function_uuid: { type: Sq.UUID, allowNull: false },
        organisation_uuid: { type: Sq.UUID, allowNull: false },
        is_f_a_active: { type: Sq.BOOLEAN, defaultValue: true },
        assignment_name: Sq.STRING,
        f_a_parent_child_level: { type: Sq.STRING, allowNull: false, defaultValue: 0 },

        ...modelCommonAttributes
    },
    {
        indexes: [
            {
                unique: false,
                fields: ['organisation_uuid',]
            }
        ],
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes

    },
);

module.exports = FunctionAssignments;
