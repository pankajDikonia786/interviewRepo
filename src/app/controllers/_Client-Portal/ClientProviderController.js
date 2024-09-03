const Sq = require("sequelize");
const fs = require("fs");
const ParseCsv = require("csv-parse").parse;
const ABN_Validator = require("au-bn-validator");
const NZBN_Validator = require("@fnzc/nz-ird-validator");
const sequelize = require('../../../config/DbConfig');
const { SUCCESS, GETSUCCESS,
} = require('../../../constants/ResponseConstants');

const { InviteClientProviderEmailLink, RejectInviteClientProviderEmailLink, } = require("../../../services/UserServices");
const { sendInviteClientProviderEmail } = require("../../../utils/EmailUtils");
const { commonAttributes, } = require("../../../services/Helper");
const { InviteProvider,
    Organisations,
    ProviderOrgDetails,
    Addresses,
    FunctionAssignments,
    FARelations,
    Individuals,
    MasterSettings,
    WorkerChecklistAssign,
    ProviderDocApproval,
    Documents,
    DocumentTypes,
    ProivderTypes,
    Countries,
    ContactTypes,
    WorkerAssign,
    ComplianceChecklist,
    CompanyInductions,
    WorkerDocApproval,
    ChecklistDocs,
    Workers,
    WorkerCompanyInd,
    ProviderChecklistAssign
} = require("../../../models/common");


//Specific Client portal 'Your providers'
//payment and document status pending----------
const GetAllProvidersOfClientAndDetails = async (req, res, next) => {
    try {
        const { sort, order, page, limit, search, client_fa_uuid, client_org_uuid, contact_type_uuid } = req.query;

        let where_obj = {
            f_a_relation_type: "client_provider",
            parent_uuid: client_fa_uuid,//client function_asssignment_uuid
        };
        let query_obj = {};

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("fa_child_data.org_data.trading_name"), { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.col("fa_child_data.org_data.abn_nzbn"), { [Sq.Op.iLike]: `%${search}%` }),

                ],
            };
        };
        if (sort && order) {
            let orderArray = []
            const commonAssociations = [
                { model: FunctionAssignments, as: "fa_child_data" },
                { model: Organisations, as: "org_data" }
            ];
            // if (sort === "end_date") {
            //     orderArray = [{ model: AccountSubscriptions, as: "provider_subs" }, { model: AccountInvoices, as: "acc_invoice" }, sort, order]
            // };
            if (sort === "trading_name" || sort === "abn_nzbn") {
                orderArray = [...commonAssociations, sort, order];
            } else if (sort === "phone") {
                orderArray = [...commonAssociations, { model: Individuals, as: "individual_data" }, sort, order];

            } else {
                orderArray = [sort, order];
            }
            query_obj.order = [orderArray];
        };

        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };

        const response = await FARelations.findAndCountAll({
            where: where_obj,

            attributes: [
                "f_a_relation_uuid", "parent_uuid", "child_uuid", "f_a_relation_type",
                [Sq.col("fa_child_data.org_data.trading_name"), "trading_name"],
                [Sq.col("fa_child_data.org_data.organisation_uuid"), "organisation_uuid"],
                [Sq.col("fa_child_data.org_data.provider_org_detail.master_setting.meta_value_one"), "meta_value_one"],
                [Sq.col("fa_child_data.org_data.provider_org_detail.providerType.provider_type_name"), "provider_type_name"],
                [Sq.col("fa_child_data.org_data.abn_nzbn"), "abn_nzbn"],
                [Sq.col("fa_child_data.org_data.org_address_data.state_name"), "state_name"],
                [Sq.col("fa_child_data.org_data.org_address_data.suburb"), "suburb"],
                [Sq.col("fa_child_data.org_data.individual_data.phone"), "phone"],
                // [Sq.col("provider_subs.acc_invoice.end_date"), "renewal_date"],
                [
                    Sq.literal('(SELECT COUNT("worker_assign_uuid") FROM "common"."worker_assign" AS "wa" ' +
                        'INNER JOIN "common"."organisations" AS "org" ON "wa"."provider_org_uuid" = "org"."organisation_uuid" ' +
                        'WHERE "wa"."client_org_uuid" = ' + "'".concat(client_org_uuid, "'") + '  AND "wa"."deleted_date" IS NULL)'),
                    "ClientaAssignsCount"
                ]
            ],
            include: [
                { //function assignment
                    model: FunctionAssignments,
                    attributes: [],
                    as: "fa_child_data",
                    include: [
                        {
                            model: Organisations, as: "org_data",
                            attributes: [],
                            include: [
                                {
                                    model: Addresses, as: "org_address_data", through: { attributes: [] },
                                    where: { address_type: "business" },
                                    attributes: [],
                                },
                                {
                                    model: ProviderOrgDetails, attributes: [],
                                    include: [{  //master settings (industry type data)
                                        model: MasterSettings,
                                        attributes: []
                                    }, { model: ProivderTypes, as: "providerType", attributes: [] }
                                    ],
                                },
                                {
                                    model: Individuals, as: "individual_data",
                                    attributes: [],
                                    through: { where: { is_user: true, contact_type_uuid }, attributes: [] },
                                },
                            ]
                        },
                    ]
                },
                // {
                //     model: AccountSubscriptions, as: "provider_subs",
                //     where: { client_fa_uuid },
                //     attributes: [],
                //     include: {
                //         model: AccountInvoices, as: "acc_invoice",
                //         attributes: [],
                //     },
                // },
            ],
            ...query_obj,
            distinct: true,
            subQuery: false,
            duplicating: false,
        });

        return GETSUCCESS(res, response, 'Get all Providers of Admin Client successfully!');

    } catch (error) {
        console.log(error);
        next(error);
    };

};


