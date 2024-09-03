
// Stripe secret key
const stripe = require("stripe")(process.env.stripe_secret_key);
const fetch = require("node-fetch")
// const { businessTypes, sequelize, Client } = require("../../config/OldDbConfig")
const { Users } = require("./../../models/common/");
const { PaypalMode, PaypalClientID, PaypalSecretKey } = process.env;
const PaypalEndPointUrl = PaypalMode === "sandbox" ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
// paypal.configure({
//     'mode': process.env.PaypalMode, //sandbox or live 
//     'client_id': process.env.PaypalClientID, // please provide your client id here 
//     'client_secret': process.env.PaypalSecretKey // provide your client secret here 
// });

const generateAccessToken = async () => {
    try {
        if (!PaypalClientID || !PaypalSecretKey) {
            throw new Error("MISSING_API_CREDENTIALS");
        }
        const auth = Buffer.from(PaypalClientID + ":" + PaypalSecretKey,
        ).toString("base64");

        const response = await fetch(`${PaypalEndPointUrl}/v1/oauth2/token`, {
            method: "POST",
            body: "grant_type=client_credentials",
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });

        const data = await response.json();
        // console.log("----------", data)
        return data.access_token;
    } catch (error) {
        console.error("Failed to generate Access Token:", error);
    }
};



const TestContractorPaypalSubscription = async (req, res, next) => {
    try {
        const accessToken = await generateAccessToken();

        const planId = 'P-7CK732147U512964RMUSAPMI';

        const config = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                plan_id: planId,
                subscriber: {
                    email_address: 'customer@example.com',
                },
            }),
        };
        // /var/www/html/project/project_new_bss/bssinfo/

        fetch('https://api.sandbox.paypal.com/v1/billing/subscriptions', config)
            .then((response) => response.json())
            .then((data) => {
                console.log('Created subscription:', data);
            })
            .catch((error) => {
                console.error('Error creating subscription:', error);
            });


        const { user_billing_email, fullname, cardnumber, exp_month, exp_year, cvc, abn_nzbn, card_holdername } = req.body;

    } catch (error) {
        console.error('Error creating billing agreement:', error.response.details);
    }

};
// console.log("paypal--------------",await generateAccessToken())
const TestStripe = async (req, res, next) => {
    try {
        var total = parseFloat(req.body.amount) * parseFloat(100);

        stripe.customers
            .create({
                name: req.body.name,
                email: req.body.email,
            })
            .then((customer) => {
                let cardDetails = {
                    card: {
                        number: req.body.cardnumber,
                        exp_month: req.body.month,
                        exp_year: req.body.year,
                        cvc: req.body.cvv,
                    },
                };

                stripe.tokens
                    .create(cardDetails)
                    .then((token) => {
                        // stripe.customers
                        //     .createSource(customer.id, { source: token.id })
                        // .then((source) =>
                        //  {
                        stripe.paymentIntents.create({
                            amount: total,
                            currency: "usd",
                            // source: source.id,
                            description: "Trying to validate a card",

                            customer: customer.id,
                        })
                            .then((charge) => {

                                res.send({ success: true, charge });
                            })
                            .catch((err) => console.log("error in charge: ", err));
                    })
                    .catch((error) => {
                        console.log("err: ", error);
                    });
            })
            .catch((error) => {
                console.log("error: ", error);
                res.send({ error });
            });
        // })
        // .catch((error) => {
        //     console.log("error: ", error);
        //     res.send({ error });
        // });
    } catch (err) {
        res.send(err);
    }
};

