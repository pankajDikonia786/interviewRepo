const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const AccountInvoices = sequelize.define(
    'account_invoices',
    {
        account_invoice_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        account_subscription_uuid: { type: Sq.UUID, allowNull: false },
        start_date: Sq.DATE,
        end_date: Sq.DATE,
        amount: Sq.DECIMAL(10, 2),
        paid_on: Sq.DATE,
        payment_reference: Sq.STRING,
        stripe_carddetail: Sq.STRING,
        stripe_invoice_id: Sq.STRING,
        stripe_invoice_number: Sq.STRING,
        stripe_invoice_pdf: Sq.STRING,

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

module.exports = AccountInvoices;
