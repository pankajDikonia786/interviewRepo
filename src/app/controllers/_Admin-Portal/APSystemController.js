const Sq = require("sequelize");
const path = require('path');
const sequelize = require('../../../config/DbConfig');
const { DateTime } = require("luxon");

const { SUCCESS, GETSUCCESS } = require('../../../constants/ResponseConstants');
const { deleteS3BucketFile } = require("../../../services/Helper.js");
const { sendIndividualEmail } = require("../../../utils/EmailUtils.js");
// const {sendNotification} =require("../_Admin-Portal/socketHandlers.js")
const {sendNotification} =require("../../../services/SocketHandlers.js")
const {
    Users,
    Individuals,
    DocumentTypes,
    EmailTemplates,
    Emails,
    MasterSettings,
    EmailTempAttachments,
    ProivderTypes,
    ProviderTypeLogs
} = require("../../../models/common");

const AddDocumentType = async (req, res, next) => {
    const { user_uuid, individual: { first_name, last_name, is_conserve_team } } = req.login_user;

    try {
        const login_user = req.login_user;
        const documentTypeDetails = req.body;
        const{doc_type_name} = documentTypeDetails
        documentTypeDetails.created_by = login_user.user_uuid;
        //parse
        documentTypeDetails.custom_fields = JSON.parse(documentTypeDetails.custom_fields);

        await DocumentTypes.create(documentTypeDetails);
        await sendNotification(`${first_name} ${last_name} added a new document type : ${doc_type_name}`, ["support team"], "");
        SUCCESS(res, "Document added !");

    } catch (error) {
        console.log(error);
        next(error);
    };
};
const AdminGetAllDocumentType = async (req, res, next) => {

    try {
        const { search, sort, order, page, limit, } = req.query;
        let where_obj = {};
        let query_obj = {};

        if (search) {
            where_obj = {
                [Sq.Op.or]: [
                    { doc_type_name: { [Sq.Op.iLike]: `%${search}%` } },
                    // Sq.where(Sq.cast(Sq.col('recipient_type'), 'varchar'),
                    //     { [Sq.Op.iLike]: `%${search}%` }),
                ],
            };
        };
        if (sort && order) {
            query_obj.order = [[sort, order]]
        };
        if (page && limit) {

            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;

        };
        const documentTypeRes = await DocumentTypes.findAndCountAll({
            where: where_obj, attributes: ["document_type_uuid",
                "doc_type_name", "recipient_type",
            ], ...query_obj
        });
        GETSUCCESS(res, documentTypeRes, "Get all document Types successfully !");

    } catch (error) {
        console.log(error);
        next(error);
    };
};
/* Email templates api's */
const CreateEmailTemplate = async (req, res, next) => {
    try {
        const { user_uuid, individual: { first_name, last_name, is_conserve_team } } = req.login_user;
        const emailTemplateDetails = req.body;

        emailTemplateDetails.created_by =user_uuid;
        const filesData = req.files;
        let emailAttachmentArray = [];

        sequelize.transaction(async (transaction) => {

            const emailRes = await EmailTemplates.create(emailTemplateDetails, { transaction });

            if (filesData) {
                filesData.forEach((filesDataVal) => {
                    emailAttachmentArray = [
                        ...emailAttachmentArray,
                        { email_temp_doc: filesDataVal.location, email_template_uuid: emailRes.email_template_uuid }
                    ];
                });
                //create bulk attachments
                await EmailTempAttachments.bulkCreate(emailAttachmentArray, { transaction });
            };
            await sendNotification(`${first_name} ${last_name} created a new email template`, ["client service team","support team"], "");

            SUCCESS(res, "Email template created successfully!");
        });
    } catch (error) {
        console.log(error);
        next(error);
    };

};
const GetEmailTemplateById = async (req, res, next) => {

    try {
        const { email_template_uuid } = req.query;
        const emailTemplatesRes = await EmailTemplates.findOne({
            where: { email_template_uuid },
            include: { model: EmailTempAttachments, as: "email_temp_attach", attributes: ["email_temp_attachment_uuid", "email_temp_doc"] }
        });

        GETSUCCESS(res, emailTemplatesRes, "Get email template by id successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };

};
//pending file data
const UpdateEmailTemplate = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const emailTemplateDetails = req.body;
        const { email_template_uuid, } = emailTemplateDetails;
        emailTemplateDetails.updated_by = login_user.user_uuid;
        delete emailTemplateDetails.email_template_uuid;
        const filesData = req.files;
        let emailAttachmentArray = [];

        sequelize.transaction(async (transaction) => {
            await EmailTemplates.update(emailTemplateDetails, { where: { email_template_uuid }, transaction });

            if (filesData) {
                filesData.forEach((filesDataVal) => {
                    emailAttachmentArray = [
                        ...emailAttachmentArray,
                        { email_temp_doc: filesDataVal.location, email_template_uuid }
                    ];
                });
                await EmailTempAttachments.bulkCreate(emailAttachmentArray, { transaction })
            };

            SUCCESS(res, "Email template updated successfully!");
        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};

const GetAllEmailTemplatesByType = async (req, res, next) => {
    try {
        const { page, limit, sort, order, search, template_type, DetailType } = req.query;
        let where_obj = { template_type };//array of template type
        let query_obj = {};
        let userModel = {
            model: Users,
            attributes: [],
            include: { model: Individuals, attributes: [] }
        }
        let _includeQuery = [userModel];

        let _attributesQuery = ["email_template_uuid", "template_name", "template_subject", "template_type",
            "created_date", "updated_date", "deleted_date",

            [Sq.fn("concat", Sq.col("user.individual.first_name"),
                " ", Sq.col("user.individual.last_name")), "createdByUser"]
        ];

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    { template_name: { [Sq.Op.iLike]: `%${search}%` } },
                    { template_subject: { [Sq.Op.iLike]: `%${search}%` } },
                    Sq.where(Sq.fn("concat", Sq.col("user.individual.first_name"), " ", Sq.col("user.individual.last_name")), { [Sq.Op.iLike]: `%${search}%` }),
                ]
            };
        };
        if (page && limit) {

            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;

        };
        if (sort && order) {
            query_obj.order = [[sort, order]]
        };

        if (DetailType === 'archived') {
            where_obj.deleted_date = { [Sq.Op.not]: null };
            query_obj.paranoid = false

            _includeQuery.push({
                model: Users,
                as: 'deletedBy',
                attributes: [],
                include: { model: Individuals, attributes: [] }
            });

            _attributesQuery.push([Sq.fn("concat", Sq.col("deletedBy.individual.first_name"),
                " ", Sq.col("deletedBy.individual.last_name")), "deletedByUser"]);

        };

        const emailTemplatesRes = await EmailTemplates.findAndCountAll({
            where: where_obj,
            attributes: _attributesQuery,
            include: _includeQuery,
            ...query_obj
        });
        GETSUCCESS(res, emailTemplatesRes, `Get email templates successfully!`);

    } catch (error) {
        console.log(error);
        next(error);
    };

};
const DeleteEmailTempAttachmentById = async (req, res, next) => {
    try {
        const { email_temp_attachment_uuid, email_temp_doc } = req.body;
        //delete file
        const fileBasename = path.basename(email_temp_doc);
        await deleteS3BucketFile(fileBasename);

        await EmailTempAttachments.destroy({ where: { email_temp_attachment_uuid } });

        SUCCESS(res, "Email template attachment deleted successfully!")

    } catch (error) {
        console.log(error);
        next(error);
    };
};
//delete attachment confirmation pending
const DeleteEmailTemplate = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const { email_template_uuid } = req.body;
        //archive email attachment data
        await EmailTempAttachments.destroy({
            where: { email_template_uuid },
            individualHooks: true, login_user: login_user,
        });
        //archive email template data
        await EmailTemplates.destroy({
            where: { email_template_uuid },
            individualHooks: true, login_user: login_user,
        });

        SUCCESS(res, 'Email template deleted successfully!');
    } catch (error) {
        console.log(error);
        next(error);
    };
};
/* Email logs api's */
//working on date range----------------------
const GetallEmailLogs = async (req, res, next) => {
    try {
        const { page, limit, sort, order, search, created_by, recipientEmail,
            email_template_uuid, from_date, to_date } = req.query;

        let where_obj = {};
        let query_obj = {};

        if (search) {
            where_obj = {
                [Sq.Op.and]: {
                    [Sq.Op.or]: [

                        Sq.where(Sq.col("email_template.template_name"), { [Sq.Op.iLike]: `%${search}%` }),
                        { email_subject: { [Sq.Op.iLike]: `%${search}%` } },
                        { email_to: { [Sq.Op.contains]: [search] }, },
                        Sq.where(Sq.fn("concat", Sq.col("individual.email"), " ", Sq.col("individual.email")), { [Sq.Op.iLike]: `%${search}%` }),
                    ]
                }

            };
        };
        if (recipientEmail) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [{
                    email_to: {
                        [Sq.Op.contains]: [recipientEmail]
                    }
                },
                {
                    email_cc: {
                        [Sq.Op.contains]: [[recipientEmail]]
                    }
                },
                {
                    email_bcc: {
                        [Sq.Op.contains]: [recipientEmail]
                    }
                }
                ]

            };
        };
        if (created_by || email_template_uuid) {
            created_by ? where_obj.created_by = created_by : "";
            email_template_uuid ? where_obj.email_template_uuid = email_template_uuid : "";
        };

        if (from_date && to_date) {
            where_obj = {
                ...where_obj,
                "created_date": {
                    [Sq.Op.and]: {
                        [Sq.Op.gte]: DateTime.fromFormat(from_date, "yyyy-MM-dd",).startOf('day').toUTC().toISO(),
                        [Sq.Op.lte]: DateTime.fromFormat(to_date, "yyyy-MM-dd").endOf('day').toUTC().toISO()
                    }
                }
            };
        };

        if (page && limit) {

            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;

        };
        if (sort && order) {
            query_obj.order = [[sort, order]];
        };
        const emailsRes = await Emails.findAndCountAll({
            attributes: ["email_uuid", "email_to", "email_subject",
                "created_date",
                [Sq.col("individual.first_name"), "first_name"],
                [Sq.col("individual.last_name"), "last_name"],
                [Sq.col("email_template.template_name"), "template_name"],
            ],
            where: where_obj,
            include: [{ model: Individuals, attributes: [] },
            { model: EmailTemplates, attributes: [] }
            ],
            ...query_obj
        });

        GETSUCCESS(res, emailsRes, "Get all email logs successfully! ")
    } catch (error) {
        console.log(error);
        next(error);

    };
};
const GetEmailLogById = async (req, res, next) => {
    try {
        const { email_uuid } = req.query;
        const EmailsRes = await Emails.findOne({
            where: { email_uuid },
        });

        GETSUCCESS(res, EmailsRes, "Get Email by id successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetAllEmailSenderList = async (req, res, next) => {
    try {
        const { recipientEmail } = req.query;

        let where_obj = {};

        if (recipientEmail) {
            where_obj = {
                [Sq.Op.or]: [{
                    email_to: {
                        [Sq.Op.contains]: [recipientEmail]
                    }
                },
                {
                    email_cc: {
                        [Sq.Op.contains]: [[recipientEmail]]
                    }
                },
                {
                    email_bcc: {
                        [Sq.Op.contains]: [recipientEmail]
                    }
                }
                ]
            }
        };
        const emailsRes = await Emails.findAll({
            where: where_obj,

            attributes: ["created_by", [Sq.col("individual.email"), 'sender_email']],

            include: { model: Individuals, attributes: [], order: ["email", "ASC"], },
            group: ["emails.created_by", "individual.individual_uuid"]
        })

        GETSUCCESS(res, emailsRes);
    } catch (error) {
        console.log(error);
        next(error);
    }
};

const GetAllEmailRecipientList = async (req, res, next) => {
    try {
        const { created_by } = req.query;

        let whereClause = '';

        if (created_by) {
            whereClause = `WHERE created_by = '${created_by}'`;
        };

        const uniqueEmailsQuery = `
            SELECT DISTINCT email FROM (
                SELECT unnest(email_to) AS email FROM common.emails ${whereClause}
                UNION ALL
                SELECT unnest(email_cc) AS email FROM common.emails ${whereClause}
                UNION ALL
                SELECT unnest(email_bcc) AS email FROM common.emails ${whereClause}
            ) AS all_emails
        `;

        const uniqueEmails = await sequelize.query(uniqueEmailsQuery, { type: Sq.QueryTypes.SELECT });

        // Extract email strings from the nested structure
        const formattedEmails = uniqueEmails.map(row => row.email);
        GETSUCCESS(res, formattedEmails, "Get All Recipient successfully!")

    } catch (error) {
        console.log(error);
        next(error);
    }
};
const GetAllUsedEmailTemplatesList = async (req, res, next) => {
    try {
        const { created_by, recipientEmail } = req.query;
        let where_obj = {};

        if (created_by) {
            where_obj.created_by = created_by;

        };
        if (recipientEmail) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [{
                    email_to: {
                        [Sq.Op.contains]: [recipientEmail]
                    }
                },
                {
                    email_cc: {
                        [Sq.Op.contains]: [[recipientEmail]]
                    }
                },
                {
                    email_bcc: {
                        [Sq.Op.contains]: [recipientEmail]
                    }
                }
                ]
            }
        };
        const emailRes = await Emails.findAll({
            where: where_obj,
            attributes: [
                [Sq.col('email_template.email_template_uuid'), "email_template_uuid"],
                [Sq.col('email_template.template_name'), "template_name"],

            ],
            include: { model: EmailTemplates, attributes: [], required: true }
        });
        GETSUCCESS(res, emailRes, "Get Email templates successfully!")
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//working---------------
const ForwardEmail = async (req, res, next) => {

    try {
        const login_user = req.login_user;
        let emailDetails = req.body;
        let { email_template_uuid } = emailDetails;
        emailDetails.created_by = login_user.user_uuid;
        let filesData = req.files;
        !email_template_uuid ? delete emailDetails.email_template_uuid : "";
        let sendEmailAttachArray = [];

        sequelize.transaction(async (transaction) => {

            if (!Array.isArray(emailDetails.email_attach_docs)) {
                // If it's not an array, convert it into an array
                emailDetails.email_attach_docs = emailDetails.email_attach_docs ? [emailDetails.email_attach_docs] : [];
            };
            //only email specific attachemnts (uploads)
            if (filesData) {
                //save url in the email tables
                filesData.forEach((filesDataVal) => {
                    //add new files data
                    emailDetails.email_attach_docs.push(filesDataVal.location);
                });
            };
            //parse the data
            emailDetails.email_to = JSON.parse(emailDetails.email_to);
            emailDetails.email_cc = JSON.parse(emailDetails.email_cc);
            //add attachement of file data
            if (emailDetails.email_attach_docs.length > 0) {

                // send attchment by email data new array
                for (let emailattach of emailDetails.email_attach_docs) {
                    sendEmailAttachArray.push({ filename: path.basename(emailattach), path: emailattach });
                };
                emailDetails.sendEmailAttachArray = sendEmailAttachArray;
            };
            //create email
            await Emails.create(emailDetails, { transaction });
            //send email
            sendIndividualEmail(emailDetails);

            SUCCESS(res, "Email sent successfully!");
        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};

/* Service types api's */
const CreateServiceType = async (req, res, next) => {
    const { user_uuid, individual: { first_name, last_name, is_conserve_team } } = req.login_user;
    try {
        const login_user = req.login_user;
        const serviceTypeDetails = req.body;
        const {meta_value_one} =serviceTypeDetails
        serviceTypeDetails.created_by = login_user.user_uuid;

        await MasterSettings.create(serviceTypeDetails);
        await sendNotification(`${first_name} ${last_name} added a new service type : ${meta_value_one}`, ["support team"], "");
        SUCCESS(res, "Service added!")
    } catch (error) {
        console.log(error);
        next(error);
    };
};

const GetAllServiceTypes = async (req, res, next) => {
    try {
        const { page, limit, sort, order, meta_key, search, } = req.query;

        let where_obj = {};
        let query_obj = {};
        if (meta_key) {
            where_obj = {
                meta_key: meta_key
            };
        };
        if (search) {
            where_obj = {
                [Sq.Op.or]: [Sq.where(Sq.fn("concat", Sq.col("user_created.individual.first_name"), " ",
                    Sq.col("user_created.individual.last_name")), { [Sq.Op.iLike]: `%${search}%` }),
                { meta_value_one: { [Sq.Op.iLike]: `%${search}%` } }
                ]
            };
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;

        };
        if (sort && order) {
            query_obj.order = [[sort, order]];

        };

        const masterSettingsRes = await MasterSettings.findAndCountAll({
            where: where_obj,
            attributes: ["master_setting_uuid", "master_setting_id",
                "meta_key", "meta_value_one", "created_date",
                [Sq.col('user_created.individual.first_name'), 'first_name'],
                [Sq.col('user_created.individual.last_name'), 'last_name']
            ],
            include: {
                model: Users, as: "user_created", attributes: [],
                include: { model: Individuals, attributes: [] }
            },
            ...query_obj
        },);
        SUCCESS(res, masterSettingsRes, "Get all service types successfully!");
    } catch (error) {
        console.log(error);
        next(error);

    };
};

/* Provider api's */
const AddProviderType = async (req, res, next) => {
    const { user_uuid, individual: { first_name, last_name, is_conserve_team } } = req.login_user;
    try {
        const { user_uuid, } = req.login_user;
        const providerData = req.body;
        const {provider_type_name} =providerData
        providerData.created_by = user_uuid;
        sequelize.transaction(async (transaction) => {

            await ProivderTypes.create(providerData, { transaction, user_uuid });
            await sendNotification(`${first_name} ${last_name} added a new Provider type : ${provider_type_name}`, ["support team","client service team"], "");
            SUCCESS(res, 'Provider Type added');
        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetAllProviderTypes = async (req, res, next) => {
    try {
        const { sort, order, page, limit, search } = req.query;
        let where_obj = {};
        let query_obj = {};

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("provider_type_name"), { [Sq.Op.iLike]: `%${search}%` }),
                ]
            };
        };
        if (page && limit) {

            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;

        };
        if (sort && order) {
            query_obj.order = [[sort, order]];
        };

        const providerTypesRes = await ProivderTypes.findAndCountAll({
            attributes: [
                "provider_type_uuid",
                "provider_type_name",
                "can_invite_workers",
                "client_pay_default",
                "licence_fee",
                "assignment_fee",
                "worker_fee",
                "created_date",
                "change_effective_date",
                "validation_criteria_limit",
                [Sq.fn("concat", Sq.col("providerCreatedBy.first_name"),
                    " ", Sq.col("providerCreatedBy.last_name")), "createdByUser"]

            ],
            where: where_obj,
            include: { model: Individuals, as: "providerCreatedBy", attributes: [] },
            ...query_obj
        });

        GETSUCCESS(res, providerTypesRes, 'Get all Providers successfully!');
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetSpecificProviderTypeLogs = async (req, res, next) => {
    try {
        const { provider_type_uuid, sort, order, } = req.query;
        let query_obj = {};

        if (sort && order) {
            query_obj.order = [[sort, order]];
        };

        const providerTypesRes = await ProviderTypeLogs.findAll({
            where: { provider_type_uuid },
            attributes: { exclude: ["old_value", "new_value"] },
            include: {
                model: Individuals, as: "proLogCreatedBy",
                attributes: ["first_name", "last_name"]
            },
            ...query_obj

        });

        GETSUCCESS(res, providerTypesRes, 'Get Provider by id successfully!');
    } catch (error) {
        console.log(error);
        next(error);
    };
};

const UpdateProviderType = async (req, res, next) => {
  
    try {
        const { user_uuid, individual: { first_name, last_name, is_conserve_team } } = req.login_user;
        const login_user =req.login_user
        const ProviderTypeDetails = req.body;
        const { provider_type_uuid, change_effective_date,provider_type_name } = ProviderTypeDetails
        ProviderTypeDetails.updated_by = user_uuid;

        sequelize.transaction(async (transaction) => {

            const oldProviderTypesRes = await ProivderTypes.findOne({ where: { provider_type_uuid } });
            await ProivderTypes.update({ change_effective_date }, {
                where: { provider_type_uuid }, returning: true, oldProviderTypesRes, ProviderTypeDetails,
                individualHooks: true, transaction, login_user
            });
            await sendNotification(`${first_name} ${last_name} updated a provider type details ${provider_type_name}`, ["super admin","client service team","support team"], "");
            SUCCESS(res, 'Update Provider types successfully!');
        });
    } catch (error) {
        console.log(error);
        next(error);
    };

};


module.exports = {
    AddDocumentType,
    AdminGetAllDocumentType,
    CreateEmailTemplate,
    GetEmailTemplateById,
    UpdateEmailTemplate,
    GetAllEmailTemplatesByType,
    DeleteEmailTempAttachmentById,
    DeleteEmailTemplate,
    GetallEmailLogs,
    GetEmailLogById,
    GetAllEmailSenderList,
    GetAllEmailRecipientList,
    GetAllUsedEmailTemplatesList,
    ForwardEmail,
    CreateServiceType,
    GetAllServiceTypes,
    AddProviderType,
    GetAllProviderTypes,
    GetSpecificProviderTypeLogs,
    UpdateProviderType
};