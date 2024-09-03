const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const InviteProviderCompliance = sequelize.define(
    'invite_provider_compliance',
    {
        invite_provider_comp_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },

        invite_provider_uuid: { type: Sq.UUID, allowNull: false, },
        checklist_uuid: { type: Sq.UUID, allowNull: false, },//client asigned compliance checklist
        //working----------------
        check_comp_assigned_to: {
            type: Sq.INTEGER,
            allowNull: false,
            validate: {
                isIn: [[0, 1]], //0 for Workers and 1 for Provider
            }
        },

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

module.exports = InviteProviderCompliance;
