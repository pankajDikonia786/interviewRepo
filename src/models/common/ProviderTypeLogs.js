const Sq = require("sequelize");
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const ProviderTypeLogs = sequelize.define("provider_type_logs", {
    provider_type_log_uuid: {
        allowNull: false,
        type: Sq.UUID,
        primaryKey: true,
        defaultValue: Sq.literal('uuid_generate_v4()'),
    },
    provider_type_uuid: { type: Sq.UUID, allowNull: false },
    action_type: { type: Sq.STRING, allowNull: false },
    desc_html: { type: Sq.ARRAY(Sq.TEXT) },
    new_value: { type: Sq.JSONB },
    old_value: { type: Sq.JSONB },
    ...modelCommonAttributes,

},
    {
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);

module.exports = ProviderTypeLogs;