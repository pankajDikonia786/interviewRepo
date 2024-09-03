const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const InviteProvWorkerComp = sequelize.define(
    'invite_provider_compliance',
    {
        invite_prov_worker_comp_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },

        invite_provider_uuid: { type: Sq.UUID, allowNull: false, },
        checklist_uuid: { type: Sq.UUID, allowNull: false, },//client asigned compliance checklist

    },
    {
        indexes: [
            {
                unique: true,
                fields: ['invite_provider_uuid', "checklist_uuid"]
            }
        ],
        paranoid: false,
        timestamps: false,
        freezeTableName: true,
        schema: 'common',

    },
);


module.exports = InviteProvWorkerComp;
