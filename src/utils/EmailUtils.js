const nodemailer = require('nodemailer');
const fs = require('fs');
const handlebars = require('handlebars');
const path = require('path');

const APP_URL = process.env.APP_URL;
const mailerConfig = {
    // secure: false,
    tls: { rejectUnauthorized: false },
    port: process.env.MAIL_PORT,
    host: process.env.MAIL_HOST,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
};
const sendSignupEmailVerificationEmail = (emailDetails, url) => {
    return new Promise(async (resolve, rejects) => {
        try {

            let transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/signup-email-verification/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);

            const replacements = {
                verification_link: url,
                APP_URL: APP_URL,
                email_to: emailDetails.email

            };

            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailDetails.email,
                subject: 'Verification Registration',
                html: htmlToSend,
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' })
                }
            });

        } catch (error) {
            throw Error(error);
        }
    });
};
const sendSignUpContinueEmail = (emailDetails, url) => {
    return new Promise(async (resolve, rejects) => {
        try {

            let transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/signup-continue/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);

            const replacements = {
                continue_signup_link: url,
                APP_URL: APP_URL,
                email_to: emailDetails.email
            };

            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailDetails.email,
                subject: 'Continue Registration',
                html: htmlToSend,
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' })
                }
            });

        } catch (error) {
            throw Error(error);
        }
    });
};

const send2faOtpEmail = (emailDetails, url) => {
    return new Promise(async (resolve, rejects) => {
        try {

            let transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/2fa-otp/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);

            const replacements = {
                _otp: [...emailDetails.otp],
                user_name: emailDetails.user_name,
                verify_otp_link: url,
                send_to_email: emailDetails.email,
                APP_URL: APP_URL,
            };

            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailDetails.email,
                subject: '2FA Authentication',
                html: htmlToSend,
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' });
                };
            });

        } catch (error) {
            throw Error(error);
        };
    });
};

const sendForgotPasswordEmail = (emailDetails, url) => {
    return new Promise(async (resolve, rejects) => {
        try {

            let transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/forgot-password/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);
            const replacements = {
                user_name: emailDetails.user_name,
                password_reset_link: url,
                email_to: emailDetails.email,
                APP_URL: APP_URL,

            };
            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailDetails.email,
                subject: 'Forgot Password',
                html: htmlToSend,
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' })
                }
            });

        } catch (error) {
            throw Error(error);
        }
    });
};
const sendInviteUserEmail = (emailDetails, url) => {
    return new Promise(async (resolve, rejects) => {
        try {

            let transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/invite-org-user/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);
            const replacements = {
                user_name: emailDetails.user_name,
                trading_name: emailDetails.trading_name,
                invite_link: url,
                email_to: emailDetails.email,
                APP_URL: APP_URL,

            };
            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailDetails.email,
                subject: 'Conserve invite user',
                html: htmlToSend,
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' })
                }
            });

        } catch (error) {
            throw Error(error);
        };
    });
};
const sendInviteClientProviderEmail = (emailDetails, url, rejectUrl) => {
    return new Promise(async (resolve, rejects) => {
        try {

            let transporter = nodemailer.createTransport(mailerConfig);
            const templateFile = emailDetails.provider_fa_uuid ? `invite-client-csv-provider` : `invite-client-csv-new-provider`;

            const filePath = path.join(__dirname, `../email-templates/${templateFile}/index.html`);
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);
            const replacements = {
                client_name: emailDetails.client_name,
                provider_name: emailDetails.provider_name,
                invite_message: emailDetails.invite_message,
                invite_link: url,
                reject_link: rejectUrl,
                email_to: emailDetails.email,
                APP_URL: APP_URL,

            };
            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailDetails.email,
                subject: 'Conserve invite Provider',
                html: htmlToSend,
                attachments: emailDetails.filesArr
                // attachments: emailDetails.filesArr
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' })
                }
            });

        } catch (error) {
            throw Error(error);
        };
    });
};
// const sendCsvInviteClientProviderEmail = (emailDetails, url, rejectUrl) => {
//     return new Promise(async (resolve, rejects) => {
//         try {

//             let transporter = nodemailer.createTransport(mailerConfig);
//             const { provider_fa_uuid } = emailDetails;

//             const templateFile = provider_fa_uuid ? `invite-client-csv-provider` : `invite-client-csv-new-provider`;

//             const filePath = path.join(__dirname, `../email-templates/${templateFile}/index.html`);

