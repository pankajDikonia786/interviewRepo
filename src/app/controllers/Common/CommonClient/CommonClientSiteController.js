const Sq = require("sequelize");
const path = require("path");
const sequelize = require('../../../../config/DbConfig');
const { SUCCESS, GETSUCCESS, INVALIDRESPONSE, CUSTOMRESPONSE, } = require('../../../../constants/ResponseConstants');
const { commonAttributes, deleteS3BucketFile } = require("../../../../services/Helper.js");
const { MessageConstants } = require('../../../../constants/StringConstants');
const {
    Sites,
    SiteInductions,
    SiteIndIndustry,
    SiteIndDocTypes,
    Modules,
    ModuleQuestions,
    ModuleAnswers,
    SiteIndModule,
    DocumentTypes,
    MasterSettings,
    WorkerTrainingSite,
    Individuals,
    Workers,
    Organisations,
    WorkerSiteAccess,
    IndividualOrg,
    ClientSiteContacts,
    WorkerChecklistAssign,
    WorkerSiteInd,
    WorkerModuleAttempt,
    ComplianceChecklist,
    Documents,
    ChecklistDocs,
    WorkerDocApproval,
    WorkerQuesAttempt
} = require("../../../../models/common");
const { States, Countries } = require("../../../../models/public");

