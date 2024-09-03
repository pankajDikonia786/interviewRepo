const path = require("path");
const Sq = require("sequelize");
const sequelize = require('../../../../config/DbConfig.js');
const { commonAttributes, deleteS3BucketFile } = require("../../../../services/Helper.js");
const { SUCCESS, GETSUCCESS, } = require('../../../../constants/ResponseConstants.js');
const {
    Workers,
    Organisations,
    Individuals,
    Addresses,
    WorkerSiteAccess,
    Sites,
    Notes,
    NotesAttachments,
    Users,
    WorkerAssign,
    WorkerChecklistAssign,
    ChecklistDocs,
    CompanyInductions,
    WorkerCompanyInd,
    WorkerDocApproval,
    ProviderClientContact
} = require('../../../../models/common');

//Worker profile 
const UpdateWorkerProfileSetting = async (req, res, next) => {
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

//Common worker notes api's
const CreateWorkerNote = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const note_details = req.body;
        const fileData = req.files;
        note_details.created_by = login_user.user_uuid;
        sequelize.transaction(async (transaction) => {
            const notesRes = await Notes.create(note_details, { transaction });
            if (fileData) {
                let attachmentsArray = [];
                for (file of fileData) {

                    attachmentsArray = [...attachmentsArray,
                    { note_attachment: file.location, note_uuid: notesRes.note_uuid }];
                };
                await NotesAttachments.bulkCreate(attachmentsArray, { transaction });
            };

            SUCCESS(res, "Note created successfully!");
        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetSpecificWorkerNotes = async (req, res, next) => {
    try {
        const { individual_uuid, page, limit, sort, order, search } = req.query;
        let where_obj = { individual_uuid };
        let query_obj = {};
        if (search) {
            where_obj = {
                [Sq.Op.or]: [
                    Sq.where(Sq.col("note_heading"), { [Sq.Op.iLike]: `%${search}%` }),
                ],
            }
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };
        if (sort && order) {
            query_obj.order = [[sort, order]]
        };
        const notesRes = await Notes.findAndCountAll({
            where: where_obj,
            attributes: ["note_uuid", "note_heading", "note", "created_date",
                [Sq.col("note_createdby.individual.first_name"), "first_name"],
                [Sq.col("note_createdby.individual.last_name"), "last_name"],
                [Sq.col("note_createdby.individual.avatar"), "avatar"]
            ],
            include: [
                {
                    model: NotesAttachments, as: "note_attachs", attributes:
                        ["note_attachment_uuid", "note_attachment"]
                },
                {
                    model: Users, as: "note_createdby",
                    attributes: [],
                    include: { model: Individuals, attributes: [] }
                }],
            subQuery: false,
            ...query_obj
        });

        return GETSUCCESS(res, notesRes, 'Get all notes of specific client successfully!');

    } catch (error) {
        console.log(error);
        next(error);
    };
};


const GetAllProvidersOfWorker = async (req, res, next) => {
    try {
        const { sort, order, page, limit, search, individual_uuid, contact_type_uuid } = req.query;

        let where_obj = { individual_uuid };
        let query_obj = {};

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("workerProvider.trading_name"), { [Sq.Op.iLike]: `%${search}%` }),
                ],
            };
        };

        if (sort && order) {

            query_obj.order = [["workerProvider", sort, order]]
        };
        if (page && limit) {

            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;

        };
        const workerResponse = await Workers.findAndCountAll({
            where: where_obj,
            attributes: [
                [Sq.col("workerProvider.organisation_uuid"), "organisation_uuid"],
                [Sq.col("workerProvider.logo"), "logo"],
                [Sq.col("workerProvider.trading_name"), "trading_name"],
                [Sq.col("workerProvider.abn_nzbn"), "abn_nzbn"],
                [Sq.col("workerProvider.website_url"), "website_url"],
                [Sq.col("workerProvider.org_address_data.address_one"), "address_one"],
                [Sq.col("workerProvider.org_address_data.address_two"), "address_two"],
                [Sq.col("workerProvider.individual_data.individual_uuid"), "individual_uuid"],
                [Sq.col("workerProvider.individual_data.email"), "email"],
                [Sq.col("workerProvider.individual_data.phone"), "phone"],
            ],
            include: {
                model: Organisations, as: "workerProvider",
                attributes: [],
                include: [
                    {
                        model: Individuals, as: "individual_data",
                        attributes: [],
                        through: { where: { is_user: true, contact_type_uuid }, attributes: [] },
                    },
                    {
                        model: Addresses,
                        as: "org_address_data",
                        attributes: [],
                        through: { attributes: [] }
                    }
                ],
            },
            subQuery: false,
            ...query_obj
        });

        GETSUCCESS(res, workerResponse, "Get all Providers of worker successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };

};
//for provider and worker
const GetWorkerSiteLogs = async (req, res, next) => {
    try {

        const { individual_uuid, worker_uuid, search, sort, order, page, limit } = req.query;

        let where_obj = { individual_uuid };

        //if need logs against specific Provider client's only
        if (worker_uuid) {
            where_obj = {
                ...where_obj,
                worker_uuid
            };
        };
        let query_obj = {};

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col('WorkerSiteClient.trading_name'),
                        { [Sq.Op.iLike]: `%${search}%` }),
                ],
            };
        };
        if (sort && order) {
            let orderArr = [];
            if (sort === "trading_name") {
                orderArr.push(["WorkerSiteClient", sort, order])
            } else if (sort === "site_name") {
                orderArr.push(["WorkerSite", sort, order])
            } else {
                orderArr.push([sort, order])
            };
            query_obj.order = [orderArr]
        };
        if (page && limit) {

            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;

        };
        const workerSitAccessRes = await WorkerSiteAccess.findAndCountAll({
            where: where_obj,
            attributes: [
                'worker_site_access_uuid',
                'sign_in_date',
                'sign_out_date',
                'clock_in_out_status'
            ],
            include: [
                {
                    model: Organisations, as: "WorkerSiteClient",
                    attributes: ["organisation_uuid", "trading_name"]
                },
                {
                    model: Sites, as: "WorkerSite",
                    attributes: ["site_uuid", "site_name"]
                }
            ],
            ...query_obj
        });

        GETSUCCESS(res, workerSitAccessRes, "Get all site logs of worker succesfully!")
    } catch (error) {
        console.log(error);
        next(error);
    }
};