//             const source = fs.readFileSync(filePath, 'utf-8').toString();
//             const template = handlebars.compile(source);
//             const replacements = {
//                 client_name: emailDetails.trading_name,
//                 provider_org_name: emailDetails.provider_org_name,
//                 invite_message: emailDetails.invite_message,
//                 invite_link: url,
//                 reject_link: rejectUrl,
//                 email_to: emailDetails.provider_email,
//                 APP_URL: APP_URL,

//             };
//             const htmlToSend = template(replacements);
//             const mailOptions = {
//                 from: process.env.MAIL_FROM_ADDRESS,
//                 to: emailDetails.provider_email,
//                 subject: 'Conserve invite Provider',
//                 html: htmlToSend,
//                 attachments: emailDetails.filesArr
//             };

//             transporter.sendMail(mailOptions, (error, info) => {
//                 if (error) {
//                     rejects(error);
//                 } else {
//                     resolve({ msg: 'Email sent successfully ... ' })
//                 }
//             });

//         } catch (error) {
//             throw Error(error);
//         };
//     });
// };
const sendProviderSignupPaymentEmail = (emailDetails,) => {
    return new Promise(async (resolve, rejects) => {
        try {

            let transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/Provider-signup-payment/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);
            const replacements = {
                sub_created_date: emailDetails.sub_created_date,
                card_brand: emailDetails.card_brand,
                cardlast4: emailDetails.cardlast4,
                invoice_number: emailDetails.invoice_number,
                charged_amount: emailDetails.charged_amount,
                license_period_start: emailDetails.license_period_start,
                license_period_end: emailDetails.license_period_end,
                email_to: emailDetails.email,
                APP_URL: APP_URL,
            };
            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailDetails.email,
                subject: 'Conserve Provider registration',
                html: htmlToSend,
                attachments: [{
                    filename: "Invoice.pdf",
                    path: emailDetails.invoice_pdf

                }]
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' })
                }
            });

        } catch (error) {
            throw Error(error);
        };
    });
};
//Common used for Client and Provider and admin forward (from email log)
const sendIndividualEmail = (emailDetails,) => {
    return new Promise(async (resolve, rejects) => {
        try {

            let transporter = nodemailer.createTransport(mailerConfig);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailDetails.email_to,
                cc: emailDetails.email_cc,
                bcc: emailDetails.email_bcc,
                subject: emailDetails.email_subject,
                html: emailDetails.email_content,
                attachments: emailDetails.sendEmailAttachArray
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' })
                };
            });

        } catch (error) {
            throw Error(error);
        };
    });
};

const sendConserveUserInviteEmail = async (emailDetails, url) => {
    return new Promise(async (resolve, rejects) => {
        try {

            const transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/invite-conserve-user/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);

            const replacements = {
                inviter_first_name: emailDetails.inviter_first_name,
                invite_link: url,
                email_to: emailDetails.email,
                APP_URL: APP_URL,
            };

            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailDetails.email,
                subject: 'Conserve team join',
                html: htmlToSend,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' })
                };
            });

        } catch (error) {
            throw Error(error);
        };
    });
};
const sendAdminUserWelcomeEmail = async (emailDetails) => {
    return new Promise(async (resolve, rejects) => {
        try {

            const transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/admin-user-welcome/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);

            const replacements = {
                email_to: emailDetails.email,
                APP_URL: APP_URL,
            };

            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailDetails.email,
                subject: 'Welcome Conserve team ',
                html: htmlToSend,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' })
                };
            });

        } catch (error) {
            throw Error(error);
        };
    });
};
const sendUserResetPasswordEmail = (emailDetails, url) => {
    return new Promise(async (resolve, rejects) => {
        try {

            let transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/conserve-user-reset-password/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);
            const replacements = {
                user_name: emailDetails.user_name,
                password_reset_link: url,
                email_to: emailDetails.email,
                APP_URL: APP_URL,
            };
            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailDetails.email,
                subject: 'Reset Password',
                html: htmlToSend,
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' })
                }
            });

        } catch (error) {
            console.log(error);
            throw Error(error);
        }
    });
};