const TestCreateSubscription = async (req, res, next) => {

    const request_body = req.body;
    const { email, first_name, last_name } = request_body;

    // let package_detail = await SubscriptionPackage.findOne({
    //     where: {
    //         subscription_package_id: request_body.subscription_package_id,
    //     },
    // });

    /*** Check Customer exist in Stripe or not ***/
    let customer_id;
    customer_id = "cus_NUy7gyvL1ppzdS"
    let stripe_customers = {
        email: email,
        name: first_name + " " + last_name,
        address: { country: "AU" },
    };

    /*** Check ABN Validate Start ***/
    let abn_type;
    /*** Check Australian Business Number (ABN) validates ***/
    // if (ABN_Validator.validateABN(abn_nzbn)) {
    //     abn_type = "au_abn";
    // }
    // /*** Check Zealand Business Numbers (NZBNs) validates ***/
    // if (NZBN_Validator.isValidIRDNumber(abn_nzbn)) {
    //     abn_type = "nz_gst";
    // }

    // if (abn_type) {
    //     stripe_customers = {
    //         ...stripe_customers,
    //         tax_id_data: [
    //             {
    //                 // type: //abn_type,
    //                 type: "au_abn",
    //                 value: login_company.abn,
    //             },
    //         ],
    //     };
    // }
    // /*** Check ABN Validate End ***/

    await stripe.customers
        .create(stripe_customers)
        .then(async function (customer) {
            customer_id = customer.id;
        })
        .catch((error) => {
            console.log("CreateSubscription stripe.customers.create error---------", error);
            res.json({
                error: error,
                status: 400,
                success: false,
                message: "Something went wrong. Please try again or reach out to support if the issue persists. or reach out to support if the issue persists.",
            });
        });


    /*** Generate New Card Against customer ***/
    let stripe_carddetail
    if (request_body.cardnumber && request_body.exp_month && request_body.exp_year && request_body.cvc) {
        let card_id;
        let card_detail = {
            card: {
                number: request_body.cardnumber,
                exp_month: request_body.exp_month,
                exp_year: request_body.exp_year,
                cvc: request_body.cvc,
                name: request_body.card_holdername,
            },
        };
        await stripe.tokens
            .create(card_detail)
            .then(async (token) => {
                let stripe_token = token.id;
                stripe_carddetail = token.card.last4
                await stripe.customers
                    .createSource(customer_id, { source: stripe_token })
                    .then(async function (secret_key) {
                        card_id = secret_key.id;
                    })
                    .catch((error) => {
                        res.json({
                            error: error,
                            status: 400,
                            success: false,
                            message: "Those details seem to be incorrect. Please try again.",
                        });
                    });
            })
            .catch((error) => {
                console.log("CreateSubscription stripe.tokens.create error---------", error);
                res.json({
                    error: error,
                    status: 400,
                    success: false,
                    message: "Those details seem to be incorrect. Please try again.",
                });
            });

        await stripe.customers
            .update(customer_id, {
                invoice_settings: {
                    default_payment_method: card_id,
                },
            })
            .then(async function (customer) {
                console.log("CreateSubscription customer---------", customer);
            })
            .catch((error) => {
                console.log("CreateSubscription stripe.customers.update error---------", error);
                res.json({
                    error: error,
                    status: 400,
                    success: false,
                    message: "Something went wrong. Please try again or reach out to support if the issue persists. or reach out to support if the issue persists.",
                });
            });
    }

    /*** Genrate Subscription agains customer ***/
    stripe.subscriptions
        .create({
            customer: customer_id,
            automatic_tax: {
                enabled: true,
            },
            items: [
                {
                    // price: package_detail.stript_object_id,
                    price: "price_1MhYmWJ3rYOSuDIYcYING4GI",
                },

            ],

        })
        .then(async (subscriptions_response) => {
            console.log("subscript----------------", subscriptions_response)

            //     let subscription_details = {
            //         subscription_date: new Date(),
            //         package_id: package_detail.subscription_package_id,
            //         billing_cycle: package_detail.billing_cycle,
            //         price: subscription_discount?.stripe_discount_id ? package_with_discount_price : parseInt(package_detail.price) + addon_amount,
            //         user_limits: user_limits,
            //         is_active: true,
            //         subscription: subscriptions_response.id,
            //         customer: customer_id,
            //         package_feature_id: package_feature,
            //         package_feature_value: request_body.extrasubsciption_users,

            //     };
            //     await Subscription.create(subscription_details, {
            //         stripe_carddetail: stripe_carddetail,
            //         start_date: start_date
            //     })
            //         .then(async function (subscription) {
            //             /*** Update Company user invitation Details start ***/
            //             return res.json({
            //                 status: 200,
            //                 success: true,
            //                 data: subscription,
            //                 message: "subscription generate successfully",
            //             });
            //         })

        })
        .catch((error) => {
            console.log("CreateSubscription stripe.subscriptions.create error-------------", error);
            res.json({
                error: error,
                status: 400,
                success: false,
                message: "stripe.subscriptions Something went wrong. Please try again or reach out to support if the issue persists. or reach out to support if the issue persists.",
            });
        });
}

