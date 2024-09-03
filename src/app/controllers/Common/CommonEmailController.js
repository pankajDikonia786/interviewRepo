const path = require("path");
const Sq = require("sequelize");
const sequelize = require('../../../config/DbConfig');
const { SUCCESS, GETSUCCESS, } = require('../../../constants/ResponseConstants');
const { commonAttributes, } = require("../../../services/Helper");
const { sendIndividualEmail } = require("../../../utils/EmailUtils");
const {
    Emails,
    EmailTemplates,
    EmailTempAttachments,
    Individuals,

} = require("../../../models/common");

/* Email api's */
//Get Email template (which Added by conserve admins)
const GetAllSpecificEmailTemplates = async (req, res, next) => {
    try {
        const { template_type } = req.query;
        const emailTempRes = await EmailTemplates.findAll({
            where: { template_type }, attributes: { exclude: commonAttributes },
            include: {
                model: EmailTempAttachments, as: "email_temp_attach", attributes: ["email_temp_attachment_uuid",
                    "email_temp_doc"]
            }
        });
        GETSUCCESS(res, emailTempRes, "Get all email templates for client successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

const GetAllIndividualForEmail = async (req, res, next) => {
    try {
        const { individual: { individual_uuid } } = req.login_user;
        const { search, } = req.query;

        let where_obj = { individual_uuid: { [Sq.Op.ne]: individual_uuid }, };

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("email"), { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.fn("concat", Sq.col("first_name"), " ", Sq.col("last_name")), { [Sq.Op.iLike]: `%${search}%` }),
                ]
            };
        };
        const individualRes = await Individuals.findAll({
            where: where_obj,
            attributes: ["individual_uuid", "first_name", "last_name", "email", "phone"],

        },);

        GETSUCCESS(res, individualRes, "Get client individual list successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//send email of client,provier and worker section and portal
//confirm pending that we need to show email only of show the names and send the attachments
const EmailToIndividual = async (req, res, next) => {

    try {
        const login_user = req.login_user;
        let emailDetails = req.body;
        let { email_template_uuid } = emailDetails;
        emailDetails.created_by = login_user.user_uuid;
        let filesData = req.files;
        !email_template_uuid ? delete emailDetails.email_template_uuid : "";
        let sendEmailAttachArray = [];
        // if()

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
            emailDetails.email_bcc = JSON.parse(emailDetails.email_bcc);
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

//Message entity (Email logs by organisation (Clients and Providrs))
const GetOrgEmailLogs = async (req, res, next) => {
    try {
        const { page, limit, sort, order, organisation_uuid } = req.query;

        let where_obj = { organisation_uuid };
        let query_obj = {};

        if (page && limit) {

            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;

        };
        if (sort && order) {
            query_obj.order = [[sort, order]];
        };
        const emailsRes = await Emails.findAndCountAll({
            where: where_obj,
            attributes: ["email_uuid", "email_to", "email_subject", "created_date",
                [Sq.fn("concat", Sq.col("individual.first_name"),
                    " ", Sq.col("individual.last_name")), "createdByUser"]
            ],
            include: [{ model: Individuals, attributes: [] },//created_by
            ],
            ...query_obj
        });

        GETSUCCESS(res, emailsRes, "Get Organisation email logs successfully! ")
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

const ForwardEmail = async (req, res, next) => {

    try {
        const login_user = req.login_user;

        let { email_uuid, email_to, sendMeCopy, organisation_uuid, individual_uuid } = req.body;

        //Get email details for copy content
        const emailRes = await Emails.findOne({
            where: { email_uuid },
            attributes: [
                'email_template_uuid',
                'email_subject',
                'email_content',
                'email_attach_docs'
            ],
            raw: true
        });
        //if Send by Client or Provider organisation
        if (organisation_uuid) {
            emailRes.organisation_uuid = organisation_uuid;
        };
        //if send by worker or conserve team
        if (individual_uuid) {
            emailRes.individual_uuid = individual_uuid;
        };
        emailRes.created_by = login_user.user_uuid;
        //parse the data
        emailRes.email_to = JSON.parse(email_to);

        if (sendMeCopy === true || sendMeCopy === "true") {
            emailRes.email_cc = [login_user.individual.email];
        };

        //create email
        await Emails.create(emailRes,);

        //Email attach array
        let sendEmailAttachArray = [];

        //add attachement of file data
        if (emailRes.email_attach_docs.length > 0) {

            // send attchment by email data new array
            for (let emailattach of emailRes.email_attach_docs) {
                sendEmailAttachArray.push({ filename: path.basename(emailattach), path: emailattach });
            };
            emailRes.sendEmailAttachArray = sendEmailAttachArray;
        };
        //send email
        sendIndividualEmail(emailRes);

        SUCCESS(res, "Email sent successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

module.exports = {
    GetAllSpecificEmailTemplates,
    GetAllIndividualForEmail,
    EmailToIndividual,
    GetOrgEmailLogs,
    GetEmailLogById,
    ForwardEmail

};