//working---------------
// const workerAllDocumentations = await SiteInductions.findAll({

//     where: {
//         site_uuid: req.query?.site_uuid
//     },
//     attributes: ["site_induction_uuid"],
//     include: [{
//         model: WorkerSiteInd,
//         attributes: ["worker_site_ind_uuid"],
//         include: {
//             model: Workers,
//             attributes: ["worker_uuid"],
//             include: {
//                 model: Individuals,
//                 attributes: ["individual_uuid"],
//                 include: [{
//                     model: Documents,
//                     attributes: ["document_uuid", "issuing_authority", "expiry_date"],
//                     include: {
//                         model: DocumentTypes,
//                         attributes: ["document_name", "is_approval_once"],
//                     },
//                 }]
//             }
//         },
//     }],

// })

//working pending to whom data need display of multiple client email address-----------

const GetAllClientsOfWorkerByProvider = async (req, res, next) => {
    try {
        const { page, limit, sort, order, search, worker_uuid, provider_org_uuid } = req.query;

        let where_obj = { worker_uuid };
        let query_obj = {};
        if (search) {

            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("clientAssign.trading_name"), { [Sq.Op.iLike]: `%${search}%` }),
                ]
            }

        };
        if (sort && order) {
            sort == "trading_name" ?
                query_obj.order = [
                    [{ model: Organisations, as: 'clientAssign', }, sort, order]
                ] : query_obj.order = [[sort, order]];
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };

        let workersRes = await WorkerAssign.findAndCountAll({
            where: where_obj,
            attributes: ['worker_uuid',],
            include: [

                {
                    model: Organisations, as: 'clientAssign',
                    attributes: ['organisation_uuid', 'trading_name'],//client
                    required: true,
                    include: [
                        {
                            model: CompanyInductions, as: 'clientCompInd',
                            attributes: ['company_induction_uuid',],
                            include: {
                                model: WorkerCompanyInd, as: 'wrkrCI',
                                where: { worker_uuid },
                                attributes: ['worker_company_ind_uuid', 'is_comp_ind_completed',],
                                required: false,
                            }
                        },
                        {
                            model: WorkerChecklistAssign, as: 'workerChklist',//hasmany
                            required: false,
                            where: {
                                provider_org_uuid,
                                worker_uuid
                            },
                            attributes: ['worker_checklist_uuid'],
                            include: {
                                model: ChecklistDocs, as: 'WCDocs',
                                required: true,
                                attributes: ['checklist_doc_uuid', 'is_other_doc',
                                ],
                                include: {//single
                                    model: WorkerDocApproval, as: "WDA",

                                    where: { worker_uuid, },
                                    attributes: ['worker_doc_appr_uuid', 'worker_uuid', 'approval_status',],
                                    required: false,
                                },
                            }
                        },
                        {
                            model: ProviderClientContact, as: "provClientCont",
                            where: { is_main_contact: true, provider_org_uuid },
                        },

                    ]
                }

            ],
            subQuery: false,
            distinct: true,
            ...query_obj
        });

        console.log(workersRes)
        const processedRows = workersRes.rows.map(worker => {
            let allApprovalsApproved = true;
            let allInductionsCompleted = true;

            // Check for worker checklist document approvals
            allApprovalsApproved = worker.clientAssign?.workerChklist.every(workerChecklist => {
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
            };

            const status = allApprovalsApproved && allInductionsCompleted ? 'compliant' : 'non-compliant';

            // Create a clean worker object with added status
            const cleanWorker = {
                status: status,
                client_org_uuid: worker?.clientAssign?.organisation_uuid,
                trading_name: worker?.clientAssign?.trading_name,
                contact_first_name: worker.clientAssign.provClientCont.contact_first_name,
                contact_last_name: worker.clientAssign.provClientCont?.contact_last_name,
                contact_email: worker.clientAssign.provClientCont?.contact_email,
                contact_phone: worker.clientAssign.provClientCont?.contact_phone
                // ...worker.clientAssign,

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

module.exports = {
    UpdateWorkerProfileSetting,
    CreateWorkerNote,
    GetSpecificWorkerNotes,
    GetAllProvidersOfWorker,
    GetWorkerSiteLogs,
    GetAllClientsOfWorkerByProvider

};






