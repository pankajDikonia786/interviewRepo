const { AccountSubscriptions } = require("../../models/common");
const AccountInvoices = require("../../models/common/AccountInvoices");
const stripe = require("stripe")(process.env.stripe_secret_key);

// This is your Stripe CLI webhook secret for testing your endpoint locally.
// const endpointSecret = "whsec_8a0f1441a02c418de34865c2684786ccebcefec65abd3c21ebb98b00391f804b";

const StripeWebhook = async (req, res) => {
    try {
        let event = req.body;

        switch (event.type) {
            // update planExpireDate of user when stripe renewed someone's subscription

            case "customer.subscription.updated":
                // send update to user that their plan has been updated
                let subscriptionUpdate = event.data.object;
                console.log("subscription plan has been updated for the user: ", subscriptionUpdate.id);
                res.status(200).send({ success: true });
                break;

            case "customer.subscription.deleted":
                // send update to user that their plan has been cancel
                let subscriptiondeleted = event.data.object;
                console.log("subscription plan has been updated for the user: ", subscriptiondeleted.id);

                const accountSubscriptionRes = await AccountSubscriptions.update({ is_active: false, },
                    { where: { customer: subscriptiondeleted.customer } })
                if (accountSubscriptionRes)
                    res.status(200).send({ success: true });

                break;

            case "invoice.created":
                // send update to user about payment success for subscription
                let invoicecreated = event.data.object;
                // console.log("invoice paid for the customer:", invoicecreated);
                res.status(200).send({ success: true });
                break;

            case "invoice.paid":
                // send update to user about payment success for subscription
                const invoice = event.data.object;
                console.log("stripe web hook-------------",invoice.lines.data.price.recurring)

                const account_subscription = await AccountSubscriptions.findOne({
                    where: { customer: invoice.customer },
                });
                // console.log("webhook customer---------", invoice.lines.data[0].period.start)
                console.log("webhook response-----------", invoice)
                const date_ob = new Date(invoice.lines.data[0].period.start * 1000);
                const date = ("0" + date_ob.getDate()).slice(-2);
                const month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
                const year = date_ob.getFullYear();
                const start_date = year + "-" + month + "-" + date;

                const date_ob1 = new Date(invoice.lines.data[0].period.end * 1000);
                const date1 = ("0" + date_ob1.getDate()).slice(-2);
                const month1 = ("0" + (date_ob1.getMonth() + 1)).slice(-2);
                const year1 = date_ob1.getFullYear();
                const end_date = year1 + "-" + month1 + "-" + date1;

                const date_ob2 = new Date(invoice.created * 1000);
                const date2 = ("0" + date_ob2.getDate()).slice(-2);
                const month2 = ("0" + (date_ob2.getMonth() + 1)).slice(-2);
                const year2 = date_ob2.getFullYear();
                const paid_on = year2 + "-" + month2 + "-" + date2;

                const account_invoice_details = {
                    account_subscription_uuid: account_subscription.account_subscription_uuid,
                    start_date: start_date,
                    end_date: end_date,
                    amount: invoice.total / 100,
                    paid_on: paid_on,
                    payment_reference: invoice.customer,
                    stripe_invoice_id: invoice.id,
                    stripe_invoice_number: invoice.number,
                    stripe_invoice_pdf: invoice.invoice_pdf,
                };

                await AccountInvoices.create(account_invoice_details, {
                    where: {
                        account_subscription_uuid: account_subscription.account_subscription_uuid
                    }
                });
                if (account_invoice_details) {
                    res.status(200).send({ success: true, });
                }
                else {
                    console.log("webhook error------", error)
                    res.status(400).send({ success: false });
                };
                break;
            default:
                res.status(200).send({ success: true });
        }
    } catch (error) {
        res.send({ success: false, message: "stripe webhook error" });
    }
};
module.exports = {
    StripeWebhook
};