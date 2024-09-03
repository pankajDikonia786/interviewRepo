const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');

const InviteWorkerClientAssign = sequelize.define(
    'invite_worker_client_assign',
    {
        invite_worker_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        invite_uuid: { type: Sq.UUID, allowNull: false },
        client_org_uuid: { type: Sq.UUID, allowNull: false },
    },
    {
        indexes: [
            {
                unique: true,
                fields: ['invite_uuid', 'client_org_uuid']
            }
        ],
        paranoid: false,
        timestamps: false,
        freezeTableName: true,
        schema: 'common',

    },
);

module.exports = InviteWorkerClientAssign;
