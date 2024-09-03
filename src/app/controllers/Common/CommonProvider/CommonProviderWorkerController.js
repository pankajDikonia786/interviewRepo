const Sq = require("sequelize");
const fs = require("fs");
const ParseCsv = require("csv-parse").parse;
const sequelize = require('../../../../config/DbConfig.js');
const { commonAttributes, convert_key_array, supportTeamQuery } = require("../../../../services/Helper.js");
const { SUCCESS, GETSUCCESS, ALREADYEXISTREPONSE } = require('../../../../constants/ResponseConstants.js');
const {
    Users,
    Sites,
    Invite,
    Workers,
    Modules,
    ChecklistDocs,
    SiteIndModule,
    WorkerAssign,
    WorkerModuleAttempt,
    ModuleQuestions,
    ModuleAnswers,
    Individuals,
    FARelations,
    Organisations,
    InviteWorkerClientAssign,
    WorkerSiteAccess,
    SiteInductions,
    WorkerSiteInd,
    CompanyInductions,
    WorkerChecklistAssign,
    WorkerDocApproval,
    Documents,
    DocumentTypes,
    DocHistory,
    ComplianceChecklist,
    IndividualDocuments,
    WorkerCompanyInd,
    InviteProviderCompliance

} = require('../../../../models/common/');
const { Roles } = require('../../../../models/public');

const { InviteProviderWorkerEmailLink, deleteFile } = require("../../../../services/UserServices.js");
const {
    sendInviteProviderWorkerEmail,
    sendWorkerRemoveToAdminEmail,
    sendWorkerRemoveToProviderEmail
} = require('../../../../utils/EmailUtils.js');


