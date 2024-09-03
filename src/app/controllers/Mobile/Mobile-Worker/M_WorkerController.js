
const sequelize = require('../../../../config/DbConfig.js');
const Sq = require("sequelize");
const path = require("path");
const { } = require('../../../../utils/EmailUtils.js');
const { SUCCESS, GETSUCCESS } = require('../../../../constants/ResponseConstants.js');
const { Individuals, } = require('../../../../models/common/index.js');
const { commonAttributes, deleteS3BucketFile } = require('../../../../services/Helper.js');

const GetWorkerDetailsById = async (req, res, next) => {
    try {
        const individualDetails = req.query;
        const { individual_uuid } = individualDetails;
        const individualRes = await Individuals.findOne({
            where: { individual_uuid },
            attributes: { exclude: commonAttributes },

        });

        GETSUCCESS(res, individualRes, "Get worker Profile Details successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};

const UpdateWorkerProfile = async (req, res, next) => {
    try {
        const individualDetails = req.body;
        const { individual_uuid, } = individualDetails;
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

            SUCCESS(res, "Worker profile updated successfully!");
        });

    } catch (error) {
        console.log(error);
        next(error);
    };
};

module.exports = {
    GetWorkerDetailsById,
    UpdateWorkerProfile

};