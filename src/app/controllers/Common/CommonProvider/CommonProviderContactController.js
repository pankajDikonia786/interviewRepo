const Sq = require("sequelize");
const sequelize = require('../../../../config/DbConfig.js');
const { commonAttributes, CommonGetIndividualQuery, OrgindividualGetQuery
} = require("../../../../services/Helper.js");
const { SUCCESS, GETSUCCESS, ALREADYEXISTREPONSE } = require('../../../../constants/ResponseConstants.js');
const { Individuals, Organisations, IndividualOrg, ProviderClientContact,
} = require('../../../../models/common/index.js');

/* Provider Contact api's start */
const GetAllIndividualListForProviderContact = async (req, res, next) => {
    try {
        const { individual: { individual_uuid } } = req.login_user;
        let individualDetails = {
            individual_uuid,
            search: req.query.search
        };
        //Common individual get function
        const individualRes = await CommonGetIndividualQuery(individualDetails);

        GETSUCCESS(res, individualRes, "Get all User list of specific Provider successfully!");

    } catch (error) {
        console.log(error);
        next(error);

    };
};

const AddProviderContact = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const contactDetails = req.body;
        const { organisation_uuid, individual_uuid } = contactDetails;
        contactDetails.created_by = login_user.user_uuid;
        //check if already exists in the related org.
        if (individual_uuid) {
            const IndividualOrgRes = await IndividualOrg.findOne({
                where: {
                    organisation_uuid, individual_uuid, is_user: false
                }
            });
            if (IndividualOrgRes) {
                return ALREADYEXISTREPONSE(res, "This Contact has already exists !");
            };
        };
        sequelize.transaction(async (transaction) => {
            let individualRes;
            if (individual_uuid === "") {
                delete contactDetails.individual_uuid;
                //create individual
                individualRes = await Individuals.create(contactDetails, { transaction });
                contactDetails.individual_uuid = individualRes.individual_uuid;
            };
            //create individual org
            await IndividualOrg.create(contactDetails, { transaction });

            SUCCESS(res, "Contact created successfully!");
        });

    } catch (error) {
        console.log(error);
        next(error);
    };
};

