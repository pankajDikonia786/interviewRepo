
const Sq = require("sequelize");
const sequelize = require('../../../../config/DbConfig');
const { SUCCESS, GETSUCCESS, } = require('../../../../constants/ResponseConstants');
const { commonAttributes, } = require("../../../../services/Helper");

const {
    Organisations,
    CompanyInductions,
    ProviderDocApproval,
    Documents,
    DocumentTypes,
    ChecklistDocs,
    ComplianceChecklist,
    ProviderChecklistAssign,
    Workers,
    Individuals,
    WorkerChecklistAssign,
    WorkerDocApproval,
    WorkerAssign,
    WorkerCompanyInd,


} = require("../../../../models/common");


const GetProviderDocTypeAgainstClientList = async (req, res, next) => {

    try {
        const { provider_org_uuid, client_org_uuid } = req.query;
        let providerCheckRes = await ProviderChecklistAssign.findAll({
            where: { provider_org_uuid, client_org_uuid },
            attributes: [
                [Sq.fn('DISTINCT', Sq.col('ProvCheckDoc.document_type.document_type_uuid')), 'document_type_uuid'],
                [Sq.col('ProvCheckDoc.document_type.doc_type_name'), 'doc_type_name']
            ],
            include:
            {
                model: ChecklistDocs, as: "ProvCheckDoc",
                attributes: [],
                required: true,
                include: {
                    model: DocumentTypes,
                    attributes: []

                },
            },
            raw: true,
            nest: true
        });
        GETSUCCESS(res, providerCheckRes, 'Get Provider document type against client successfully!');

    } catch (error) {
        console.log(error);
        next(error);
    };
};

//working pending upload status handle
const GetProviderDocsAgainstClient = async (req, res, next) => {
    try {
        let { client_org_uuid, provider_org_uuid, sort, order, page, limit, search, docTypeIds, isPendingUpload, approvalStatus } = req.query;

        let where_arr = [{ provider_org_uuid, client_org_uuid }];
        console.log(req.query)
        let query_obj = {};
        // Check for search term 
        if (search) {
            where_arr.push({
                '$ProvCheckDoc.DocAppr.provApprDoc.doc_name$': {
                    [Sq.Op.iLike]: `%${search}%`
                }
            });
        };

        let apprStatusReq = false;
        // Array.isArray(approvalStatus) &&
        //filters
        // Check for approval status 
        if (approvalStatus?.length > 0 || isPendingUpload === "true") {


            if (isPendingUpload === "true" && approvalStatus?.length === 0) {

                where_arr.push(
                    Sq.where(Sq.col("ProvCheckDoc.DocAppr.provider_doc_appr_uuid"), { [Sq.Op.is]: null })
                );
            };
            if (approvalStatus?.length > 0 && isPendingUpload === "false") {

                approvalStatus = JSON.parse(approvalStatus);
                where_arr.push(
                    Sq.where(Sq.col("ProvCheckDoc.DocAppr.approval_status"), { [Sq.Op.in]: approvalStatus }),);
                apprStatusReq = true;
            };
            if (approvalStatus?.length > 0 && isPendingUpload === "true") {

                approvalStatus = JSON.parse(approvalStatus);
                where_arr.push(
                    {
                        [Sq.Op.or]:
                            [Sq.where(Sq.col("ProvCheckDoc.DocAppr.approval_status"), { [Sq.Op.in]: approvalStatus }),
                            Sq.where(Sq.col("ProvCheckDoc.DocAppr.provider_doc_appr_uuid"), { [Sq.Op.is]: null })]
                    }
                );
            };
        };

        // Check for document type 
        if (docTypeIds?.length > 0) {

            docTypeIds = JSON.parse(docTypeIds);
            where_arr.push(
                Sq.where(Sq.col("ProvCheckDoc.document_type.document_type_uuid"), { [Sq.Op.in]: docTypeIds }),

            );
        };

        if (sort && order) {
            query_obj.order = [
                [
                    Sq.literal(`COALESCE("ProvCheckDoc->DocAppr->provApprDoc"."${sort}", '')`), order
                ]
            ];
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };

        let providerCheckRes = await ProviderChecklistAssign.findAndCountAll({
            where: where_arr,
            attributes: [],
            include: [
                {
                    model: ChecklistDocs, as: "ProvCheckDoc",
                    required: true,
                    include: [
                        {//single 
                            model: ProviderDocApproval, as: "DocAppr",
                            where: { provider_org_uuid },
                            attributes: ["approval_status", "client_org_uuid", "provider_doc_appr_uuid"],
                            required: apprStatusReq,
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
                            attributes: ['document_type_uuid', 'doc_type_name']
                        }
                    ],
                }
            ],
            // raw:true,
            subQuery: false,
            ...query_obj

        });
 
        let flattenResponse = []

        if (providerCheckRes?.rows.length > 0) {
            providerCheckRes.rows.forEach((val, ind, array) => {
                val?.ProvCheckDoc.forEach((docVal) => {

                    flattenResponse.push(docVal);
                });
            });
        };

        GETSUCCESS(res, { count: providerCheckRes.count, rows: flattenResponse }, "Get Provider document against client successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };

};
const GetSubmissionDocsOrChecklist = async (req, res, next) => {
    try {

        let { client_org_uuid, worker_uuid } = req.query;

        const workerChecklistRes = await WorkerChecklistAssign.findAll({
            where: {
                client_org_uuid, worker_uuid
            },
            include: {
                model: ChecklistDocs, as: 'workerCheckDocs',
                // where: { checklist_doc_uuid: checklistDocIds },//array
                attributes: { exclude: commonAttributes },
                include: [
                    {//single 
                        model: WorkerDocApproval, as: "workerDocAppr",
                        where: { worker_uuid },
                        attributes: ["worker_doc_appr_uuid", "approval_status", "client_org_uuid",],
                        required: false,
                        include: [
                            {
                                model: Documents, as: "workerApprDoc",
                                attributes: {
                                    exclude: ["created_by", "updated_by",
                                        "deleted_by", "deleted_date", "updated_date"]
                                }
                            },
                        ]
                    },
                    {
                        model: DocumentTypes,
                        attributes: ['document_type_uuid', 'doc_type_name']
                    }
                ]
            }
        });
        //if worker chekclist not assignend to worker then get compliance 
        let compChecklistRes;

        if (workerChecklistRes?.length === 0 || !workerChecklistRes) {

            compChecklistRes = await ComplianceChecklist.findAll({
                where: { client_org_uuid, recipient_type: 'worker' },
                attributes: ['checklist_uuid', 'checklist_name',
                    'recipient_type',],
                order: [['checklist_name', 'ASC']]
            });
        };

        GETSUCCESS(res, {
            workerDocs: workerChecklistRes, checklistData: compChecklistRes
        }, `Get  ${workerChecklistRes?.length === 0 ? 'Worker document against client' : 'checklist'} successfully!`);
    } catch (error) {
        console.log(error);
        next(error);
    };

};

module.exports = {
    GetProviderDocsAgainstClient,
    GetProviderDocTypeAgainstClientList,
    GetSubmissionDocsOrChecklist

};