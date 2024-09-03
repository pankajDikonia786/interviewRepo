const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const InviteProvider = sequelize.define(
    'invite_provider',
    {
        invite_provider_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        client_fa_uuid: { type: Sq.UUID, allowNull: false, },//client client_fa_uuid (function_assignment_uuid)
        provider_fa_uuid: Sq.UUID,//provider provider_fa_uuid (function_assignment_uuid) if already exist
        provider_type_uuid: { type: Sq.UUID, allowNull: false, },
        individual_uuid: { type: Sq.UUID, allowNull: false, },
        provider_abn_nzbn: { type: Sq.STRING },
        email: { type: Sq.STRING, unique: true },
        // provider_email: { type: Sq.STRING },
        invite_message: Sq.TEXT,
        invite_status: { type: Sq.ENUM("Invited", "Active", "Rejected",), defaultValue: "Invited" },
        is_regis_attempt: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        invite_date: { type: Sq.DATE, allowNull: false },
        is_invited_by_admin: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        ...modelCommonAttributes
    },
    {
        indexes: [
            {
                unique: true,
                fields: ['client_fa_uuid', "individual_uuid"]
            }
        ],
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);


module.exports = InviteProvider;
