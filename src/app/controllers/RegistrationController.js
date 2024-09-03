const path = require("path");
const Sq = require("sequelize");
const sequelize = require('../../config/DbConfig.js');

const bcrypt = require("bcrypt");
const { DateTime } = require("luxon");
const jwt = require('jsonwebtoken');

const {
  registrationVerifyEmailLink,
  signUpContinueEmailLink,
  InviteAcceptProviderViewProfileLink,
  InviteOrgUserEmailLink
} = require("../../services/UserServices.js");

const {
  sendSignupEmailVerificationEmail,
  sendSignUpContinueEmail,
  sendProviderSignupPaymentEmail,
  sendProviderInvitationRejectEmail,
  sendProviderInvitationAcceptEmail,
  sendInviteUserEmail
} =
  require('../../utils/EmailUtils.js');

const { SUCCESS, GETSUCCESS, INVALIDRESPONSE, ALREADYEXISTREPONSE, LINKEXPIREDRESPONSE,
  NOTFOUND, UNAUTHORISEDRESPONSE, CUSTOMRESPONSE, VERIFYEMAILSUCCESS
} = require('../../constants/ResponseConstants.js');

const {
  Individuals, Users, Organisations, ProviderOrgDetails, ProviderTempRegis, Addresses, OrgAddresses,
  IndividualOrg, FunctionAssignments, FARelations, AccountSubscriptions,
  InviteProvider, ProviderClientContact, ComplianceDocs, DocumentTypes, Documents,
  ProivderTypes, Invite, FAUserPermissions, FunctionMainUsers, InviteProviderCompliance,
  ContactTypes, ProviderChecklistAssign, ProviderDocApproval, OrgDocuments, DocHistory,
  Functions
} = require('../../models/common/index.js');

const { generateAccessToken, } = require('../../middlewares/AuthMiddleware.js');
const { ProviderStripeSubscription } = require('../../services/PaymentGateways.js');
const {
  commonAttributes,
  deleteS3BucketFile,
  unixToDate,
  ProviderPrimaryUserPerm } = require('../../services/Helper.js');

  const {
    sendNotification,sendNotificationPersonally } = require('../../services/SocketHandlers');


//note -----currenly checking and creating new email only for provider(direct reqistration)
//for default registration of provider(Direct registration)
const SignupProviderEmailVerification = async (req, res, next) => {
  try {
    const providerVerificationDetail = req.body;
    const { email } = providerVerificationDetail;

    await sequelize.transaction(async (transaction) => {
      //Check if emailalrady exist
      if (await Individuals.findOne({ where: { email: { [Sq.Op.iLike]: email, } } })) {

        return ALREADYEXISTREPONSE(res, 'Email already exists. Please try a different Email addresss.');
      };
      //create individuals
      const individualRes = await Individuals.create(providerVerificationDetail, { transaction });

      //Start Provider verification Email //
      //Generate token with expiry time limit
      const expiresIn = "24h";
      const AccessToken = await generateAccessToken({ individual_uuid: individualRes.individual_uuid }, expiresIn);
      const emailDetails = {
        email: individualRes.email
      };

      //create email address url 
      const url = await registrationVerifyEmailLink(individualRes.email, AccessToken);
      sendSignupEmailVerificationEmail(emailDetails, url);
      //End Provider verification Email //

      SUCCESS(res, 'Email Verication link sent successfully!');
    });
  } catch (error) {
    console.log(error);
    next(error);
  };
};
//for default registration of provider
const ResendEmailVerification = async (req, res, next) => {
  try {
    let { email } = req.body;

    const individualRes = await Individuals.findOne({
      where: { email: { [Sq.Op.iLike]: email, } }
    });

    if (!individualRes) return INVALIDRESPONSE(res, 'Invalid Email!');

    //Start Provider verification Email //
    //Generate token with expiry time limit
    const expiresIn = "24h";
    const AccessToken = await generateAccessToken({ individual_uuid: individualRes.individual_uuid }, expiresIn);
    const emailDetails = {
      email: individualRes.email
    };

    //create email address url 
    const url = await registrationVerifyEmailLink(individualRes.email, AccessToken);
    sendSignupEmailVerificationEmail(emailDetails, url);

    SUCCESS(res, 'Email Verification link sent successfully!');

  } catch (error) {
    console.log(error);
    next(error);
  };
};
//for default registration of provider
const VerifyEmail = async (req, res, next) => {
  try {

    const { email, token } = req.body;

    if (!token) {
      return UNAUTHORISEDRESPONSE(res, "Unauthorised");
    };
    //verify email token expiration
    let decoded_token;
    await jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
      decoded_token = decoded?.individual_uuid;

      if (err) {
        return LINKEXPIREDRESPONSE(res, "Email verification failed, possibly the link is invalid or expired");
      };
    });
    //check individual uuid and email 
    let individualRes;
    if (decoded_token) {
      individualRes = await Individuals.findOne({
        where: {
          individual_uuid: decoded_token,
          email: { [Sq.Op.iLike]: email, },
        }, attributes: { exclude: commonAttributes },

      });

      if (individualRes)
        return VERIFYEMAILSUCCESS(res, individualRes, 'Email verification successfully!');

      if (!individualRes) return INVALIDRESPONSE(res, 'Invalid email!');
    }
  } catch (error) {

    console.log(error);
    next(error);
  };
};
//not applied yet -----------------------
//set new password not create at starting
const SetNewPassword = async (req, res, next) => {
  try {
    sequelize.transaction(async (transaction) => {
      let { individual_uuid, password, } = req.body;

      //bcrypt the password
      password = await bcrypt.hash(password, 10);
      //Create user and password
      const { user_uuid } = await Users.create({ individual_uuid, password, }, { transaction });
      //Update individuals
      await Individuals.udpate({ user_uuid }, { where: { individual_uuid }, transaction });

      return CUSTOMRESPONSE(res, 'Password Created Successfully');
    });
  } catch (error) {
    console.log(error);
    next(error);
  };
};

