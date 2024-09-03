const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const AccountSubscriptions = sequelize.define(
    'account_subscriptions',
    {
        account_subscription_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        client_fa_uuid: { type: Sq.UUID, allowNull: false },
        provider_fa_uuid: { type: Sq.UUID,allowNull: false  },
        subscription: { type: Sq.STRING, },
        price_id: { type: Sq.STRING, },
        customer: { type: Sq.STRING, },
        subscription_date: Sq.DATE,
        next_renewal_date: Sq.DATE,
        is_active: { type: Sq.BOOLEAN, defaultValue: true },
        mandatory_2fa: Sq.STRING,

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

module.exports = AccountSubscriptions;