const CreateSite = async (req, res, next) => {
    try {
        const { user_uuid } = req.login_user;
        const siteDetails = req.body;
        let { siteContactIndividualIds, function_assignment_uuid } = siteDetails;
        siteDetails.created_by = user_uuid;
        const filesData = req.files;

        let filesPathArray = [];
        //Add evacuation diagram data in array
        if (filesData) {
            for (let file of filesData) {
                filesPathArray.push(file.location)
            };
            siteDetails.evacuation_diagram = filesPathArray;
        };
        //create site
        const { site_uuid } = await Sites.create(siteDetails);
        //Site contacts
        if (siteContactIndividualIds?.length > 0) {
            const siteContactArr = [];
            siteContactIndividualIds = JSON.parse(siteContactIndividualIds);

            for (let individual_uuid of siteContactIndividualIds) {
                siteContactArr.push({
                    site_uuid,
                    client_fa_uuid: function_assignment_uuid,
                    individual_uuid, created_by: user_uuid
                });

            };
            //create client site contact
            await ClientSiteContacts.bulkCreate(siteContactArr);
        };

        SUCCESS(res, "Site created successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetAllSitesOfClient = async (req, res, next) => {
    try {
        const { sort, order, page, limit, search, function_assignment_uuid } = req.query;

        let where_obj = { function_assignment_uuid };
        let query_obj = {};
        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("site_name"), { [Sq.Op.iLike]: `%${search}%` }),
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
        const sitesRes = await Sites.findAndCountAll({
            where: where_obj,
            attributes: ["site_uuid", "state_id", "site_name", "site_address", "site_address_other", "is_site_active",
                [Sq.col("site_state.state_name"), "state_name"]
            ],
            include: { model: States, as: "site_state", attributes: [] },
            ...query_obj
        });

        GETSUCCESS(res, sitesRes, 'Get all sites of Client successfully!');

    } catch (error) {
        console.log(error);
        next(error);
    }
};
const GetClientSiteById = async (req, res, next) => {
    try {
        const { site_uuid, client_org_uuid } = req.query;

        const siteRes = await Sites.findOne({
            where: { site_uuid },
            attributes: { exclude: commonAttributes },
            include: [
                { model: Countries, as: "site_country", attributes: ["name"] },
                { model: States, as: "site_state", attributes: ["state_name"] },
                {
                    model: ClientSiteContacts, as: 'siteContacts',
                    separate: true,
                    include: {
                        model: Individuals, as: 'siteContIndi',
                        include: {
                            model: IndividualOrg, as: 'org_ind', where: {
                                organisation_uuid: client_org_uuid, is_user: false

                            }, attributes: ['job_title']
                        },

                        attributes: ['individual_uuid', 'first_name', 'last_name', 'email', 'phone']
                    }
                },
            ]
        });

        GETSUCCESS(res, siteRes, "Get Site by id Successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};

const UpdateClientSite = async (req, res, next) => {
    try {
        const { user_uuid } = req.login_user;
        const siteDetails = req.body;
        let { site_uuid, siteContactIndividualIds, deleteSiteContactIds } = siteDetails;
        siteDetails.updated_by = user_uuid;
        //New upload files (evacuation_diagram)
        const filesData = req.files;
        //existing evacuation_diagram files
        siteDetails.evacuation_diagram = JSON.parse(siteDetails.evacuation_diagram);
        if (filesData) {
            for (let file of filesData) {
                //Add new files of evacuation_diagram
                siteDetails.evacuation_diagram.push(file.location);
            };
        };
        const siteRes = await Sites.update(siteDetails, { where: { site_uuid }, returning: true, plain: true, });
        const client_fa_uuid = siteRes[1].function_assignment_uuid;//client 
        //parse
        deleteSiteContactIds = JSON.parse(deleteSiteContactIds);
        siteContactIndividualIds = JSON.parse(siteContactIndividualIds);
        //Deletesite contact 
        if (deleteSiteContactIds.length > 0) {
            await ClientSiteContacts.destroy({ where: { site_contact_uuid: deleteSiteContactIds } });
        };

        //new Site contacts create
        if (siteContactIndividualIds.length > 0) {
            const siteContactArr = [];
            for (let individual_uuid of siteContactIndividualIds) {
                siteContactArr.push({ client_fa_uuid, site_uuid, individual_uuid, created_by: user_uuid });
            };
            await ClientSiteContacts.bulkCreate(siteContactArr);
        };

        SUCCESS(res, "Site updated successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const DeleteSiteEvacuationDiagramById = async (req, res, next) => {
    try {
        let { site_uuid, evacuation_diagram_url, evacuation_diagram } = req.body;

        if (evacuation_diagram_url && site_uuid) {

            evacuation_diagram = JSON.parse(evacuation_diagram)
            await Sites.update({ evacuation_diagram }, { where: { site_uuid: site_uuid, } }
            );
            //delete  specific file
            const fileBasename = path.basename(evacuation_diagram_url);
            await deleteS3BucketFile(fileBasename);

        } else {
            return INVALIDRESPONSE(res, "Bad Request!");
        };
        SUCCESS(res, "Site Evacuation Diagram deleted successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};
//------------------pending delete other related data of site
const RemoveClientSiteById = async (req, res, next) => {
    try {
        const { site_uuid } = req.query;
        await Sites.destroy({ where: { site_uuid }, });
        SUCCESS(res, "Site Deleted Successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };

};
//recheck:---------------------- need change
//For site induction document
// const GetCompDocsListOfWorkerType = async (req, res, next) => {

//     try {
//         const { function_assignment_uuid, search, } = req.query;

//         let where_obj = { function_assignment_uuid };

//         if (search) {
//             where_obj = {
//                 ...where_obj,
//                 [Sq.Op.or]: [
//                     Sq.where(Sq.col("checklist_name"), { [Sq.Op.iLike]: `%${search}%` }),
//                 ]
//             };
//         };

//         const complianceDocsRes = await CompChecklist.findAll({
//             where: where_obj,
//             attributes: ["comp_checklist_uuid", "function_assignment_uuid", "checklist_name",],
//             include: {
//                 model: DocumentTypes,
//                 where: { recipient_type: "worker" },
//                 attributes: ["document_type_uuid", "recipient_type"],
//                 // required: false,
//             },
//             order: [["checklist_name", "ASC"]]
//         });

//         GETSUCCESS(res, complianceDocsRes, "Get all Compliace checklist of specific worker List successfully!");
//     } catch (error) {
//         console.log(error);
//         next(error);
//     };
// };

const CreateSiteInduction = async (req, res, next) => {

    try {
        await sequelize.transaction(async (transaction) => {
            const login_user = req.login_user.user_uuid;
            const siteInductionDetails = req.body;
            let { doctType_uuid_data, master_setting_uuid_data } = siteInductionDetails;

            let site_doc_array = [];
            let site_industry_array = [];
            siteInductionDetails.created_by = login_user.user_uuid;

            //create site induction
            const { site_induction_uuid } = await SiteInductions.create(siteInductionDetails, { transaction });

            if (doctType_uuid_data) {
                for (const document_type_uuid of doctType_uuid_data)
                    site_doc_array.push({
                        document_type_uuid, site_induction_uuid
                    });
                //create induction compliance doc requirements
                await SiteIndDocTypes.bulkCreate(site_doc_array, { transaction });
            };
            if (master_setting_uuid_data) {
                for (const master_setting_uuid of master_setting_uuid_data)
                    site_industry_array.push({
                        master_setting_uuid, site_induction_uuid
                    });
                // create site induction industry
                await SiteIndIndustry.bulkCreate(site_industry_array, { transaction });
            };

            SUCCESS(res, { site_induction_uuid, message: "Induction added successfully!" });

        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const CreateSiteInductionModule = async (req, res, next) => {
    try {
        await sequelize.transaction(async (transaction) => {
            const login_user = req.login_user;
            const siteInductionModuleDetails = req.body;
            let { module_ques_data, site_induction_uuid, pdf_page_range } = siteInductionModuleDetails;
            siteInductionModuleDetails.created_by = login_user.user_uuid;

            //parse (pdf_page_range(JSONB) can be empty if content_info are not pdf file)
            if (pdf_page_range && Object.keys(pdf_page_range)) {
                siteInductionModuleDetails.pdf_page_range = JSON.parse(pdf_page_range);
            };
            //aws bucket data
            let fileData = req.file?.location;

            fileData ? siteInductionModuleDetails.content_info = fileData : "";
            //parse questions data
            module_ques_data = JSON.parse(module_ques_data);

            const { module_uuid } = await Modules.create(siteInductionModuleDetails, { transaction });

            for (let [quesInd, ques,] of module_ques_data.entries()) {
                //create questions
                module_ques_data[quesInd].module_uuid = module_uuid;
                const moduleQuestionsRes = await ModuleQuestions.create(ques, { transaction });
                let module_question_uuid = moduleQuestionsRes.module_question_uuid;

                //create answers options data
                for (let [ind, answer] of ques.ques_ans_data.entries()) {
                    ques.ques_ans_data[ind].module_question_uuid = module_question_uuid;
                }
                await ModuleAnswers.bulkCreate(ques.ques_ans_data, { transaction });
            };
            //create induction module document junction
            await SiteIndModule.create({
                site_induction_uuid, module_uuid,
            }, { transaction });

            SUCCESS(res, { module_uuid, message: "Site Induction module added successfully!" });
        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetSiteInductionModuleById = async (req, res, next) => {
    try {
        const { module_uuid } = req.query;
        const moduleRes = await Modules.findOne({
            where: { module_uuid, module_type: "site induction" }, attributes: { exclude: commonAttributes },
            include: {
                model: ModuleQuestions, as: "module_ques_data", attributes: { exclude: commonAttributes },
                include: { model: ModuleAnswers, as: "ques_ans_data", attributes: { exclude: commonAttributes } }
            },
            order: [
                ["module_ques_data", "sort_order", "ASC"],
                ["module_ques_data", "ques_ans_data", "sort_order", "ASC"],
            ],
        });
        GETSUCCESS(res, moduleRes, "Get Site induction Module by id Successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};

const UpdateSiteInductionModule = async (req, res, next) => {
    try {
        await sequelize.transaction(async (transaction) => {
            const login_user = req.login_user;
            const siteInductionModuleDetails = req.body;
            let { module_ques_data, module_uuid, pdf_page_range } = siteInductionModuleDetails;
            siteInductionModuleDetails.updated_by = login_user.user_uuid;

            //cause error if "null" string (frontend)
            if (siteInductionModuleDetails?.sort_order === "null")
                siteInductionModuleDetails.sort_order = null;

            //parse (pdf_page_range(JSONB) can be empty if content_info are not pdf file)
            if (pdf_page_range && Object.keys(pdf_page_range)) {
                siteInductionModuleDetails.pdf_page_range = JSON.parse(pdf_page_range);
            };
            //aws bucket data
            let fileData = req.file?.location;
            fileData ? siteInductionModuleDetails.content_info = fileData : "";
            //parse
            module_ques_data = JSON.parse(module_ques_data);
            //update module
            await Modules.update(siteInductionModuleDetails, { where: { module_uuid }, transaction },);

            let module_question_uuid;
            let createAnsArr = [];
            for (let [quesInd, ques,] of module_ques_data.entries()) {
                //createv or update questions
                if (module_ques_data[quesInd].module_question_uuid) {

                    module_question_uuid = module_ques_data[quesInd].module_question_uuid;
                    await ModuleQuestions.update(module_ques_data[quesInd], { where: { module_question_uuid }, transaction });
                } else {
                    delete ques.module_question_uuid;
                    ques.module_uuid = module_uuid;
                    const moduleQuestionsRes = await ModuleQuestions.create(ques, { transaction });
                    module_question_uuid = moduleQuestionsRes.module_question_uuid;
                };
                //create or update answers data
                for (let [ind, answers] of ques.ques_ans_data.entries()) {
                    if (answers.module_answer_uuid) {
                        let module_answer_uuid = answers.module_answer_uuid;
                        await ModuleAnswers.update(answers, { where: { module_answer_uuid }, transaction });//update
                    } else {
                        delete answers.module_answer_uuid;
                        answers.module_question_uuid = module_question_uuid;
                        createAnsArr = [...createAnsArr, answers];
                    }
                }
            };
            if (createAnsArr) await ModuleAnswers.bulkCreate(createAnsArr, { transaction });//create answers

            SUCCESS(res, "Site Induction module updated successfully!");
        })
    } catch (error) {
        console.log(error);
        next(error);
    };

};

const UpdateSiteInduction = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        let {
            site_induction_uuid,
            SiteIndDocTypeIds,
            SiteIndIndustryIds,//high risk industry
            newDocTypeIds,//new document type
            newMasterSettingUuids
        } = req.body;
        let siteInductionDetails = req.body;

        siteInductionDetails.updated_by = login_user.user_uuid;
        //parse
        SiteIndDocTypeIds = JSON.parse(SiteIndDocTypeIds);
        SiteIndIndustryIds = JSON.parse(SiteIndIndustryIds);
        newDocTypeIds = JSON.parse(newDocTypeIds);
        newMasterSettingUuids = JSON.parse(newMasterSettingUuids);

        await sequelize.transaction(async (transaction) => {

            if (SiteIndDocTypeIds.length > 0) {
                //delete
                await SiteIndDocTypes.destroy({ where: { site_ind_doctype_uuid: SiteIndDocTypeIds }, transaction },);
            };
            if (SiteIndIndustryIds.length > 0) {
                //delete
                await SiteIndIndustry.destroy({ where: { site_ind_industry_uuid: SiteIndIndustryIds }, transaction },);
            };
            //for create
            if (newDocTypeIds) {
                const site_induction_doc_array = newDocTypeIds.map((document_type_uuid) => ({
                    document_type_uuid,
                    site_induction_uuid,
                }));
                //create induction document types
                await SiteIndDocTypes.bulkCreate(site_induction_doc_array, { transaction });
            };
            //for create
            if (newMasterSettingUuids) {
                // Create site induction industry records in bulk
                const site_induction_industry_array = newMasterSettingUuids.map((master_setting_uuid) => ({
                    master_setting_uuid,
                    site_induction_uuid,
                }));
                // create site induction industry
                await SiteIndIndustry.bulkCreate(site_induction_industry_array, { transaction });
            };
            //update site induction details 
            await SiteInductions.update(siteInductionDetails, { where: { site_induction_uuid }, transaction });

            SUCCESS(res, "Site induction details updated successfully!");
        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetSiteInductionAndModulesbyId = async (req, res, next) => {
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
                        // order: [["sort_order", "ASC"]],
                        include: {
                            model: ModuleQuestions, as: "module_ques_data",
                            attributes: { exclude: commonAttributes },
                            include: {
                                model: ModuleAnswers, as: "ques_ans_data",
                                attributes: { exclude: commonAttributes },
                            }
                        }
                    },
                    order: [["module_data", "sort_order", "ASC"],
                    ["module_data", "module_ques_data", "sort_order", "ASC"],
                    ["module_data", "module_ques_data", "ques_ans_data", "sort_order", "ASC"],
                    ],
                    separate: true
                },
                {//site induction Compliance doc junction
                    model: SiteIndDocTypes,
                    attributes: { exclude: commonAttributes },
                    include: {
                        model: DocumentTypes,
                        attributes: { exclude: commonAttributes },
                    }
                },
                {//site induction industry junction
                    model: SiteIndIndustry,
                    attributes: { exclude: commonAttributes },
                    include: {
                        model: MasterSettings,
                        attributes: { exclude: commonAttributes },
                    }
                }
            ],
        });

        GETSUCCESS(res, siteInductionRes, "Get Site Induction successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };

};

const GetSiteInductionRequiredDoc = async (req, res, next) => {
    try {
        const { site_induction_uuid } = req.query;
        const siteInductionDocTypesRes = await SiteIndDocTypes.findAll({
            where: { site_induction_uuid },
            attributes: ["site_ind_doctype_uuid", "site_induction_uuid"],
            include: {
                model: DocumentTypes,
                attributes: [
                    "document_type_uuid", "doc_type_name",
                    "allow_expiry", "recipient_type"
                ]
            }
        });

        GETSUCCESS(res, siteInductionDocTypesRes, "Get all required site induction document successfully!")
    } catch (error) {
        console.log(error);
        next(error);

    };
};
const GetAllInductionsOfSpecificSite = async (req, res, next) => {

    try {
        const { site_uuid, search, sort, order, page, limit } = req.query;
        let where_obj = { site_uuid };
        let query_obj = {};
        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("site_ind_name"), { [Sq.Op.iLike]: `%${search}%` }),
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
        const siteInductionRes = await SiteInductions.findAndCountAll({
            where: where_obj,
            attributes: [
                [Sq.fn("COUNT", Sq.col("site_ind_modules.site_induction_uuid")), "module_count"],
                [Sq.fn("array_agg", Sq.col("site_ind_modules.module_uuid")), "moduleUuids"],
                "site_induction_uuid", "site_ind_name", "site_ind_status", "created_date"],
            include: [{
                model: SiteIndModule,
                attributes: [],
            }],
            distinct: true,
            subQuery: false,
            group: ["site_inductions.site_induction_uuid"],
            ...query_obj
        });
        const resData = { count: siteInductionRes.count.length, rows: siteInductionRes.rows };

        GETSUCCESS(res, resData, "Get all inductions of specifc site successfully!")
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//soft delete
const RemoveInductionModuleQuesById = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const { module_question_uuid } = req.body;
        await ModuleQuestions.destroy({
            where: { module_question_uuid },
            individualHooks: true, login_user: login_user,
        })
        await ModuleAnswers.destroy({ where: { module_question_uuid } });

        SUCCESS(res, "Module question deleted successfully!")

    } catch (error) {
        console.log(error);
        next(error);
    };
};

const DeleteSiteIndModuleFileById = async (req, res, next) => {
    try {
        const { module_uuid, content_info } = req.body;
        //delete file
        const fileBasename = path.basename(content_info);
        await deleteS3BucketFile(fileBasename);

        await Modules.update({ content_info: null }, { where: { module_uuid, content_info_type: "file" } });
        SUCCESS(res, "Site induction Module Content deleted by id successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};
const DeleteSiteInductionModuleById = async (req, res, mext) => {
    try {
        let { module_uuid, content_info, content_info_type, moduleQuesIds } = req.body;

        sequelize.transaction(async (transaction) => {

            if ((content_info && content_info_type) && content_info_type === "file" || content_info_type === "file_video") {
                //delete file
                const fileBasename = path.basename(content_info);
                await deleteS3BucketFile(fileBasename);
            };

            if (moduleQuesIds.length > 0) {
                //Delete questions and answers
                await ModuleQuestions.destroy({ where: { module_question_uuid: moduleQuesIds }, transaction });
                await ModuleAnswers.destroy({ where: { module_question_uuid: moduleQuesIds }, transaction });

            };
            //Detele module
            await SiteIndModule.destroy({ where: { module_uuid }, transaction });
            await Modules.destroy({ where: { module_uuid }, transaction });

            SUCCESS(res, "Module deleted successfully!");
        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};
//need to confirm soft delete  pending
const DeleteSiteIndModuleQuesAnsByid = async (req, res, next) => {
    try {
        const { module_question_uuid } = req.body;
        await ModuleQuestions.destroy({ where: { module_question_uuid } });
        await ModuleAnswers.destroy({ where: { module_question_uuid } });

        SUCCESS(res, "Site induction Module Question deleted by id successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

const DeleteSiteIndModuleAnsByid = async (req, res, next) => {
    try {
        const { module_answer_uuid } = req.body;
        await ModuleAnswers.destroy({ where: { module_answer_uuid } });

        SUCCESS(res, "Site induction Module Answer deleted by id successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};

const UpdateSiteInductionStatus = async (req, res, next) => {
    try {
        const { user_uuid } = req.login_user;
        const { site_induction_uuid, site_ind_status } = req.body;

        await SiteInductions.update({ site_ind_status, updated_by: user_uuid }, { where: { site_induction_uuid } });

        SUCCESS(res, "Site induction status updated successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };

};

const DeleteSite = async (req, res, next) => {
    try {
        const { site_uuid } = req.body;
        const siteInductionsRes = await SiteInductions.findOne({
            where: { site_uuid },
            attributes: ['site_induction_uuid'],
            raw: true
        });
        if (siteInductionsRes) {
            return CUSTOMRESPONSE(res, 'Delete site inductions first to remove site!');

        };
        await Sites.destroy({ where: { site_uuid }, },);
        await ClientSiteContacts.destroy({ where: { site_uuid } });
        //site inductions-------------------
        // const siteInductionsRes = await SiteInductions.findAll({
        //     where: { site_uuid },
        //     attributes: [[Sq.fn('ARRAY_AGG', Sq.col('site_induction_uuid')), 'siteIndIdsArr'],],
        //     raw: true
        // });
        //Delete site
        // await Sites.destroy({ where: { site_uuid }, }, transaction);

        // if (siteInductionsRes[0]?.siteIndIdsArr) {
        //     //Delete site induction
        //     await SiteInductions.destroy({
        //         where: {
        //             site_induction_uuid: siteInductionsRes[0]?.siteIndIdsArr
        //         }, transaction
        //     });
        //Delete  WorkerSiteInd of workers
        // await WorkerSiteInd.destroy({ where: { site_induction_uuid: siteInductionsRes[0]?.siteIndIdsArr } });
        //Delete site induction doc type
        // await SiteIndDocTypes.destroy({ where: { site_induction_uuid: siteInductionsRes[0]?.siteIndIdsArr } });
        //Delete site induction industry 
        // await SiteIndIndustry.destroy({ where: { site_induction_uuid: siteInductionsRes[0]?.siteIndIdsArr } });
        //All site induction modules
        // const siteIndModuleRes = await SiteIndModule.findAll({
        //     where: { site_induction_uuid: siteInductionsRes[0].siteIndIdsArr },
        //     attributes: [
        //         'module_uuid',
        //         'site_ind_module_uuid',
        //         [Sq.fn('ARRAY_AGG', Sq.col('site_ind_ques.module_question_uuid')), 'module_question_uuids'],
        //         [Sq.col("module_data.content_info"), "content_info"],
        //         [Sq.col("module_data.content_info_type"), "content_info_type"],
        //     ],
        //     include: [{
        //         model: ModuleQuestions, as: 'site_ind_ques',
        //         required: false,
        //         attributes: [],
        //     },
        //     {
        //         model: Modules, as: "module_data",
        //         attributes: []
        //     }
        //     ],
        //     group: ["site_ind_module.module_uuid",
        //         "site_ind_module.site_ind_module_uuid",
        //         "module_data.content_info", "module_data.content_info_type"
        //     ],
        //     raw: true, nest: true
        // });
        //if site induction has modules
        // if (siteIndModuleRes.length > 0) {
        //     let siteIndModuleIdArr = [];
        //     let moduleIdArr = [];
        //     let quesIdArr = [];
        //     let fileUrlArr = [];

        //     for (let siteIndModule of siteIndModuleRes) {
        //         //Get ids
        //         let { module_uuid, site_ind_module_uuid } = siteIndModule;

        //         siteIndModuleIdArr.push(site_ind_module_uuid);
        //         moduleIdArr.push(module_uuid);

        //         if (siteIndModule?.module_question_uuids.length > 0
        //             && siteIndModule?.module_question_uuids[0] != null) {
        //             quesIdArr.push(...siteIndModule?.module_question_uuids)
        //         };
        //file data urls
        // if (siteIndModule?.content_info && siteIndModule?.content_info_type == "file"
        //     || siteIndModule?.content_info_type == "file_video") {
        //     fileUrlArr.push(path.basename(decodeURIComponent(siteIndModule?.content_info)));
        // };
        // };
        //delete site induction module junction
        // await SiteIndModule.destroy({
        //     where: { site_ind_module_uuid: siteIndModuleIdArr },
        //     transaction
        // });
        //delete all site induction modules
        // await Modules.destroy({ where: { module_uuid: moduleIdArr }, transaction });
        // if (quesIdArr.length > 0) {
        //     await ModuleQuestions.destroy({ where: { module_question_uuid: quesIdArr }, transaction });
        //     await ModuleAnswers.destroy({ where: { module_question_uuid: quesIdArr }, transaction });

        // };
        //delete worker module attempt details
        // await WorkerModuleAttempt.destroy({ where: { module_uuid: quesIdArr }, transaction });
        // await WorkerQuesAttempt.destroy({ where: { module_uuid: quesIdArr }, transaction });

        //delete file data from s3 bucket
        // if (fileUrlArr.length > 0) {
        //     // array of urls
        //     deleteS3BucketFile(fileUrlArr);
        // };
        // };

        //-------remove worker WorkerSiteAccess and WorkerTrainingSite  against site
        // await WorkerSiteAccess.destroy({ where: { site_uuid }, transaction });
        // await WorkerTrainingSite.destroy({ where: { site_uuid }, transaction });

        // };
        SUCCESS(res, "Site deleted successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

const DeleteSiteInduction = async (req, res, next) => {
    try {

        const { site_induction_uuid, moduleUuids } = req.body;
        //to check if inductees attemp 
        const workerSiteIndRes = await WorkerSiteInd.findOne({
            where: { site_induction_uuid },
            attributes: ['site_induction_uuid'],
            raw: true
        });

        if (workerSiteIndRes) {
            return CUSTOMRESPONSE(res, MessageConstants.InductionCanNotDeleteMessage);

        };
        sequelize.transaction(async (transaction) => {
            await SiteInductions.destroy({ where: { site_induction_uuid, }, transaction });
            if (moduleUuids.length > 0) {

                //delete specific site induction modules and other related data
                await SiteIndModule.destroy({ where: { site_induction_uuid }, transaction });
                await Modules.destroy({ where: { module_uuid: moduleUuids }, transaction });
                await SiteIndIndustry.destroy({ where: { site_induction_uuid }, transaction });
                await SiteIndDocTypes.destroy({ where: { site_induction_uuid }, transaction });

                const moduleQuesRes = await ModuleQuestions.findAll({
                    where: { module_uuid: moduleUuids },
                    attributes: [[Sq.fn("array_agg", Sq.col("ques_ans_data.module_answer_uuid")), "answerUuids"],],

                    include: {
                        model: ModuleAnswers, as: "ques_ans_data",
                        attributes: [],
                    },
                    group: [],
                    raw: true
                });

                if (moduleQuesRes.length > 0) {
                    // ModuleQuestions
                    await ModuleQuestions.destroy({ where: { module_uuid: moduleUuids }, transaction });
                    //ModuleAnswers
                    if (moduleQuesRes[0].answerUuids?.length > 0)

                        await ModuleAnswers.destroy({ where: { module_answer_uuid: moduleQuesRes[0].answerUuids }, transaction });
                };

            };

            SUCCESS(res, "Site induction deleted successfully!");
        });
    } catch (error) {
        console.log(error);
        next(error);

    };
};
const UpdateSiteActiveStatus = async (req, res, next) => {
    try {
        const { user_uuid } = req.login_user;
        const { site_uuid, is_site_active } = req.body;

        await Sites.update({ is_site_active, updated_by: user_uuid },
            {
                where: { site_uuid }
            });

        SUCCESS(res, `Site ${is_site_active === true || is_site_active === "true" ? "Activated" : "Inactived"} successfully!`);
    } catch (error) {
        console.log(error);
        next(error);
    };

};

const GetClientSiteAllInductees = async (req, res, next) => {
    try {
        const { site_uuid, search, page, limit, sort, order } = req.query;

        let where_obj = { site_uuid, is_training_completed: true };
        let query_obj = {};
        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col('siteInductee.worker_individual.email'),
                        { [Sq.Op.iLike]: `${search}` }),
                    Sq.where(Sq.fn("concat", Sq.col("siteInductee.worker_individual.first_name"),
                        " ", Sq.col("siteInductee.worker_individual.first_name")), { [Sq.Op.iLike]: `%${search}%` }),
                ]
            };
        };
        if (page && limit) {

            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;

        };
        if (sort && order) {
            let sortKey;
            switch (sort) {
                case "trading_name":
                case 'abn_nzbn':
                    sortKey = [Sq.col(`siteInductee.workerProvider.${sort}`), order];
                    break;
                case "worker_job_title":
                    sortKey = [Sq.col(`siteInductee.${sort}`), order];
                    break;
                default:
                    sortKey = [sort, order]
                    break;
            };

            query_obj.order = [sortKey]
        };

        const allInductees = await WorkerTrainingSite.findAndCountAll({

            where: where_obj,
            attributes: ['worker_training_site_uuid', 'worker_uuid',
                [Sq.col("siteInductee.provider_org_uuid"), "provider_org_uuid"],
                [Sq.col("siteInductee.worker_job_title"), "worker_job_title"],
                [Sq.col("siteInductee.worker_individual.individual_uuid"), "individual_uuid"],
                [Sq.col("siteInductee.worker_individual.first_name"), "first_name"],
                [Sq.col("siteInductee.worker_individual.last_name"), "last_name"],
                [Sq.col("siteInductee.worker_individual.avatar"), "avatar"],
                [Sq.col("siteInductee.worker_individual.phone",), "phone"],
                [Sq.col("siteInductee.worker_individual.email"), "email"],
                [Sq.col("siteInductee.worker_individual.country.name"), "country_name"],//renamed
                [Sq.col("siteInductee.worker_individual.state.state_name"), "state_name"],
                [Sq.col("siteInductee.workerProvider.org_name"), "org_name"],
                [Sq.col("siteInductee.workerProvider.abn_nzbn"), "abn_nzbn"],
            ],
            include: [{
                model: Workers,
                as: "siteInductee",
                attributes: [],
                required: true,
                include: [
                    {
                        model: Individuals,
                        as: "worker_individual",
                        attributes: [],
                        include: [
                            {
                                model: Countries,
                                attributes: [],
                            },

                            {
                                model: States,
                                attributes: [],
                            },
                        ]
                    },
                    {
                        model: Organisations,
                        as: "workerProvider",
                        attributes: [],
                    }
                ],
            }],
            ...query_obj

        });

        return GETSUCCESS(res, allInductees, "Get all inductees of site successfully!");
    } catch (error) {
        console.error(error);
        next(error);
    };
};

//-------delete inductees document againset specific site pending------(site doc not addded yet)
const DeleteInducteeSiteDetails = async (req, res, next) => {
    try {
        const { site_uuid, worker_uuid } = req.body;
        await sequelize.transaction(async (transaction) => {
            await Promise.all([
                WorkerTrainingSite.destroy({ where: { site_uuid, worker_uuid }, transaction }),
                WorkerSiteInd.destroy({ where: { site_uuid, worker_uuid }, transaction }),
                WorkerSiteAccess.destroy({ where: { site_uuid, worker_uuid }, transaction }),
                WorkerModuleAttempt.destroy({ where: { site_uuid, worker_uuid }, transaction }),
                WorkerQuesAttempt.destroy({ where: { worker_uuid, site_uuid }, transaction })
            ]);
        });

        SUCCESS(res, 'Inductee details against specific site deleted successfully!');
    } catch (error) {
        console.log(error);
        next(error);
    }
};
const GetSpecificSiteLogs = async (req, res, next) => {
    try {

        const { site_uuid, search, sort, order, page, limit } = req.query;
        let where_obj = { site_uuid };
        let query_obj = {};

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.fn("concat", Sq.col("WorkerSiteIndi.first_name"), " ",
                        Sq.col("WorkerSiteIndi.last_name")), { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.col('SiteAccessWorker.workerProvider.trading_name'),
                        { [Sq.Op.iLike]: `%${search}%` }),
                ],
            };
        };
        if (sort && order) {
            let orderArr = [];
            if (sort === "trading_name") {
                orderArr.push(["SiteAccessWorker", "workerProvider", sort, order])
            } else if (sort === "first_name") {
                orderArr.push(["WorkerSiteIndi", sort, order])
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
            attributes: ['worker_site_access_uuid', 'individual_uuid', 'sign_in_date', 'sign_out_date',
                'client_org_uuid', 'clock_in_out_status',
                [Sq.col("SiteAccessWorker.provider_org_uuid"), "provider_org_uuid"],//provider
                [Sq.col("SiteAccessWorker.workerProvider.trading_name"), "trading_name"],
                [Sq.col("WorkerSiteIndi.first_name"), "first_name"],
                [Sq.col("WorkerSiteIndi.last_name"), "last_name"],

            ],
            include: [
                {
                    model: Workers, as: "SiteAccessWorker", attributes: [],
                    include: { model: Organisations, as: "workerProvider", attributes: [] }
                },
                {
                    model: Individuals, as: "WorkerSiteIndi",
                    attributes: []
                }
            ],
            ...query_obj
        });

        GETSUCCESS(res, workerSitAccessRes, "Get site logs succesfully!")
    } catch (error) {
        console.log(error);
        next(error);
    }
};
const GetClientContactsForSiteList = async (req, res, next) => {
    try {
        const { organisation_uuid } = req.query;//client organisation 

        const response = await IndividualOrg.findAll({
            where: { organisation_uuid, is_client_site_contact: true, is_user: false },
            attributes: ['individual_org_uuid', 'individual_uuid',
                [Sq.col('org_individual.first_name'), 'first_name'],
                [Sq.col('org_individual.last_name'), 'last_name'],],

            include: { model: Individuals, as: 'org_individual', attributes: [] }
        });

        GETSUCCESS(res, response, 'Get all site contact of Client successfully!');
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const AssignCompChecklistToWorker = async (req, res, next) => {
    try {
        const { client_org_uuid,
            provider_org_uuid, worker_uuid, checklistIds } = req.body;
        console.log(req.body)

        let checkListArr = [];
        if (checklistIds.length > 0) {

            // checkListArr = JSON.parse(checklistIds);
            for (const checklist_uuid of checklistIds) {

                checkListArr.push({
                    checklist_uuid, client_org_uuid, provider_org_uuid, worker_uuid,

                });

            };
            await WorkerChecklistAssign.bulkCreate(checkListArr);
        };

        SUCCESS(res, 'Worker Checklist Assign Successfully!');
    } catch (error) {
        console.log(error);
        next(error);

    };

};


module.exports = {
    CreateSite,
    GetClientSiteById,
    UpdateClientSite,
    DeleteSiteEvacuationDiagramById,
    RemoveClientSiteById,
    CreateSiteInduction,
    UpdateSiteInductionModule,
    GetAllSitesOfClient,
    DeleteSiteInduction,
    UpdateSiteInduction,
    GetSiteInductionModuleById,
    GetSiteInductionAndModulesbyId,
    CreateSiteInductionModule,
    GetSiteInductionRequiredDoc,
    GetAllInductionsOfSpecificSite,
    RemoveInductionModuleQuesById,
    DeleteSiteInductionModuleById,
    DeleteSiteIndModuleQuesAnsByid,
    DeleteSiteIndModuleFileById,
    DeleteSiteIndModuleAnsByid,
    UpdateSiteInductionStatus,
    DeleteSite,
    UpdateSiteActiveStatus,
    GetClientSiteAllInductees,
    DeleteInducteeSiteDetails,
    GetSpecificSiteLogs,
    GetClientContactsForSiteList,
    AssignCompChecklistToWorker,


};