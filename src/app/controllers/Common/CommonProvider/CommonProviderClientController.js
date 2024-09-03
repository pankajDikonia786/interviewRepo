
const Sq = require("sequelize");
const sequelize = require('../../../../config/DbConfig.js');
const { SUCCESS, GETSUCCESS, } = require('../../../../constants/ResponseConstants.js');
const {
    Organisations,
    FARelations,
    ProviderDocApproval,
    ProviderClientContact,
    Checklists,
    ChecklistDocs,
    DocumentTypes,
    InviteProvider,
    Individuals,
    Documents,
    OrgDocuments,
    DocHistory,
    WorkerAssign,
    Workers,
    ProviderChecklistAssign
} = require('../../../../models/common/index.js');
const { commonAttributes } = require("../../../../services/Helper.js");

/* Provider -> Clients */
//working----------------------payment status of non compliant pending and check when not any doc mendatory available pending
//do we need to show compliant if all comp docs are not-mandtory and added by all docs by provider ? 
const GetAllClientsOfProvider = async (req, res, next) => {
    try {
        const { page, limit, sort, order, search, provider_fa_uuid, provider_org_uuid, } = req.query;

        let where_obj = { child_uuid: provider_fa_uuid, f_a_relation_type: "client_provider" };
        let query_obj = {};

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("fa_parent_org.provClientCont.contact_email"), { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.col("fa_parent_org.trading_name"), { [Sq.Op.iLike]: `%${search}%` }),
                ]
            };
        };
        if (sort && order) {
            if (sort === "trading_name")
                query_obj.order = [[{ model: Organisations, as: "fa_parent_org", }, sort, order]];
            else
                query_obj.order = [[sort, order]];
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };
        const clientsRes = await FARelations.findAndCountAll({
            where: where_obj,
            attributes: [],
            include: {
                model: Organisations, as: "fa_parent_org",
                attributes: ["organisation_uuid", "trading_name", "function_assignment_uuid"],

                include: [

                    {//provider client contact
                        model: ProviderClientContact, as: "provClientCont",
                        attributes: [
                            "contact_email",
                            "contact_phone",
                            "contact_first_name",
                            "contact_last_name"],
                        where: {
                            is_main_contact: true,
                            provider_org_uuid
                        },
                        required: false
                    },
                    {//assigned compliance checklist of provider by client
                        model: ProviderChecklistAssign, as: "ClientChklist",
                        separate: true,
                        required: false,
                        attributes: ['provider_checklist_uuid',],
                        include: {
                            model: ChecklistDocs, as: 'ProvCheckDoc', required: true,
                            attributes: ['checklist_doc_uuid', 'is_other_doc', 'other_doc_name', 'document_type_uuid"',
                                'is_doc_mandatory',
                            ],
                            required: true,
                            include: [
                                {//single
                                    model: ProviderDocApproval, as: "DocAppr",
                                    where: { provider_org_uuid },
                                    attributes: ["approval_status", "reviewed_date"],
                                    required: false,
                                    // include: {
                                    //     model: Documents, as: "provApprDoc",
                                    //     attributes: ["doc_name",]
                                    // }
                                },
                                // {
                                //     model: DocumentTypes,
                                //     attributes: { exclude: commonAttributes }
                                // }
                            ]
                        },
                    },
                ]
            },

            ...query_obj,
            subQuery: false,
            distinct: true,

        });
        // return res.json(clientsRes)
        let modifiedData = clientsRes.rows.map((val, ind, arr) => {
            let orgChklist = val.fa_parent_org?.ClientChklist;
            if (orgChklist.length > 0) {

                // Initialize approved count and total mandatory count
                let totalMandatoryCount = 0;
                let approvedMandatoryCount = 0;

                // Iterate over each orgChklist entry
                orgChklist?.forEach((docVal, docInd) => {
                    let compDocs = docVal.ProvCheckDoc;

                    // If no compliance documents exist for the client or compDocs is falsy
                    if (!compDocs || compDocs.length === 0) {
                        return; // Exit the loop for this organization
                    }
                    const approvedStatuses = ["approved", "client_approved_action"];

                    // Count the total number of mandatory documents
                    totalMandatoryCount += compDocs.filter(doc => doc.is_doc_mandatory).length;

                    // Count the number of approved mandatory documents
                    approvedMandatoryCount += compDocs.filter(doc => doc.is_doc_mandatory && approvedStatuses.includes(doc?.DocAppr?.approval_status)).length;
                });

                // Determine the mainDocStatus based on the comparison of approvedMandatoryCount and totalMandatoryCount
                let mainDocStatus = approvedMandatoryCount === totalMandatoryCount ? 'Compliant' : 'Non-compliant';

                // Return the organization details along with the calculated docs_status
                return { docs_status: mainDocStatus, ...val.fa_parent_org.toJSON() };
            } else {
                //if not data
                return { docs_status: "-", ...val.fa_parent_org.toJSON() };//need to discuss
            }
        });

        GETSUCCESS(res,
            { count: clientsRes.count, rows: modifiedData },
            // clientsRes,
            "Get all Clients Of Provider successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };

};

