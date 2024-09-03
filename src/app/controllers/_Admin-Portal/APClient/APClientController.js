const Sq = require("sequelize");
const sequelize = require('../../../../config/DbConfig');
const { SUCCESS, GETSUCCESS, } = require('../../../../constants/ResponseConstants');

const { commonAttributes, } = require("../../../../services/Helper.js");
const { Organisations, Addresses, OrgAddresses, FunctionAssignments, FARelations, Individuals,
    IndividualOrg, ClientDetails, MasterSettings, ProviderOrgDetails, AccountInvoices, AccountSubscriptions,
    InviteProvider,
    ProivderTypes } = require("../../../../models/common");
    const {sendNotification} =require("../../../../services/SocketHandlers.js")
const GetAllParentClientList = async (req, res, next) => {
    const { function_uuid } = req.query;
    try {
        const functionAssignmentsRes = await FunctionAssignments.findAll(
            {
                where: { function_uuid, f_a_parent_child_level: { [Sq.Op.ne]: 2 } },
                attributes: ["f_a_parent_child_level", "function_assignment_uuid",
                    [Sq.col("org_data.trading_name"), "trading_name"],
                    [Sq.col("org_data.organisation_uuid"), "organisation_uuid"],
                    [Sq.col("org_data.trading_name"), "trading_name"]
                ],
                include: {
                    model: Organisations, as: "org_data",
                    attributes: [],
                }
            }
        );
        return GETSUCCESS(res, functionAssignmentsRes, 'Get All Parent Client list successfully!!');

    } catch (error) {
        console.log(error);
        next(error);
    };

};

