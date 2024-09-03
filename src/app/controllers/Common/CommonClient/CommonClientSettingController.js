const Sq = require("sequelize");
const sequelize = require('../../../../config/DbConfig.js');
const path = require("path");
const { SUCCESS, GETSUCCESS, CUSTOMRESPONSE, } = require('../../../../constants/ResponseConstants.js');
const { commonAttributes, deleteS3BucketFile } = require("../../../../services/Helper.js");
const { Organisations, Addresses, ClientDetails, } = require("../../../../models/common/index.js");

const GetSpecificClientDetailsById = async (req, res, next) => {
    try {
        const { organisation_uuid } = req.query;

        const orgRes = await Organisations.findOne({
            where: { organisation_uuid },
            attributes: { exclude: commonAttributes },
            include: [{
                model: ClientDetails,
                attributes: { exclude: commonAttributes }
            },
            {
                model: Addresses,
                as: "org_address_data",
                attributes: { exclude: commonAttributes },
                through: { attributes: [] }
            }]
        });
        GETSUCCESS(res, orgRes, "Get client details by id successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//To check already existing org
const GetAlreadyExistingOrgCheck = async (req, res, next) => {
    try {
        const { trading_name, abn_nzbn, organisation_uuid } = req.query;

        let where_obj = {
            trading_name:
                { [Sq.Op.iLike]: trading_name }, abn_nzbn: { [Sq.Op.iLike]: abn_nzbn }
        };
        //For updation organisation abn/nzbn and organisation trading name check
        if (organisation_uuid) {
            where_obj = {
                ...where_obj,
                organisation_uuid: {
                    [Sq.Op.ne]: organisation_uuid
                }
            };
        };

        const orgRes = await Organisations.findOne({
            where: where_obj, attributes: ["organisation_uuid", "trading_name", "abn_nzbn"]
        });

        GETSUCCESS(res, orgRes, "Get already existing  Organisation query successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };

};
const UpdateClientDetails = async (req, res, next) => {

    try {
        const login_user = req.login_user;
        const clientDetails = req.body;
        let { organisation_uuid, client_address_data } = clientDetails;
        const fileData = req.file;
        clientDetails.updated_by = login_user.user_uuid;
        fileData?.location ? clientDetails.logo = fileData.location : "";

        sequelize.transaction(async (transaction) => {

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
            await Organisations.update(clientDetails, { where: { organisation_uuid }, transaction });
            //parse address data
            client_address_data = JSON.parse(client_address_data);
            //update or create Addresses
            for (let client_address of client_address_data) {
                client_address.updated_by = login_user.user_uuid;
                if (client_address.address_uuid) {

                    await Addresses.update(client_address, {
                        where: { address_uuid: client_address.address_uuid },
                        transaction
                    });
                } else {
                    delete client_address.address_uuid;
                    await Addresses.create(client_address, { transaction });
                };
            };

            CUSTOMRESPONSE(res, "Client details updated successfully!");
        });
    } catch (error) {
        console.log(error);
        next(error);
    };

};
//not required this now requirement changed
const UpdateComplianceChecklistReviewDate = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const accreditationsDetails = req.body;
        const { client_detail_uuid } = accreditationsDetails;
        accreditationsDetails.updated_by = login_user.user_uuid;

        await ClientDetails.update(accreditationsDetails, {
            where: { client_detail_uuid },
        });

        SUCCESS(res, "Client Compliance Checklist review date updated successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

module.exports = {
    GetSpecificClientDetailsById,
    GetAlreadyExistingOrgCheck,
    UpdateClientDetails,
    UpdateComplianceChecklistReviewDate
};