const GetProviderWorkersInvite = async (req, res, next) => {

    try {
        const { page, limit, sort, order, search, function_assignment_uuid } = req.query;
        //here Provider function_assignment_uuid 
        let where_obj = {
            function_assignment_uuid,
            invite_status: "Invited",
            invited_user_type: "worker"
        };
        let query_obj = {};

        if (search) {
            where_obj = {
                [Sq.Op.or]: [
                    Sq.where(Sq.fn("concat", Sq.col("invite_individual.first_name"),
                        " ", Sq.col("invite_individual.last_name")), { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.col("invite_individual.email"), { [Sq.Op.iLike]: `%${search}%` }),
                ]
            };
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };
        if (sort && order) {
            if (sort === "first_name") {
                query_obj.order = [[{ model: Individuals, as: "invite_individual" }, sort, order]];
            } else if (sort === "trading_name") {

                query_obj.order = [[
                    { model: Organisations, as: "inviteWorkerClients" }, sort, order]];


            } else {
                query_obj.order = [[sort, order]];
            };
        };
        const inviteRes = await Invite.findAndCountAll({
            where: where_obj,
            attributes: ['invite_uuid', 'invite_status', 'invite_date'],
            include: [
                {
                    model: Individuals, as: "invite_individual", attributes:
                        ['individual_uuid', 'first_name', 'last_name', 'email', 'phone']
                }, {
                    model: Organisations, as: 'inviteWorkerClients',
                    attributes: ['organisation_uuid', 'trading_name'],
                    through: { attributes: [], },
                }

            ], subQuery: false,
            ...query_obj
        });
        GETSUCCESS(res, inviteRes, "Get all Invited worker of specific Provider successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};


//need to revisit because here now worker can directly addedd via mobile app (need to check from worker table)
const inviteWorkerCsvView = async (req, res, next) => {
    try {
        const { function_assignment_uuid } = req.body;//Provider function assignment uuid
        const file = req.file;
        //individual details
        let individualRes = await Individuals.findAll({
            attributes: ["individual_uuid", "is_conserve_team", "user_uuid",
                [Sq.fn('LOWER', Sq.col('email')), 'email'],
                [Sq.col("indi_invite.invite_uuid"), "invite_uuid"]],
            include: {
                //where Provider fuction_assignment_uuid   
                model: Invite, where: { function_assignment_uuid },
                as: "indi_invite", invited_user_type: "worker", attributes: [],
                required: false
            },
            raw: true
        });
        //
        individualRes = convert_key_array(individualRes, "email");
        //let array
        let csv_workers_data = [];

        const filePath = `${appRoot}/uploads/${file.filename}`;

        await fs.createReadStream(filePath)
            .pipe(ParseCsv({
                columns: true,
                relax_quotes: true,
                // escape: '\\',
                ltrim: true,
                rtrim: true,
                bom: true
            },))
            .on("data", function (row) {

                if (Object.keys(row).length === 0) {
                    // Skip this empty row
                    return;
                };
                csv_workers_data.push(row);

            }).on("end", function () {
                let invite_worker_details = [];
                const emailSet = {};

                for (const csv_worker of csv_workers_data) {

                    let { email, first_name, } = csv_worker;

                    const emailValidator = /\S+@\S+\.\S+/;
                    // Check for missing fields or invalid feilds
                    if (!email || !first_name || !emailValidator.test(email)) {
                        // Mark as not validated and continue to the next worker
                        csv_worker.is_validated = false;
                        invite_worker_details.push(csv_worker);
                        continue;
                    };
                    email = email.toLowerCase();
                    // Check for duplicate email
                    if (emailSet[email]) {
                        // Mark as not validated and continue to the next worker
                        csv_worker.is_validated = false;
                        invite_worker_details.push(csv_worker);
                        continue;
                    };
                    // Add the email to the emailSet to track it as encountered
                    emailSet[email] = true;
                    //individual data
                    const {
                        individual_uuid,
                        invite_uuid,
                        user_uuid
                    } = individualRes[email] || {};

                    //if already invited or email belong to conserver admins
                    if (individualRes[email] && individualRes[email].invite_uuid
                        || individualRes[email]?.is_conserve_team == true) {

                        csv_worker.is_validated = false;
                        invite_worker_details.push(csv_worker);
                        continue;
                    } else {
                        csv_worker.is_validated = true;
                        csv_worker.individual_uuid = individual_uuid || "";
                        csv_worker.user_uuid = user_uuid || "";
                        csv_worker.invite_uuid = invite_uuid || "";
                        invite_worker_details.push(csv_worker);
                        continue;
                    };
                };

                GETSUCCESS(res, invite_worker_details, "Invite workers Csv details view successfully!");
                //delete file
                deleteFile(filePath);
            });

    } catch (error) {
        console.log(error);
        next(error);
    };
};

const InviteWorkerFromCsvDetails = async (req, res, next) => {
    try {
        const { individual: { first_name } } = req.login_user;
        const { user_uuid } = req.login_user;
        const inviteDetails = req.body;
        let { worker_invite_data, function_assignment_uuid, trading_name, clientOrgIds } = inviteDetails;
        let inviteIds = [];
        let workerAssignArr = [];

        const createPomise = worker_invite_data.map(async (inviteDetailVal) => {

            let individualsRes = await Individuals.findOrCreate({
                where: {
                    email: { [Sq.Op.iLike]: inviteDetailVal.email }
                },
                defaults: {
                    first_name: inviteDetailVal.first_name,
                    last_name: inviteDetailVal.last_name,
                    email: inviteDetailVal.email,
                    created_by: user_uuid
                }
            });

            let [individuals] = individualsRes;
            //add individual uuid
            inviteDetailVal.individual_uuid = individuals.individual_uuid;

            //Add or delete user_uuid
            individuals.user_uuid ? inviteDetailVal.user_uuid = individuals.user_uuid :
                delete inviteDetailVal.user_uuid;
            //create invite data
            let inviteData = {
                invited_user_type: "worker",
                individual_uuid: inviteDetailVal.individual_uuid,
                function_assignment_uuid,
                invite_date: new Date(),
                created_by: user_uuid,

            };
            inviteDetailVal?.user_uuid ? inviteData.user_uuid = inviteDetailVal?.user_uuid : "";
            //find or create 
            let [inviteRes, inviteCreated] = await Invite.findOrCreate({
                where: {
                    individual_uuid: inviteDetailVal.individual_uuid,
                    function_assignment_uuid, invited_user_type: "worker"
                }, defaults: inviteData
            });

            if (inviteCreated) {
                inviteIds.push(inviteRes.invite_uuid);//invite uuids
                inviteDetailVal.invite_uuid = inviteRes.invite_uuid;

                //create url
                const url = await InviteProviderWorkerEmailLink(inviteRes.invite_uuid);
                let emailDetails = {
                    first_name: inviteDetailVal.first_name,//worker name
                    inviter_name: first_name,//inviter name
                    trading_name,
                    worker_email: inviteDetailVal.email
                };
                // Emails invite Worker
                sendInviteProviderWorkerEmail(emailDetails, url);
            };
        });

        await Promise.all(createPomise,);

        // Create worker assignments

        if (inviteIds.length > 0 && clientOrgIds.length > 0) {

            for (let invite_uuid of inviteIds) {

                for (let client_org_uuid of clientOrgIds) {
                    workerAssignArr.push({ invite_uuid, client_org_uuid })
                };
            };
            await InviteWorkerClientAssign.bulkCreate(workerAssignArr);

        };

        SUCCESS(res, "Invite sent successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};
const DeleteWorkerInvite = async (req, res, next) => {
    try {
        const { invite_uuid, } = req.body;

        await Invite.destroy({ where: { invite_uuid }, force: true, });

        await InviteWorkerClientAssign.destroy({ where: { invite_uuid } });

        SUCCESS(res, 'Worker invite deleted successfully!');

    } catch (error) {
        console.log(error);
        next(error);
    };
};

//working---------------------send email pending to provider to whom need to send provider users of provider primary ?
const RemoveWorkerOfProvider = async (req, res, next) => {
    try {
        const { user_uuid } = req.login_user;
        const { provider_org_uuid, worker_uuid, trading_name, first_name, email } = req.body;
        //get related workers 
        const workerAssignRes = await WorkerAssign.findAll({
            where: { provider_org_uuid, worker_uuid },
            attributes: [[Sq.col('clientAssign.trading_name'), 'trading_name']],
            include: {
                model: Organisations, as: 'clientAssign',
                attributes: []
            }, raw: true, nest: true

        });

        //remove spcific provider worker
        await Workers.destroy({ where: { worker_uuid }, individualHooks: true, user_uuid, });
        //remove worker assign to client
        await WorkerAssign.destroy({
            where: {
                worker_uuid,
                provider_org_uuid
            }, individualHooks: true, user_uuid,
        });
        await WorkerChecklistAssign.destroy({});
        await WorkerDocApproval.destroy({});
        // await 

        // //get suppoet team
        const supportTeamDetails = await supportTeamQuery();
        //Support team exist
        if (supportTeamDetails.length > 0) {
            // Extract the trading namess into an array
            const _clientTradingNames = workerAssignRes.map(record => record.trading_name);
            //email details
            let supportTeamEmailDetails = {
                _workerName: first_name,//worker name
                _workerEmail: email,//inviter name
                _providerTradingName: trading_name,//provider trading_name
                _clientTradingNames
            };
            //Send email to support team
            for (let supportTeam of supportTeamDetails) {
                supportTeamEmailDetails.supportTeamEmail = supportTeam.email;
                sendWorkerRemoveToAdminEmail(supportTeamEmailDetails);
            };
        };

        //email to provider
        const ProviderEmailDetails = {};
        // sendWorkerRemoveToProviderEmail();


        SUCCESS(res, 'Specific Provider Worker removed successfully!');

    } catch (error) {
        console.log(error);
        next(error);

    };
};

//filter compliant filter to fix and test----------------------------------
const GetAllWorkersOfProvider = async (req, res, next) => {
    try {
        const { page, limit, sort, order, search, provider_org_uuid, statusType } = req.query;
        // let worker_where_query = {};
        let where_query = {};
        let query_obj = {};
        let requiredStatus = false;

        if (search) {
            where_query = {

                [Sq.Op.or]: [Sq.where(Sq.fn("concat", Sq.col("first_name"), " ", Sq.col("last_name")), { [Sq.Op.iLike]: `%${search}%` })]

            };
        };
        if (statusType === 'assigned') {

            requiredStatus = true;
        };
        // if (statusType === "Compliant") {
        //     worker_where_query = {
        //         ...worker_where_query,
        //         [Sq.Op.and]: [
        //             {
        //                 '$client_assigns.workerChklist.WCDocs.WDA.approval_status$': {
        //                     [Sq.Op.and]: [
        //                         { [Sq.Op.ne]: null },
        //                         { [Sq.Op.in]: ['approved', 'client_approved_action'] }
        //                     ]
        //                 }
        //             },
        //             {
        //                 '$client_assigns.clientCompInd.wrkrCI.is_comp_ind_completed$': {
        //                     [Sq.Op.or]: [
        //                         { [Sq.Op.ne]: null },
        //                         { [Sq.Op.eq]: true }
        //                     ]
        //                 }
        //             }
        //         ]
        //     };

        //     requiredStatus = true;
        // } else if (statusType === "NonCompliant") {
        //     worker_where_query = {
        //         ...worker_where_query,
        //         [Sq.Op.or]: [
        //             {
        //                 '$client_assigns.workerChklist.WCDocs.WDA.approval_status$': {
        //                     [Sq.Op.or]: [
        //                         { [Sq.Op.eq]: null },
        //                         { [Sq.Op.notIn]: ['approved', 'client_approved_action'] }
        //                     ]
        //                 }
        //             },
        //             {
        //                 '$client_assigns.clientCompInd.wrkrCI.is_comp_ind_completed$': {
        //                     [Sq.Op.or]: [
        //                         { [Sq.Op.eq]: null },
        //                         { [Sq.Op.eq]: false }
        //                     ]
        //                 }
        //             }
        //         ]
        //     };
        //     requiredStatus = true;
        // };

        if (sort && order) {
            sort == "first_name" ?
                query_obj.order = [[{ model: Individuals, as: "worker_individual" }, sort, order]] :
                query_obj.order = [[sort, order]];
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };
        const workersRes = await Workers.findAndCountAll({
            where: {
                provider_org_uuid,
                // ...worker_where_query
            }, attributes: ["worker_uuid", "worker_job_title"],
            include: [
                {
                    model: Individuals, as: "worker_individual", where: where_query, attributes:
                        ["individual_uuid", "first_name", "last_name", "phone", "email"],
                    required: true,
                },
                {
                    model: Organisations, as: "client_assigns",
                    required: requiredStatus,

                    attributes: ["organisation_uuid", "trading_name", "function_assignment_uuid"],
                    through: { attributes: [] },

                    include: [
                        {
                            model: WorkerChecklistAssign, as: 'workerChklist',
                            where: {
                                provider_org_uuid,
                                worker_uuid:
                                {
                                    [Sq.Op.eq]:
                                        Sq.col('client_assigns.worker_assign.worker_uuid')

                                }

                            },
                            attributes: ['worker_checklist_uuid'],
                            include: {
                                model: ChecklistDocs, as: 'WCDocs',
                                required: true,

                                attributes: ['checklist_doc_uuid', 'is_other_doc', 'other_doc_name', 'document_type_uuid"',
                                    'is_doc_mandatory',
                                ],
                                /////////////////////////////
                                include: {//single
                                    model: WorkerDocApproval, as: "WDA",

                                    where: {
                                        provider_org_uuid,
                                        worker_uuid:
                                        {
                                            [Sq.Op.eq]:
                                                Sq.col('client_assigns.worker_assign.worker_uuid')

                                        }
                                    },
                                    attributes: ['worker_doc_appr_uuid', 'worker_uuid', 'approval_status',],
                                    required: false,

                                },

                            },
                        },
                        {//company inductions
                            model: CompanyInductions, as: 'clientCompInd',
                            attributes: ['company_induction_uuid',],
                            include: {
                                model: WorkerCompanyInd, as: 'wrkrCI',
                                where: {
                                    worker_uuid:
                                    {
                                        [Sq.Op.eq]:
                                            Sq.col('client_assigns.worker_assign.worker_uuid')

                                    }
                                },
                                attributes: ['is_comp_ind_completed', 'worker_company_ind_uuid'],
                                required: false,
                            }
                        }],
                },],
            ...query_obj,
            distinct: true,
            subQuery: false,

        });
        //
        const processedResult = workersRes.rows.map(worker => {
            const updatedClientAssigns = worker.client_assigns.map(clientAssign => {
                const allApprovalsApproved = clientAssign.workerChklist.every(workerChklist => {
                    return workerChklist.WCDocs.every(WCDoc => {
                        return WCDoc.WDA && (WCDoc.WDA.approval_status === 'approved' || WCDoc.WDA.approval_status === 'client_approved_action');
                    });
                });

                const allInductionsCompleted = clientAssign.clientCompInd.every(clientCompInd => {

                    return clientCompInd.wrkrCI && clientCompInd.wrkrCI.is_comp_ind_completed;
                });

                // Determine status based on conditions
                const status = allApprovalsApproved && allInductionsCompleted ? 'compliant' : 'non-compliant';

                // Return a new object with updated `status`, ensuring no circular references
                return {
                    organisation_uuid: clientAssign.organisation_uuid,
                    trading_name: clientAssign.trading_name,
                    function_assignment_uuid: clientAssign.function_assignment_uuid,
                    status: status
                };
            });

            // Return updated worker object with modified client_assigns, ensuring no circular references
            return {
                worker_uuid: worker.worker_uuid,
                worker_job_title: worker.worker_job_title,
                worker_individual: {
                    individual_uuid: worker.worker_individual.individual_uuid,
                    first_name: worker.worker_individual.first_name,
                    last_name: worker.worker_individual.last_name,
                    phone: worker.worker_individual.phone,
                    email: worker.worker_individual.email
                },
                client_assigns: updatedClientAssigns
            };
        });

        // Prepare final response object
        const finalResponse = { count: workersRes.count, rows: processedResult };

        GETSUCCESS(res, finalResponse, "Get all workers of Provider successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};

//Get worker site logs accoriding to client of specific provider
const GetWorkerSiteLogsByClient = async (req, res, next) => {
    try {

        let { individual_uuid, client_org_uuid, sort, order } = req.query;

        let query_obj = {};

        if (sort && order) {
            let orderArr = [];
            if (sort === 'trading_name') {
                orderArr.push(['WorkerSiteClient', sort, order])
            } else if (sort === 'site_name') {
                orderArr.push(['WorkerSite', sort, order])
            } else {
                orderArr.push([sort, order])
            };
            query_obj.order = [orderArr]
        };
        const workerSitAccessRes = await WorkerSiteAccess.findAll({
            where: { individual_uuid, client_org_uuid },
            attributes: [
                'worker_site_access_uuid',
                'sign_in_date',
                'sign_out_date',
                'clock_in_out_status'
            ],
            include: [
                {
                    model: Organisations, as: 'WorkerSiteClient',
                    attributes: ['organisation_uuid', 'trading_name']
                },
                {
                    model: Sites, as: 'WorkerSite',
                    attributes: ['site_uuid', 'site_name']
                }
            ],
            ...query_obj
        });

        GETSUCCESS(res, workerSitAccessRes, "Get Worker site logs Details succesfully!")
    } catch (error) {
        console.log(error);
        next(error);
    };
};

const GetSubmissionDocsOfWorker = async (req, res, next) => {
    try {
        const { individual: { is_conserve_team } } = req.login_user;
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
                        // attributes: ["approval_status", "client_org_uuid", "provider_doc_appr_uuid"],
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
                        attributes: { exclude: commonAttributes }
                    }
                ]
            }
        })

        // Get unique client_org_uuid 
        // const uniqueClientOrgUuids = ChecklistDocRes.map(item =>
        //     item.workerDocAppr?.client_org_uuid).filter(uuid => uuid !== null);
        // let OrgRes;
        // //for check if login user is admin or owner worker
        // if (is_conserve_team || !uniqueClientOrgUuids.includes(provider_org_uuid)) {
        //     //get all client against specific submitted doc approval
        //     OrgRes = await Organisations.findAll({
        //         where: { organisation_uuid: uniqueClientOrgUuids }, attributes: [
        //             'organisation_uuid', 'trading_name']
        //     });
        // };
        GETSUCCESS(res, workerChecklistRes, "Get Worker document against client successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };

};
const CreateAndSubmitWorkerOtherDoc = async (req, res, next) => {
    try {
        const { login_user, body: DocDetails } = req;
        const {
            individual_uuid,
            worker_uuid,
            client_org_uuid,
            provider_org_uuid,
            checklist_doc_uuid,
        } = DocDetails;
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
            await IndividualDocuments.create({ document_uuid, individual_uuid }, { transaction });

            const workerDocAppRes = await WorkerDocApproval.create({
                document_uuid,
                client_org_uuid,
                checklist_doc_uuid,
                provider_org_uuid,
                worker_uuid,
                created_by: user_uuid,
            }, { transaction });

            let historydataObj = { is_worker_doc: true, document_uuid, created_by: user_uuid };
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
                    worker_doc_appr_uuid: workerDocAppRes.worker_doc_appr_uuid,
                    desc_html: [`<p>${first_name + " " + last_name} has send to Client for approval</p>`],
                    new_value: JSON.stringify(workerDocAppRes),
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

const GetAllDocsOfWorkerByDocType = async (req, res, next) => {
    try {
        const { individual_uuid, document_type_uuid } = req.query;

        const individualDocsRes = await IndividualDocuments.findAll({
            where: { individual_uuid },
            attributes: [
                [Sq.col("individualDoc.document_uuid"), "document_uuid"],
                [Sq.col("individualDoc.doc_name"), "doc_name"],
                [Sq.col("individualDoc.expiry_date"), "expiry_date"]],
            include: {
                model: Documents, as: "individualDoc",
                required: true,
                where: { document_type_uuid, is_other_doc: false },
                attributes: [],
            },
        });

        GETSUCCESS(res, individualDocsRes, "Get all Documents by Document type successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

const SubmitWorkerDocToClient = async (req, res, next) => {
    try {
        const { user_uuid, individual: { first_name, last_name } } = req.login_user;
        const docDetails = req.body;
        docDetails.created_by = user_uuid;

        sequelize.transaction(async (transaction) => {

            const workerDocAppRes = await WorkerDocApproval.create(docDetails, { transaction });

            //create ProviderDocApproval history
            const docChangeHistoryDetails = {
                document_uuid: docDetails.document_uuid,
                created_by: user_uuid,
                action_type: "create_doc_appr",
                worker_doc_appr_uuid: workerDocAppRes.worker_doc_appr_uuid,
                desc_html: [`<p>${first_name + " " + last_name} has send to Client for approval</p>`],
                new_value: workerDocAppRes,
            };

            await DocHistory.create(docChangeHistoryDetails, { transaction });

            SUCCESS(res, "Document submitted successfully!");
        });

    } catch (error) {
        console.log(error);
        next(error);
    };

};

//worker document status with site induction are pending 
const GetIndStatusOfWorkerByClient = async (req, res, next) => {
    try {
        const { client_org_uuid, worker_uuid, sort, order, inductionType } = req.query;
        const query_obj = {};

        if (sort && order) {
            let orderArr = [];
            if (sort === 'site_ind_name') {
                orderArr.push([Sq.col(`clientOrgSites.siteInd.site_ind_name`), order]);

            } else if (sort === 'company_ind_name') {
                orderArr.push([Sq.col(`clientCompInd.company_ind_name`), order]);
            };
            query_obj.order = orderArr;
        };
        let orgRes;
        if (inductionType === 'site') {
            orgRes = await Organisations.findOne({
                where: { organisation_uuid: client_org_uuid },
                attributes: ['organisation_uuid', 'trading_name'],
                include: [{
                    model: Sites, as: 'clientOrgSites',
                    attributes: ['site_name'],
                    include: {
                        model: SiteInductions, as: 'siteInd',
                        attributes: ['site_induction_uuid', 'site_ind_name'],

                        required: true,
                        include: {
                            model: WorkerSiteInd, where: { worker_uuid }, as: 'siteIndWorker',
                            attributes: ['is_induction_completed', 'updated_date'], required: false
                        }
                    }
                },
                ], ...query_obj,
            });
        };
        if (inductionType === 'company') {
            orgRes = await Organisations.findOne({
                where: { organisation_uuid: client_org_uuid },
                attributes: ['organisation_uuid', 'trading_name'],
                include: [
                    {
                        model: CompanyInductions, as: 'clientCompInd',
                        attributes: ['company_induction_uuid', 'company_ind_name'],
                        include: {
                            model: WorkerCompanyInd, as: 'workerCompInd',
                            where: { worker_uuid },
                            attributes: ['is_comp_ind_completed', 'updated_date'],
                            required: false,

                        }
                    }], ...query_obj,
            });
        };

        GETSUCCESS(res, orgRes, 'Get Worker site Induction for specific client successfully!');
    } catch (error) {
        console.log(error);
        next(error);
    };
};

//Assigned clients to provider(status data pending--------------)
const GetClientsAssignedToWorkerByProvider = async (req, res, next) => {
    try {
        const { worker_uuid, provider_org_uuid, sort, order } = req.query;

        let query_obj = {};
        //sort created_date,trading_name
        if (sort && order) {
            let orderArr = [];
            if (sort === 'trading_name') {
                orderArr.push(['clientAssign', sort, order])
            } else {
                orderArr.push([sort, order])
            };
            query_obj.order = [orderArr]
        };
        const workerAssignRes = await WorkerAssign.findAll({
            where: { worker_uuid, provider_org_uuid },
            attributes: [
                'client_org_uuid', 'created_date',
                [Sq.col('clientAssign.org_phone'), 'org_phone'],
                [Sq.col('clientAssign.trading_name'), 'trading_name']

            ],
            include: { model: Organisations, as: 'clientAssign', attributes: [] },
            ...query_obj
        });
        GETSUCCESS(res, workerAssignRes, 'Get all clients of worker by specific provider successfully!')

    } catch (error) {
        console.log(error);
        next(error);
    };
};

//assign workers to clients-------------workign pending working assing client invited worker checklist 
const CreateAssignWorkersToClient = async (req, res, next) => {
    try {
        const { user_uuid } = req.login_user;
        let { provider_org_uuid, clientOrgIds, workerIds } = req.body;

        // const inviteProvCompRes = await InviteProviderCompliance.findAll({
        //     where: { invite_provider_uuid },
        //     attributes: ['checklist_uuid'],
        //     where: { invite_provider_uuid, },
        //     raw: true
        // });
        // const checklistUuidsWithOrg = inviteProvCompRes.map(checklist => ({
        //     checklist_uuid: checklist.checklist_uuid,
        //     client_org_uuid, provider_org_uuid: orgRes.organisation_uuid,
        //     // Add client_org_uuid to each object
        // }));


        //parse
        workerIds = JSON.parse(workerIds);
        clientOrgIds = JSON.parse(clientOrgIds);

        for (let worker_uuid of workerIds) {
            for (let client_org_uuid of clientOrgIds) {
                let [workerAssign, workerAssignCreated] = await WorkerAssign.findOrCreate({
                    where: {
                        provider_org_uuid,
                        worker_uuid,
                        client_org_uuid
                    },
                    defaults: {
                        provider_org_uuid,
                        worker_uuid,
                        client_org_uuid,
                        created_by: user_uuid
                    }
                },);

                // checklist_uuid: 
                // client_org_uuid:
                // provider_org_uuid: 
                // worker_uuid:
                // await WorkerChecklistAssign.findOrCreate({});


                // workerClientAssignArr.push({
                //     provider_org_uuid,
                //     worker_uuid,
                //     client_org_uuid,
                //     created_by: user_uuid
                // })
            };
        };
        SUCCESS(res, "Clients assigned to the workers successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

//related data not removed
const RemoveWorkerAssignedClients = async (req, res, next) => {
    try {
        const { user_uuid } = req.login_user;
        let { workerIds, clientOrgIds, provider_org_uuid } = req.body;

        //parse
        workerIds = JSON.parse(workerIds);
        clientOrgIds = JSON.parse(clientOrgIds);

        // orgRes = await Organisations.findAll({
        //     where: { organisation_uuid: clientOrgIds },
        //     attributes: ['organisation_uuid', 'trading_name'],
        //     include: [{
        //         model: Sites, as: 'clientOrgSites',
        //         attributes: ['site_name'],
        //         include: {
        //             model: SiteInductions, as: 'siteInd',
        //             attributes: ['site_induction_uuid', 'site_ind_name'],
        //             required: true,

        //         }
        //     },
        //     {
        //         model: CompanyInductions, as: 'clientCompInd',
        //         attributes: ['company_induction_uuid', 'company_ind_name'],

        //     }
        //     ],
        // });

        await WorkerAssign.update({ deleted_date: new Date(), deleted_by: user_uuid }, {
            where: {
                worker_uuid: workerIds, client_org_uuid: clientOrgIds, provider_org_uuid
            }, individualHooks: true, user_uuid,
        });
        // await WorkerDocApproval.destroy({ where: { workerIds } });
        // await WorkerCompanyInd.destroy();


        SUCCESS(res, "Assigned worker to client removed successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };

};
// const GetWorkerDocForProvider = async (req, res, next) => {
//     try {
//         //function_assignment_uuid of provider
//         const { document_uuid, } = req.query;

//         const documentRes = Documents.findOne({
//             where: { document_uuid },
//             subQuery: false,
//             include: {
//                 model: DocumentTypes, as: "document_type",
//                 attributes: { exclude: commonAttributes },
//             }
//         });

//         GETSUCCESS(res, documentRes, "Get Worker Document by id successfully!");

//     } catch (error) {
//         console.log(error);
//         next(error);
//     };
// };
//All history of provider specific  document

//not applied  confirmation pending
// const RemoveBulkWorkerOfProvider = async (req, res, next) => {
//     try {
//         const { user_uuid } = req.login_user;
//         const { provider_org_uuid, worker_uuid, trading_name, first_name, email } = req.body;
//         //get related workers Workers

//         await Workers.findOne({
//             where: { worker_uuid },
//             include: {

//                 model: WorkerAssign, where: { provider_org_uuid, worker_uuid },
//                 as: 'workerAssigns',
//                 attributes: [[Sq.col('clientAssign.trading_name'), 'trading_name']],
//                 include: {
//                     model: Organisations, as: 'clientAssign',
//                     attributes: []
//                 }
//             }, raw: true, nest: true

//         });
//         const workerAssignRes = await WorkerAssign.findAll({
//             where: { provider_org_uuid, worker_uuid },
//             attributes: [[Sq.col('clientAssign.trading_name'), 'trading_name']],
//             include: {
//                 model: Organisations, as: 'clientAssign',
//                 attributes: []
//             }, raw: true, nest: true

//         });

//         //remove spcific provider worker
//         await Workers.destroy({ where: worker_uuid }, { individualHooks: true, user_uuid, });
//         //remove worker assign to client
//         await WorkerAssign.destroy({
//             where: {
//                 worker_uuid,
//                 provider_org_uuid
//             }, individualHooks: true, user_uuid,
//         });
//         //get suppoet team
//         const supportTeamDetails = await Roles.findAll({
//             where: { role_name: 'support team' },
//             attributes: [[Sq.col('roleAssigns.individual.email'), 'email'],],
//             // plain:true,
//             include: {
//                 model: Users, as: "roleAssigns",
//                 through: { attributes: [] },
//                 attributes: [],
//                 required: true,
//                 include: { model: Individuals, attributes: [] },
//                 // attributes: ["role_assignment_uuid",],
//             }
//         });
//         //Support team exist
//         if (supportTeamDetails.length > 0) {
//             // Extract the trading namess into an array
//             const clientTradingNames = workerAssignRes.map(record => record.trading_name);
//             //email details
//             let supportTeamEmailDetails = {
//                 workerName: first_name,//worker name
//                 WorkerEmail: email,//inviter name
//                 providerTradingName: trading_name,//provider trading_name
//                 clientTradingNames
//             };

//             for (let supportTeam of supportTeamDetails) {
//                 supportTeamEmailDetails.supportTeamEmail = supportTeam.email;
//                 console.log('----------------', supportTeam.email)
//                 sendWorkerRemoveToAdminEmail(supportTeamEmailDetails);
//             };

//             // sendWorkerRemoveToAdminEmail,
//             // sendWorkerRemoveToProviderEmail
//         };

//         //email to provider
//         const ProviderEmailDetails = {};
//         sendWorkerRemoveToProviderEmail();




//         SUCCESS(res, "tradingNames", 'Specific Provider Worker removed successfully!');

//     } catch (error) {
//         console.log(error);
//         next(error);

//     };
// };

//to get worker site and company induction training details 
const GetWorkerTrainingInduction = async (req, res, next) => {
    try {
        const { worker_uuid, site_induction_uuid, company_induction_uuid, inductionType } = req.query;
        let inductionRes;
        if (inductionType === 'site') {

            inductionRes = await SiteInductions.findOne({
                where: { site_induction_uuid },
                attributes: { exclude: commonAttributes },
                include: [
                    {//site induction module
                        model: SiteIndModule,
                        attributes: ["site_ind_module_uuid", "module_uuid"],
                        include: {
                            model: Modules, as: "module_data",
                            attributes: { exclude: commonAttributes },
                            include: [
                                {
                                    model: WorkerModuleAttempt, as: "ModuleAttempt",
                                    where: { worker_uuid },
                                    attributes: ["is_module_pass", "module_atttemp_date"],
                                    required: false,
                                },
                                {
                                    model: ModuleQuestions, as: "module_ques_data",
                                    attributes: { exclude: commonAttributes },
                                    include: [
                                        {
                                            model: ModuleAnswers, as: "ques_ans_data",
                                            attributes: { exclude: commonAttributes },
                                        }
                                    ]
                                }],
                            order: [
                                ["module_ques_data", "sort_order", "ASC"],
                                ["module_ques_data", "ques_ans_data", "sort_order", "ASC"],
                            ],
                        }, separate: true
                    },
                    // {//site induction Compliance doc junction
                    //     model: SiteIndDocTypes,
                    //     attributes: { exclude: commonAttributes },
                    //     include: {
                    //         model: ComplianceDocs,
                    //         attributes: { exclude: commonAttributes },
                    //     },
                    //     // required:true,
                    // }, 
                    // {//site induction industry junction
                    //     model: SiteIndIndustry,
                    //     attributes: { exclude: commonAttributes },
                    //     include: {
                    //         model: MasterSettings,
                    //         attributes: { exclude: commonAttributes },
                    //     }
                    // }
                ],
            });
        } else if (inductionType === 'company') {

            inductionRes = await CompanyInductions.findOne({
                where: { company_induction_uuid },
                attributes: { exclude: commonAttributes },
                include: [
                    {//modules
                        model: Modules, as: "company_ind_modules",
                        through: { attributes: [], },
                        attributes: { exclude: commonAttributes },

                        include: [
                            {
                                model: WorkerModuleAttempt, as: "ModuleAttempt",
                                where: { worker_uuid },
                                attributes: ["is_module_pass", "module_atttemp_date"],
                                required: false,
                            },

                            {
                                model: ModuleQuestions, as: "module_ques_data",
                                attributes: { exclude: commonAttributes },
                                include: {
                                    model: ModuleAnswers, as: "ques_ans_data",
                                    attributes: { exclude: commonAttributes },
                                    separate: true,
                                    order: [["sort_order", "ASC"]],
                                }
                            }],
                    },
                ],
                order: [
                    ["company_ind_modules", "sort_order", "ASC"],
                    ["company_ind_modules", "module_ques_data", "sort_order", "ASC"],
                ],
            });

        };

        GETSUCCESS(res, inductionRes, `Get Worker ${inductionType} Induction training Details successfully!`);
    } catch (error) {
        console.log(error);
        next(error);
    };

};
module.exports = {
    GetProviderWorkersInvite,
    DeleteWorkerInvite,
    RemoveWorkerOfProvider,
    inviteWorkerCsvView,
    InviteWorkerFromCsvDetails,
    GetAllWorkersOfProvider,
    GetWorkerSiteLogsByClient,
    GetSubmissionDocsOfWorker,
    GetAllDocsOfWorkerByDocType,
    SubmitWorkerDocToClient,
    CreateAndSubmitWorkerOtherDoc,
    GetIndStatusOfWorkerByClient,
    GetClientsAssignedToWorkerByProvider,
    CreateAssignWorkersToClient,
    RemoveWorkerAssignedClients,
    GetWorkerTrainingInduction,
    // GetWorkerDocForProvider

    // RemoveBulkWorkerOfProvider

};