//exclude provider type where client pay pending
//view specific provider according to provider type are pending(need apply checks)-------------
const GetAllGlobalProvidersForClient = async (req, res, next) => {
    try {
        const { page, limit, sort, order, function_uuid, trading_name, meta_value_one, abn_nzbn,
            country_id, state_id, suburb, zipcode, contact_type_uuid, client_fa_uuid } = req.query;
        let where_obj = { function_uuid };
        let query_obj = {};

        if (trading_name) {
            where_obj = {
                ...where_obj,
                trading_name: { [Sq.Op.iLike]: `%${trading_name}%` }
            };
        };
        if (abn_nzbn) {
            where_obj = {
                ...where_obj,
                abn_nzbn: { [Sq.Op.iLike]: `%${abn_nzbn}%` }
            };

        };
        if (meta_value_one) {
            where_obj = {
                ...where_obj,
                '$provider_org_detail.master_setting.meta_value_one$': { [Sq.Op.iLike]: `%${meta_value_one}%` }
            };
        };
        if (country_id) {
            where_obj = {
                ...where_obj,
                '$org_address_data.country_id$': country_id
            };
        };
        if (state_id) {
            where_obj = {
                ...where_obj,
                '$org_address_data.state_id$': state_id
            };
        };
        if (suburb) {
            where_obj = {
                ...where_obj,
                '$org_address_data.suburb$': suburb
            };
        };
        if (zipcode) {
            where_obj = {
                ...where_obj,
                '$org_address_data.zipcode$': zipcode
            };
        };

        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };
        if (sort && order) {
            query_obj.order = [[sort, order]]
        };

        const orgRes = await Organisations.findAndCountAll({

            where: where_obj,
            attributes: ["organisation_uuid", "function_uuid", "trading_name", "abn_nzbn",
                [Sq.col("individual_data.individual_uuid"), "individual_uuid"],
                [Sq.col("individual_data.email"), "email"],
                [Sq.col("individual_data.first_name"), "first_name"],
                [Sq.col("individual_data.last_name"), "last_name"],
                [Sq.col("provider_org_detail.providerType.provider_type_name"), "provider_type_name"],
                [Sq.col(`org_fun_assign.function_assignment_uuid`), "function_assignment_uuid"],
                [Sq.col("org_fun_assign.fa_relation_child.f_a_relation_uuid"), "f_a_relation_uuid"],
                [Sq.col("org_fun_assign.invitedProvider.invite_status"), "invite_status"],
                [Sq.col("org_fun_assign.invitedProvider.invite_provider_uuid"), "invite_provider_uuid"],
                [Sq.col("provider_org_detail.master_setting.meta_value_one"), "meta_value_one"],
                [Sq.col("org_address_data.suburb"), "suburb"],
                [Sq.col("org_address_data.state_name"), "state_name"],
                [Sq.col("org_address_data.country_name"), "country_name"]
            ],
            include: [
                {
                    model: FunctionAssignments, as: "org_fun_assign",
                    attributes: [],
                    required: true,
                    include: [
                        {//invite provider that are already exist (registered as org for related client) and invited 
                            model: InviteProvider, as: "invitedProvider",
                            where: { client_fa_uuid, },
                            attributes: [],
                            required: false,
                        },
                        //if already provider of related client
                        {
                            model: FARelations, as: "fa_relation_child",
                            where: { parent_uuid: client_fa_uuid },
                            required: false,
                        },
                    ]
                },
                {//provider main user (provider)
                    model: Individuals, as: "individual_data",
                    attributes: [],
                    through: { where: { is_user: true, contact_type_uuid }, attributes: [] },
                },
                {
                    model: ProviderOrgDetails,
                    attributes: [],
                    include: [{
                        model: MasterSettings,
                        attributes: [],
                    },////provider type data
                    { model: ProivderTypes, as: 'providerType' }],
                },
                {
                    model: Addresses, as: "org_address_data", attributes: [],
                    through: { attributes: [] }
                },
            ],
            distinct: true,
            duplicating: false,
            subQuery: false,
            ...query_obj,
        });

        GETSUCCESS(res, orgRes, "Get all Globally Providers Successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//working---------------- static contact type
const GetProviderOverviewForClient = async (req, res, next) => {
    try {
        const { organisation_uuid } = req.query;

        const contactTypeRes = await ContactTypes.findAll({
            where: {
                contact_type:
                    ['provider billing', 'provider primary']
            }
        });
        let ContactTypeIds = [contactTypeRes[0].contact_type_uuid, contactTypeRes[1].contact_type_uuid];

        const orgRes = await Organisations.findOne({
            where: { organisation_uuid },
            attributes: { exclude: commonAttributes },
            include: [{
                model: ProviderOrgDetails,
                attributes: {
                    exclude: [...commonAttributes, 'client_engagement_doc',
                        'client_engagement_doc', 'msa_doc', 'high_risk_activity',
                        'whs_system_available', 'msa_info']
                },
                include: [{
                    model: MasterSettings,
                    attributes: ['meta_value_one'],
                },////provider type data
                {
                    model: ProivderTypes, as: 'providerType',
                    attributes: ['provider_type_name']
                }],
            },

            {//contact_type_uuid =provider primary
                model: Individuals, as: "individual_data",
                attributes: { exclude: [...commonAttributes, 'occupation', 'is_conserve_team'] },
                through: {
                    where: {
                        is_user: true, contact_type_uuid: ContactTypeIds

                    }, attributes: ['contact_type_uuid']
                    // include: { model: ContactTypes, as: "contactType", attributes: ['contact_type'] }
                },
            },
            {
                model: Addresses,
                as: "org_address_data",
                attributes: { exclude: commonAttributes },
                through: { attributes: [] },
                include: { model: Countries, attributes: ["phone_code", "country_code"] }
            }]
        });

        GETSUCCESS(res, orgRes, "Get Provider Overview for client successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};
//status pending-------------
const GetAllWorkersOfProviderByClient = async (req, res, next) => {
    try {
        const { page, limit, sort, order, search, provider_org_uuid, client_org_uuid } = req.query;
        let where_query;
        let query_obj = {};
        if (search) {
            where_query = [Sq.where(Sq.fn("concat", Sq.col("assignWorker.worker_individual.first_name"), " ", Sq.col("assignWorker.worker_individual.last_name")), { [Sq.Op.iLike]: `%${search}%` })]

        };
        if (sort && order) {
            sort == "first_name" ?
                query_obj.order = [[{ model: Workers, as: "assignWorker" },
                { model: Individuals, as: "worker_individual" }, sort, order]
                ] : query_obj.order = [[sort, order]];
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };

        // WorkerChecklistAssign.findAll({
        //     where: {
        //         provider_org_uuid,
        //         client_org_uuid
        //     }
        // })

        let workersRes = await WorkerAssign.findAndCountAll({
            where: { provider_org_uuid, client_org_uuid },

            attributes: ['worker_uuid',
                [Sq.col('assignWorker.worker_job_title'), 'worker_job_title'],
                [Sq.col('assignWorker.worker_individual.individual_uuid'), 'individual_uuid'],
                [Sq.col('assignWorker.worker_individual.first_name'), 'first_name'],
                [Sq.col('assignWorker.worker_individual.last_name'), 'last_name'],
                [Sq.col('assignWorker.worker_individual.phone'), 'phone'],

            ],
            include: [
                {
                    model: Workers, as: "assignWorker",
                    where: { provider_org_uuid },
                    attributes: [],
                    include: {
                        model: Individuals, as: "worker_individual", where: where_query,
                        attributes: [],
                        required: true
                    },
                },
                {
                    model: WorkerChecklistAssign, as: 'WCA',//hasmany
                    where: {
                        provider_org_uuid,
                        client_org_uuid

                    },
                    attributes: ['worker_checklist_uuid'],
                    include: {
                        model: ChecklistDocs, as: 'WCDocs',//hasmany
                        required: true,
                        attributes: ['checklist_doc_uuid', 'is_other_doc',
                        ],
                        include: {//single
                            model: WorkerDocApproval, as: "WDA",

                            where: {
                                provider_org_uuid,
                                client_org_uuid,
                                worker_uuid:
                                {
                                    [Sq.Op.eq]:
                                        Sq.col('WCA.worker_uuid')

                                }
                            },
                            attributes: ['worker_doc_appr_uuid', 'worker_uuid', 'approval_status',],
                            required: false,
                        },
                    }
                },
                {
                    model: Organisations, as: 'clientAssign',
                    attributes: ['organisation_uuid'],
                    include: {
                        model: CompanyInductions, as: 'clientCompInd',
                        // attributes: ['company_induction_uuid',],
                        include: {
                            model: WorkerCompanyInd, as: 'wrkrCI',
                            where: {
                                worker_uuid:
                                {
                                    [Sq.Op.eq]:
                                        Sq.col('worker_assign.worker_uuid')

                                }
                            },
                            attributes: ['worker_company_ind_uuid', 'is_comp_ind_completed',],
                            required: false,
                        }
                    }
                }
            ],
            subQuery: false,
            distinct: true,
            ...query_obj
        });
        workersRes = JSON.stringify(workersRes);
        workersRes = JSON.parse(workersRes);
        console.log(workersRes)
        const processedRows = workersRes.rows.map(worker => {
            let allApprovalsApproved = true;
            let allInductionsCompleted = true;

            // Check for worker checklist document approvals
            allApprovalsApproved = worker.WCA.every(workerChecklist => {
                return workerChecklist.WCDocs.every(WCDoc => {
                    return WCDoc.WDA && (WCDoc.WDA.approval_status === 'approved' || WCDoc.WDA.approval_status === 'client_approved_action');
                });
            });

            // Check for client company inductions completion
            if (worker.clientAssign && worker.clientAssign.clientCompInd) {
                worker.clientAssign.clientCompInd.forEach(clientCompInd => {
                    if (!clientCompInd.wrkrCI || !clientCompInd.wrkrCI.is_comp_ind_completed) {
                        allInductionsCompleted = false;
                    }
                });
            } else {
                allInductionsCompleted = false; // Handle the case where clientAssign or clientCompInd is missing or empty
            }

            const status = allApprovalsApproved && allInductionsCompleted ? 'compliant' : 'non-compliant';

            // Create a clean worker object with added status
            const cleanWorker = {
                status: status,
                ...worker,

            };

            return cleanWorker;
        });

        const finalResponse = {
            count: workersRes.count,
            rows: processedRows
        };


        GETSUCCESS(res, finalResponse, "Get all workers of Provider by client successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//Used for View doc via link
const GetProviderApprovalDocbyId = async (req, res, next) => {
    try {

        let { provider_doc_appr_uuid, } = req.query;

        const Response = await ProviderDocApproval.findOne({
            where: { provider_doc_appr_uuid },

            attributes: ["approval_status", "client_org_uuid", "provider_doc_appr_uuid"],
            include: [
                {
                    model: Documents, as: "provApprDoc",
                    attributes: {
                        exclude: ["created_by", "updated_by",
                            "deleted_by", "deleted_date", "updated_date"]
                    },
                    include: {
                        model: DocumentTypes, as: "document_type",
                        attributes: ['doc_type_name']
                    }
                },
            ],
        });

        GETSUCCESS(res, Response, "Get Provider Approval document for Client successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };

};
const GetAllAssignedChecklistOfProvider = async (req, res, next) => {
    try {
        const { client_org_uuid, provider_org_uuid } = req.query;

        const compChklstRes = await ComplianceChecklist.findAll({
            where: {
                client_org_uuid,
                recipient_type: 'provider'
            },
            attributes: ['checklist_uuid', 'client_org_uuid', 'checklist_name', 'recipient_type'],
            include: {//for if checklist assigned
                model: ProviderChecklistAssign, as: 'compAssigns',
                where: { provider_org_uuid },
                attributes: ['provider_checklist_uuid'],
                required: false
            }
        });

        GETSUCCESS(res, compChklstRes, "Get Provider checklist successfully!");

    } catch (error) {
        console.log(error);
        next(error);

    };

};

const CreateOrUpdateChecklistAssign = async (req, res, next) => {
    try {
        let { provider_org_uuid, client_org_uuid, removeChecklistIds, newChecklistIds } = req.body;

        sequelize.transaction(async (transaction) => {


            if (removeChecklistIds?.length > 0) {
                removeChecklistIds = JSON.parse(removeChecklistIds);

                await ProviderChecklistAssign.destroy({ where: { provider_org_uuid, }, transaction })
            };
            if (newChecklistIds?.length > 0) {
                let checklistAssignArr = [];
                newChecklistIds = JSON.parse(newChecklistIds);

                for (let checklist_uuid of newChecklistIds) {
                    checklistAssignArr.push({ provider_org_uuid, client_org_uuid, checklist_uuid });
                };
                await ProviderChecklistAssign.bulkCreate(checklistAssignArr);

            };

            SUCCESS(res, 'Provider Checklist updated successfully!');
        });
    } catch (error) {
        console.log(error);
        next(error);

    };

};
module.exports = {
    GetAllProvidersOfClientAndDetails,
    GetAllGlobalProvidersForClient,
    GetProviderOverviewForClient,
    GetAllWorkersOfProviderByClient,
    GetProviderApprovalDocbyId,
    GetAllAssignedChecklistOfProvider

};