//when provider are attempt signup and in process then not to remove invitation
//Create Provider main person permissions pending
//Provider signup for a client
const SignupProviderForClient = async (req, res, next) => {
  try {
    await sequelize.transaction(async (transaction) => {

      const providerDetails = req.body;
      const {
        client_org_uuid,
        individual_data,
        address_data,
        client_contact_data,
        client_fa_uuid,
        invite_provider_uuid,//for invited provider 
        registrationType,
        client_trading_name,
      } = providerDetails;

      //file data fields(aws)
      const fileData = req.files;

      console.log('------------------', providerDetails)
      console.log('-----------------------', fileData);
      if (fileData) {
        //client evidence of engagement document
        fileData?.engagementDoc ? providerDetails.client_engagement_doc
          = fileData?.engagementDoc[0].location : "";
        //msa doc
        fileData?.msaDoc ? providerDetails.msa_doc = fileData?.msaDoc[0].location : "";
      };
      let orgRes;
      let functionAssignmentRes;
      let individualRes;
      let accessToken;
      let inviteBillingUserObj = {};
      let usersPermArr = [];
      //check if data related data not exist
      if (
        (registrationType === "inviteByClient" && (
          !client_fa_uuid ||
          !invite_provider_uuid ||
          !providerDetails?.provider_type_uuid ||
          !client_org_uuid ||
          client_org_uuid === ''
        )
        ) ||
        (registrationType === "forClient" && (
          !client_fa_uuid ||
          !client_org_uuid
        )
        )
      ) {
        return INVALIDRESPONSE(res, "Bad request!");
      };
      //Get function type of provider organistion
      const { function_uuid } = await Functions.findOne({
        where: { function_name: { [Sq.Op.iLike]: 'provider' } },
        attributes: ['function_uuid']
      });
      //add function_uuid
      providerDetails.function_uuid = function_uuid;
      //////////get contact types of individual
      const contactTypeRes = await ContactTypes.findAll({
        where: {
          [Sq.Op.or]: [
            { contact_type: { [Sq.Op.iLike]: 'provider primary' } },
            { contact_type: { [Sq.Op.iLike]: 'provider billing' } }
          ]
        }, attributes: ['contact_type_uuid', 'contact_type']
      });
      //process contact type
      let primaryContactTypeUuid;
      let billingContactTypeUUid;
      contactTypeRes.forEach(contact => {
        if (contact.contact_type === 'provider primary') {
          primaryContactTypeUuid = contact.contact_type_uuid;
        } else if (contact.contact_type === 'provider billing') {
          billingContactTypeUUid = contact.contact_type_uuid;
        };
      });

      //Provider type (when regist without invitation)
      let providerTypeRes;
      if (registrationType === 'forClient') {
        providerTypeRes = await ProivderTypes.findOne({
          where: {
            provider_type_name:
              Sq.where(Sq.fn('LOWER', Sq.col('provider_type_name')), 'contractor')//default added
          }
        });
        //add provider uuid if direct registration
        providerDetails.provider_type_uuid = providerTypeRes.provider_type_uuid;
      };
      // if(isExistingProvider){}
      //create address single or multiple address
      let addressesRes = await Addresses.bulkCreate(JSON.parse(address_data), { returning: true, transaction, });

      let orgIndArray = [];
      for (let individual of JSON.parse(individual_data)) {
        individual.is_user = true;

        //user details are already created at the time of registration process
        if (individual.providerContactType === "primary" && individual.individual_uuid) {
          let userRes;
          let userCreated;
          //user uuid not already exist
          if (!individual.user_uuid || individual.user_uuid === '' || !individual.user_uuid == null) {
            //bcrypt the password
            const password = await bcrypt.hash(individual.password, 10);
            //find or create as user
            [userRes, userCreated] = await Users.findOrCreate({
              where: {
                individual_uuid: individual.individual_uuid,
              },
              defaults: {
                individual_uuid: individual.individual_uuid, password
              }, transaction
            });
            individual.user_uuid = userRes.user_uuid;

          };
          //generate token of primary user
          if (registrationType === "inviteByClient") {
            accessToken = generateAccessToken({ user_uuid: individual.user_uuid, });

          };
          const individual_uuid = individual.individual_uuid;
          //make provider primary check fo Individual table
          individual.is_provider_primary = true,
            //update individuals primary user
            individualRes = await Individuals.update(individual, {
              where: { individual_uuid }, returning: true, plain: true, transaction
            },);
          individualRes = individualRes[1];
          //create org. of Provider
          orgRes = await Organisations.create(providerDetails, { transaction });
          //organsation individual details push
          orgIndArray.push({
            individual_uuid,
            organisation_uuid: orgRes.organisation_uuid,
            contact_type_uuid: primaryContactTypeUuid,
            is_user: true
          });
          //create bulk org. addresses 
          await OrgAddresses.bulkCreate(
            addressesRes.map(value => ({
              address_uuid: value.address_uuid,
              organisation_uuid: orgRes.organisation_uuid,
            })), { transaction });

          //create function assignment of Provider
          functionAssignmentRes = await FunctionAssignments.create({
            function_uuid: function_uuid,
            organisation_uuid: orgRes.organisation_uuid
          }, { transaction });
          //if primary user created permission create direct
          // if (userCreated) {
          usersPermArr.push({
            org_function_type: 'provider',
            function_assignment_uuid: functionAssignmentRes.function_assignment_uuid,
            user_uuid: individual.user_uuid,
            is_user_perm_active: true,//for primary contact direct
            ...ProviderPrimaryUserPerm
          });
          // }
          //update function_assinment_uuid in Organisation
          await Organisations.update({
            function_assignment_uuid: functionAssignmentRes.function_assignment_uuid
          }, { where: { organisation_uuid: orgRes.organisation_uuid }, transaction });

          //organisation_uuid (provider)
          providerDetails.organisation_uuid = orgRes.organisation_uuid;

          !providerDetails.high_risk_master_setting_uuid ? delete providerDetails.high_risk_master_setting_uuid : '';

          console.log('providedetails-----------------', providerDetails)
          //parse provider details data
          // providerDetails.mas_info = JSON.parse(providerDetails.mas_info);
          providerDetails.whs_contact_info = JSON.parse(providerDetails.whs_contact_info);

          //create provider details
          await ProviderOrgDetails.create(providerDetails, { transaction });

          //create function assignment relation
          await FARelations.create({
            parent_uuid: client_fa_uuid,
            f_a_relation_type: "client_provider",
            child_uuid: functionAssignmentRes.function_assignment_uuid
          }, { transaction });

          //create Provider Primary user link
          await FunctionMainUsers.create({
            user_uuid: individual.user_uuid,
            provider_org_uuid: orgRes.organisation_uuid,
            is_primary_user: true
          }, { transaction });
        }
        else {
          //if billing contact user
          let billingIndividual;
          let individualCreated;

          if (individual.individual_uuid == "") {
            //create individuals (contacts) user
            delete individual.individual_uuid;
            [billingIndividual, individualCreated] = await Individuals.findOrCreate({
              where: { email: Sq.where(Sq.fn('LOWER', Sq.col('email')), individual.email.toLowerCase()) },
              defaults: { ...individual, }, transaction
            },);
            //add individual_uuid 
            individual.individual_uuid = billingIndividual.individual_uuid;
            billingIndividual.user_uuid ? individual.user_uuid = billingIndividual.individual_uuid :
              delete individual.user_uuid;
          };
          //create Provider Billing user link
          await FunctionMainUsers.create({
            user_uuid: individual.user_uuid,
            provider_org_uuid: orgRes.organisation_uuid,
            is_billing_user: true
          }, { transaction })
          //-------create invite and send invitation to billing contact user
          const inviteRes = await Invite.create({
            function_assignment_uuid: functionAssignmentRes.function_assignment_uuid,
            invited_user_type: 'provider_user',
            individual_uuid: individual.individual_uuid,
            user_uuid: individual?.user_uuid,
            invite_date: new Date(),
            created_by: individual.user_uuid,
          }, { transaction });
          //billing user permission invite
          usersPermArr.push({
            org_function_type: 'provider',
            function_assignment_uuid: functionAssignmentRes.function_assignment_uuid,
            user_uuid: individual?.user_uuid,
            invite_uuid: inviteRes.invite_uuid,
            documents_view: true
          });
          //for send invitation to billing user email
          inviteBillingUserObj = {
            user_name: individual.first_name + " " + individual.last_name,
            email: individual.email,
            invite_uuid: inviteRes.invite_uuid,
          };
          //organisation individual data
          orgIndArray.push({
            individual_uuid: individualRes.individual_uuid,
            organisation_uuid: orgRes.organisation_uuid,
            contact_type_uuid: individual.contact_type_uuid,
            is_user: true
          });
        };
        // name and email account data for stripe payment and send email to billing contact user
        if (individual.providerContactType === 'billing') {
          providerDetails.fullname = individual.first_name + " " + individual.last_name;
          providerDetails.user_billing_email = individual.email;
        };
      };
      //create client contact
      await ProviderClientContact.create(
        {
          provider_org_uuid: orgRes.organisation_uuid,
          client_org_uuid, ...JSON.parse(client_contact_data)
        }, { transaction });
      // create  permissions
      await FAUserPermissions.bulkCreate(usersPermArr, { transaction });
      //create Provider client contact details
      //create individual organisation
      await IndividualOrg.bulkCreate(orgIndArray, { transaction });

      //when provider attemp the direct registration without invitation
      let ProviderInviteRows;
      let providerInviteRecord;

      if ((invite_provider_uuid && registrationType === "inviteByClient") || registrationType === "forClient") {

        if (registrationType === "inviteByClient" || registrationType === "inviteByClient") {
          //Generate Stripe Subscription
          // const resSubscription = await ProviderStripeSubscription(providerDetails)
          // if (resSubscription) {
          //   //Create Account Subscription details(stripe data)
          //   await AccountSubscriptions.create({
          //     client_fa_uuid: client_fa_uuid,
          //     provider_fa_uuid: functionAssignmentRes.function_assignment_uuid,
          //     subscription: resSubscription.id,
          //     price_id: resSubscription.items.data[0].price.id,
          //     customer: resSubscription.customer,
          //     subscription_date: new Date(),

          //   }, { transaction });

          //   // Send Email start
          //   const sub_period_start_date = DateTime.fromFormat(await unixToDate(resSubscription.current_period_start), 'yyyy-MM-dd').toFormat("MM-dd-yyyy");
          //   const sub_period_end_date = DateTime.fromFormat(await unixToDate(resSubscription.current_period_end), 'yyyy-MM-dd').toFormat("MM-dd-yyyy");
          //   const sub_created_date = DateTime.now().toFormat('MM-dd-yyyy');
          //   const emailDetails = {
          //     sub_created_date,
          //     email: providerDetails.user_billing_email, card_brand: resSubscription.card_brand,
          //     cardlast4: resSubscription.cardlast4, invoice_number: resSubscription.invoice_number,
          //     charged_amount: resSubscription.plan.amount.toFixed(2), license_period_start: sub_period_start_date,
          //     license_period_end: sub_period_end_date, invoice_pdf: resSubscription.invoice_pdf
          //   };
          //   sendProviderSignupPaymentEmail(emailDetails);
          // };
          //
          //update invite provider org status

          [ProviderInviteRows, [providerInviteRecord]] = await InviteProvider.update(
            { invite_status: "Active" }, {
            where: { invite_provider_uuid },
            returning: true,
            transaction,
          });

        };
      };
      //get and create client checklist assined data
      if (registrationType === "inviteByClient") {
        const inviteProvCompRes = await InviteProviderCompliance.findAll({
          where: { invite_provider_uuid, check_comp_assigned_to: 1 },//1 for provider
          attributes: ['checklist_uuid'],
          where: { invite_provider_uuid, },
          raw: true
        });
        const checklistUuidsWithOrg = inviteProvCompRes.map(checklist => ({
          checklist_uuid: checklist.checklist_uuid,
          client_org_uuid, provider_org_uuid: orgRes.organisation_uuid,
          // Add client_org_uuid to each object
        }));
        // If there are records to process
        if (checklistUuidsWithOrg.length > 0) {
          // Perform bulk create and update operations in parallel
          await Promise.all([
            ProviderChecklistAssign.bulkCreate(checklistUuidsWithOrg, { transaction }),
            InviteProviderCompliance.update(
              { provider_org_uuid: orgRes.organisation_uuid },
              { where: { invite_provider_uuid }, transaction }
            )
          ]);
        }

      };
      //Billing contact user email send
      if (inviteBillingUserObj) {
        const org_function_type = 'provider';
        const emailDetails = {
          trading_name: orgRes.trading_name,
          user_name: inviteBillingUserObj.fullname,
          email: inviteBillingUserObj.email
        };
        // const { org_function_type } = user_perm_data;
        const url = await InviteOrgUserEmailLink(inviteBillingUserObj.invite_uuid,
          billingContactTypeUUid, org_function_type);
        //send email
        sendInviteUserEmail(emailDetails, url);
      };
      //response send data
      const msg = "New Provider Registration for a client successfully!";
      const resData = providerInviteRecord && registrationType === "inviteByClient" ? {
        token: accessToken,
        client_org_uuid,
        provider_org_uuid: orgRes.organisation_uuid,
        provider_fa_uuid: functionAssignmentRes.function_assignment_uuid, msg
      } : msg;

      return SUCCESS(res, resData);
    });

  } catch (error) {
    console.log(error);
    next(error);
  };
};
const RegisterExistingProviderForClient = async (req, res, next) => {
  try {
    await sequelize.transaction(async (transaction) => {

      const providerDetails = req.body;
      const {
        client_org_uuid,
        provider_org_uuid,
        client_fa_uuid,
        invite_provider_uuid,
        client_contact_data,
        // registrationType,
      } = providerDetails;

      //check data
      if ((!client_fa_uuid ||
        !invite_provider_uuid || !client_org_uuid || !provider_org_uuid)) {
        return INVALIDRESPONSE(res, "Bad request!");

      };
      //get function_assignment_uuid of provider org
      const { function_assignment_uuid } = await Organisations.findOne({ where: { organisation_uuid: provider_org_uuid } });
      //create provider client contact of client
      const { title, first_name, last_name, email, phone, phone_optional } = client_contact_data;
      await ProviderClientContact.create(
        {
          provider_org_uuid,
          client_org_uuid,
          contact_title: title,
          contact_first_name: first_name,
          contact_last_name: last_name,
          contact_phone: phone,
          contact_phone_optional: phone_optional,
          contact_email: email
        }, { transaction });

      //create function assignment relation
      await FARelations.create({
        parent_uuid: client_fa_uuid,
        f_a_relation_type: "client_provider",
        child_uuid: function_assignment_uuid
      }, { transaction });

      // if ((invite_provider_uuid && registrationType === "inviteByClient") || registrationType === "forClient") {

      // if (registrationType === "inviteByClient" || registrationType === "inviteByClient") {
      //Generate Stripe Subscription
      // const resSubscription = await ProviderStripeSubscription(providerDetails)
      // if (resSubscription) {
      //   //Create Account Subscription details(stripe data)
      //   await AccountSubscriptions.create({
      //     client_fa_uuid: client_fa_uuid,
      //     provider_fa_uuid: functionAssignmentRes.function_assignment_uuid,
      //     subscription: resSubscription.id,
      //     price_id: resSubscription.items.data[0].price.id,
      //     customer: resSubscription.customer,
      //     subscription_date: new Date(),

      //   }, { transaction });

      //   // Send Email start
      //   const sub_period_start_date = DateTime.fromFormat(await unixToDate(resSubscription.current_period_start), 'yyyy-MM-dd').toFormat("MM-dd-yyyy");
      //   const sub_period_end_date = DateTime.fromFormat(await unixToDate(resSubscription.current_period_end), 'yyyy-MM-dd').toFormat("MM-dd-yyyy");
      //   const sub_created_date = DateTime.now().toFormat('MM-dd-yyyy');
      //   const emailDetails = {
      //     sub_created_date,
      //     email: providerDetails.user_billing_email, card_brand: resSubscription.card_brand,
      //     cardlast4: resSubscription.cardlast4, invoice_number: resSubscription.invoice_number,
      //     charged_amount: resSubscription.plan.amount.toFixed(2), license_period_start: sub_period_start_date,
      //     license_period_end: sub_period_end_date, invoice_pdf: resSubscription.invoice_pdf
      //   };
      //   sendProviderSignupPaymentEmail(emailDetails);
      // };
      //
      //update invite provider org status
      await InviteProvider.update(
        { invite_status: "Active" }, {
        where: { invite_provider_uuid },
        returning: true,
        transaction,
      });
      // };
      // };

      //Get and create client checklist assined data
      const inviteProvCompRes = await InviteProviderCompliance.findAll({
        where: { invite_provider_uuid },
        attributes: ['checklist_uuid'],
        where: { invite_provider_uuid, check_comp_assigned_to: 1 },//1 for provider
        raw: true
      });
      const checklistUuidsWithOrg = inviteProvCompRes.map(checklist => ({
        checklist_uuid: checklist.checklist_uuid,
        client_org_uuid, provider_org_uuid,
        // Add client_org_uuid to each object
      }));
      //create provider checklist assigned by client to main table
      if (inviteProvCompRes.length > 0) {
        await ProviderChecklistAssign.bulkCreate(checklistUuidsWithOrg, { transaction })
      };

      return SUCCESS(res, "Provider Registration for a client successfully!");
    });

  } catch (error) {
    console.log(error);
    next(error);
  };
};
//payment and other details flow pending (flow not confirmend yet)updation penidng (check in for regisclient)
const SignupProviderForYourself = async (req, res, next) => {
  try {
    await sequelize.transaction(async (transaction) => {

      const providerDetails = req.body;
      const {
        individual_data,
        address_data,
      } = providerDetails;

      //file data fields(aws)
      const fileData = req.files;

      console.log('------------------', providerDetails)
      console.log('-----------------------', fileData);
      if (fileData) {
        //msa doc
        fileData?.msaDoc ? providerDetails.msa_doc = fileData?.msaDoc[0].location : "";
      };
      let orgRes;
      let functionAssignmentRes;
      let individualRes;
      let inviteBillingUserObj = {};
      let usersPermArr = [];

      if (individual_data.length == 0) {
        return INVALIDRESPONSE(res, "Bad request!");

      };
      //Get function type of provider organistion
      const { function_uuid } = await Functions.findOne({
        where: { function_name: { [Sq.Op.iLike]: 'provider' } },
        attributes: ['function_uuid']
      });
      providerDetails.function_uuid = function_uuid;
      //////////get contact types of individual
      const contactTypeRes = await ContactTypes.findAll({
        where: {
          [Sq.Op.or]: [
            { contact_type: { [Sq.Op.iLike]: 'provider primary' } },
            { contact_type: { [Sq.Op.iLike]: 'provider billing' } }
          ]
        }, attributes: ['contact_type_uuid', 'contact_type']
      });

      //process contact type
      let primaryContactTypeUuid;
      let billingContactTypeUUid;
      contactTypeRes.forEach(contact => {
        if (contact.contact_type === 'provider primary') {
          primaryContactTypeUuid = contact.contact_type_uuid;
        } else if (contact.contact_type === 'provider billing') {
          billingContactTypeUUid = contact.contact_type_uuid;
        };
      });
      //Get Provider type
      let { provider_type_uuid } = await ProivderTypes.findOne({
        where: {
          provider_type_name:
            Sq.where(Sq.fn('LOWER', Sq.col('provider_type_name')), 'contractor')//default added
        }
      });

      //add provider uuid if direct registration
      providerDetails.provider_type_uuid = provider_type_uuid;

      //create address single or multiple address
      let addressesRes = await Addresses.bulkCreate(JSON.parse(address_data), { returning: true, transaction, });

      let orgIndArray = [];
      for (let individual of JSON.parse(individual_data)) {
        individual.is_user = true;

        //user details are already created at the time of registration process
        if (individual.providerContactType === "primary" && individual.individual_uuid) {
          let userRes;
          let userCreated;
          //user uuid not already exist
          if (!individual.user_uuid || individual.user_uuid === '' || !individual.user_uuid == null) {
            //bcrypt the password
            const password = await bcrypt.hash(individual.password, 10);
            //find or create as user
            [userRes, userCreated] = await Users.findOrCreate({
              where: {
                individual_uuid: individual.individual_uuid,
              },
              defaults: {
                individual_uuid: individual.individual_uuid, password
              }, transaction
            });
            individual.user_uuid = userRes.user_uuid;

          };
          //generate tokem of primary user
          // accessToken = generateAccessToken({ user_uuid: individual.user_data, });

          const individual_uuid = individual.individual_uuid;

          //update individuals primary user
          individual.is_provider_primary = true,
            individualRes = await Individuals.update(individual, {
              where: { individual_uuid }, returning: true, plain: true, transaction
            },);
          individualRes = individualRes[1];
          //create org. of Provider
          orgRes = await Organisations.create(providerDetails, { transaction });
          //organsation individual details push
          orgIndArray.push({
            individual_uuid,
            organisation_uuid: orgRes.organisation_uuid,
            contact_type_uuid: primaryContactTypeUuid,
            is_user: true
          });
          //create org. addresses 
          await OrgAddresses.bulkCreate(
            addressesRes.map(value => ({
              address_uuid: value.address_uuid,
              organisation_uuid: orgRes.organisation_uuid,
            })), { transaction });

          //create function assignment of Provider
          functionAssignmentRes = await FunctionAssignments.create({
            function_uuid: function_uuid,
            organisation_uuid: orgRes.organisation_uuid
          }, { transaction });
          //if primary user created permission create direct
          // if (userCreated) {
          usersPermArr.push({
            org_function_type: 'provider',
            function_assignment_uuid: functionAssignmentRes.function_assignment_uuid,
            user_uuid: individual.user_uuid,
            is_user_perm_active: true,//default active primary user permissions
            ...ProviderPrimaryUserPerm
          });
          // }
          //update function_assinment_uuid in Organisation
          await Organisations.update({
            function_assignment_uuid: functionAssignmentRes.function_assignment_uuid
          }, { where: { organisation_uuid: orgRes.organisation_uuid }, transaction });

          //organisation_uuid (provider)
          providerDetails.organisation_uuid = orgRes.organisation_uuid;

          !providerDetails.high_risk_master_setting_uuid ? delete providerDetails.high_risk_master_setting_uuid : '';

          console.log('providedetails-----------------', providerDetails)
          //parse provider details data
          // providerDetails.mas_info = JSON.parse(providerDetails.mas_info);
          providerDetails.whs_contact_info = JSON.parse(providerDetails.whs_contact_info);

          //create provider details
          await ProviderOrgDetails.create(providerDetails, { transaction });
          //create Provider Primary user link
          await FunctionMainUsers.create({
            user_uuid: individual.user_uuid,
            provider_org_uuid: orgRes.organisation_uuid,
            is_primary_user: true
          }, { transaction });

        }
        else {
          //if billing contact user
          let billingIndividual;
          let individualCreated;

          if (individual.individual_uuid == "") {
            //create individuals (contacts) user
            delete individual.individual_uuid;
            [billingIndividual, individualCreated] = await Individuals.findOrCreate({
              where: { email: Sq.where(Sq.fn('LOWER', Sq.col('email')), individual.email.toLowerCase()) },
              defaults: { ...individual, }, transaction
            },);
            //add individual_uuid 
            individual.individual_uuid = billingIndividual.individual_uuid;
            billingIndividual.user_uuid ? individual.user_uuid = billingIndividual.individual_uuid :
              delete individual.user_uuid;
          };
          //create Provider billing user link
          await FunctionMainUsers.create({
            user_uuid: individual.user_uuid,
            provider_org_uuid: orgRes.organisation_uuid,
            is_primary_user: true
          }, { transaction });
          //-------create invite and send invitation to billing contact user
          const inviteRes = await Invite.create({
            function_assignment_uuid: functionAssignmentRes.function_assignment_uuid,
            invited_user_type: 'provider_user',
            individual_uuid: individual.individual_uuid,
            user_uuid: individual?.user_uuid,
            invite_date: new Date(),
            created_by: individual.user_uuid,
          }, { transaction });
          //billing user permission invite
          usersPermArr.push({
            org_function_type: 'provider',
            function_assignment_uuid: functionAssignmentRes.function_assignment_uuid,
            user_uuid: individual?.user_uuid,
            invite_uuid: inviteRes.invite_uuid,
            documents_view: true
          });
          // //for send invitation to billing user email
          inviteBillingUserObj = {
            user_name: individual.first_name + " " + individual.last_name,
            email: individual.email,
            invite_uuid: inviteRes.invite_uuid,
          };
          //organisation individual data
          orgIndArray.push({
            individual_uuid: individualRes.individual_uuid,
            organisation_uuid: orgRes.organisation_uuid,
            contact_type_uuid: individual.contact_type_uuid,
            is_user: true
          });
        };
        // name and email account data for stripe payment and send email to billing contact user
        if (individual.providerContactType === 'billing') {
          providerDetails.fullname = individual.first_name + " " + individual.last_name;
          providerDetails.user_billing_email = individual.email;
        };
      };
      //working------------------
      // await ProviderPrimayBillingUsers.create(
      //   user_uuid:
      //   provider_org_uuid:
      // );
      // create  permissions
      await FAUserPermissions.bulkCreate(usersPermArr, { transaction });

      //create individual organisation
      await IndividualOrg.bulkCreate(orgIndArray, { transaction });

      //when provider attemp the direct registration without invitation
      let ProviderInviteRows;
      let providerInviteRecord;

      // if ((invite_provider_uuid && registrationType === "inviteByClient") || registrationType === "forClient") {

      // if (registrationType === "inviteByClient" || registrationType === "inviteByClient") {
      //Generate Stripe Subscription
      // const resSubscription = await ProviderStripeSubscription(providerDetails)
      // if (resSubscription) {
      //   //Create Account Subscription details(stripe data)
      //   await AccountSubscriptions.create({
      //     client_fa_uuid: client_fa_uuid,
      //     provider_fa_uuid: functionAssignmentRes.function_assignment_uuid,
      //     subscription: resSubscription.id,
      //     price_id: resSubscription.items.data[0].price.id,
      //     customer: resSubscription.customer,
      //     subscription_date: new Date(),

      //   }, { transaction });

      //   // Send Email start
      //   const sub_period_start_date = DateTime.fromFormat(await unixToDate(resSubscription.current_period_start), 'yyyy-MM-dd').toFormat("MM-dd-yyyy");
      //   const sub_period_end_date = DateTime.fromFormat(await unixToDate(resSubscription.current_period_end), 'yyyy-MM-dd').toFormat("MM-dd-yyyy");
      //   const sub_created_date = DateTime.now().toFormat('MM-dd-yyyy');
      //   const emailDetails = {
      //     sub_created_date,
      //     email: providerDetails.user_billing_email, card_brand: resSubscription.card_brand,
      //     cardlast4: resSubscription.cardlast4, invoice_number: resSubscription.invoice_number,
      //     charged_amount: resSubscription.plan.amount.toFixed(2), license_period_start: sub_period_start_date,
      //     license_period_end: sub_period_end_date, invoice_pdf: resSubscription.invoice_pdf
      //   };
      //   sendProviderSignupPaymentEmail(emailDetails);
      // };
      //
      //update invite provider org status

      // };
      // };
      //create client checklist assined data
      //Billing contact user email send
      if (inviteBillingUserObj) {
        const org_function_type = 'provider';
        const emailDetails = {
          trading_name: orgRes.trading_name,//provider trading name
          user_name: inviteBillingUserObj.fullname,
          email: inviteBillingUserObj.email
        };
        // const { org_function_type } = user_perm_data;
        const url = await InviteOrgUserEmailLink(inviteBillingUserObj.invite_uuid,
          billingContactTypeUUid, org_function_type);
        //send email
        sendInviteUserEmail(emailDetails, url);
      };
      //response send data

      return SUCCESS(res, "Provider Registration for a client successfully!");
    });

  } catch (error) {
    console.log(error);
    next(error);
  };
};
const CreateProviderRegisTempData = async (req, res, next) => {
  try {
    const providerDetails = req.body;
    let {
      registrationType,
      invite_provider_uuid,
      user_uuid,//provider primary user
      client_fa_uuid,
      provider_regist_data
    } = providerDetails;
    const filesData = req.files;
    providerDetails.provider_regist_data = JSON.parse(provider_regist_data);
    //Not required at the time of create
    delete providerDetails.provider_temp_regist_uuid;
    console.log("-----------------", providerDetails)
    console.log("-------------------", filesData)

    sequelize.transaction(async (transaction) => {
      if (registrationType == "inviteByClient" && (!client_fa_uuid && !invite_provider_uuid)) {

        return INVALIDRESPONSE(res, "Bad request!");

      };
      if (user_uuid === '' || user_uuid === 'null' || user_uuid == null) delete providerDetails.user_uuid;//recheck temp purpose

      //if for registration for  client
      if (filesData) {
        //msa doc
        filesData?.tempMsaDoc ? providerDetails.temp_msa_doc = filesData?.tempMsaDoc[0].location : "";
        //client evidence of engagement document
        if (registrationType === "forClient" || registrationType === "inviteByClient") {
          filesData?.tempEngagementDoc ? providerDetails.temp_engagement_doc
            = filesData?.tempEngagementDoc[0].location : "";
        }
      };

      let primaryUserEmail;
      //Get user email (Primary contact user)
      let individualData = providerDetails.provider_regist_data.individual_data;
      for (let individual of individualData) {
        if (individual.providerContactType == "primary") {
          primaryUserEmail = individual.email;
        }
      }
      //create to save and continue later data
      let createRes = await ProviderTempRegis.create(providerDetails, { transaction });

      if (registrationType === 'inviteByClient' && invite_provider_uuid) {
        //update invite registration start status
        await InviteProvider.update({ is_regis_attempt: true }, { where: { invite_provider_uuid }, transaction });
      };

      // Start sending (Save and Continue later) email
      //send registrationType when registrationType for yourself
      const url = await signUpContinueEmailLink(
        registrationType === 'yourself' ? registrationType : '',
        createRes.provider_temp_regist_uuid
      );
      sendSignUpContinueEmail({ email: primaryUserEmail }, url);

      SUCCESS(res, 'Provider Registration Details saved successfully!');
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
const UpdateProviderRegisTempData = async (req, res, next) => {
  try {
    const providerDetails = req.body;
    let {
      registrationType,
      invite_provider_uuid,
      provider_temp_regist_uuid,
      user_uuid,//provider primary user
      provider_regist_data
    } = providerDetails;
    const filesData = req.files;
    providerDetails.provider_regist_data = JSON.parse(provider_regist_data);

    console.log("-----------------", providerDetails)
    console.log("-------------------", filesData)

    if (registrationType == "inviteByClient" && (!client_fa_uuid && !invite_provider_uuid)) {

      return INVALIDRESPONSE(res, "Bad request!");

    };

    if (user_uuid === '' || user_uuid === 'null' || user_uuid == null) delete providerDetails.user_uuid;//recheck temp purpose
    if (invite_provider_uuid === '') delete providerDetails.invite_provider_uuid;

    //if registration for client
    if ((filesData && filesData?.tempEngagementDoc) &&
      (registrationType === "forClient" || registrationType === "inviteByClient")) {
      //client evidence of engagement document
      filesData?.tempEngagementDoc[0]?.location ? providerDetails.temp_engagement_doc
        = filesData?.tempEngagementDoc[0].location : "";
    };

    //msa doc
    if (filesData && filesData?.tempMsaDoc) {
      filesData?.tempMsaDoc[0]?.location ? providerDetails.temp_msa_doc = filesData?.tempMsaDoc[0].location : "";
    };
    sequelize.transaction(async (transaction) => {

      //----------------delete existing files
      if (filesData?.length > 0) {
        const ContTempRegisDataRes = await ProviderTempRegis.findOne({
          where: { provider_temp_regist_uuid },
        });
        //temp engagement file
        if (filesData?.tempEngagementDoc[0]?.location && ContTempRegisDataRes?.temp_engagement_doc) {
          const tempEngagementDocName = path.basename(ContTempRegisDataRes.temp_engagement_doc);
          // const filePath = `${appRoot}/${contractorDetailsRes?.msa_doc}`;
          await deleteS3BucketFile(tempEngagementDocName);
        };
        //temp msa file
        if (filesData?.tempMsaDoc[0]?.location && ContTempRegisDataRes?.temp_msa_doc) {
          const tempMsaDocName = path.basename(ContTempRegisDataRes.temp_msa_doc);
          await deleteS3BucketFile(tempMsaDocName);
        };
      };

      //parse individual data
      let individualData = JSON.parse(providerDetails.provider_regist_data.individual_data);
      providerDetails.provider_regist_data.individual_data = individualData;
      //parse address data
      if (providerDetails.provider_regist_data.address_data.length > 0) {
        providerDetails.provider_regist_data.address_data = JSON.parse(providerDetails.provider_regist_data.address_data);
      };
      //Get user email (Primary contact user)
      let primaryUserEmail;
      for (let individual of individualData) {
        if (individual.providerContactType == "primary") {
          primaryUserEmail = individual.email;
        }
      };
      //update data
      await ProviderTempRegis.update(providerDetails, { where: { provider_temp_regist_uuid }, transaction });

      // Start sending (Save and Continue later) email
      // email address url 
      const url = await signUpContinueEmailLink(provider_temp_regist_uuid);
      sendSignUpContinueEmail({ email: primaryUserEmail }, url);
      // End sending (Save and Continue later) email //

      SUCCESS(res, 'Provider Registration Details saved successfully!');
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const GetProviderRegisSaveAndContinueById = async (req, res, next) => {
  try {
    const { provider_temp_regist_uuid } = req.query;

    const contTempRegisDataRes = await ProviderTempRegis.findOne({ where: { provider_temp_regist_uuid } });

    GETSUCCESS(res, contTempRegisDataRes, "Get Provider save and continue registration details successfully!");

  } catch (error) {
    console.log(error);
    next(error);
  };
};
//delete temporary registration data (not applied)
const DeleteProviderTempRegisfile = async (req, res, next) => {
  try {
    const { provider_temp_regist_uuid, temp_engagement_doc, temp_msa_doc } = req.body;

    // file which need to be deleted
    if (temp_engagement_doc || temp_engagement_doc) {

      const fileBasename = path.basename(temp_engagement_doc || temp_msa_doc);
      await deleteS3BucketFile(fileBasename);
      let data = {};
      temp_engagement_doc ? data.temp_engagement_doc = "" : data.temp_msa_doc = "";

      await ProviderTempRegis.update(data, { where: { provider_temp_regist_uuid } });
    };
    SUCCESS(res, "Provider registration save and continue later file deleted successfully!");

  } catch (error) {
    console.log(error);
    next(error);
  };
};
//revisit not fully implemented at frontend
//api's for Provider invitation
//pending (checking Provider org. status regist. complete or not pending)
//provider data not user here-------------
const GetProviderInvitationById = async (req, res, next) => {
  try {
    const { invite_provider_uuid, contact_type_uuid } = req.query;

    const inviteRes = await InviteProvider.findOne({
      where: { invite_provider_uuid },
      attributes: { exclude: commonAttributes },
      include:
        [
          {
            model: FunctionAssignments, as: "provInviteClient",
            attributes: ["function_assignment_uuid",],//client
            include: {
              model: Organisations, as: "org_data",
              attributes: ["organisation_uuid", "trading_name"]
            }
          },
          {
            model: Individuals, as: "invitedProvider",
            attributes: [[Sq.fn("concat", Sq.col("invitedProvider.first_name"),
              " ", Sq.col("invitedProvider.last_name")), "providerName"]
            ]
          }
        ],
    });
    if (inviteRes.invite_status == "Rejected" || inviteRes.invite_status == "In-Process") {

      return LINKEXPIREDRESPONSE(res, "This link has no more exist!");
    };

    //check Provider and individual if already exist or not status (created after invitation by other way or direct)
    let individualRes;
    //if not as a Provider in the system when invited then check 
    if (!inviteRes?.provider_fa_uuid) {
      // query
      if (inviteRes.individual_uuid || inviteRes.provider_email) {
        const where_query = {};

        if (inviteRes.individual_uuid) {

          where_query.individual_uuid = inviteRes.individual_uuid;
        } else if (inviteRes.provider_email) {
          where_query.email = Sq.where(
            Sq.fn('LOWER', Sq.col('individuals.email')),
            'LIKE',
            inviteRes.provider_email.toLowerCase()
          );
        };

        //Get individual and related data(also check if not created as conserve team (Admin)) and if user (check by user_uuid)
        individualRes = await Individuals.findOne({
          where: where_query,
          attributes: { exclude: commonAttributes },
          include: [
            { //if already a Provider as user
              model: IndividualOrg, as: "org_ind", where: { contact_type_uuid, is_user: true },//contact_type_uuid of provider primary
              required: false,
              //To check if Provider already registred with client (if created)
              include: {
                model: FunctionAssignments, as: "ind_org_fa", attributes: ["function_assignment_uuid"],
                include: {
                  model: FARelations, as: "fa_relation_child", where: { parent_uuid: inviteRes.client_fa_uuid },
                  attributes: { exclude: commonAttributes }
                }
              },
              attributes: { exclude: commonAttributes },
              required: false
            },
          ]
        });
      };
    };
    const promises = [inviteRes];
    if (individualRes) {
      promises.push(individualRes);
    };
    const resultAll = await Promise.all(promises);
    GETSUCCESS(res, { invite_data: resultAll[0], provider_data: resultAll[1] },);

  } catch (error) {
    console.log(error);
    next(error);
  };
};

const RejectProviderInvitation = async (req, res, next) => {
  try {
    const { invite_provider_uuid, providerName, reject_invite_message,trading_name,client_org_uuid} = req.body;

    await sequelize.transaction(async (transaction) => {
      // Update the invite status to "Rejected" and retrieve the updated record
      const [updatedRows, [updatedRecord]] = await InviteProvider.update(
        { invite_status: "Rejected" }, {
        where: { invite_provider_uuid },
        returning: true,
        transaction,
      });

      if (!updatedRows) {
        // Handle the case where no records were updated
        return NOTFOUND(res, "No records Found!");
      };
      // Find the user who created the invitation
      const { first_name, last_name, email } = await Individuals.findOne({
        where: { user_uuid: updatedRecord.created_by },

      });

      const emailDetails = {
        inviteByUserName: `${first_name} ${last_name}`,
        email,
        providerName,
        reject_invite_message,
      };
      // Send the rejection email
      sendProviderInvitationRejectEmail(emailDetails);
      sendNotification(`${providerName} has rejected the invitation from ${trading_name}.`,["super admin","support team","client service team",`org_${client_org_uuid}`],
      "",{organisation_uuid:client_org_uuid,trading_name})
      return SUCCESS(res, "Provider Invitation declined email successfully!");
    });
  } catch (error) {
    console.error(error);
    next(error);
  };
};
//send the email who invite (specific client user only) send after complete registration
const ProviderAcceptInvitationConfirm = async (req, res, next) => {
  try {

    const { invite_provider_uuid, function_assignment_uuid } = req.body;

    await sequelize.transaction(async (transaction) => {
      // Update the invite status to "Active" and retrieve the updated record
      const [updatedRows, [updatedRecord]] = await InviteProvider.update(
        { invite_status: "Active" }, {
        where: { invite_provider_uuid },
        returning: true,
        transaction,
      });

      if (!updatedRows) {
        // Handle the case where no records were updated
        return NOTFOUND(res, "No records Found!");
      };
      //user who created the invitation
      const { first_name, last_name, email } = await Individuals.findOne({
        where: { user_uuid: updatedRecord.created_by },
      });

      const emailDetails = {
        user_name: `${first_name} ${last_name}`,
        email,
        provider_org_name: updatedRecord.provider_org_name,

      };
      //Provider org. function_assignment_uuid
      const url = await InviteAcceptProviderViewProfileLink(function_assignment_uuid);
      // Send the Accept invitation  email to client user
      sendProviderInvitationAcceptEmail(emailDetails, url);

      return SUCCESS(res, "Provider Invitation accepted email to client successfully!");
    });

  } catch (error) {
    console.log(error);
    next(error);
  };
};
//workiing-----------------------
//for new Provider check
const GetAlreadyExistingProviderAndRelation = async (req, res, next) => {
  try {
    const { trading_name, abn_nzbn, client_fa_uuid } = req.query;

    let where_obj = {
      trading_name:
        { [Sq.Op.iLike]: trading_name }, abn_nzbn: { [Sq.Op.iLike]: abn_nzbn }
    };

    const orgRes = await Organisations.findOne({
      where: where_obj, attributes: ["organisation_uuid", "trading_name", "abn_nzbn"],
      include: {
        model: FunctionAssignments, as: "org_fun_assign",

        include: {
          model: FARelations, as: "fa_relation_child",
          where: { parent_uuid: client_fa_uuid, f_a_relation_type: "client_provider" },
          attributes: { exclude: commonAttributes }
        }
      }
    });

    GETSUCCESS(res, orgRes, "Get already existing  Organisation query successfully!");
  } catch (error) {
    console.log(error);
    next(error);
  };

};
//permission of provider primary user pending
const CreateInvitedProviderPrimaryUser = async (req, res, next) => {
  try {
    const userDetails = req.body;
    let { individual_uuid, user_uuid, password, email } = userDetails
    sequelize.transaction(async (transaction) => {
      let individualRes;
      let individualCreated;
      //check with concurrency
      if (user_uuid == "" && individual_uuid == "") {
        delete userDetails.individual_uuid;
        delete userDetails.user_uuid;
        delete userDetails.password;
        [individualRes, individualCreated] = await Individuals.findOrCreate({
          where: { email: { [Sq.Op.iLike]: email } },
          defaults: userDetails,
          transaction
        });
      };
      //hash the password
      password = await bcrypt.hash(password, 10);
      //individual newly created or if user not exist 
      if (individualCreated || !individualRes.user_uuid) {
        let usersRes;
        await Promise.all([
          [usersRes,] = await Users.findOrCreate({
            where: { individual_uuid: individualRes.individual_uuid },
            defaults: { individual_uuid: individualRes.individual_uuid, password },
            transaction
          }),
          Individuals.update({ user_uuid: usersRes.user_uuid },
            { where: { individual_uuid: individualRes.individual_uuid }, transaction })
        ]);

      };
      SUCCESS(res, "Provider primary user created successfully!");
    });

  } catch (error) {
    console.log(error);
    next(error);
  };
};
//need to revisit ---------- according to new functionality
// const GetClientComplianceDocsRequired = async (req, res, next) => {
//   try {
//     //client function_assignment_uuid and provider organisation_uuid
//     const { function_assignment_uuid, organisation_uuid } = req.query;
//     //compliace doc of client
//     const complianceDocsRes = await ComplianceDocs.findAll({
//       where: { function_assignment_uuid },
//       attributes: ["compliance_doc_uuid", "function_assignment_uuid", "compliance_doc_name", "is_doctype_swms",
//         "high_risk_specific",],
//       include: {
//         where: { recipient_type: "provider" },
//         model: DocumentTypes,
//         attributes: ["document_type_uuid", "document_type", "recipient_type"],
//         required: false,
//         //Provider documents 
//         include: {
//           model: Documents, where: { organisation_uuid },
//           attributes: { exclude: commonAttributes },
//           as: "doctypeDocument", required: false
//         }
//       },
//     });

//     GETSUCCESS(res, complianceDocsRes, "Get all Compliance document (Provider) of specific client successfully!");
//   } catch (error) {
//     console.log(error);
//     next(error);
//   };
// };
// const GetContractorPrimaryUser = async (req, res, next) => {
//   try {
//     const { } = req.query;

//     const individualRes = await Individuals.findOne({ where: { email } });
//     return GETSUCCESS(res, "", "Get provider primary user  successfully!");
//   } catch (error) {
//     console.log(error);
//     next(error);
//   };
// };



//for create specific doc or create doc and send doc to approval (Registration invited by client)
const AddProviderDocsAndSubmit = async (req, res, next) => {
  try {

    console.log("------------", req.body)
    const { login_user, body: DocDetails } = req;
    let { provider_org_uuid, docsData, existingDocsData, client_org_uuid } = DocDetails;
    const { user_uuid, individual: { first_name, last_name } } = login_user;
    const fileData = req.files;

    // if (!existingDocsData) existingDocsData = [];
    console.log('fileData-------------', fileData);

    if (((existingDocsData?.length == 0) &&
      docsData.length == 0) || !provider_org_uuid || !client_org_uuid) {
      return INVALIDRESPONSE(res, "Bad request!");
    };
    console.log('fileData-------------', fileData);
    console.log('providerRegistrationDocs-------------', DocDetails);
    await sequelize.transaction(async (transaction) => {
      const docArray = [];
      const docApprArray = [];
      const docHistoryArray = [];
      const newDocuments = [];

      if (docsData.length > 0) {
        //parse
        docsData = JSON.parse(docsData);

        // Process documents in parallel
        await Promise.all(docsData.map(async (doc, docInd) => {
          const { checklist_doc_uuid } = doc;
          //parse
          // if (doc?.doctype_fields_data && Object.keys(doc?.doctype_fields_data).length > 0) {
          //   doc.doctype_fields_data = JSON.parse(doc.doctype_fields_data);
          // }
          //file data of new docuements
          if (fileData[docInd]?.location) {
            doc.doc_file = fileData[docInd]?.location;
          };
          console.log("-------------", doc)
          //create document 
          const { document_uuid, is_other_doc } = await Documents.create(doc, { transaction });

          newDocuments.push({ document_uuid, is_other_doc });
          docArray.push({ organisation_uuid: provider_org_uuid, document_uuid, created_by: user_uuid });
          docApprArray.push({
            provider_org_uuid,
            document_uuid,
            client_org_uuid,
            checklist_doc_uuid,
            created_by: user_uuid,
          });
          //create new doc history data
          docHistoryArray.push({
            document_uuid,
            action_type: "create_doc",
            desc_html: [`<p>${first_name} ${last_name} has Created the New document</p>`],
            new_value: JSON.stringify(DocDetails),
          });
        }));

        // Create org.doc junction
        await OrgDocuments.bulkCreate(docArray, { transaction });
      };

      // For submit only existing docs for approval (other doc can not be )
      // if (existingDocsData.length > 0) {
      //   //parse
      //   existingDocsData = JSON.parse(existingDocsData);
      //   //add existing doc array
      //   docApprArray.push(...existingDocsData.map((existingDoc) => ({
      //     document_uuid: existingDoc.document_uuid,
      //     checklist_doc_uuid: existingDoc.checklist_doc_uuid,
      //     client_org_uuid,
      //     provider_org_uuid,
      //     created_by: user_uuid,
      //   })));
      // };

      // Create doc approval
      const providerDocAppRes = await ProviderDocApproval.bulkCreate(docApprArray, { transaction });

      // Process doc approvals in parallel
      await Promise.all(providerDocAppRes.map((docApp) => {
        const { document_approval_uuid, document_uuid } = docApp;
        //check other docs or general docs
        const newDoc = newDocuments.find(doc => doc.document_uuid === document_uuid);
        const action_type = newDoc && newDoc.is_other_doc ? "create_doc_appr_other" : "create_doc_appr";

        // Doc approval history data
        docHistoryArray.push({
          document_uuid,
          action_type,
          desc_html: [`<p>${first_name} ${last_name} has sent to Client for approval</p>`],
          new_value: JSON.stringify(DocDetails),
          document_approval_uuid,
        });
      }));

      // Create document history records
      await DocHistory.bulkCreate(docHistoryArray, { transaction });

      SUCCESS(res, "Thanks! Document added.");
    });
  } catch (error) {
    console.log(error);
    next(error);
  };
};

module.exports = {
  SignupProviderEmailVerification,
  ResendEmailVerification,
  VerifyEmail,
  SetNewPassword,
  SignupProviderForClient,
  RegisterExistingProviderForClient,
  CreateProviderRegisTempData,
  UpdateProviderRegisTempData,
  SignupProviderForYourself,
  GetProviderRegisSaveAndContinueById,
  DeleteProviderTempRegisfile,
  GetProviderInvitationById,
  RejectProviderInvitation,
  ProviderAcceptInvitationConfirm,
  CreateInvitedProviderPrimaryUser,
  // GetClientComplianceDocsRequired,
  AddProviderDocsAndSubmit


};
