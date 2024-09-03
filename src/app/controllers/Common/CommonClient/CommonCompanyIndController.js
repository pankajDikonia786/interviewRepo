const Sq = require("sequelize");
const path = require("path");
const sequelize = require('../../../../config/DbConfig');
const { SUCCESS, GETSUCCESS, CUSTOMRESPONSE } = require('../../../../constants/ResponseConstants');
const { commonAttributes, deleteS3BucketFile, GeneratePdfRangePages } = require("../../../../services/Helper.js");
const { MessageConstants } = require('../../../../constants/StringConstants');
const {sendNotification} = require("../../../../services/SocketHandlers")
const {
    CompanyInductions,
    CompanyInductionModule,
    Modules,
    ModuleQuestions,
    ModuleAnswers,
    WorkerCompanyInd } = require("../../../../models/common");

const CreateCompanyInductionForClient = async (req, res, next) => {

    try {
        const login_user = req.login_user;
        const companyInductionDetails = req.body;
        const {organisation_uuid,company_ind_name,trading_name} = companyInductionDetails;
        companyInductionDetails.created_by = login_user.user_uuid;
        const { company_induction_uuid } = await CompanyInductions.create(companyInductionDetails);

        sendNotification(
            `New client induction added with induction name: ${company_ind_name}`, 
            [`org_${organisation_uuid}`, "client service team"], 
            "", 
            { is_task: true,organisation_uuid:organisation_uuid,trading_name:trading_name,task_assgined:["client"]}
        );

        SUCCESS(res, { company_induction_uuid, message: "Client Company induction created successfully!" });
    } catch (error) {
        console.log(error);
        next(error);
    };
};