//provider and provider client contact
const GetAllContactsOfProvider = async (req, res, next) => {
    try {
        const { search, page, limit, sort, order, organisation_uuid, } = req.query;

        let where_obj = { organisation_uuid };

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.fn("concat", Sq.col("individual_data.first_name"), " ", Sq.col("individual_data.last_name")),
                        { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.fn("concat", Sq.col("clientContacts.contact_first_name"), " ", Sq.col("clientContacts.contact_last_name")),
                        { [Sq.Op.iLike]: `%${search}%` })
                ],
            };
        };

        const individualRes = await Organisations.findOne({
            where: where_obj, attributes: [],

            include: [{
                model: Individuals,
                as: "individual_data",
                attributes: ["individual_uuid", "title", "first_name", "last_name", "email", "phone", "created_date",],
                through: { where: { is_user: false }, attributes: ["individual_org_uuid", "organisation_uuid", "job_title",] }, required: false
            }, {
                model: ProviderClientContact,
                as: "clientContacts", required: false,
                where: {
                    [Sq.Op.or]: [
                        { contact_first_name: { [Sq.Op.iLike]: `%${search}%` } },
                    ],
                },
            }],

        });
        let response;
        if (individualRes) {
            let allData = [...individualRes.individual_data, ...individualRes.clientContacts];
            if (sort && order) {
                //sort
                allData = allData.sort((a, b) => {
                    let nameA;
                    let nameB;
                    if (sort === "first_name") {
                        nameA = (a.first_name || a.contact_first_name).toUpperCase(); // ignore upper and lowercase
                        nameB = (b.first_name || b.contact_first_name).toUpperCase(); // ignore upper and lowercase
                    } else if (sort === "created_date") {
                        nameA = a.created_date || a.created_date;
                        nameB = b.created_date || b.created_date;
                    };
                    let comparison = 0;

                    if (nameA > nameB) {
                        comparison = 1;
                    } else if (nameA < nameB) {
                        comparison = -1;
                    };

                    return order === 'desc' ? comparison * -1 : comparison;
                });
            };
            // pagination
            const paginatedData = allData.slice((page - 1) * limit, page * limit);
            // Construct your response object with pagination information
            response = {
                rows: paginatedData,
                count: allData.length,
                currentPage: page,
                pageSize: limit
            };
        }
        return GETSUCCESS(res, response || individualRes, 'Get all contacts successfully!');

    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetProviderInternalOrClientContacts = async (req, res, next) => {
    try {
        const { page, limit, sort, order, search, organisation_uuid, type } = req.query;
        let where_query = {};
        let query_obj = {};

        if (search) {
            where_query = type === "internal" ?
                [Sq.where(Sq.fn("concat", Sq.col("org_individual.first_name"), " ", Sq.col("org_individual.last_name")),
                    { [Sq.Op.iLike]: `%${search}%` })] : [Sq.where(Sq.fn("concat", Sq.col("contact_first_name"), " ", Sq.col("contact_last_name")),
                        { [Sq.Op.iLike]: `%${search}%` })];

        };
        if (sort && order) {
            //contact_first_name (for Provider (client contact) or first_name(for provider contact) or created_date
            query_obj.order = [[sort, order]]
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };

        let response;
        if (type == "internal") {
            response = await IndividualOrg.findAndCountAll({
                where: { organisation_uuid, is_user: false, ...where_query },
                attributes: ["organisation_uuid", "job_title", "individual_uuid", "individual_org_uuid",
                    [Sq.col("org_individual.first_name"), "first_name"],
                    [Sq.col("org_individual.last_name"), "last_name"],
                    [Sq.col("org_individual.email"), "email"],
                    [Sq.col("org_individual.phone"), "phone"]
                ],
                include: {
                    model: Individuals, as: "org_individual",
                    attributes: []
                }, ...query_obj
            });
        };
        if (type === "clientContact") {
            response = await ProviderClientContact.findAndCountAll({
                where: { provider_org_uuid: organisation_uuid, ...where_query },
                //provider client organisation 
                include: {
                    model: Organisations, as: "clientContactOrg",
                    attributes: ["organisation_uuid", "trading_name"]
                },
                ...query_obj
            });
        };

        GETSUCCESS(res, response, `Get Provider contacts successfully!`);

    } catch (error) {
        console.log(error);
        next(error);

    };

};
const GetProviderInternalContactById = async (req, res, next) => {
    try {
        const contactDetails = req.query;
        contactDetails.is_user = false;
        //individual get common function
        const individualRes = await OrgindividualGetQuery(contactDetails);

        GETSUCCESS(res, individualRes, "Get Provider Contact by id successfully!");
    } catch (error) {
        console.error(error);
        next(error);
    };
};
const GetProviderClientContactById = async (req, res, next) => {
    try {
        const { provider_client_contact_uuid } = req.query;

        const response = await ProviderClientContact.findOne({
            where: { provider_client_contact_uuid }, attributes: { exclude: commonAttributes }
        });

        GETSUCCESS(res, response, "Get Provider client Contact by id successfully!");
    } catch (error) {
        console.error(error);
        next(error);
    };
};

const UpdateProviderContact = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const contactDetails = req.body;
        const { individual_uuid, organisation_uuid } = contactDetails;
        contactDetails.updated_by = login_user.user_uuid;
        //Update only contact title
        await IndividualOrg.update(contactDetails, {
            where:
                { individual_uuid, organisation_uuid, is_user: false }
        });

        SUCCESS(res, "Contact details updated successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };

};
const UpdateProviderClientContact = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const clientContactDetails = req.body;
        const { provider_client_contact_uuid } = clientContactDetails;
        clientContactDetails.updated_by = login_user.user_uuid;

        await ProviderClientContact.update(clientContactDetails, {
            where: { provider_client_contact_uuid }
        });

        SUCCESS(res, "Contact details updated successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };

};
//need to discuss about account billing contact and delete contact because contact (individual)are universal
const DeleteProviderContact = async (req, res, next) => {
    try {
        const { individual_org_uuid } = req.body;

        await IndividualOrg.destroy({ where: { individual_org_uuid, } });

        SUCCESS(res, "Contact deleted successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};

module.exports = {
    GetAllIndividualListForProviderContact,
    AddProviderContact,
    GetAllContactsOfProvider,
    GetProviderInternalOrClientContacts,
    GetProviderInternalContactById,
    GetProviderClientContactById,
    UpdateProviderContact,
    UpdateProviderClientContact,
    DeleteProviderContact,
};