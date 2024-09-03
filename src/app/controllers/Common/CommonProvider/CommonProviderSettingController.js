const Sq = require("sequelize");
const path = require("path");
const sequelize = require('../../../../config/DbConfig.js');
const { commonAttributes, deleteS3BucketFile, OrgindividualGetQuery } = require("../../../../services/Helper.js");
const { SUCCESS, GETSUCCESS, } = require('../../../../constants/ResponseConstants.js');
const {
    Individuals,
    IndividualOrg,
    Organisations,
    ProviderOrgDetails,
    Addresses,
    Countries,
} = require('../../../../models/common/index.js');


const GetProviderUserDetailsById = async (req, res, next) => {
    try {
        const userDetails = req.query;
        userDetails.is_user = true;
        //common function for get individuals   
        const individualRes = await OrgindividualGetQuery(userDetails);

        GETSUCCESS(res, individualRes, "Get Provider User by id successfully!");
    } catch (error) {
        console.error(error);
        next(error);
    };
};
const UpdateProviderUserProfile = async (req, res, next) => {
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

            SUCCESS(res, "Provider User profile updated successfully!");
        });

    } catch (error) {
        console.log(error);
        next(error);
    };
};

//provider setting api's
const GetProviderDetailsById = async (req, res, next) => {
    try {
        const { organisation_uuid } = req.query;

        const orgRes = await Organisations.findOne({
            where: { organisation_uuid },
            attributes: { exclude: commonAttributes },
            include: [{
                model: ProviderOrgDetails,
                attributes: { exclude: commonAttributes }
            },
            {
                model: Addresses,
                as: "org_address_data",
                attributes: { exclude: commonAttributes },
                through: { attributes: [] },
                include: { model: Countries, attributes: ["phone_code", "country_code"] }
            }]
        });

        GETSUCCESS(res, orgRes, "Get Provider details by id successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};
const UpdateProviderOrgDetails = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const providerDetails = req.body;
        let { organisation_uuid,
            provider_org_detail_uuid,
            provider_address_data,
            no_of_emp,
            ind_master_setting_uuid
        } = providerDetails;

        const fileData = req.file;
        providerDetails.updated_by = login_user.user_uuid;

        fileData?.location ? providerDetails.logo = fileData.location : "";
        console.log(req.body)

        sequelize.transaction(async (transaction) => {

            //file data
            if (typeof fileData !== "undefined" && fileData?.location) {
                //delete existing file
                const organisationsRes = await Organisations.findOne({
                    where: { organisation_uuid },
                });
                if (organisationsRes.logo) {
                    let fileBasename = path.basename(organisationsRes.logo);
                    await deleteS3BucketFile(fileBasename);
                };
            };

            // update organisation details
            await Organisations.update(providerDetails,
                { where: { organisation_uuid }, transaction });
            //parse
            provider_address_data = JSON.parse(provider_address_data);
            //Update Address
            // provider_address_data.updated_by = login_user.user_uuid;
            if (provider_address_data.length > 0) {
                provider_address_data.forEach(address => {
                    Addresses.update({ address, updated_by: login_user.user_uuid }, {
                        where: { address_uuid: address.address_uuid },
                        transaction
                    });
                });
            };
            await ProviderOrgDetails.update({ no_of_emp, ind_master_setting_uuid },
                { where: { provider_org_detail_uuid }, transaction });

            SUCCESS(res, "Provider org. details updated successfully!");
        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//discuss evidence of engagement pending
const UpdateProviderOrgOtherDetails = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const providerDetails = req.body;
        let { provider_org_detail_uuid } = providerDetails;
        providerDetails.updated_by = login_user.user_uuid;
        const fileData = req.file;
        fileData?.location ? providerDetails.msa_doc = fileData.location : "";
        //file data
        if (typeof fileData !== "undefined" && fileData?.location) {
            //delete existing file
            const organisationsRes = await ProviderOrgDetails.findOne({
                where: { provider_org_detail_uuid },
            });
            if (organisationsRes.msa_doc) {
                let fileBasename = path.basename(organisationsRes.msa_doc);
                await deleteS3BucketFile(fileBasename);
            };
        };
        //update other details
        await ProviderOrgDetails.update(providerDetails,
            { where: { provider_org_detail_uuid }, });

        SUCCESS(res, "Provider org. Whs and MSA details updated successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

module.exports = {
    GetProviderUserDetailsById,
    UpdateProviderUserProfile,
    GetProviderDetailsById,
    UpdateProviderOrgDetails,
    UpdateProviderOrgOtherDetails,

};

