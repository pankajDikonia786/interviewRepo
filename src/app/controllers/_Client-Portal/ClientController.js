const Sq = require("sequelize");
const path = require("path");
const sequelize = require('../../../config/DbConfig');
const { sendConserveSupportByUserEmail } = require("../../../utils/EmailUtils");
const { SUCCESS, GETSUCCESS, } = require('../../../constants/ResponseConstants');
const { deleteS3BucketFile, OrgindividualGetQuery } = require("../../../services/Helper");
const { Individuals, IndividualOrg } = require("../../../models/common");

const GetClientUserDetailsById = async (req, res, next) => {
    try {
        const userDetails = req.query;
        userDetails.is_user = true;
        //common function for get individuals and other
        const individualRes = await OrgindividualGetQuery(userDetails);

        GETSUCCESS(res, individualRes, "Get Client User by id successfully!");
    } catch (error) {
        console.error(error);
        next(error);
    };
};

const UpdateClientUserProfile = async (req, res, next) => {
    try {
        const individualDetails = req.body;
        const { individual_uuid, organisation_uuid, job_title } = individualDetails;
        const fileData = req.file;
        individualDetails.updated_by = req.login_user.user_uuid;
        fileData?.location ? individualDetails.avatar = fileData.location : "";
        sequelize.transaction(async (transaction) => {

            if (typeof fileData !== "undefined" && fileData?.location) {
                //delete existing file
                const individualsRes = await Individuals.findOne({
                    where: { individual_uuid },
                });

                if (individualsRes.avatar) {
                    let fileBasename = path.basename(individualsRes.avatar);
                    await deleteS3BucketFile(fileBasename);
                };
            };

            await Individuals.update(individualDetails, { where: { individual_uuid }, transaction });
            await IndividualOrg.update({ job_title }, {
                where: { organisation_uuid, individual_uuid, is_user: true },
                transaction
            });

            SUCCESS(res, "Client User profile updated successfully!");
        });

    } catch (error) {
        console.log(error);
        next(error);
    };
};

const ClientSupportEmailSend = async (req, res, next) => {
    try {
        const EmailDetails = req.body;
        const files = req.files;
        const { email, first_name, last_name } = req.login_user.individual;
        EmailDetails.email = email;
        EmailDetails.user_name = first_name + " " + last_name;

        const filesArr = (files || []).map(file => ({
            filename: `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`,
            content: file.buffer
        }));

        sendConserveSupportByUserEmail({ filesArr, ...EmailDetails });
        SUCCESS(res, "Email sent successfully!");

    } catch (error) {
        console.error(error);
        next(error);
    };
};

module.exports = {
    UpdateClientUserProfile,
    GetClientUserDetailsById,
    ClientSupportEmailSend
};