const testOldDatabaseConserve = async (req, res, next) => {

    try {
        const oldProjectsRes = await sequelize.query('SELECT * FROM Employee where EmployeeID<10000 ', {
            // model: Client,
            // mapToModel: true // pass true here if you have any mapped fields
        });
        console.log("dasta-------------------", oldProjectsRes)

        // const newUsersRes = await Client.findAll({where: {BusinessTypeId: 1}});
        // console.log(newUsersRes)
        // const data = await businessTypes.findAll()
        // res.send(newUsersRes)

    } catch (error) {
        console.log("--------------------", error)

    };

};
//seprated checking client user 
//Cron Compliance Doc review date 
// cron.schedule('*/9 * * * * *', async () => {
//     try {
//         const { month, day } = DateTime.now().c;
//         // Today's compliance checklist review date
//         const { function_uuid } = await Functions.findOne({ where: { function_name: "client" } });
//         const resDetails = await FunctionAssignments.findAll({
//             where: { is_f_a_active: true, function_uuid },
//             include: [{
//                 model: ClientDetails, as: "fa_client_details",
//                 required: true,
//                 where: {
//                     [Sq.Op.and]: [
//                         Sq.fn('EXTRACT(MONTH from "review_comp_checklist") =', month),
//                         Sq.fn('EXTRACT(day from "review_comp_checklist") =', day),
//                     ],
//                 },
//             },
//              {
//                 model: Organisations, as: "org_data", attributes: ["trading_name"]
//             }
//             ],
//         });
//         console.log("", resDetails)
//         if (resDetails.length > 0) {
//             for (let resDetail of resDetails) {
//                 let { function_assignment_uuid } = resDetail;
//                 const userRes = await FAUserPermissions.findAll({
//                     where: {
//                         write_comp_checklist: true,
//                         function_assignment_uuid,
//                         user_uuid: { [Sq.Op.ne]: null },
//                     },
//                     attributes: [
//                         [Sq.col(`fa_user_perm.user_uuid`), `user_uuid`],
//                         [Sq.col(`fa_user_perm.individual_uuid`), `individual_uuid`],
//                         [Sq.col(`fa_user_perm.individual.first_name`), `first_name`],
//                         [Sq.col(`fa_user_perm.individual.last_name`), `last_name`],
//                         [Sq.col(`fa_user_perm.individual.email`), `email`],
//                     ],
//                     include: {
//                         model: Users,
//                         as: "fa_user_perm",
//                         attributes: [],
//                         include: {
//                             model: Individuals,
//                             attributes: [],
//                         },
//                     },
//                     raw: true,
//                     nest: true,
//                 });

//                 const batchSize = 20; // Define batch
//                 const totalUsers = userRes.length;

//                 for (let start = 0; start < totalUsers; start += batchSize) {
//                     const batch = userRes.slice(start, start + batchSize);

//                     // Process each batch of users
//                     for (let user_val of batch) {
//                         const emailLinkData = {
//                             user_uuid: user_val.user_uuid,
//                             organisation_uuid: resDetail.organisation_uuid,
//                             function_assignment_uuid: resDetail.function_assignment_uuid,
//                         };
//                         user_val.trading_name = resDetail.org_data.trading_name;
//                         const url = await ReviewComplianceChecklistEmailLink(emailLinkData);

//                         // Send email to the user
//                         await sendCronComplianceChecklistReviewEmail(user_val, url);
//                         console.log("Sent email to:---------------", user_val);
//                     };

//                     // Delay between batches to avoid overloading the email service
//                     await new Promise((resolve) => setTimeout(resolve, 1000));
//                 };
//             };
//         };
//     } catch (error) {
//         console.log(error);
//         next(error);
//     };
// });
// PaypalMode, PaypalClientID, PaypalSecretKey


// const { PDFDocument } = require('pdf-lib');
// const axios = require('axios');
// const fs = require("fs")


