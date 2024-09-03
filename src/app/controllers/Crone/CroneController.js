const cron = require('node-cron');
const { DateTime } = require('luxon');
const Sq = require("sequelize");
const { ReviewComplianceChecklistEmailLink } = require("../../../services/UserServices.js")
const { sendNotification } = require("../../../services/socketHandlers.js")
const { sendCronComplianceChecklistReviewEmail } = require('../../../utils/EmailUtils');
const { Individuals,
    ClientDetails,
    FunctionAssignments,
    FAUserPermissions,
    Functions,
    Users,
    Organisations,
    ProivderTypes,
    ProviderTypeLogs
} = require('../../../models/common');
//this crone functionality now not exist in updated figma
// */9 * * * * *
//Cron Compliance Doc review email 
// const CronComplianceDocReview = cron.schedule('* * * * * *', async () => {
// try {
//     const { month, day } = DateTime.now().c;
//     // compliance checklist review date
//     const { function_uuid } = await Functions.findOne({ where: { function_name: "client" } });
//     const resDetails = await FunctionAssignments.findAll({
//         where: { is_f_a_active: true, function_uuid },
//         attributes: ["organisation_uuid", "function_assignment_uuid", [Sq.col(`fa_perm.fa_user_perm.user_uuid`), `user_uuid`],
//             [Sq.col(`fa_perm.fa_user_perm.individual_uuid`), `individual_uuid`],
//             [Sq.col(`fa_perm.fa_user_perm.individual.first_name`), `first_name`],
//             [Sq.col(`fa_perm.fa_user_perm.individual.last_name`), `last_name`],
//             [Sq.col(`fa_perm.fa_user_perm.individual.email`), `email`],
//             [Sq.col(`org_data.trading_name`), `trading_name`],
//         ],

//         include: [
//             {
//                 model: ClientDetails, as: "fa_client_details",
//                 required: true,
//                 where: {
//                     [Sq.Op.and]: [
//                         Sq.fn('EXTRACT(MONTH from "review_comp_checklist") =', month),
//                         Sq.fn('EXTRACT(day from "review_comp_checklist") =', day),
//                     ],
//                 },
//                 attributes: [],
//             },
//             {
//                 model: Organisations, as: "org_data", attributes: [],
//                 required: true,
//             },
//             {
//                 model: FAUserPermissions, as: "fa_perm",
//                 required: true,
//                 where: {
//                     write_comp_checklist: true,
//                     user_uuid: { [Sq.Op.ne]: null },
//                 },
//                 attributes: [],
//                 include: {
//                     model: Users,
//                     as: "fa_user_perm",
//                     attributes: [],
//                     include: {
//                         model: Individuals,
//                         attributes: [],
//                     },
//                 },
//             }
//         ],
//         raw: true,
//         nest: true
//     });
//     if (resDetails.length > 0) {
//         const batchSize = 30; // Define batch
//         const totalUsers = resDetails.length;

//         for (let start = 0; start < totalUsers; start += batchSize) {
//             const batch = resDetails.slice(start, start + batchSize);

//             // Process each batch of users
//             for (let user_val of batch) {

