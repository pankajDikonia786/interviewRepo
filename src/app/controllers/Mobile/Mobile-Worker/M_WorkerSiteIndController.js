
const sequelize = require('../../../../config/DbConfig.js');
const Sq = require("sequelize");
const { SUCCESS, GETSUCCESS } = require('../../../../constants/ResponseConstants.js');
const {
    Organisations,
    Sites,
    SiteInductions,
    SiteIndModule,
    SiteIndDocTypes,
    ComplianceDocs,
    Modules,
    ModuleQuestions,
    ModuleAnswers,
    WorkerQuesAttempt,
    WorkerModuleAttempt,
    WorkerSiteInd,
    IndividualDocuments,
    Documents,
    DocumentTypes,
    DocumentSwmTypes,
    SwmTypes,
    WorkerTrainingSite,
    WorkerSiteAccess
} = require('../../../../models/common');
const { commonAttributes, } = require('../../../../services/Helper.js');

const GetAllClientsForWorkerSiteInd = async (req, res, next) => {
    try {
        const { function_uuid, search, } = req.query;
        let whereObj = { function_uuid, is_org_active: true };
        if (search) {
            whereObj = {
                ...whereObj,
                trading_name: { [Sq.Op.iLike]: `%${search}%` }
            };
        };
        const orgRes = await Organisations.findAll({
            where: whereObj,
            attributes: ["organisation_uuid", "function_assignment_uuid", "trading_name"],
            include: {
                model: Sites, where: { is_site_active: true }, as: "clientOrgSites",
                attributes: [],
                required: true
            }
        });

        GETSUCCESS(res, orgRes, "Get all client list successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};
//here may be need to show only one site induction from multiple (need to handle direct worker and  related to provider-worker relation)
const GetAllSitesAndIndStatusOfClientById = async (req, res, next) => {

    try {
        const { function_assignment_uuid, worker_uuid, search } = req.query;

        let whereObj = { function_assignment_uuid, is_site_active: true };
        if (search) {
            whereObj = {
                ...whereObj,
                site_name: { [Sq.Op.iLike]: `%${search}%` }
            };
        };
        const sitesRes = await Sites.findAll({
            where: whereObj,
            attributes: ["site_uuid", "site_name",
            ],
            include: [
                //specific site inductions training site completed or not
                { model: WorkerTrainingSite, as: "siteTraining", attributes: { exclude: commonAttributes } },
                {
                    model: SiteInductions, as: "siteInd",
                    attributes: ["site_induction_uuid", "site_ind_name"],
                    where: { site_ind_status: "active" },
                    // required:false,
                    include: {
                        //if data exist that mean induction attempt
                        model: WorkerSiteInd, as: "siteIndWorker",
                        where: { worker_uuid },//add where according to direct worker and with (need to select provider then get workerid)Provider pending
                        attributes: ["worker_site_ind_uuid", "is_induction_completed"],

                        required: false
                    },
                }],
        });

        GETSUCCESS(res, sitesRes, "Get Site Details successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetTrainingSiteIndAndModulesbyId = async (req, res, next) => {
    try {
        const { site_induction_uuid } = req.query;
        const siteInductionRes = await SiteInductions.findOne({
            where: { site_induction_uuid },
            attributes: { exclude: commonAttributes },
            include: [
                {//site induction module
                    model: SiteIndModule,
                    attributes: { exclude: commonAttributes },
                    include: {
                        model: Modules, as: "module_data",
                        attributes: { exclude: commonAttributes },
                        include: {
                            model: ModuleQuestions, as: "module_ques_data",
                            attributes: { exclude: commonAttributes },
                            include: {
                                model: ModuleAnswers, as: "ques_ans_data",
                                attributes: { exclude: commonAttributes },
                            }
                        }
                    }, separate: true
                },
                {//site induction doc types doc junction
                    model: SiteIndDocTypes,
                    attributes: { exclude: commonAttributes },
                    include: {
                        model: DocumentTypes,
                        attributes: { exclude: commonAttributes },
                    },
                    // required:true,
                },
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

        GETSUCCESS(res, siteInductionRes, "Get Site Induction successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };

};

//can we use user_module_attempt_uuid check instead of is_module_first_attempt
const SaveTrainingModuleQuesDetails = async (req, res, next) => {
    try {
        const { user_uuid, individual: { individual_uuid } } = req.login_user;
        let { module_uuid, site_uuid, module_question_uuid, worker_uuid, site_induction_uuid, is_ques_completed, is_module_first_attempt } = req.body;

        await sequelize.transaction(async (transaction) => {
            //create ques. attepmt by worker
            await WorkerQuesAttempt.create({
                module_question_uuid,
                module_uuid,
                worker_uuid,
                site_uuid,
                is_ques_completed
            }, { transaction });
            //hit when worker attempt the every module (specific ques) first time 
            if (is_module_first_attempt === true || is_module_first_attempt === "true") {
                //create worker site induction per module attempt (When attempt first ques. of module)
                await WorkerModuleAttempt.create({
                    module_uuid, worker_uuid, individual_uuid, site_uuid///
                }, { transaction });

                //create or check worker site induction junction 
                await WorkerSiteInd.findOrCreate({
                    where: {
                        site_induction_uuid,
                        worker_uuid
                    },
                    defaults: {
                        site_induction_uuid,
                        site_uuid,//
                        worker_uuid,
                        created_by: user_uuid
                    }, transaction
                });
                //for site overall trainnig purpose 
                await WorkerTrainingSite.findOrCreate({
                    where: {
                        site_uuid,
                        worker_uuid
                    },
                    defaults: {
                        site_uuid,
                        worker_uuid,
                        created_by: user_uuid
                    }, transaction
                });
            };

            SUCCESS(res, "Training module ques saved successfully!");
        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//To use when specific site induction module is completed (for current and past training site inductions)
const PassTrainingSiteIndModule = async (req, res, next) => {
    try {
        const { individual: { individual_uuid } } = req.login_user;
        const { module_uuid, is_module_pass, worker_uuid } = req.body;

        await WorkerModuleAttempt.update({ is_module_pass },
            {
                where: { worker_uuid, module_uuid, individual_uuid }
            });

        SUCCESS(res, "Training module pass successfully!");
    } catch (error) {
        console.log(error);
        next(error)
    }
};

//To use when specific site induction is completed 
const UpdateTrainingSiteIndStatus = async (req, res, next) => {
    try {
        const { user_uuid } = req.login_user;
        let { worker_uuid, site_uuid, site_induction_uuid, is_induction_completed, is_training_completed } = req.body;

        if (site_induction_uuid !== "") {
            //for hit use at the time of all module training completed
            await WorkerSiteInd.update({ is_induction_completed, updated_by: user_uuid },
                { where: { worker_uuid, site_induction_uuid } });
        };
        //when overall inductions of specific site completed
        if (is_training_completed === true || is_training_completed === "true") {

            await WorkerTrainingSite.update({ is_training_completed }, {
                where: { site_uuid, worker_uuid },
            });
        };

        SUCCESS(res, `Worker training site induction successfully!`);
    } catch (error) {
        console.log(error);
        next(error);

    };
};

const GetWorkerPastTrainingSiteIndById = async (req, res, next) => {
    try {
        const { worker_uuid, site_induction_uuid } = req.query;

        const siteInductionRes = await SiteInductions.findOne({
            where: { site_induction_uuid },
            attributes: { exclude: commonAttributes },
            include: [
                {
                    //if data exist that mean induction attempt
                    model: WorkerSiteInd, as: "siteIndWorker",
                    where: { worker_uuid, },
                    attributes: ["worker_site_ind_uuid", "is_induction_completed"],
                    required: false,
                },
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
                                include: [{
                                    model: WorkerQuesAttempt, as: "QuesAttempt",
                                    attributes: ["module_uuid", "is_ques_completed"],
                                    where: { worker_uuid },
                                }, {
                                    model: ModuleAnswers, as: "ques_ans_data",
                                    attributes: { exclude: commonAttributes },
                                }]
                            }]
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

        GETSUCCESS(res, siteInductionRes, "Get Past training Site Induction successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };

};
//site_uuid from mobile front requried-////////////
const SavePastTrainingModuleQuesDetails = async (req, res, next) => {

    try {
        const { user_uuid, individual: { individual_uuid } } = req.login_user;
        let { module_uuid, module_question_uuid, worker_uuid, site_induction_uuid, is_ques_completed, is_module_first_attempt } = req.body;

        await sequelize.transaction(async (transaction) => {
            //create ques. attempt by worker
            await WorkerQuesAttempt.create({ module_question_uuid, module_uuid, site_uuid, is_ques_completed }, { transaction });
            //hit when worker attemp the every module (specific ques) first time 
            if (is_module_first_attempt === true || is_module_first_attempt === "true") {
                //create worker site induction per module attempt (When attempt first ques. of module)
                await WorkerModuleAttempt.create({
                    module_uuid, individual_uuid, worker_uuid, site_uuid
                }, { transaction });

            };
            //create or check worker site induction junction 
            await WorkerSiteInd.findOrCreate({
                where: {
                    site_induction_uuid,
                    worker_uuid,
                },
                defaults: {
                    site_induction_uuid,
                    worker_uuid,
                    site_uuid,
                    created_by: user_uuid
                }, transaction
            });

            SUCCESS(res, { message: "Past training module ques saved successfully!" });
        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//show all document of of worker at global level
const GetAllManageDocsOfWorker = async (req, res, next) => {
    try {
        const { individual: { individual_uuid } } = req.login_user;

        const documentRes = await IndividualDocuments.findAll({
            where: { individual_uuid }, attributes: ["individual_document_uuid"],
            attributes: [
                [Sq.col("individualDoc.document_uuid"), "document_uuid"],
                [Sq.col("individualDoc.doc_file"), "doc_file"],
                [Sq.col("individualDoc.is_swms_doc"), "is_swms_doc"],
                [Sq.col("individualDoc.expiry_date"), "expiry_date"],
                [Sq.col("individualDoc.issuing_authority"), "issuing_authority"],
                [Sq.col("individualDoc.document_type.doc_type_name"), "doc_type_name"],
                [Sq.col("individualDoc.document_type.document_type"), "document_type"],
                [Sq.col("individualDoc.swm_doc_type.swm_type.swm_type_name"), "swm_type_name"],
                [Sq.col("individualDoc.swm_doc_type.swm_type.swm_type_name"), "swm_type_name"]
            ],
            include: {
                model: Documents, as: "individualDoc",
                attributes: [],
                required: true,
                include: [
                    {
                        model: DocumentTypes, as: "document_type",
                        attributes: [],
                        required: false
                    },
                    {
                        model: DocumentSwmTypes, as: "swm_doc_type", attributes: ["document_swm_type_uuid"],
                        include: [
                            { model: SwmTypes, attributes: [] },
                        ]
                    },
                ]
            }
        });

        GETSUCCESS(res, documentRes, "Get all managed documents successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};

const CreateWorkerClockInOut = async (req, res, next) => {
    try {
        const { individual: { individual_uuid } } = req.login_user;
        const { worker_uuid,
            site_uuid,
            client_org_uuid,
            estimate_clockout_time,
            clock_in_out_status,
            updateEstimateTimeOnly
        } = req.body;

        const fileData = req.file;

        if (updateEstimateTimeOnly === true || updateEstimateTimeOnly === "true") {
            await WorkerSiteAccess.update(
                {
                    estimate_clockout_time,
                },
                {
                    where: {
                        individual_uuid,
                        worker_uuid,
                        site_uuid,
                        clock_in_out_status: true//when worker signin
                    },
                }
            );
            return SUCCESS(res, `Worker Estimate time updated successfully! `);
        };
        if (clock_in_out_status === true || clock_in_out_status === "true") {

            await WorkerSiteAccess.create({
                worker_uuid,
                individual_uuid,
                site_uuid,
                client_org_uuid,
                estimate_clockout_time,
                sign_in_date: new Date(),
                clock_in_out_status,
                photo: fileData?.location ? fileData.location : ""//picture
            })
        };
        if (clock_in_out_status === false || clock_in_out_status === "false") {
            await WorkerSiteAccess.update(
                {
                    sign_out_date: new Date(),
                    clock_in_out_status
                },
                {
                    where: {
                        individual_uuid,
                        worker_uuid,
                        site_uuid,
                        clock_in_out_status: true
                    },
                }
            );
        };

        SUCCESS(res, `Worker ${clock_in_out_status === true || clock_in_out_status === "true" ? "Singin" : "Signout"} successfully! `);

    } catch (error) {
        console.log(error);
        next(error);
    };

};
const GetCurrentClockInOutStatus = async (req, res, next) => {

    try {
        const { individual: { individual_uuid } } = req.login_user;
        const { worker_uuid, } = req.query;
        //if worker are signin at any clinet site
        const workerSiteAccessRes = await WorkerSiteAccess.findOne({
            where: { worker_uuid, individual_uuid, clock_in_out_status: true },
            attributes: ["site_uuid", "client_org_uuid", [Sq.col("WorkerSite.site_name"), "site_name"],
                "clock_in_out_status", "estimate_clockout_time", "sign_in_date",],
            include: { model: Sites, as: "WorkerSite", attributes: [] }
        });

        GETSUCCESS(res, workerSiteAccessRes, "Get worker clock in details successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };

};




module.exports = {
    GetAllClientsForWorkerSiteInd,
    GetAllSitesAndIndStatusOfClientById,
    GetTrainingSiteIndAndModulesbyId,
    PassTrainingSiteIndModule,
    UpdateTrainingSiteIndStatus,
    SaveTrainingModuleQuesDetails,
    GetWorkerPastTrainingSiteIndById,
    SavePastTrainingModuleQuesDetails,
    GetAllManageDocsOfWorker,
    CreateWorkerClockInOut,
    GetCurrentClockInOutStatus


};