const apppdf = async () => {
    try {
        // Replace with the URL of the PDF hosted on Amazon S3
        const pdfUrl = 'https://conservedev.s3.ap-south-1.amazonaws.com/1697549294628-310968223-fp_dc_setup_guide.pdf';

        // Download the PDF from the URL
        const { data } = await axios.get(pdfUrl, { responseType: 'arraybuffer' });

        // Load the PDF document
        const pdfDoc = await PDFDocument.load(data);

        // Specify the page range to extract (e.g., pages 3 to 6)
        const startPage = 3;
        const endPage = 6;

        const extractedDoc = await PDFDocument.create();

        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
            const [copiedPage] = await extractedDoc.copyPages(pdfDoc, [pageNum - 1]);
            extractedDoc.addPage(copiedPage);
        };

        // Serialize the extracted PDF
        const pdfBytes = await extractedDoc.save();

        // Save the extracted PDF to a file
        fs.writeFile('extracted-pages.pdf', pdfBytes, (err) => {
            if (err) {
                console.error(err);
            } else {
                console.log('PDF file saved successfully');
            }
        });

        // res.contentType('application/pdf');
        // res.send(pdfBytes);
    } catch (error) {
        console.error(error);
    }
};

//for update this
const GetAllWorkersOfProvider = async (req, res, next) => {
    try {
        const { page, limit, sort, order, search, provider_org_uuid, statusType } = req.query;
        // let worker_where_query = {};
        let where_query = {};
        let query_obj = {};
        let requiredStatus = false;

        if (search) {
            where_query = {

                [Sq.Op.or]: [Sq.where(Sq.fn("concat", Sq.col("first_name"), " ", Sq.col("last_name")), { [Sq.Op.iLike]: `%${search}%` })]

            };
        };
        if (statusType === 'assigned') {

            requiredStatus = true;
        };
        // if (statusType === "Compliant") {
        //     worker_where_query = {
        //         ...worker_where_query,
        //         [Sq.Op.and]: [
        //             {
        //                 '$client_assigns.workerChklist.WCDocs.WDA.approval_status$': {
        //                     [Sq.Op.and]: [
        //                         { [Sq.Op.ne]: null },
        //                         { [Sq.Op.in]: ['approved', 'client_approved_action'] }
        //                     ]
        //                 }
        //             },
        //             {
        //                 '$client_assigns.clientCompInd.wrkrCI.is_comp_ind_completed$': {
        //                     [Sq.Op.or]: [
        //                         { [Sq.Op.ne]: null },
        //                         { [Sq.Op.eq]: true }
        //                     ]
        //                 }
        //             }
        //         ]
        //     };

        //     requiredStatus = true;
        // } else if (statusType === "NonCompliant") {
        //     worker_where_query = {
        //         ...worker_where_query,
        //         [Sq.Op.or]: [
        //             {
        //                 '$client_assigns.workerChklist.WCDocs.WDA.approval_status$': {
        //                     [Sq.Op.or]: [
        //                         { [Sq.Op.eq]: null },
        //                         { [Sq.Op.notIn]: ['approved', 'client_approved_action'] }
        //                     ]
        //                 }
        //             },
        //             {
        //                 '$client_assigns.clientCompInd.wrkrCI.is_comp_ind_completed$': {
        //                     [Sq.Op.or]: [
        //                         { [Sq.Op.eq]: null },
        //                         { [Sq.Op.eq]: false }
        //                     ]
        //                 }
        //             }
        //         ]
        //     };
        //     requiredStatus = true;
        // };

        if (sort && order) {
            sort == "first_name" ?
                query_obj.order = [[{ model: Individuals, as: "worker_individual" }, sort, order]] :
                query_obj.order = [[sort, order]];
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };
        const workersRes = await Workers.findAndCountAll({
            where: {
                provider_org_uuid,
                // ...worker_where_query
            }, attributes: ["worker_uuid", "worker_job_title"],
            include: [
                {
                    model: Individuals, as: "worker_individual", where: where_query, attributes:
                        ["individual_uuid", "first_name", "last_name", "phone", "email"],
                    required: true,
                },
                {

                    model: WorkerAssign, as: "clientAssigns",
                    required: requiredStatus,
                    include: {
                        model: Organisations, as: "clientAssign",

                    },

                    // attributes: ["organisation_uuid", "trading_name", "function_assignment_uuid"],
                    // through: { attributes: [] },


                    // model: Organisations, as: "client_assigns",
                    // required: requiredStatus,

                    // attributes: ["organisation_uuid", "trading_name", "function_assignment_uuid"],
                    // through: { attributes: [] },

                    // include: [
                    //     {
                    //         model: WorkerChecklistAssign, as: 'WCA',
                    //         // required:false,
                    //         where: {
                    //             provider_org_uuid,
                    //             worker_uuid:
                    //             {
                    //                 [Sq.Op.eq]:
                    //                     Sq.col('clientAssigns.worker_uuid')

                    //             }

                    //         },
                    //         attributes: ['worker_checklist_uuid'],
                    //         include: {
                    //             model: ChecklistDocs, as: 'WCDocs',
                    //             required: true,

                    //             attributes: ['checklist_doc_uuid', 'is_other_doc', 'other_doc_name', 'document_type_uuid"',
                    //                 'is_doc_mandatory',
                    //             ],
                    //             /////////////////////////////
                    //             include: {//single
                    //                 model: WorkerDocApproval, as: "WDA",

                    //                 where: {
                    //                     provider_org_uuid,
                    //                     worker_uuid:
                    //                     {
                    //                         [Sq.Op.eq]:
                    //                             Sq.col('clientAssigns.worker_uuid')

                    //                     }
                    //                 },
                    //                 attributes: ['worker_doc_appr_uuid', 'worker_uuid', 'approval_status',],
                    //                 required: false,

                    //             },

                    //         },
                    //     },
                        // {//company inductions
                        //     model: CompanyInductions, as: 'clientCompInd',
                        //     attributes: ['company_induction_uuid',],
                        //     include: {
                        //         model: WorkerCompanyInd, as: 'wrkrCI',
                        //         where: {
                        //             worker_uuid:
                        //             {
                        //                 [Sq.Op.eq]:
                        //                     Sq.col('clientAssigns.worker_uuid')

                        //             }
                        //         },
                        //         attributes: ['is_comp_ind_completed', 'worker_company_ind_uuid'],
                        //         required: false,
                        //     }
                        // }
                    // ],
                },],
            ...query_obj,
            distinct: true,
            subQuery: false,

        });
        //
        // const processedResult = workersRes.rows.map(worker => {
        //     const updatedClientAssigns = worker.client_assigns.map(clientAssign => {
        //         const allApprovalsApproved = clientAssign.workerChklist.every(workerChklist => {
        //             return workerChklist.WCDocs.every(WCDoc => {
        //                 return WCDoc.WDA && (WCDoc.WDA.approval_status === 'approved' || WCDoc.WDA.approval_status === 'client_approved_action');
        //             });
        //         });

        //         const allInductionsCompleted = clientAssign.clientCompInd.every(clientCompInd => {

        //             return clientCompInd.wrkrCI && clientCompInd.wrkrCI.is_comp_ind_completed;
        //         });

        //         // Determine status based on conditions
        //         const status = allApprovalsApproved && allInductionsCompleted ? 'compliant' : 'non-compliant';

        //         // Return a new object with updated `status`, ensuring no circular references
        //         return {
        //             organisation_uuid: clientAssign.organisation_uuid,
        //             trading_name: clientAssign.trading_name,
        //             function_assignment_uuid: clientAssign.function_assignment_uuid,
        //             status: status
        //         };
        //     });

        //     // Return updated worker object with modified client_assigns, ensuring no circular references
        //     return {
        //         worker_uuid: worker.worker_uuid,
        //         worker_job_title: worker.worker_job_title,
        //         worker_individual: {
        //             individual_uuid: worker.worker_individual.individual_uuid,
        //             first_name: worker.worker_individual.first_name,
        //             last_name: worker.worker_individual.last_name,
        //             phone: worker.worker_individual.phone,
        //             email: worker.worker_individual.email
        //         },
        //         client_assigns: updatedClientAssigns
        //     };
        // });

        // Prepare final response object
        // const finalResponse = { count: workersRes.count, rows: processedResult };

        GETSUCCESS(res, workersRes, "Get all workers of Provider successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};

module.exports = {
    TestContractorPaypalSubscription,
    TestStripe,
    TestCreateSubscription,
    testOldDatabaseConserve,

};