//                 let { user_uuid, individual_uuid, function_assignment_uuid } = user_val;
//                 if (user_uuid && individual_uuid && function_assignment_uuid) {
//                     const emailLinkData = {
//                         user_uuid: user_val.user_uuid,
//                         organisation_uuid: user_val.organisation_uuid,
//                         function_assignment_uuid: user_val.function_assignment_uuid,
//                     };
//                     user_val.trading_name = user_val.org_data.trading_name;
//                     //create link url
//                     const url = await ReviewComplianceChecklistEmailLink(emailLinkData);
//                     // Send email to the user
//                     await sendCronComplianceChecklistReviewEmail(user_val, url);
//                 };
//             };
//             // Delay between batches to avoid overloading the email service
//             await new Promise((resolve) => setTimeout(resolve, 1000));
//         };
//         console.log("Cron Compliance checklist review emails successfully !");
//     } else {
//         console.log("Cron Data not found for Compliance checklist review emails !");
//     };
// } catch (error) {
//     console.log("Error------------Cron Compliance checklist review emails", error);
// };
// });
//temporary stop the cron 
// CronComplianceDocReview.stop();
//set cron run the 12 am daily according to australia time through UTC
const CronProviderTypeUpdate = cron.schedule('0 14 * * *', async () => {
    try {
        const todayStart = DateTime.now().toUTC().startOf('day');
        const todayEnd = DateTime.now().toUTC().endOf('day');

        let providerTypesIds = [];
        //All provider types data according to change_effective_date 
        const providerTypes = await ProivderTypes.findAll({
            where: {
                change_effective_date: {
                    [Sq.Op.between]: [todayStart.toJSDate(), todayEnd.toJSDate()]
                },
            }
        });

        if (providerTypes.length > 0) {
            for (const providerType of providerTypes) {
                providerTypesIds.push(providerType.provider_type_uuid)

            };
            const providerTypeLogs = await ProviderTypeLogs.findAll({
                where: [Sq.literal(`created_date = (SELECT MAX(pt.created_date) FROM 
            common.provider_type_logs  AS pt WHERE pt.provider_type_uuid =
             provider_type_logs.provider_type_uuid)`),
                {
                    provider_type_uuid: providerTypesIds,
                    action_type: "update"
                }],
            });
            for (const providerTypeLog of providerTypeLogs) {
                const { new_value, provider_type_uuid } = providerTypeLog;
                delete new_value.provider_type_uuid;
                delete new_value.change_effective_date;
                await ProivderTypes.update(new_value, { where: { provider_type_uuid } });

            };
        };
        return console.log("Crone related data not found for Provider Types :--------");
    } catch (error) {

        console.log("Error Cron Provider Types:<<<<<<<<<<<<<< ", error);
    };

});


const ReviewChecklistRenewalDue = cron.schedule('* * * * *', async () => {
    console.log(":::::::::::::::::::::;;;;;vnfvfbnvfdmbdfvnbfdvbmnfdvnbfdvnfdvnmbfdvbmnfdvnmbfdvbnfdvmnfdvmnbfdvbnfdvvnbfdmnvfdbvnfdnbvfdnb","hello")
    try {
        // Fetch function_uuid for 'client' function
        const functionRecord = await Functions.findOne({ where: { function_name: 'client' } });
        if (!functionRecord) {
            console.log('Function record not found for "client".');
            return;
        }

        const function_uuid = functionRecord.function_uuid;

        // Fetch all active function assignments
        const resDetails = await FunctionAssignments.findAll({
            where: { is_f_a_active: true, function_uuid },
            attributes: ['organisation_uuid', 'function_assignment_uuid'],
            include: [
                {
                    model: ClientDetails,
                    as: 'fa_client_details',
                    attributes: [],
                },
                {
                    model: Organisations,
                    as: 'org_data',
                    attributes: ['org_name', 'trading_name'],
                    required: true,
                    include:[{
                        model: Individuals, as:"individual_data",
                        attributes:["individual_uuid", "first_name", "last_name", "email"],
                        where: { is_conserve_team: false },
                            include: {
                                model: Users,
                                as: "user_data",
                                attributes: ["user_uuid", "last_login"],
                              },
                        
                    }]
                },
                {
                    model: compliance_checklist,
                    as: 'clientChecklist',
                    attributes: ['checklist_renewal_date'],
                },
            ],
        });

        // Process each record
        for (const data of resDetails) {
            console.log(":::::::::::::::::::::::::::::.data",data)
            const { clientChecklist, org_data } = data;

            if (clientChecklist && clientChecklist.checklist_renewal_date) {
                const renewalDate = new Date(clientChecklist.checklist_renewal_date);
                const currentDate = new Date();

                 if (renewalDate < currentDate) {
                    console.log(":hello pankaj this is for rewnwal checklist is due")
            }
                // Check if the renewal date is past
                // if (renewalDate < currentDate) {
                //     console.log(`Compliance checklist is overdue for organization: ${org_data.org_name}`);

                //     // Fetch all users in the organization
                //     const users = await Users.findAll({
                //         where: { organisation_uuid: data.organisation_uuid },
                //         attributes: ['email', 'notification_token'], // Adjust attributes as needed
                //     });

                //     // Notify users
                //     for (const user of users) {
                //         // Send notification
                //         await sendNotification(user.notification_token, 'Compliance checklist is overdue');

                //         // Send email
                //         await sendEmail(user.email, 'Compliance Checklist Overdue', 'The compliance checklist for your organization is overdue. Please review it as soon as possible.');
                //     }
                // }
            }
        }

    } catch (error) {
        console.error('Error occurred in cron job for compliance renewal date:', error.message);
    }
});
ReviewChecklistRenewalDue.start();