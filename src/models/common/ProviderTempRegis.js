const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");
const ProviderTempRegis = sequelize.define(
    'provider_temp_regist',
    {
        provider_temp_regist_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },

        user_uuid: {
            type: Sq.UUID,
            // allowNull: false ///revisite
        },
        client_fa_uuid: { type: Sq.UUID, },
        invite_provider_uuid: { type: Sq.UUID },
        provider_regist_data: { type: Sq.JSONB, allowNull: false },
        temp_engagement_doc: Sq.TEXT,
        temp_msa_doc: Sq.TEXT,
        is_regis_completed: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },

        ...modelCommonAttributes
    },
    {
        indexes: [{
            unique: true,
            fields: ['invite_provider_uuid',]
        }],

        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes

    },
);

module.exports = ProviderTempRegis;
