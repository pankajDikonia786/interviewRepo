const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const RoleAssignments = sequelize.define(
    'role_assignments',
    {
        role_assignment_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        user_uuid: { type: Sq.UUID, allowNull: false },
        role_uuid: { type: Sq.UUID, allowNull: false },
        admin_job_title: { type: Sq.STRING },
        ...modelCommonAttributes
    },
    {
        indexes: [
            {
                unique: false,
                fields: ['user_uuid', "role_uuid",]
            }
        ],
        paranoid: true,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);
RoleAssignments.beforeDestroy(async (roleAssignment, option) => {
    await RoleAssignments.update({
        deleted_by: option.login_user.user_uuid
    }, { paranoid: false, where: { role_assignment_uuid: roleAssignment.role_assignment_uuid } });

});
module.exports = RoleAssignments;