const CreateCompanyInductionModule = async (req, res, next) => {
    try {
        await sequelize.transaction(async (transaction) => {

            const login_user = req.login_user;
            const companyInductionModuleDetails = req.body;
            let { module_ques_data, company_induction_uuid, pdf_page_range } = companyInductionModuleDetails;
            companyInductionModuleDetails.created_by = login_user.user_uuid;
            //parse (pdf_page_range(JSONB) can be empty if content_info are not pdf file)
            if (pdf_page_range && Object.keys(pdf_page_range)) {
                companyInductionModuleDetails.pdf_page_range = JSON.parse(pdf_page_range);
            };
            //aws bucket data
            let fileData = req.file?.location;
            fileData ? companyInductionModuleDetails.content_info = fileData : "";

            //parse questions data
            module_ques_data = JSON.parse(module_ques_data);

            const modulesRes = await Modules.create(companyInductionModuleDetails, { transaction });
            let module_uuid = modulesRes.module_uuid;
            if (module_ques_data.length > 0) {
                for (let [quesInd, ques,] of module_ques_data.entries()) {
                    //create questions
                    module_ques_data[quesInd].module_uuid = modulesRes.module_uuid;
                    const moduleQuestionsRes = await ModuleQuestions.create(ques, { transaction });
                    let module_question_uuid = moduleQuestionsRes.module_question_uuid;

                    //create answers options data
                    for (let [ind, answer] of ques.ques_ans_data.entries()) {
                        ques.ques_ans_data[ind].module_question_uuid = module_question_uuid;
                    }
                    await ModuleAnswers.bulkCreate(ques.ques_ans_data, { transaction });
                };
            };
            //create company induction module document junction
            await CompanyInductionModule.create({ company_induction_uuid, module_uuid, }, { transaction });

            SUCCESS(res, { module_uuid: modulesRes.module_uuid, message: "Company Induction module added successfully!" });
        })
    } catch (error) {
        console.log(error);
        next(error);
    };

};
const UpdateCompanyInduction = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const companyInductionDetails = req.body;
        const { company_induction_uuid } = companyInductionDetails;
        companyInductionDetails.updated_by = login_user.user_uuid;
        delete companyInductionDetails.company_induction_uuid;

        await CompanyInductions.update(companyInductionDetails, { where: { company_induction_uuid } });

        SUCCESS(res, "Company induction details updated successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};
const GetCompanyInductionModuleById = async (req, res, next) => {
    try {
        const { module_uuid } = req.query;
        const moduleRes = await Modules.findOne({
            where: { module_uuid }, attributes: { exclude: commonAttributes },
            include: {
                model: ModuleQuestions, as: "module_ques_data", attributes: { exclude: commonAttributes },
                include: { model: ModuleAnswers, as: "ques_ans_data", attributes: { exclude: commonAttributes } },
            },
            order: [
                ["module_ques_data", "sort_order", "ASC"],
                ["module_ques_data", "ques_ans_data", "sort_order", "ASC"],
            ],
        });

        GETSUCCESS(res, moduleRes, "Get Module by id Successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    }
};
const ExportInductionModulePdfRange = async (req, res, next) => {
    try {
        const pdfDetails = req.body;//content_info,pdf_page_range

        const filePath = await GeneratePdfRangePages(pdfDetails);
        const pdfFile = { file: process.env.APP_URL + "/" + filePath };

        return GETSUCCESS(res, pdfFile, "Get Pdf by range successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};
const UpdateCompanyInductionModule = async (req, res, next) => {
    try {
        await sequelize.transaction(async (transaction) => {
            const login_user = req.login_user;
            const companyInductionModuleDetails = req.body;
            let { module_ques_data, module_uuid, pdf_page_range } = companyInductionModuleDetails;
            //cause error if "null" string (frontend)
            if (companyInductionModuleDetails?.sort_order === "null")
                companyInductionModuleDetails.sort_order = null;

            //parse (pdf_page_range(JSONB) can be empty if content_info are not pdf file)
            if (pdf_page_range && Object.keys(pdf_page_range)) {
                companyInductionModuleDetails.pdf_page_range = JSON.parse(pdf_page_range);
            };
            companyInductionModuleDetails.updated_by = login_user.user_uuid;
            //aws bucket data
            let fileData = req.file?.location;
            fileData ? companyInductionModuleDetails.content_info = fileData : "";

            //parse questions data
            module_ques_data = JSON.parse(module_ques_data);
            //update module
            await Modules.update(companyInductionModuleDetails, { where: { module_uuid }, transaction },);

            let module_question_uuid;
            let createAnsArr = [];
            if (module_ques_data.length > 0) {
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
                            await ModuleAnswers.update(answers, { where: { module_answer_uuid }, transaction });
                        } else {
                            delete answers.module_answer_uuid;
                            answers.module_question_uuid = module_question_uuid;
                            createAnsArr = [...createAnsArr, answers];
                        }
                    }
                };
                if (createAnsArr.length > 0) await ModuleAnswers.bulkCreate(createAnsArr, { transaction });//create answers
            };
            SUCCESS(res, "Company Induction module updated successfully!");
        })
    } catch (error) {
        console.log(error);
        next(error);
    };

};

const GetAllInductionOfSpecificCompany = async (req, res, next) => {

    try {
        const { function_assignment_uuid, search, sort, order, page, limit } = req.query;
        let where_obj = { function_assignment_uuid };
        let query_obj = {};
        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("company_ind_name"), { [Sq.Op.iLike]: `%${search}%` }),
                ],
            };
        };
        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };
        if (sort && order) {
            query_obj.order = [[sort, order]]
        };
        const companyInductionRes = await CompanyInductions.findAndCountAll({
            where: where_obj,
            attributes: [
                [Sq.fn("COUNT", Sq.col("company_induction_modules.company_induction_uuid")), "company_module_count"],
                "company_induction_uuid", "company_ind_name", "company_ind_status", "company_ind_valid_days", "created_date"],
            include: [{
                model: CompanyInductionModule,
                attributes: [],
            }],
            distinct: true,
            subQuery: false,
            group: ["company_inductions.company_induction_uuid"],
            ...query_obj
        });
        const resData = { count: companyInductionRes.count.length, rows: companyInductionRes.rows };

        GETSUCCESS(res, resData, "Get all company induction successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};

const GetCompanyInductionAndModulesbyId = async (req, res, next) => {
    try {
        const { company_induction_uuid } = req.query;
        const companyInductionRes = await CompanyInductions.findOne({
            where: { company_induction_uuid },
            attributes: { exclude: commonAttributes },
            include: [
                {//modules
                    model: Modules, as: "company_ind_modules",
                    through: { attributes: [], },
                    attributes: { exclude: commonAttributes },

                    include: {
                        model: ModuleQuestions, as: "module_ques_data",
                        attributes: { exclude: commonAttributes },
                        include: {
                            model: ModuleAnswers, as: "ques_ans_data",
                            attributes: { exclude: commonAttributes },
                            separate: true,
                            order: [["sort_order", "asc"]],
                        }
                    },
                },
            ],
            order: [
                ["company_ind_modules", "sort_order", "ASC"],
                ["company_ind_modules", "module_ques_data", "sort_order", "ASC"],
            ],
        });

        GETSUCCESS(res, companyInductionRes, "Get Site Induction successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

const DeleteCompanyIndModuleFileById = async (req, res, next) => {
    try {
        const { module_uuid, content_info } = req.body;
        const { user_uuid } = req.login_user;
        //delete file
        const fileBasename = path.basename(content_info);
        await deleteS3BucketFile(fileBasename);

        await Modules.update({ content_info: null, updated_by: user_uuid }, { where: { module_uuid, } });
        SUCCESS(res, "Module file content deleted by id successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};
const DeleteCompanyInductionModuleById = async (req, res, mext) => {
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
            await CompanyInductionModule.destroy({ where: { module_uuid }, transaction });
            await Modules.destroy({ where: { module_uuid }, transaction });

            SUCCESS(res, "Module deleted successfully!");
        });
    } catch (error) {
        console.log(error);
        next(error);
    };
};

//need to confirm soft delete  pending
const DeleteCompanyIndModuleQuesAnsByid = async (req, res, next) => {
    try {
        const { module_question_uuid } = req.body;
        await ModuleQuestions.destroy({ where: { module_question_uuid } });
        await ModuleAnswers.destroy({ where: { module_question_uuid } });

        SUCCESS(res, "Module answer deleted by id successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

const DeleteCompanyIndModuleAnsByid = async (req, res, next) => {
    try {
        const { module_answer_uuid } = req.body;
        await ModuleAnswers.destroy({ where: { module_answer_uuid } });

        SUCCESS(res, "Module answer deleted by id successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };
};
const UpdateCompanyInductionStatus = async (req, res, next) => {
    try {

        const { company_induction_uuid,induction_name,company_ind_status,login_user,organisation_uuid,trading_name } = req.body;
        await CompanyInductions.update({ company_ind_status }, { where: { company_induction_uuid } });
        sendNotification(company_ind_status === "archived"?`The company induction for ${induction_name} has been archived.`: company_ind_status === "active"?`The company induction for ${induction_name} is now active.`: "",["support team", `org_${organisation_uuid}`], "" ,{login_user,organisation_uuid,trading_name })// Default message if neither condition is met)
        SUCCESS(res, "Company induction status updated successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };

};
//delete worker other inductions related data pending---------------recheck
const DeleteCompanyInduction = async (req, res, next) => {
    try {
        let { company_induction_uuid,induction_name,trading_name,organisation_uuid,login_user} = req.body;
        sequelize.transaction(async (transaction) => {

            const inductionsRes = await WorkerCompanyInd.findOne({
                where: { company_induction_uuid },
                attributes: ['company_induction_uuid'],
                raw: true
            });
            if (inductionsRes) {
                return CUSTOMRESPONSE(res, MessageConstants.InductionCanNotDeleteMessage);

            };

            const companyIndModuleRes = await CompanyInductionModule.findAll({
                where: { company_induction_uuid },
                attributes: [
                    'module_uuid',
                    'company_induction_module_uuid',
                    [Sq.fn('ARRAY_AGG', Sq.col('CompIndQues.module_question_uuid')), 'module_question_uuids'],
                    [Sq.col("compIndModules.content_info"), "content_info"],
                    [Sq.col("compIndModules.content_info_type"), "content_info_type"],
                ],
                include: [{
                    model: ModuleQuestions, as: 'CompIndQues',
                    required: false,
                    attributes: [],
                },
                {
                    model: Modules, as: "compIndModules",
                    attributes: []
                }
                ],
                group: ["company_induction_module.module_uuid",
                    "company_induction_module.company_induction_module_uuid",
                    "compIndModules.module_uuid"],
                raw: true, nest: true
            });

            //delete company induction
            await CompanyInductions.destroy({ where: { company_induction_uuid }, transaction });
            if (companyIndModuleRes.length > 0) {
                let compIndModuleIdArr = [];
                let moduleIdArr = [];
                let quesIdArr = [];
                let fileUrlArr = [];

                for (let companyIndModule of companyIndModuleRes) {
                    //get ids
                    let { module_uuid, company_induction_module_uuid } = companyIndModule;

                    compIndModuleIdArr.push(company_induction_module_uuid);
                    moduleIdArr.push(module_uuid);

                    if (companyIndModule?.module_question_uuids.length > 0
                        && companyIndModule?.module_question_uuids[0] != null) {
                        quesIdArr.push(...companyIndModule?.module_question_uuids)
                    };
                    //file data urls
                    if (companyIndModule?.content_info && companyIndModule?.content_info_type == "file"
                        || companyIndModule?.content_info_type == "file_video") {
                        fileUrlArr.push(path.basename(decodeURIComponent(companyIndModule?.content_info)));
                    };
                };
                //delete company inductin module junction
                await CompanyInductionModule.destroy({
                    where: { company_induction_module_uuid: compIndModuleIdArr },
                    transaction
                });
                await Modules.destroy({ where: { module_uuid: moduleIdArr }, transaction });
                if (quesIdArr.length > 0) {
                    await ModuleQuestions.destroy({ where: { module_question_uuid: quesIdArr }, transaction });
                    await ModuleAnswers.destroy({ where: { module_question_uuid: quesIdArr }, transaction });
                };
                // console.log(quesIdArr)
                if (fileUrlArr.length > 0) {
                    // array of urls
                    deleteS3BucketFile(fileUrlArr);
                };
                //remove worker induction 
                // await WorkerCompanyInd.destroy({ company_induction_uuid });
            };
            sendNotification(`The ${induction_name} for ${trading_name} has been deleted by ${login_user}`,[`org_${organisation_uuid}`,"support team"],"",{trading_name,organisation_uuid})
            SUCCESS(res, "Delete Company Induction successfully!");
        });

    } catch (error) {
        console.log(error);
        next(error);
    };
};

module.exports = {
    CreateCompanyInductionForClient,
    CreateCompanyInductionModule,
    UpdateCompanyInduction,
    GetCompanyInductionModuleById,
    ExportInductionModulePdfRange,
    UpdateCompanyInductionModule,
    GetAllInductionOfSpecificCompany,
    GetCompanyInductionAndModulesbyId,
    DeleteCompanyIndModuleFileById,
    DeleteCompanyInductionModuleById,
    DeleteCompanyIndModuleQuesAnsByid,
    DeleteCompanyIndModuleAnsByid,
    UpdateCompanyInductionStatus,
    DeleteCompanyInduction

};