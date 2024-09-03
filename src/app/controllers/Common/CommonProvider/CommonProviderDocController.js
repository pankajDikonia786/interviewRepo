
const Sq = require("sequelize");
const sequelize = require('../../../../config/DbConfig.js');
const path = require('path');
const { SUCCESS, GETSUCCESS, } = require('../../../../constants/ResponseConstants.js');
const {
    Organisations, Documents, DocumentTypes, DocHistory, OrgDocuments, ProviderDocApproval,
} = require('../../../../models/common/index.js');
// const { sendProviderDocApprovalEmail } = require("../../../../utils/EmailUtils.js");
// const { ProviderDocApprovalReqLink, } = require("../../../../services/UserServices.js");
const { commonAttributes, deleteS3BucketFile } = require("../../../../services/Helper.js");

/* Add documents api's */

//for create specific doc or create doc and send doc to approval
const CreateProviderDoc = async (req, res, next) => {
    try {
        const { login_user, body: DocDetails } = req;
        const { organisation_uuid, doctype_fields_data, client_org_uuid, checklist_doc_uuid, } = DocDetails;
        const { user_uuid, individual: { first_name, last_name } } = login_user;
        DocDetails.created_by = user_uuid;
        const fileData = req.file;
        //parse
        if (doctype_fields_data && Object.keys(doctype_fields_data)) {
            DocDetails.doctype_fields_data = JSON.parse(doctype_fields_data);
        };

        fileData?.location ? DocDetails.doc_file = fileData?.location : DocDetails.doc_file = "";

        sequelize.transaction(async (transaction) => {

            //create documents
            const documentRes = await Documents.create(DocDetails, { transaction });
            const { document_uuid } = documentRes;
            DocDetails.document_uuid = document_uuid;

            //org.doc junction
            await OrgDocuments.create({ document_uuid, organisation_uuid }, { transaction });

            let historydataObj = { document_uuid, created_by: user_uuid };
            //new document create history data
            let docChangeHistoryArr = [{
                ...historydataObj,
                action_type: "create_doc",
                desc_html: [`<p>${first_name + " " + last_name} has Created the New document</p>`],
                new_value: JSON.stringify(DocDetails),

            }];
            //if provider add and submit the doc to client (provider>client) only
            if (client_org_uuid && checklist_doc_uuid) {

                const providerDocAppRes = await ProviderDocApproval.create({
                    document_uuid,
                    client_org_uuid,
                    checklist_doc_uuid,
                    provider_org_uuid: organisation_uuid,
                    created_by: user_uuid,
                }, { transaction });
                //create ProviderDocApproval history
                docChangeHistoryArr.push({
                    ...historydataObj,
                    action_type: "create_doc_appr",
                    provider_doc_appr_uuid: providerDocAppRes.provider_doc_appr_uuid,
                    desc_html: [`<p>${first_name + " " + last_name} has send to Client for approval</p>`],
                    new_value: JSON.stringify(providerDocAppRes),
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

//working (Need to also work on document type because it not exist in document type table)
const GetAllDocumentsOfProvider = async (req, res, next) => {

    try {
        const { page, limit, sort, order, search, organisation_uuid } = req.query;
        let where_obj = {};
        let query_obj = {};

        if (search) {
            where_obj = {
                [Sq.Op.or]: [
                    Sq.where(Sq.col("providerDoc.document_type.doc_type_name"), { [Sq.Op.iLike]: `%${search}%` }),
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
        const orgDocumentsRes = await OrgDocuments.findAndCountAll({
            where: { organisation_uuid, ...where_obj, },
            attributes: ["org_document_uuid",
                [Sq.col("providerDoc.document_uuid"), "document_uuid"],
                [Sq.col("providerDoc.document_type_uuid"), "document_type_uuid"],
                [Sq.col("providerDoc.doc_name"), "doc_name"],
                [Sq.col("providerDoc.expiry_date"), "expiry_date"],
                [Sq.col("providerDoc.document_type.doc_type_name"), "doc_type_name"]
            ],

            include: {
                model: Documents, as: "providerDoc",
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

        GETSUCCESS(res, orgDocumentsRes, "Get all Documents of Provider successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};

//need also update document type because document_type in  document type table not exist now
const GetProviderDocById = async (req, res, next) => {
    try {
        //function_assignment_uuid of provider
        const { document_uuid, function_assignment_uuid, document_type_uuid, } = req.query;
        //clients using related compliance criteria by document type
        // const faRelationRes = FARelations.findAll({
        //     attributes: [
        //         [Sq.col("clientCompDoc.compDocOrg.organisation_uuid"), "organisation_uuid"],
        //         [Sq.col("clientCompDoc.compDocOrg.trading_name"), "trading_name"]
        //         ,],
        //     where: { child_uuid: function_assignment_uuid, f_a_relation_type: "client_provider" },
        //     include: {
        //         model: ComplianceDocs, as: "clientCompDoc",
        //         where: { document_type_uuid },
        //         attributes: [],
        //         include: {
        //             model: Organisations,
        //             attributes: [],
        //             as: "compDocOrg",
        //         },
        //     },
        //     group: [
        //         "clientCompDoc.compliance_doc_uuid",
        //         "f_a_relations.f_a_relation_uuid",
        //         "clientCompDoc->compDocOrg.organisation_uuid"
        //     ]
        // });
        //get all clients against specific submitted doc approval

        const documentRes = Documents.findOne({
            where: { document_uuid },
            subQuery: false,
            include: {
                model: DocumentTypes, as: "document_type",
                attributes: { exclude: commonAttributes },
            }
        });
        //client approval docs
        const providerDocAppRes = ProviderDocApproval.findAll({
            where: { document_uuid },
            attributes: ["document_uuid",
                [Sq.col("provApprClient.organisation_uuid"), "organisation_uuid"],
                [Sq.col("provApprClient.trading_name"), "trading_name"]

            ],
            include: {
                model: Organisations, as: "provApprClient",
                attributes: []
            },
            group: ["provApprClient.organisation_uuid", "provider_doc_approval.document_uuid"]

        });

        const [docData, clientsData,] = await Promise.all([documentRes, providerDocAppRes,]);

        GETSUCCESS(res, { docData: docData, clientsData }, "Get Document by id successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

const UpdateProviderDoc = async (req, res, next) => {
    try {
        const { user_uuid, individual: { first_name, last_name } } = req.login_user;
        let documentDetails = req.body;
        let { document_uuid, column_names, doctype_fields_data } = documentDetails;

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
            await ProviderDocApproval.update({
                approval_status: "pending",
                reviewed_date: null,
                reviewed_date: null,

            }, {
                where: { document_uuid, updated_by: user_uuid }, transaction
            });
            //Create doc history
            delete documentDetails.column_names;
            const docHistoryData = {
                action_type: "update",
                column_names,//Columns that values updated
                document_uuid,
                desc_html,
                new_value: documentDetails,
                created_by: user_uuid
            };
            //Update doc_file if file exist
            await DocHistory.create(docHistoryData, { transaction });

            SUCCESS(res, "Document details updated successfully!");
        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//here need to remove file data pending
const DeleteProviderDoc = async (req, res, next) => {
    try {
        const { document_uuid, } = req.body;

        sequelize.transaction(async (transaction) => {

            await Documents.destroy({ where: { document_uuid }, transaction });
            await OrgDocuments.destroy({ where: { document_uuid }, transaction });
            await DocHistory.destroy({ where: { document_uuid }, transaction });
            await ProviderDocApproval.destroy({ where: { document_uuid } });

        });

        SUCCESS(res, "Document deleted successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

//All history of provider specific  document
const GetDocumentHistoryById = async (req, res, next) => {
    try {
        const { document_uuid, provider_doc_appr_uuid } = req.query;
        //for all doc data 
        let queryArr = [{ document_uuid, }];
        //if required with specific doc against client submitted and doc create or update
        if (provider_doc_appr_uuid) {
            queryArr = [{ document_uuid, provider_doc_appr_uuid },
            { document_uuid, provider_doc_appr_uuid: null }
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

module.exports = {

    CreateProviderDoc,
    GetAllDocumentsOfProvider,
    GetProviderDocById,
    UpdateProviderDoc,
    DeleteProviderDoc,
    GetDocumentHistoryById,

};