const GetProviderAllClientInvites = async (req, res, next) => {
    try {
        const { page, limit, sort, order, provider_fa_uuid, search, } = req.query;

        let where_obj = {};
        let query_obj = {};

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("provInvitedBy.email"), { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.fn("concat", Sq.col("provInvitedBy.first_name"), " ", Sq.col("provInvitedBy.last_name")), { [Sq.Op.iLike]: `%${search}%` }),
                ]
            };
        };
        if (sort && order) {
            if (sort === "first_name" || sort === "email")
                query_obj.order = [[{ model: Individuals, as: "provInvitedBy" }, sort, order]];
            else
                query_obj.order = [[sort, order]];
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };
        const inviteProviderRes = await InviteProvider.findAndCountAll({
            where: { provider_fa_uuid, invite_status: { [Sq.Op.ne]: "Active" } },
            attributes: ["invite_provider_uuid", [Sq.col("provInvitedBy.first_name"), "first_name"],
                [Sq.col("provInvitedBy.last_name"), "last_name"], [Sq.col("provInvitedBy.email"), "email"]
            ],
            include: { model: Individuals, as: "provInvitedBy", attributes: [] }
        });
        GETSUCCESS(res, inviteProviderRes, "Get all  Client invites of Provider successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};

const GetSubmissionDocsOfProvider = async (req, res, next) => {
    try {
        const { individual: { is_conserve_team } } = req.login_user;
        let { checklistDocIds, provider_org_uuid, sort, order } = req.query;

        let query_obj = {};
        if (checklistDocIds) {
            //parse
            checklistDocIds = JSON.parse(checklistDocIds);
        };

        if (sort && order) {
            if (sort === 'doc_name')
                query_obj.order = [[{ model: ProviderDocApproval, as: "DocAppr", },
                { model: Documents, as: "provApprDoc", }, sort, order]];
            if (sort === 'doc_type_name')
                query_obj.order = [[{ model: DocumentTypes, }, sort, order]];
        };

        const ChecklistDocRes = await ChecklistDocs.findAll({
            where: { checklist_doc_uuid: checklistDocIds },//array
            attributes: { exclude: commonAttributes },
            include: [
                {//single 
                    model: ProviderDocApproval, as: "DocAppr",
                    where: { provider_org_uuid },
                    attributes: ["approval_status", "client_org_uuid", "provider_doc_appr_uuid"],
                    required: false,
                    include: [
                        {
                            model: Documents, as: "provApprDoc",
                            attributes: {
                                exclude: ["created_by", "updated_by",
                                    "deleted_by", "deleted_date", "updated_date"]
                            }
                        },
                    ]
                },
                {
                    model: DocumentTypes,
                    attributes: { exclude: commonAttributes }
                }
            ]
        });
        // Get unique client_org_uuid 
        const uniqueClientOrgUuids = ChecklistDocRes.map(item =>
            item.DocAppr?.client_org_uuid).filter(uuid => uuid !== null);
        let OrgRes;
        //for check if login user in admin or owner provider
        if (is_conserve_team || !uniqueClientOrgUuids.includes(provider_org_uuid)) {
            //get all client against specific submitted doc approval
            OrgRes = await Organisations.findAll({
                where: { organisation_uuid: uniqueClientOrgUuids }, attributes: [
                    'organisation_uuid', 'trading_name']
            });
        };
        GETSUCCESS(res, { docs: ChecklistDocRes, clientOrg: OrgRes }, "Get Provider document against client successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };

};
const GetAllDocsOfProviderByDocType = async (req, res, next) => {
    try {
        const { provider_org_uuid, document_type_uuid } = req.query;

        const orgDocumentsRes = await OrgDocuments.findAll({
            where: { organisation_uuid: provider_org_uuid },
            attributes: [
                [Sq.col("providerDoc.document_uuid"), "document_uuid"],
                [Sq.col("providerDoc.doc_name"), "doc_name"],
                [Sq.col("providerDoc.expiry_date"), "expiry_date"]],
            include: {
                model: Documents, as: "providerDoc",
                required: true,
                where: { document_type_uuid, is_other_doc: false },
                attributes: [],
            },
        });

        GETSUCCESS(res, orgDocumentsRes, "Get all Documents by Document type successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

const SubmitExistingDocToClient = async (req, res, next) => {
    try {
        const { user_uuid, individual: { first_name, last_name } } = req.login_user;
        const providerDocAppDetails = req.body;
        providerDocAppDetails.created_by = user_uuid;

        sequelize.transaction(async (transaction) => {

            const providerdocAppRes = await ProviderDocApproval.create(providerDocAppDetails, { transaction });

            //create ProviderDocApproval history
            const docChangeHistoryDetails = {
                document_uuid: providerDocAppDetails.document_uuid,
                created_by: user_uuid,
                action_type: "create_doc_appr",
                provider_doc_appr_uuid: providerdocAppRes.provider_doc_appr_uuid,
                desc_html: [`<p>${first_name + " " + last_name} has send to Client for approval</p>`],
                new_value: providerdocAppRes,
            };

            await DocHistory.create(docChangeHistoryDetails, { transaction });

            SUCCESS(res, "Document submitted successfully!");
        });

    } catch (error) {
        console.log(error);
        next(error);
    };

};
//specific provider workers
const GetAllAssignedWorkerToClient = async (req, res, next) => {
    try {
        const { provider_org_uuid, client_org_uuid } = req.query;

        const workerAssignRes = await WorkerAssign.findAll({
            where: { provider_org_uuid, client_org_uuid },
            attributes: ['worker_uuid',
                [Sq.col('assignWorker.worker_job_title'), 'worker_job_title'],
                [Sq.col('assignWorker.worker_individual.first_name'), 'first_name'],
                [Sq.col('assignWorker.worker_individual.last_name'), 'last_name'],
                [Sq.col('assignWorker.worker_individual.phone'), 'phone'],
            ],
            include: [
                {
                    model: Workers, as: 'assignWorker', attributes: [],
                    required: true,
                    include: { model: Individuals, as: 'worker_individual', attributes: [], },
                }
            ]
        });

        GETSUCCESS(res, workerAssignRes, "Get All Assigned workers of Provider to Client successfully!")

    } catch (error) {
        console.log(error);
        next(error);
    };
};
const CreateAndSubmitOtherDoc = async (req, res, next) => {
    try {
        const { login_user, body: DocDetails } = req;
        const { organisation_uuid, client_org_uuid, checklist_doc_uuid, } = DocDetails;
        const { user_uuid, individual: { first_name, last_name } } = login_user;
        DocDetails.created_by = user_uuid;
        DocDetails.is_other_doc = true;
        //file data
        req.file?.location ? DocDetails.doc_file = req.file.location : "";

        sequelize.transaction(async (transaction) => {

            //create documents
            const documentRes = await Documents.create(DocDetails, { transaction });
            const { document_uuid } = documentRes;
            DocDetails.document_uuid = document_uuid;

            //org.doc provider junction
            await OrgDocuments.create({ document_uuid, organisation_uuid }, { transaction });

            const providerDocAppRes = await ProviderDocApproval.create({
                document_uuid,
                client_org_uuid,
                checklist_doc_uuid,
                provider_org_uuid: organisation_uuid,
                created_by: user_uuid,
            }, { transaction });

            let historydataObj = { document_uuid, created_by: user_uuid };
            //create ProviderDocApproval history
            let docChangeHistoryArr = [
                {
                    ...historydataObj,
                    action_type: "create_doc",
                    desc_html: [`<p>${first_name + " " + last_name} has Created the New document</p>`],
                    new_value: JSON.stringify(DocDetails),
                },
                {
                    ...historydataObj,
                    action_type: "create_doc_appr",
                    provider_doc_appr_uuid: providerDocAppRes.provider_doc_appr_uuid,
                    desc_html: [`<p>${first_name + " " + last_name} has send to Client for approval</p>`],
                    new_value: JSON.stringify(providerDocAppRes),
                }];

            //Create history
            await DocHistory.bulkCreate(docChangeHistoryArr, { transaction });

            SUCCESS(res, "Other Document added!.");

        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};

module.exports = {
    GetAllClientsOfProvider,
    GetProviderAllClientInvites,
    GetSubmissionDocsOfProvider,
    GetAllDocsOfProviderByDocType,
    SubmitExistingDocToClient,
    GetAllAssignedWorkerToClient,
    CreateAndSubmitOtherDoc

};