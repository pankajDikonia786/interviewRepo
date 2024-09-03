const ABN_Validator = require("au-bn-validator");
const NZBN_Validator = require("@fnzc/nz-ird-validator");
const { SUCCESS, } = require('../../src/constants/ResponseConstants');

const PaypalEndPointUrl = process.env.PaypalMode === "sandbox" ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

// Stripe secret key
const stripe = require("stripe")(process.env.stripe_secret_key);

//dynamic stripe package details pending and data pending
const ProviderStripeSubscription = async (stripeDetails) => {

    return new Promise(async (Resolve, Reject) => {
        const { user_billing_email, fullname, cardnumber, exp_month, exp_year, cvc, abn_nzbn, card_holdername } = stripeDetails;
        try {
            let customer_id;
            let token;
            let stripe_customers = {
                email: user_billing_email,
                name: fullname,
                address: { country: "AU" },
            };

            /*** Check ABN Validate Start ***/
            let abn_type;
            /*** Check Australian Business Number (ABN) validates ***/
            if (ABN_Validator.validateABN(abn_nzbn)) {
                abn_type = "au_abn";
            };
            /*** Check Zealand Business Numbers (NZBNs) validates ***/
            if (NZBN_Validator.isValidIRDNumber(abn_nzbn)) {
                abn_type = "nz_gst";
            };
            if (abn_type) {
                stripe_customers = {
                    ...stripe_customers,
                    tax_id_data: [
                        {
                            type: abn_type,
                            value: abn_nzbn,
                        },
                    ],
                };
            };
            // /*** Check ABN Validate End ***/

            //create customer
            const customer = await stripe.customers.create(stripe_customers)
            customer_id = customer.id;

            /*** Generate New Card Against customer ***/
            // let stripe_carddetail
            if (cardnumber && exp_month && exp_year && cvc) {
                let card_id;
                let card_detail = {
                    card: {
                        number: cardnumber,
                        exp_month: exp_month,
                        exp_year: exp_year,
                        cvc: cvc,
                        name: card_holdername,
                    },
                };
                //create token
                token = await stripe.tokens.create(card_detail);
                let stripe_token = token.id;

                //create customer source secret key
                const secret_key = await stripe.customers.createSource(
                    customer_id, { source: stripe_token });
                card_id = secret_key.id;
                await stripe.customers
                    .update(customer_id, {
                        invoice_settings: {
                            default_payment_method: card_id,
                        },
                    })
            };

            /*** Genrate Subscription against customer ***/
            const subscriptionRes = await stripe.subscriptions
                .create({
                    customer: customer_id,
                    automatic_tax: { enabled: true, },
                    items: [
                        {
                            price: "price_1MhYmWJ3rYOSuDIYcYING4GI",
                        },],
                });

            /* get invoice details */
            const invoiceRes = await stripe.invoices.retrieve(
                subscriptionRes.latest_invoice
            );
            console.log("res-------------------", subscriptionRes)
            subscriptionRes.customer = customer_id;
            subscriptionRes.card_brand = token.card.brand;
            subscriptionRes.cardlast4 = token.card.last4;
            subscriptionRes.invoice_number = invoiceRes.number;
            subscriptionRes.invoice_pdf = invoiceRes.invoice_pdf;

            return Resolve(subscriptionRes);

        } catch (error) {
            console.log(error)
            return Reject(error);

        };
    });
};
const ProviderPaypalSubscription = async (req, res, next) => {
    try {
        const { user_billing_email, fullname, cardnumber, exp_month, exp_year, cvc, abn_nzbn, card_holdername } = stripeDetails;
        const billingAgreementAttributes = {
            name: 'My Subscription',
            description: 'Monthly subscription for your service',
            start_date: '2023-10-01T00:00:00Z', // Set your desired start date
            plan: {
                id: planId,
            },
            payer: {
                payment_method: 'credit_card',
                payer_info: {
                    email: email,
                },
                funding_instruments: [
                    {
                        credit_card: {
                            number: cardnumber,
                            // type: cardInfo.type, // Card type (e.g., visa, mastercard)
                            expire_month: exp_month,
                            expire_year: exp_year,
                            cvv2: cvc,
                        },
                    },
                ],
            },
        };


        const billingAgreement = await new Promise((resolve, reject) => {
            paypal.billingAgreement.create(billingAgreementAttributes, (error, billingAgreement) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(billingAgreement);
                }
            });
        });

        console.log('"-----------------",Created billing agreement:', billingAgreement);

        // Redirect the customer to the approval URL
        const approvalUrl = billingAgreement.links.find(link => link.rel === 'approval_url').href;
        console.log('Customer approval URL:', approvalUrl);

        // You can redirect the customer to the approvalUrl to complete the payment.
        return approvalUrl;
    } catch (error) {
        console.error('Error creating billing agreement:', error);
    }

};


module.exports = {
    ProviderStripeSubscription,
    ProviderPaypalSubscription
};
