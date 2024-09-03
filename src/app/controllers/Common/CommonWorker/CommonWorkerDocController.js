const Sq = require("sequelize");
const sequelize = require('../../../../config/DbConfig.js');
const { commonAttributes, } = require("../../../../services/Helper.js");
const { SUCCESS, GETSUCCESS, } = require('../../../../constants/ResponseConstants.js');
const {
    Organisations,
    DocHistory,
    Documents,
    DocumentTypes,
    IndividualDocuments,
    WorkerDocApproval, } = require('../../../../models/common');


//for create specific doc or create doc and send doc to approval
const CreateWorkerDoc = async (req, res, next) => {
    try {
        const { login_user, body: DocDetails } = req;
        const {
            individual_uuid,
            doctype_fields_data,
            worker_uuid,
            client_org_uuid,//required when document approval 
            checklist_doc_uuid,//required when document approval 
            provider_org_uuid,//required when document approval 
        } = DocDetails;

        const { user_uuid, individual: { first_name, last_name } } = login_user;
        DocDetails.created_by = user_uuid;
        //FileData
        const fileData = req.file;
        //parse
        if (doctype_fields_data && Object.keys(doctype_fields_data)) {
            DocDetails.doctype_fields_data = JSON.parse(doctype_fields_data);
        };
        //file data
        fileData?.location ? DocDetails.doc_file = fileData?.location : DocDetails.doc_file = "";

        sequelize.transaction(async (transaction) => {

            //create documents
            const documentRes = await Documents.create(DocDetails, { transaction });
            const { document_uuid } = documentRes;
            DocDetails.document_uuid = document_uuid;

            //org.doc junction
            await IndividualDocuments.create({ document_uuid, individual_uuid }, { transaction });

            let historydataObj = { document_uuid, is_worker_doc: true, created_by: user_uuid };
            //new document create history data
            let docChangeHistoryArr = [{
                ...historydataObj,
                action_type: "create_doc",
                desc_html: [`<p>${first_name + " " + last_name} has Created the New document</p>`],
                new_value: JSON.stringify(DocDetails),

            }];
            //if provider add and submit the doc to client (provider>client)
            if (client_org_uuid && checklist_doc_uuid) {

                const workerDocAppRes = await WorkerDocApproval.create({
                    document_uuid,
                    client_org_uuid,
                    checklist_doc_uuid,
                    worker_uuid,
                    provider_org_uuid,
                    created_by: user_uuid,

                }, { transaction });
                //create ProviderDocApproval history
                docChangeHistoryArr.push({
                    ...historydataObj,
                    action_type: "create_doc_appr",
                    worker_doc_appr_uuid: workerDocAppRes.worker_doc_appr_uuid,
                    desc_html: [`<p>${first_name + " " + last_name} has send to Client for approval</p>`],
                    new_value: JSON.stringify(workerDocAppRes),
                });
            };
            //history
            await DocHistory.bulkCreate(docChangeHistoryArr, { transaction });

            SUCCESS(res, "Thanks! Document added.");

        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};

const GetAllDocsOfWorker = async (req, res, next) => {

    try {
        const { page, limit, sort, order, search, individual_uuid } = req.query;
        let where_obj = {};
        let query_obj = {};

        if (search) {
            where_obj = {
                [Sq.Op.or]: [
                    Sq.where(Sq.col("individualDoc.doc_name"), { [Sq.Op.iLike]: `%${search}%` }),
                ],
            }
        };
        if (sort && order) {
            query_obj.order = [[sort, order]];
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };
        const individualDocsRes = await IndividualDocuments.findAndCountAll({
            where: { individual_uuid, ...where_obj, },
            attributes: [
                [Sq.col("individualDoc.document_uuid"), "document_uuid"],
                [Sq.col("individualDoc.document_type_uuid"), "document_type_uuid"],
                [Sq.col("individualDoc.doc_name"), "doc_name"],
                [Sq.col("individualDoc.expiry_date"), "expiry_date"],
                [Sq.col("individualDoc.document_type.doc_type_name"), "doc_type_name"]
            ],

            include: {
                model: Documents, as: "individualDoc",
                attributes: [],
                required: true,
                where: { is_other_doc: false },
                include:
                {
                    model: DocumentTypes, as: "document_type",
                    attributes: [],
                },
            },
            ...query_obj,
        },);

        GETSUCCESS(res, individualDocsRes, "Get all Documents of Worker successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};

//need also update document type because document_type in  document type table not exist now
const GetWorkerrDocById = async (req, res, next) => {
    try {

        const { document_uuid, } = req.query;

        const documentRes = Documents.findOne({
            where: { document_uuid },
            subQuery: false,
            include: {
                model: DocumentTypes, as: "document_type",
                attributes: { exclude: commonAttributes },
            }
        });
        // //client approval docs data
        // const workerDocApprRes = WorkerDocApproval.findAll({
        //     where: { document_uuid },
        //     attributes: ["document_uuid",
        //         [Sq.col("provApprClient.organisation_uuid"), "organisation_uuid"],
        //         [Sq.col("provApprClient.trading_name"), "trading_name"]

        //     ],
        //     include: {
        //         model: Organisations, as: "provApprClient",
        //         attributes: []
        //     },
        //     group: ["provApprClient.organisation_uuid", "provider_doc_approval.document_uuid"]

        // });

        const [docData,// clientsData
            ,] = await Promise.all([documentRes,
                // providerDocAppRes,
            ]);

        GETSUCCESS(res, {
            docData: docData,
            // clientsData 
        }, "Get Document by id successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};
//notappli
//here may be need to chnge status of the uploaded doc agaist client site induction when doc chenged or updated
const UpdateWorkerDoc = async (req, res, next) => {
    try {
        const { user_uuid, individual: { first_name, last_name } } = req.login_user;
        let documentDetails = req.body;
        let { document_uuid, column_names, doctype_fields_data } = documentDetails;
        console.log("-------------------", documentDetails)

        //parse (custom fields)
        if (doctype_fields_data && Object.keys(doctype_fields_data)) {
            documentDetails.doctype_fields_data = JSON.parse(doctype_fields_data);
        };
        column_names = JSON.parse(documentDetails.column_names);
        documentDetails.updated_by = user_uuid;
        const fileData = req.file;

        fileData?.location ? [documentDetails.doc_file = fileData.location, documentDetails.file_size = fileData.size] : "";

        let column_name_string = [];
        let desc_html = [];

        column_names.forEach((columnName, columnNameInd) => {
            //Get mapped name in variable
            const mappedName = columnName === "doc_name" ? "Document name" :
                columnName === "expiry_date" ? "Expiry date" :
                    columnName === "Issuer" ? "issuer" :
                        columnName === "Expiry Date Notes" ? "expiry_date_notes" :
                            columnName === "policy_no" ? "Policy number" :
                                columnName === "amount_insured" ? "Amount Insured" :
                                    columnName;

            column_name_string.push(mappedName);
            desc_html.push(`<p>${first_name}${last_name ? " " + last_name : ""} has ${columnName == "doc_file" ? "uploaded document" : `edited ${column_name_string[columnNameInd]}`}</p>`)
        });
        await sequelize.transaction(async (transaction) => {
            // not removing because file will ramain exist in history
            // if (typeof fileData !== "undefined" && fileData?.location) {
            //     //delete existing file
            //     const documentRes = await Documents.findOne({
            //         where: { document_uuid },
            //     });
            //     if (documentRes.doc_file) {
            //         let fileBasename = path.basename(documentRes.doc_file);
            //         await deleteS3BucketFile(fileBasename)
            //     };
            // };

            //Update document
            await Documents.update(documentDetails, { where: { document_uuid }, transaction });
            //make all document validation pending
            await WorkerDocApproval.update({
                approval_status: "pending",
                reviewed_date: null,
                reviewed_date: null,

            }, { where: { document_uuid, updated_by: user_uuid }, transaction });
            //Create doc history
            delete documentDetails.column_names;
            const docHistoryData = {
                action_type: "update",
                column_names,//Columns that values updated
                document_uuid,
                desc_html,
                new_value: documentDetails,
                is_worker_doc: true,
                created_by: user_uuid
            };
            //Update doc_file if file exist
            await DocHistory.create(docHistoryData, { transaction });

            SUCCESS(res, "Worker Document details updated successfully!");
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};
//not applied
//need to confirm yet also delete doc history pending and whet if WorkerDocApproval data deleted and client want to accept approval using email
const DeleteWorkerDoc = async (req, res, next) => {
    try {
        const { doc_type, document_uuid, worker_doc_approval_uuid } = req.body;
        sequelize.transaction(async (transaction) => {
            if (worker_doc_approval_uuid === "" || !worker_doc_approval_uuid) {

                await Documents.destroy({ where: { document_uuid }, transaction });
                await IndividualDocuments.destroy({ where: { document_uuid }, transaction });

            } else {
                await WorkerDocApproval.destroy({ where: { worker_doc_approval_uuid } });
            };
            SUCCESS(res, "Document deleted successfully!");
        });

    } catch (error) {
        console.log(error);
        next(error);
    };
};

//for defalult doc history or submitted doc history agaist client
const GetWorkerDocHistoryById = async (req, res, next) => {
    try {
        const { document_uuid, worker_doc_appr_uuid } = req.query;
        //for all doc data 
        let queryArr = [{ document_uuid, }];
        //if required with specific doc against client submitted and doc create or update
        if (worker_doc_appr_uuid) {
            queryArr = [{ document_uuid, worker_doc_appr_uuid },
            { document_uuid, worker_doc_appr_uuid: null }
            ];
        };

        const DocHistoryRes = await DocHistory.findAll({
            where: {
                [Sq.Op.or]: queryArr
            },
            order: [["created_date", "DESC"]]
        });

        GETSUCCESS(res, DocHistoryRes, "Get Document history successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};


const GetAllClientsOfSpecificWorker = async (req, res, next) => {
    try {

    } catch (error) {

    };
};

module.exports = {
    CreateWorkerDoc,
    GetAllDocsOfWorker,
    GetWorkerrDocById,
    UpdateWorkerDoc,
    DeleteWorkerDoc,
    GetWorkerDocHistoryById

};
