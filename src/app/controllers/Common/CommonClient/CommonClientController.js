const path = require("path");
const Sq = require("sequelize");
const sequelize = require('../../../../config/DbConfig');
const { SUCCESS, GETSUCCESS, ALREADYEXISTREPONSE, NOTFOUND } = require('../../../../constants/ResponseConstants');
const { commonAttributes, CommonGetIndividualQuery, OrgindividualGetQuery } = require("../../../../services/Helper");
const { sendIndividualEmail } = require("../../../../utils/EmailUtils");
const {
    InviteProvider,
    Organisations,
    Emails,
    EmailTemplates,
    EmailTempAttachments,
    IndividualOrg,
    FunctionAssignments,
    FARelations,
    Individuals,
    MasterSettings,
    Addresses,
    ClientDetails,
    ProviderOrgDetails,
    ProivderTypes,
    ClientSiteContacts
} = require("../../../../models/common");


const GetAllProvidersPrimaryList = async (req, res, next) => {
    try {
        //function_assignment_uuid = client and function_uuid = provider
        const { search, function_uuid, contact_type_uuid, function_assignment_uuid } = req.query;
        let where_obj = { function_uuid };

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("abn_nzbn"), { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.col("trading_name"), { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.col("individual_org.org_individual.email"), { [Sq.Op.iLike]: `%${search}%` }),
                ]
            };
        };
        const functionAssignmetRes = await Organisations.findAll({
            where: where_obj,
            attributes: ["organisation_uuid", "abn_nzbn", "function_uuid", "trading_name",
                [Sq.col("provider_org_detail.providerType.provider_type_name"), "provider_type_name"],
                [Sq.col("org_fun_assign.function_assignment_uuid"), "function_assignment_uuid"],
                [Sq.col("individual_org.org_individual.individual_uuid"), "individual_uuid"],
                [Sq.col("individual_org.org_individual.user_uuid"), "user_uuid"],
                [Sq.col("individual_org.org_individual.email"), "email"],
                [Sq.col("individual_org.org_individual.first_name"), "first_name"],
                [Sq.col("individual_org.org_individual.last_name"), "last_name"],
                [Sq.col("org_fun_assign->fa_relation_child.f_a_relation_uuid"), "f_a_relation_uuid"],

            ],
            include: [
                {
                    model: FunctionAssignments, as: "org_fun_assign", attributes: [],
                    //only check specific client-provider (for check if provider. already exist with client)
                    include: {
                        model: FARelations, as: "fa_relation_child",
                        required: false,
                        where: { parent_uuid: function_assignment_uuid, f_a_relation_type: "client_provider" }, attributes: []
                    }
                },
                {
                    model: ProviderOrgDetails, attributes: [],
                    include: { model: ProivderTypes, as: 'providerType', attributes: [] }

                },
                {//contact type (provider primary contact)
                    model: IndividualOrg, as: "individual_org", attributes: [],
                    where: { contact_type_uuid, is_user: true },
                    subQuery: false, duplicating: false,
                    include: { model: Individuals, as: "org_individual", attributes: [] }
                }
            ],

        });

        return GETSUCCESS(res, functionAssignmetRes, "Get all Providers list successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//Invite Provider api's
const GetAllInvitedProvidersOfClient = async (req, res, next) => {
    try {
        const { page, limit, sort, order, search, client_fa_uuid } = req.query;

        let where_obj = { client_fa_uuid, invite_status: { [Sq.Op.or]: ['Invited', 'Rejected'] } };
        let query_obj = {};

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [,
                    { provider_abn_nzbn: { [Sq.Op.iLike]: `%${search}%` } },
                    { email: { [Sq.Op.iLike]: `%${search}%` } },
                    Sq.where(Sq.fn("concat", Sq.col("invitedProvider.first_name"), " ",
                        Sq.col("invitedProvider.last_name")), { [Sq.Op.iLike]: `%${search}%` }),

                ],

            };
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };
        if (sort && order) {
            let sortArray = [];
            if (sort === "first_name") {
                sortArray = [{ model: Individuals, as: 'invitedProvider' }, sort, order];
                query_obj.order = [sortArray];
            }
            if (sort === "provider_type_name") {
                sortArray = [{ model: ProivderTypes, as: "invitedProviderType" }, sort, order];
                query_obj.order = [sortArray];
            }
            if (sort === "meta_value_one") {
                sortArray = [{ model: Organisations, as: "invitedProviderOrg", },
                { model: ProviderOrgDetails, }, { model: MasterSettings, }, sort, order];
                query_obj.order = [sortArray];
            }
            else {
                query_obj.order = [[sort, order]]
            };

        };
        const InviteProviderRes = await InviteProvider.findAndCountAll({
            where: where_obj,
            attributes: ["invite_provider_uuid", "invite_status", "provider_abn_nzbn",
                [Sq.col('invitedProvider.first_name'), 'first_name'],
                [Sq.col('invitedProvider.last_name'), 'last_name'],
                [Sq.col('invitedProviderType.provider_type_name'), 'provider_type_name'],
                [Sq.col('invitedProviderOrg.provider_org_detail.master_setting.meta_value_one'), 'serviceName'],
                [Sq.col('invitedProviderOrg.org_address_data.state_name'), 'state_name'],

            ],
            include: [
                {
                    model: Individuals, as: "invitedProvider",
                    attributes: []
                },
                {
                    model: ProivderTypes, as: "invitedProviderType",
                    attributes: []
                },
                {
                    model: Organisations, as: "invitedProviderOrg",
                    attributes: [],
                    required: false,
                    include: [
                        {
                            model: ProviderOrgDetails,
                            attributes: [],
                            include: {
                                model: MasterSettings,
                                attributes: []
                            }
                        },
                        {

                            model: Addresses, as: "org_address_data",
                            attributes: [],
                            through: { attributes: [] },
                            duplicating: false

                        }
                    ]
                }
            ],
            ...query_obj,
        });

        return GETSUCCESS(res, InviteProviderRes, "Get all Provider of Client successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    }
};

/* Contact api's start */
const GetAllIndividualListForContact = async (req, res, next) => {
    try {
        const { individual: { individual_uuid } } = req.login_user;
        let individualDetails = {
            individual_uuid,
            search: req.query.search
        };
        //Common individual get function
        const individualRes = await CommonGetIndividualQuery(individualDetails);

        GETSUCCESS(res, individualRes, "Get all User list of specific client successfully!");

    } catch (error) {
        console.log(error);
        next(error);

    };
};
//working add org if user already exist
//working update database and api's
const AddClientContact = async (req, res, next) => {
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
            //if not exist then create otherwise link only
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
const GetAllClientContacts = async (req, res, next) => {
    try {
        const { search, page, limit, sort, order, organisation_uuid } = req.query;

        let query_obj = {};
        let where_obj = { organisation_uuid, is_user: false, };

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.fn("concat", Sq.col("org_individual.first_name"),
                        " ", Sq.col("org_individual.last_name")),
                        { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.col("job_title"), { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.col("org_individual.email"), { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.col("org_individual.phone"), { [Sq.Op.iLike]: `%${search}%` }),
                ],
            };
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;

        };
        if (sort && order) {
            query_obj.order = [[sort, order]]
        };
        const individualRes = await IndividualOrg.findAndCountAll({
            where: where_obj,
            attributes: [
                'individual_org_uuid', 'organisation_uuid', 'job_title', 'is_client_site_contact',
                [Sq.col("org_individual.individual_uuid"), "individual_uuid"],
                [Sq.col("org_individual.first_name"), "first_name"],
                [Sq.col("org_individual.last_name"), "last_name"],
                [Sq.col("org_individual.email"), "email"],
                [Sq.col("org_individual.phone"), "phone"]
            ],
            include: {
                model: Individuals,
                as: "org_individual",
                attributes: [],
            },
            ...query_obj
        });
        return GETSUCCESS(res, individualRes, 'Get all Contacts of Client successfully!');

    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetClientContactById = async (req, res, next) => {
    try {
        const contactDetails = req.query;
        contactDetails.is_user = false;
        //individual get common function
        const individualRes = await OrgindividualGetQuery(contactDetails);

        GETSUCCESS(res, individualRes, "Get Client Contact by id successfully!");
    } catch (error) {
        console.error(error);
        next(error);
    };
};

const UpdateClientContact = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const contactDetails = req.body;
        let { individual_uuid,
            organisation_uuid,//client
            function_assignment_uuid,//client
            individual_data,
            is_client_site_contact
        } = contactDetails;
        contactDetails.updated_by = login_user.user_uuid;

        //Update only contact title
        await IndividualOrg.update(contactDetails, {
            where:
                { individual_uuid, organisation_uuid, is_user: false }
        });
        //contact data only can update from Admin-Client portal 
        if (individual_data) {
            await Individuals.update(individual_data, { where: { individual_uuid } });
        };
        //delete all if false contact of sites
        if (is_client_site_contact === false || is_client_site_contact === 'false') {
            await ClientSiteContacts.destroy({ where: { individual_uuid, client_fa_uuid: function_assignment_uuid } });
        };

        SUCCESS(res, "Contact details updated successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };

};
//need to discuss about account billing contact and delete contact because contact (individual)are universal
const DeleteClientContact = async (req, res, next) => {
    try {

        sequelize.transaction(async (transaction) => {
            const { individual_org_uuid, function_assignment_uuid, } = req.body;

            const { individual_uuid, is_client_site_contact } = await IndividualOrg.findOne(
                {
                    where: { individual_org_uuid }
                });
            if (is_client_site_contact === true || is_client_site_contact === 'true') {
                await ClientSiteContacts.destroy({ where: { individual_uuid, client_fa_uuid: function_assignment_uuid }, transaction });
            };

            await IndividualOrg.destroy({ where: { individual_org_uuid }, transaction });
            SUCCESS(res, "Contact deleted successfully!");
        });

    } catch (error) {
        console.log(error);
        next(error);
    };
};

//Common Accreditations details Get
const GetClientOtherDetailsById = async (req, res, next) => {
    try {
        const { organisation_uuid } = req.query;
        const clientDetailsRes = await ClientDetails.findOne({
            where: { organisation_uuid },
            attributes: { exclude: commonAttributes }
        });

        GETSUCCESS(res, clientDetailsRes, "Get Client other details successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

module.exports = {
    GetAllProvidersPrimaryList,
    GetAllInvitedProvidersOfClient,

    GetAllIndividualListForContact,
    AddClientContact,
    GetAllClientContacts,
    GetClientContactById,
    UpdateClientContact,
    DeleteClientContact,
    GetClientOtherDetailsById

};