const AddClient = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const clientDetails = req.body;
        const{trading_name} =clientDetails

        let { client_address_data, function_uuid, function_assignment_uuid, f_a_relation_type, f_a_parent_child_level } = clientDetails;
        clientDetails.created_by = login_user.user_uuid;
        //delete if empty
        delete clientDetails.function_assignment_uuid;
        delete clientDetails.organisation_uuid;

        const fileData = req.file;
        fileData?.location ? clientDetails.logo = fileData?.location : clientDetails.logo = "";

        await sequelize.transaction(async (transaction) => {

            //Create organisations
            const orgRes = await Organisations.create(clientDetails, { transaction });
            //create client other details entry (accreditations and other)
            await ClientDetails.create({ organisation_uuid: orgRes.organisation_uuid }, { transaction });//not clear yet
            //Create Addressesss
            const addressesRes = await Addresses.bulkCreate(JSON.parse(client_address_data), { raw: true, transaction });

            // Create organisation addresses relation
            await OrgAddresses.bulkCreate([{
                organisation_uuid: orgRes.organisation_uuid,
                address_uuid: addressesRes[0].address_uuid
            },
            {
                organisation_uuid: orgRes.organisation_uuid,
                address_uuid: addressesRes[1].address_uuid
            }
            ], { transaction });

            //create function assignment
            const functionAssignments = await FunctionAssignments.create({
                function_uuid, organisation_uuid: orgRes.organisation_uuid,
                f_a_parent_child_level
            }, { transaction });

            await Organisations.update({
                function_assignment_uuid: functionAssignments.function_assignment_uuid
            }, { where: { organisation_uuid: orgRes.organisation_uuid }, transaction });

            if (function_assignment_uuid) {
                //if condition contain parent client function_assignment_uuid
                //Create the parent child relationship
                await FARelations.create({
                    parent_uuid: function_assignment_uuid,
                    f_a_relation_type,
                    child_uuid: functionAssignments.function_assignment_uuid
                }, { transaction });
            };
            await sendNotification(`New client added to system : ${trading_name}`, ["client service team"], "",{task_assgined:["adminClient"],is_task:true,trading_name});
            SUCCESS(res, 'Client created successfully!');

        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};

//pending some status data
const AdminGetAllClients = async (req, res, next) => {

    try {
        const { sort, order, page, limit, search, function_uuid, } = req.query;

        let where_obj = {};
        let query_obj = {};
        if (search) {
            where_obj = {
                [Sq.Op.or]: [
                    Sq.where(Sq.col("trading_name"), { [Sq.Op.iLike]: `%${search}%` }),
                ],
            }
        };
        if (sort && order) {
            query_obj.order = [[sort, order]]
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };
        const orgRes = await Organisations.findAndCountAll({
            where: where_obj,
            attributes: ["organisation_uuid", "org_name",
                "trading_name", "is_org_active", "logo", "abn_nzbn", "created_date"
            ],
            include: [
                {
                    model: FunctionAssignments,
                    as: "org_fun_assign",
                    where: { function_uuid, f_a_parent_child_level: 0 },
                    attributes: ["function_assignment_uuid", "function_uuid"],
                    include: [
                        {//child clients junctions
                            model: FARelations,
                            required: true,
                            separate: true,
                            attributes: ["f_a_relation_uuid", "parent_uuid", "child_uuid"],
                            where: { f_a_relation_type: "client_sub_client" },
                            as: "fa_relation_data",
                            required: false,
                            include: {//first level child function assignment
                                model: FunctionAssignments,
                                where: { function_uuid },
                                attributes: ["function_assignment_uuid", "assignment_name", "organisation_uuid"],
                                as: "fa_child_data",
                                include: [
                                    {
                                        model: Organisations, as: "org_data", attributes: ["organisation_uuid", "org_name", "trading_name", "is_org_active"],
                                        // include: { model: Individuals, as: "individual_data", through: { where: { contact_type_uuid }, attributes: [] }, }
                                    },
                                    {//joins child second levels of parent
                                        model: FARelations,
                                        required: true,
                                        separate: true,
                                        attributes: ["f_a_relation_uuid", "parent_uuid", "child_uuid"],
                                        where: { f_a_relation_type: "client_sub_client" },
                                        as: "fa_relation_data",
                                        required: false,
                                        include: {
                                            model: FunctionAssignments,
                                            where: { function_uuid },
                                            attributes: ["function_assignment_uuid", "assignment_name", "organisation_uuid"],
                                            as: "fa_child_data",
                                            include: {
                                                model: Organisations, as: "org_data", attributes: ["organisation_uuid", "org_name", "trading_name", "is_org_active"],
                                                // include: { model: Individuals, as: "individual_data" }

                                            },
                                        }
                                    }
                                ],
                            },
                        }]
                },
            ],

            ...query_obj,
            distinct: true,
            subQuery: false
        });

        return GETSUCCESS(res, orgRes, 'Get All client details successfully!');
    } catch (error) {
        console.log(error);
        next(error);
    }
};
//working------------providertype,sort,status and status wise filter pending
//Admin portal specific client provider details
const GetAllProvidersOfClient = async (req, res, next) => {
    try {
        const { sort, order, page, limit, search, client_fa_uuid, statusType } = req.query;

        let where_obj = {
            f_a_relation_type: "client_provider",
            parent_uuid: client_fa_uuid,//client function_asssignment_uuid
        };
        let query_obj = {};

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("fa_child_org.trading_name"), { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.col("fa_child_org.abn_nzbn"), { [Sq.Op.iLike]: `%${search}%` }),
                ],
            };
        };
        if (sort && order) {
            let orderArray = []
            if (sort === "end_date") {
                orderArray = [{ model: AccountSubscriptions, as: "provider_subs" }, { model: AccountInvoices, as: "acc_invoice" }, sort, order]
            };
            if (sort === "abn_nzbn") {
                orderArray = [{ model: Organisations, as: "fa_child_org" }, sort, order];
            };
            if (sort == "trading_name") {
                orderArray = [{ model: Organisations, as: "fa_child_org", }, sort, order];
                query_obj.order = [orderArray];
            };
            if (sort == "meta_value_one") {
                orderArray = [{ model: Organisations, as: "fa_child_org", }, { model: ProviderOrgDetails, }, { model: MasterSettings, }, sort, order];
                query_obj.order = [orderArray];
            };

            if (sort === "created_date") {
                orderArray = [sort, order];
            };
            query_obj.order = [orderArray]
        };

        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };

        const response = await FARelations.findAndCountAll({
            where: where_obj,
            attributes: [
                "f_a_relation_uuid", "parent_uuid", "child_uuid", "f_a_relation_type",
                [Sq.col("fa_child_org.trading_name"), "trading_name"],
                [Sq.col("fa_child_org.provider_org_detail.master_setting.meta_value_one"), "meta_value_one"],
                [Sq.col("fa_child_org.provider_org_detail.providerType.provider_type_name"), "provider_type_name"],
                [Sq.col("fa_child_org.org_address_data.state_name"), "state_name"],
                // [Sq.col("fa_child_org.individual_data.first_name"), "first_name"],
                // [Sq.col("fa_child_org.individual_data.last_name"), "last_name"],
                [Sq.col("fa_child_org.abn_nzbn"), "abn_nzbn"],
                [Sq.col("provider_subs.acc_invoice.end_date"), "renewal_date"],
            ],
            include: [

                {
                    model: Organisations, as: "fa_child_org", attributes: [],
                    required: true,
                    include: [
                        {
                            model: Addresses, as: "org_address_data",
                            where: { address_type: "business" },
                            through: { attributes: [] },
                            attributes: [],
                        },
                        {
                            model: ProviderOrgDetails, attributes: [],

                            //master settings (industry type data)
                            include: [
                                { model: MasterSettings, attributes: [] },
                                { model: ProivderTypes, as: "providerType", attributes: [] }
                            ],
                        },
                        // {
                        //     model: Individuals, as: "individual_data",
                        //     attributes: [],
                        //     through: { where: { is_user: true, contact_type_uuid }, attributes: [] },
                        // },
                    ]
                },
                {
                    model: AccountSubscriptions, as: "provider_subs",
                    where: { client_fa_uuid },
                    required: false,
                    attributes: [],
                    include: {
                        model: AccountInvoices, as: "acc_invoice",
                        attributes: [],
                    },
                },
            ],
            ...query_obj,
            distinct: true,
            subQuery: false,
        });

        return GETSUCCESS(res, response, 'Get all Providers of Admin Client successfully!');

    } catch (error) {
        console.log(error);
        next(error);
    };

};

/* Specific Admin-client settings */

//Accreditations update
const UpdateClientAccreditations = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const accreditationsDetails = req.body;
        const { client_detail_uuid } = accreditationsDetails;
        accreditationsDetails.updated_by = login_user.user_uuid;
        await ClientDetails.update(accreditationsDetails, {
            where: { client_detail_uuid },
        });

        SUCCESS(res, "Client Accreditations details updated successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

/* end specific client settings */

module.exports = {
    GetAllParentClientList,
    AddClient,
    AdminGetAllClients,
    GetAllProvidersOfClient,
    UpdateClientAccreditations,

};

