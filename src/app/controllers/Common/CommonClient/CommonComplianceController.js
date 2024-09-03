const Sq = require("sequelize");
const sequelize = require('../../../../config/DbConfig');
const { SUCCESS, GETSUCCESS, } = require('../../../../constants/ResponseConstants');
const { DocumentTypes, ComplianceChecklist, ChecklistDocs, ProivderTypes } = require("../../../../models/common");
const { commonAttributes } = require("../../../../services/Helper");

/* compliance Checklist api's */

const CreateComplianceChecklist = async (req, res, next) => {
    try {
        const complianceDocDetails = req.body;
        let { docsData, } = complianceDocDetails;
        const { user_uuid } = req.login_user;
        const files = req.files;
        complianceDocDetails.recipient_type == "worker" ? delete complianceDocDetails.provider_type_uuid : "";
        complianceDocDetails.created_by = user_uuid;

        //create compliance checklist
        const { checklist_uuid } = await ComplianceChecklist.create(complianceDocDetails,);
        //parse
        docsData = JSON.parse(docsData);

        if (docsData.length > 0) {
            let otherDocUrls = {};

            // Collect file URLs based on file field names
            if (files && files.length > 0) {
                files.forEach(file => {
                    const fieldName = file.fieldname; // This should match 'file_id'
                    const docId = fieldName.split('_')[1];// Extract the ID 
                    otherDocUrls[docId] = file.location;
                });
            };

            let checklistDocsArray = [];

            for (let checklistDoc of docsData) {

                const { is_other_doc, tempId } = checklistDoc;
                if (is_other_doc === false || is_other_doc === 'false') {
                    checklistDocsArray.push({ ...checklistDoc, checklist_uuid, created_by: user_uuid, });
                }
                else {
                    checklistDocsArray.push({
                        ...checklistDoc, other_doc_url: otherDocUrls[tempId] || '',
                        checklist_uuid,
                        created_by: user_uuid
                    });
                };
            };
            //ChecklistDocs create
            await ChecklistDocs.bulkCreate(checklistDocsArray);
        };

        SUCCESS(res, "Checklist added");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

//for both types details archived or active 
const GetAllComplianceChecklistOfClient = async (req, res, next) => {

    try {
        const { sort, order, page, limit, client_org_uuid, search, recipient_type, DetailType } = req.query;

        let where_obj = { client_org_uuid };
        let query_obj = {};
        if (DetailType === 'archived') {
            where_obj.deleted_date = { [Sq.Op.not]: null };
            query_obj.paranoid = false
        };

        if (recipient_type) {
            where_obj = {
                ...where_obj,
                recipient_type: Sq.where(Sq.cast(Sq.col('recipient_type'), 'varchar'),
                    { [Sq.Op.iLike]: `${recipient_type}` }),
            };
        };

        if (search) {
            let where_search = [
                Sq.where(Sq.col("checklist_name"), { [Sq.Op.iLike]: `%${search}%` }),
            ]

            where_obj = {
                ...where_obj,
                [Sq.Op.or]: where_search
            };
        };

        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };
        if (sort && order) {
            query_obj.order = [[sort, order]]
        };

        const compChecklistRes = await ComplianceChecklist.findAndCountAll({
            where: where_obj,
            attributes: ['checklist_uuid', 'checklist_name',
                'recipient_type', 'checklist_renewal_date', 'deleted_date'],
            ...query_obj
        });

        GETSUCCESS(res, compChecklistRes, "Get all Compliance successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//for both types details archived or active 
const GetComplianceChecklistById = async (req, res, next) => {

    try {
        const { checklist_uuid, DetailType, sort, order } = req.query;
        let where_obj = { checklist_uuid };
        let query_obj = {};


        if (DetailType === 'archived') {
            where_obj.deleted_date = { [Sq.Op.not]: null };
            query_obj.paranoid = false
        };

        const compChecklistRes = await ComplianceChecklist.findOne({
            where: where_obj,
            attributes: { exclude: commonAttributes, },
            include: [
                {
                    model: ChecklistDocs, as: "compDocs",
                    where: where_obj,
                    attributes: [
                        'checklist_doc_uuid',
                        'is_doc_mandatory',
                        'is_other_doc',
                        'other_doc_name',
                        'deleted_date'
                    ],
                    required: false,
                    include: {
                        model: DocumentTypes, attributes: ['document_type_uuid', 'doc_type_name'],
                        order: [[sort, order]]
                    },
                    ...query_obj,
                },
            ],
            ...query_obj

        });

        GETSUCCESS(res, compChecklistRes, "Get Compliance checklist by id successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};

const UpdateComplianceChecklist = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        let checklistDetails = req.body;
        const { checklist_uuid } = checklistDetails;
        delete checklistDetails.checklist_uuid;
        req.body.updated_by = login_user.user_uuid;

        await ComplianceChecklist.update(checklistDetails, { where: { checklist_uuid } });

        SUCCESS(res, 'Checklist updated successfully');

    } catch (error) {
        console.log(error);
        next(error);
    };

};

const AddChecklistDoc = async (req, res, next) => {
    try {
        const { user_uuid } = req.login_user;
        const complianceDocDetail = req.body;
        //for other document file 
        const file = req.file;
        file?.location ? complianceDocDetail.other_doc_url = file.location : "";
        complianceDocDetail.created_by = user_uuid;

        //ChecklistDocs create
        await ChecklistDocs.create(complianceDocDetail);

        SUCCESS(res, 'Compliance Document added');

    } catch (error) {
        console.log(error);
        next(error);
    };
};

const ArchiveChecklist = async (req, res, next) => {

    try {
        const login_user = req.login_user;
        const { checklist_uuid } = req.body;

        sequelize.transaction(async (transaction) => {

            await ComplianceChecklist.update({
                deleted_date: new Date(),
                deleted_by: login_user.user_uuid,
            }, {
                where: { checklist_uuid },
                transaction

            });
            await ChecklistDocs.update({
                deleted_date: new Date(),
                deleted_by: login_user.user_uuid,
            }, {
                where: { checklist_uuid },
                transaction
            });
        });

        SUCCESS(res, "Compliance Checklist Archived successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};

const ArchiveComplianceDoc = async (req, res, next) => {

    try {
        const login_user = req.login_user;
        let { checklistDocIds } = req.body;

        if (checklistDocIds.length > 0) {

            await ChecklistDocs.update({
                deleted_date: new Date(),
                deleted_by: login_user.user_uuid,
            }, {
                where: { checklist_doc_uuid: checklistDocIds },
            });
        };

        SUCCESS(res, "Compliance document Archived successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};


module.exports = {
    CreateComplianceChecklist,
    AddChecklistDoc,
    GetAllComplianceChecklistOfClient,
    GetComplianceChecklistById,
    UpdateComplianceChecklist,
    ArchiveChecklist,
    ArchiveComplianceDoc

};