const sendRemoveAdminUserEmail = (emailDetails,) => {
    return new Promise(async (resolve, rejects) => {
        try {

            let transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/delete-admin-user/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);
            const replacements = {
                user_name: emailDetails.user_name,
                message: emailDetails.message,
                APP_URL: APP_URL,
                // email_to: emailDetails.email,
            };
            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailDetails.email,
                subject: 'Admin User Deactivated',
                html: htmlToSend,
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' })
                }
            });

        } catch (error) {
            console.log(error);
            throw Error(error);
        };
    });
};
const sendProviderDocApprovalEmail = (emailDetails, url) => {
    return new Promise(async (resolve, rejects) => {
        try {
            const {
                doc_name,
                provider_trading_name,
                client_trading_name,
                client_email,
                emailTemplateName,
                message,
                supportEmail
            } = emailDetails;

            let transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, `../email-templates/${emailTemplateName}/index.html`);
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);


            const replacements = {
                provider_trading_name,//Provider org.trading_name
                doc_name,
                client_trading_name,
                _message: message,
                docUrl: url,
                email_to: supportEmail || client_email,//update as pending client or admin (incase when client rejected
                APP_URL: APP_URL,
            };
            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: supportEmail || client_email,//update as pending client or admin (incase when client rejected
                subject: 'Provider Document Approval to Client',
                html: htmlToSend,

            };
            // emailDetails?.doc_attach ? mailOptions.attachments = [{
            //     filename: new URL(emailDetails.doc_attach).pathname.split('/').pop(),
            //     path: emailDetails.doc_attach

            // }] : "";
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' })
                };
            });

        } catch (error) {
            console.log(error);
            throw Error(error);
        };
    });

};
const sendInviteProviderWorkerEmail = (emailDetails, url) => {
    return new Promise(async (resolve, rejects) => {
        try {

            let transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/invite-provider-worker/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);
            const replacements = {
                worker_first_name: emailDetails.first_name,
                inviter_name: emailDetails.inviter_name,
                provider_trading_name: emailDetails.trading_name,
                accept_invite_link: url,
                email_to: emailDetails.worker_email,
                APP_URL: APP_URL,
            };
            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailDetails.worker_email,
                subject: 'Invite Provider Worker',
                html: htmlToSend,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' })
                };
            });

        } catch (error) {
            console.log(error);
            throw Error(error);
        };
    });

};
//Email to confirmation the Provider
const sendWorkerAcceptedInviteEmail = (emailDetails, url) => {
    return new Promise(async (resolve, rejects) => {
        try {

            let transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/worker-accepted-invite/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);
            const replacements = {
                provider_trading_name: emailDetails.trading_name,
                worker_first_name: emailDetails.first_name,
                worker_profile_link: url,
                email_to: emailDetails.email,
                APP_URL: APP_URL,
            };
            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailDetails.email,//inviter email who invites the worker
                subject: 'Worker Accept Invitation',
                html: htmlToSend,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' })
                };
            });

        } catch (error) {
            console.log(error);
            throw Error(error);
        };
    });

};
const sendCronComplianceChecklistReviewEmail = (emailDetails, url) => {
    return new Promise(async (resolve, rejects) => {
        try {

            let transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/review-compliance/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);
            const replacements = {
                user_name: emailDetails.first_name + " " + emailDetails.last_name,
                trading_name: emailDetails.trading_name,
                compliance_checklist_link: url,
                email_to: emailDetails.email,
                APP_URL: APP_URL,
            };
            console.log(replacements)
            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailDetails.email,
                subject: 'Review Compliance Checklist',
                html: htmlToSend,
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' })
                };
            });

        } catch (error) {
            console.log(error);
            throw Error(error);
        };
    });

};
const sendConserveSupportByUserEmail = (emailDetails) => {
    return new Promise(async (resolve, rejects) => {
        try {

            let transporter = nodemailer.createTransport(mailerConfig);
            const { user_name, emailDescHtml, emailSubject, filesArr } = emailDetails;
            const mailOptions = {
                from: `${user_name} <${emailDetails.email}>`,
                to: process.env.CONSERVE_SUPPORT_EMAIL,
                subject: emailSubject,
                html: emailDescHtml,
                attachments: filesArr
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' });
                };
            });

        } catch (error) {
            console.log(error);
            throw Error(error);
        };
    });

};
const sendProviderInvitationRejectEmail = (emailDetails) => {
    return new Promise(async (resolve, rejects) => {
        try {
            const { providerName, inviteByUserName, email, reject_invite_message } = emailDetails;
            let transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/invite-provider-reject/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);
            const replacements = {
                inviteByUserName,
                providerName,
                reject_invite_message,
                email_to: email,
                APP_URL: APP_URL,
            };
            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: email,
                subject: 'Provider declined invitation',
                html: htmlToSend,
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' });
                };
            });

        } catch (error) {
            console.log(error);
            throw Error(error);
        };
    });

};
const sendProviderInvitationAcceptEmail = (emailDetails, url) => {
    return new Promise(async (resolve, rejects) => {
        try {
            const { provider_org_name, user_name, email, } = emailDetails;
            let transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/invite-provider-accept/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);
            const replacements = {
                user_name,
                provider_org_name,
                APP_URL: APP_URL,
                email_to: email,
                url
            };
            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: email,
                subject: 'Provider Accepted invitation',
                html: htmlToSend,
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' });
                };
            });

        } catch (error) {
            console.log(error);
            throw Error(error);
        };
    });

};/* Mobile */
const sendMobile2faOtpEmail = (emailDetails,) => {
    return new Promise(async (resolve, rejects) => {
        try {

            let transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/_mobile-2fa-otp/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);

            const replacements = {
                _otp: [...emailDetails.otp],
                user_name: emailDetails.user_name,
                send_to_email: emailDetails.email,
                APP_URL: APP_URL,
            };

            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailDetails.email,
                subject: 'Mobile 2FA Authentication',
                html: htmlToSend,
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' });
                };
            });

        } catch (error) {
            throw Error(error);
        };
    });
};
const sendMobileForgotPasswordEmail = (emailDetails,) => {
    return new Promise(async (resolve, rejects) => {
        try {

            let transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/_mobile-forgot-password/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);
            const replacements = {
                user_name: emailDetails.user_name,
                email_to: emailDetails.email,
                APP_URL: APP_URL,
                // password_reset_link

            };
            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailDetails.email,
                subject: 'Mobile Forgot Password',
                html: htmlToSend,
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' });
                };
            });

        } catch (error) {
            throw Error(error);
        };
    });
};
//test _clientTradingNames array output pending-------------------
const sendWorkerRemoveToAdminEmail = (emailDetails,) => {
    return new Promise(async (resolve, rejects) => {
        try {
            const { _workerName, _workerEmail, _providerTradingName, _clientTradingNames, supportTeamEmail } = emailDetails;
            let transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/worker-remove-to-admin/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);

            const replacements = {
                _workerName,
                _workerEmail,
                _providerTradingName,
                _clientTradingNames,
                email_to: supportTeamEmail,
                APP_URL: APP_URL,
            };

            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: supportTeamEmail,
                subject: 'To Confirm Worker removed',
                html: htmlToSend,
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' });
                };
            });

        } catch (error) {
            throw Error(error);
        };
    });
};
//working pending--------------
const sendWorkerRemoveToProviderEmail = (emailDetails,) => {
    return new Promise(async (resolve, rejects) => {
        try {

            let transporter = nodemailer.createTransport(mailerConfig);
            const filePath = path.join(__dirname, '../email-templates/_mobile-forgot-password/index.html');
            const source = fs.readFileSync(filePath, 'utf-8').toString();
            const template = handlebars.compile(source);
            const replacements = {
                user_name: emailDetails.user_name,
                email_to: emailDetails.email,
                APP_URL: APP_URL,
                // password_reset_link

            };
            const htmlToSend = template(replacements);
            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailDetails.email,
                subject: 'Mobile Forgot Password',
                html: htmlToSend,
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    rejects(error);
                } else {
                    resolve({ msg: 'Email sent successfully ... ' });
                };
            });

        } catch (error) {
            throw Error(error);
        };
    });
};

module.exports = {
    sendSignupEmailVerificationEmail,
    sendSignUpContinueEmail,
    send2faOtpEmail,
    sendForgotPasswordEmail,
    sendInviteUserEmail,
    sendInviteClientProviderEmail,
    // sendCsvInviteClientProviderEmail,
    sendProviderSignupPaymentEmail,
    sendIndividualEmail,
    sendConserveUserInviteEmail,
    sendRemoveAdminUserEmail,
    sendAdminUserWelcomeEmail,
    sendUserResetPasswordEmail,
    sendProviderDocApprovalEmail,
    sendInviteProviderWorkerEmail,
    sendWorkerAcceptedInviteEmail,
    sendCronComplianceChecklistReviewEmail,
    sendConserveSupportByUserEmail,
    sendProviderInvitationRejectEmail,
    sendProviderInvitationAcceptEmail,

    sendMobile2faOtpEmail,
    sendMobileForgotPasswordEmail,

    sendWorkerRemoveToAdminEmail,
    sendWorkerRemoveToProviderEmail

};