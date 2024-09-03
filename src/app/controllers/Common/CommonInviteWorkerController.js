const Sq = require("sequelize");
const fs = require("fs");
const ParseCsv = require("csv-parse").parse;
const sequelize = require('../../../config/DbConfig.js');
const { commonAttributes, convert_key_array, supportTeamQuery } = require("../../../services/Helper.js");
const { SUCCESS, GETSUCCESS, } = require('../../../constants/ResponseConstants.js');
const {
    Invite,
    Individuals,
    InviteWorkerClientAssign,
    Workers
} = require('../../../models/common/');

const { InviteProviderWorkerEmailLink, } = require("../../../services/UserServices.js");
const { sendInviteProviderWorkerEmail, } = require('../../../utils/EmailUtils.js');

//invite worker check if already exist wiht provider pending--------------------
//make invite worker api's common for all worker ,Provider and admin portal currently only invite worker admin as invitewokrer are working and created
const InviteWorker = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const { first_name, } = login_user.individual;
        const inviteDetails = req.body;
        const { workersInviteData, workerClientsIds, provider_fa_uuid, trading_name, } = inviteDetails;

        if (!provider_fa_uuid || !trading_name || workersInviteData.length === 0)
            return INVALIDRESPONSE(res, 'Bad request!')

        sequelize.transaction(async (transaction) => {

            // const workersRes = await Workers.findOne({ where: { provider_org_uuid, individual_uuid } });
            for (let workerInvite of workersInviteData) {
                let individualRes;
                let individualCreated;
                let user_uuid = workerInvite?.user_uuid || null;
                let individual_uuid = workerInvite.individual_uuid;
                //if not exist in system
                if (individual_uuid === '') {
                    let email = workerInvite.email;

                    [individualRes, individualCreated] = await Individuals.findOrCreate({
                        where: {
                            email: { [Sq.Op.iLike]: email, },//check with email
                        },
                        defaults: {
                            first_name: workerInvite.first_name,
                            last_name: workerInvite.last_name,
                            email,
                            created_by: login_user.user_uuid
                        }, transaction
                    });
                    individual_uuid = individualRes.individual_uuid;//add individual_uuid
                    user_uuid = individualRes?.user_uuid || null;//if already exist 
                };
                // if (!individualCreated) {
                //     const workersRes = await Workers.findOne({ where: { provider_org_uuid, individual_uuid } });
                // };
                //find and create invite
                let [inviteRes, inviteCreated] = await Invite.findOrCreate({
                    where: {
                        function_assignment_uuid: provider_fa_uuid,//provider function assignment
                        individual_uuid, invited_user_type: "worker"
                    },
                    defaults: {
                        function_assignment_uuid: provider_fa_uuid,//provider function assignment
                        individual_uuid, invited_user_type: "worker",
                        invite_date: new Date(),
                        user_uuid,
                        created_by: login_user.user_uuid
                    }, transaction
                });
                //if new
                if (inviteCreated) {
                    //create clients assigned to worker
                    if (workerClientsIds.length > 0) {
                        let WorkerClientsArr = [];
                        for (const client_org_uuid of workerClientsIds) {
                            WorkerClientsArr.push({ client_org_uuid, invite_uuid: inviteRes.invite_uuid });
                        };
                        await InviteWorkerClientAssign.bulkCreate(WorkerClientsArr, { transaction });
                    };
                    //send email
                    const emailDetails = {
                        first_name: workerInvite?.first_name || individualRes.first_name,//worker first name
                        inviter_name: first_name,//inviter name
                        trading_name,//provider trading name
                        worker_email: workerInvite?.email || individualRes.email
                    };
                    //create url link
                    const url = await InviteProviderWorkerEmailLink(inviteRes.invite_uuid);
                    //send mail
                    sendInviteProviderWorkerEmail(emailDetails, url);
                };
            };

            SUCCESS(res, "Invite sent!");
        });

    } catch (error) {
        console.log(error);
        next(error);
    };

};
const ReinviteWorker = async (req, res, next) => {
    try {
        const login_user = req.login_user;
        const { first_name, } = login_user.individual;
        const { invite_uuid, trading_name, first_name: inviter_name, email,provider_org_uuid} = req.body;

        if (!invite_uuid || !trading_name || !first_name || !email) {
            return INVALIDRESPONSE(res, "Bad request!");
        };
        await Invite.update({ updated_by: login_user.user_uuid }, { where: { invite_uuid } });
        const emailDetails = {
            first_name: inviter_name,//worker name
            inviter_name: first_name,//inviter name
            trading_name,
            worker_email: email
        };
        //create link
        const url = await InviteProviderWorkerEmailLink(invite_uuid,provider_org_uuid,trading_name,inviter_name);
        //Send email
        sendInviteProviderWorkerEmail(emailDetails, url);
        SUCCESS(res, "Invite sent successfully!");

    } catch (error) {
        console.log(error);
        next(error);

    };
};
module.exports = {
    InviteWorker,
    ReinviteWorker

};