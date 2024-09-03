const Organisations = require('./Organisations');
const Individuals = require('./Individuals');
const Users = require('./Users');
const ProviderOrgDetails = require("./ProviderOrgDetails");
const ProviderTempRegis = require("./ProviderTempRegis");
const FunctionMainUsers = require('./FunctionMainUsers');

const ProviderClientContact = require("./ProviderClientContact");

const MasterSettings = require("./MasterSettings");

const Addresses = require("./Addresses");
const OrgAddresses = require("./OrgAddresses");
const IndividualOrg = require("./IndividualOrg");
// const OrgAddressContacts = require("./OrgAddressContacts");

const Functions = require("./Functions");
const FunctionAssignments = require("./FunctionAssignments");
const FARelations = require("./FARelations");

const ContactTypes = require("./ContactTypes");


const AccountSubscriptions = require("./AccountSubscriptions");
const AccountInvoices = require("./AccountInvoices");

const Sites = require("./Sites");
const ClientSiteContacts = require("./ClientSiteContacts")
const Notes = require("./Notes");
const NotesAttachments = require("./NoteAttachemnts");

const DocumentTypes = require("./DocumentTypes");
const ProivderTypes = require("./ProviderTypes");
const ProviderTypeLogs = require("./ProviderTypeLogs");
const Documents = require("./Documents");
const DocHistory = require("./DocHistory");
const OrgDocuments = require("./OrgDocuments");
const IndividualDocuments = require("./IndividualDocuments");
const ProviderDocApproval = require("./ProviderDocApproval");

const CompanyInductions = require("./CompanyInductions");
const CompanyInductionModule = require("./CompanyInductionModule");

const SiteInductions = require("./SiteInductions");
const SiteIndIndustry = require("./SiteIndIndustry");
const SiteIndDocTypes = require("./SiteIndDocTypes");//revisit
const SiteIndModule = require("./SiteIndModule");

const Modules = require("./Modules");
const ModuleQuestions = require("./ModuleQuestions");
const ModuleAnswers = require("./ModuleAnswers");

const WorkerQuesAttempt = require("./WorkerQuesAttempt");
const WorkerModuleAttempt = require("./WorkerModuleAttempt");

const Invite = require("./Invite");
const InviteWorkerClientAssign = require('./InviteWorkerClientAssign');
const InviteProvider = require("./InviteProvider");
const InviteAttach = require("./InviteAttach");
const InviteProviderCompliance = require('./InviteProviderCompliance');

const Roles = require("../public/Roles");
const RoleAssignments = require("./RoleAssignments");

const ClientDetails = require("./ClientDetails");
const ComplianceChecklist = require('./ComplianceChecklist');
const ChecklistDocs = require("./ChecklistDocs");
// const ComplianceIndHighrisk = require("./ComplianceIndHighRisk");
const Emails = require("./Emails");
const EmailTemplates = require("./EmailTemplates");
const EmailTempAttachments = require("./EmailTempAttachments");

const LoginHistory = require("./LoginHistory");

const WorkerType = require("./WorkerType");
const Workers = require("./Workers");
const WorkerAssign = require("./WorkerAssign");
const WorkerSiteInd = require("./WorkerSiteInd");

const FAUserPermissions = require("./FAUserPermissions");
const WorkerChecklistAssign = require('./WorkerChecklistAssign');
const WorkerTrainingSite = require("./WorkerTrainingSite");
const WorkerDocApproval = require("./WorkerDocApproval");
const WorkerSiteAccess = require("./WorkerSiteAccess");
const WorkerCompanyInd = require("./WorkerCompanyInd");

const ProviderChecklistAssign = require('./providerChecklistAssign');

const { States, Countries } = require('../public');

const Notifications = require("./Notifications");
const NotificationReadReceipt = require("./NotifcationsReadReceipt");

/* NotificationReadReceipt */
NotificationReadReceipt.belongsTo(Notifications, {
    foreignKey: 'notification_uuid',
    as: 'notification'
});
/* Notifications  */
Notifications.hasMany(NotificationReadReceipt, {
    foreignKey: 'notification_uuid',
    as: 'notification_read_status'
});

/* AccountSubscriptions */
AccountSubscriptions.hasOne(AccountInvoices, {
    as: "acc_invoice",
    foreignKey: "account_subscription_uuid"
});

/* Organisations */
Organisations.belongsToMany(Addresses, {
    through: OrgAddresses,
    as: 'org_address_data',
    constraints: false,
    allowNull: true,
    defaultValue: null,
    foreignKey: 'organisation_uuid',
    otherKey: 'address_uuid'

});

// Organisations.hasOne(FunctionMainUsers, {
//     as: "mainUser",
//     foreignKey: 'organisation_uuid',
//     sourceKey: 'provider_org_uuid'
// });
// Organisations.hasOne(OrgAddresses, {
//     as: 'org_address_junction',
//     foreignKey: 'organisation_uuid',
// });
Organisations.belongsToMany(Individuals, {
    through: IndividualOrg,
    as: 'individual_data',
    constraints: false,
    allowNull: true,
    defaultValue: null,
    foreignKey: 'organisation_uuid',
    otherKey: 'individual_uuid'
});
Organisations.hasOne(IndividualOrg, {
    as: "individual_org",
    foreignKey: "organisation_uuid",
});
Organisations.hasOne(FunctionAssignments, {
    as: "org_fun_assign",
    foreignKey: "organisation_uuid",

});
Organisations.hasOne(ClientDetails, {
    foreignKey: "organisation_uuid",

});

Organisations.hasMany(ProviderClientContact, {
    as: "clientContacts",
    foreignKey: "provider_org_uuid",
    sourceKey: "organisation_uuid"
});

Organisations.hasOne(ProviderClientContact, {
    as: "provClientCont",
    foreignKey: "client_org_uuid",
    sourceKey: "organisation_uuid"
});

Organisations.hasOne(ProviderOrgDetails, {
    foreignKey: "organisation_uuid",

});

Organisations.hasMany(ComplianceChecklist, {
    as: "orgChklists",
    sourceKey: "organisation_uuid",
    foreignKey: "client_org_uuid",

});

// Organisations.hasMany(WorkerClientAssign, {
//     foreignKey: "provider_org_uuid",
//     as: "org_worker_assigns"

// });
Organisations.hasMany(Sites, {
    as: "clientOrgSites",
    sourceKey: "function_assignment_uuid",
    foreignKey: "function_assignment_uuid"
});
Organisations.hasMany(CompanyInductions, {
    as: "clientCompInd",
    sourceKey: "function_assignment_uuid",
    foreignKey: "function_assignment_uuid"
});

Organisations.hasMany(ProviderChecklistAssign, {
    as: "ClientChklist",
    sourceKey: "organisation_uuid",
    foreignKey: "client_org_uuid"
});
Organisations.hasMany(WorkerChecklistAssign, {
    as: "workerChklist",
    sourceKey: "organisation_uuid",
    foreignKey: "client_org_uuid"
});
/* OrgDocuments */
OrgDocuments.hasOne(Documents, {
    as: "providerDoc",
    sourceKey: "document_uuid",
    foreignKey: "document_uuid",
    constraints: false,
    allowNull: true,
    defaultValue: null
});

/* ProviderClientContact */
ProviderClientContact.hasOne(Organisations, {
    as: "clientContactOrg",
    foreignKey: "organisation_uuid",
    sourceKey: "client_org_uuid"
});
/* OrgAddresses */
OrgAddresses.hasOne(Addresses, {
    as: "org_address",
    sourceKey: "address_uuid",
    foreignKey: "address_uuid",

});

/* Addresses */
Addresses.hasOne(States, {
    foreignKey: "state_id",
    sourceKey: "state_id"
});
Addresses.hasOne(Countries, {
    foreignKey: "country_id",
    sourceKey: "country_id"
});


/* Individuals */
Individuals.hasMany(IndividualOrg, {
    foreignKey: "individual_uuid",
    constraints: false,
    allowNull: true,
    defaultValue: null,
});
Individuals.hasOne(IndividualOrg, {
    as: "org_ind",
    foreignKey: "individual_uuid",
    constraints: false,
    allowNull: true,
    defaultValue: null,
});
Individuals.hasOne(Users, {
    as: "user_data",
    foreignKey: "individual_uuid",

});
Individuals.hasMany(Invite, {
    foreignKey: "individual_uuid",
    constraints: false,
    allowNull: true,
    defaultValue: null,
});
Individuals.hasOne(Invite, {
    as: "indi_invite",
    foreignKey: "individual_uuid"
});
Individuals.hasOne(Workers, {
    as: "worker_data",
    foreignKey: "individual_uuid"
});


Individuals.hasOne(States, {
    foreignKey: "state_id",
    sourceKey: "state_id"
});
Individuals.hasOne(Countries, {
    foreignKey: "country_id",
    sourceKey: "country_id"
});
Individuals.hasMany(Countries, {
    foreignKey: "country_id",
    sourceKey: "country_id"
});
Individuals.hasOne(Users, {
    as: 'indCreatedBy',
    foreignKey: "user_uuid",
    sourceKey: "created_by"
});



/* IndividualDocuments */
IndividualDocuments.belongsTo(Documents, {
    as: "individualDoc",
    sourceKey: "document_uuid",
    foreignKey: "document_uuid",
    constraints: false,
    allowNull: true,
    defaultValue: null,
});

/* Workers */
Workers.belongsToMany(Organisations, {
    through: WorkerAssign,
    as: 'client_assigns',
    constraints: false,
    allowNull: true,
    defaultValue: null,
    foreignKey: 'worker_uuid',
    otherKey: 'client_org_uuid'

});

Workers.hasOne(Individuals, {
    as: "worker_individual",
    sourceKey: "individual_uuid",
    foreignKey: "individual_uuid"
});
Workers.hasOne(Organisations, {
    as: "workerProvider",
    sourceKey: "provider_org_uuid",
    foreignKey: "organisation_uuid"
});
Workers.hasMany(WorkerChecklistAssign, {
    as: "ChklstAssigns",
    sourceKey: "worker_uuid",
    foreignKey: "worker_uuid"
});
/* WorkerAssign */
WorkerAssign.belongsTo(Workers, {
    as: "wrkrAssign",
    sourceKey: "worker_uuid",
    foreignKey: "worker_uuid"
});

WorkerAssign.hasOne(Workers, {
    as: "assignWorker",
    sourceKey: "worker_uuid",
    foreignKey: "worker_uuid"
});
WorkerAssign.belongsTo(Organisations, {
    as: 'clientAssign',
    foreignKey: "client_org_uuid",
 
});
WorkerAssign.hasMany(WorkerChecklistAssign, {
    as: "WCA",
    foreignKey: "worker_uuid",
    sourceKey: "worker_uuid"
});

/* WorkerChecklistAssign */

WorkerChecklistAssign.hasMany(ChecklistDocs, {
    as: 'workerCheckDocs',
    foreignKey: 'checklist_uuid',
    sourceKey: 'checklist_uuid'

});
WorkerChecklistAssign.hasMany(ChecklistDocs, {
    as: 'WCDocs',
    foreignKey: 'checklist_uuid',
    sourceKey: 'checklist_uuid'

});


/* IndividualOrg */
IndividualOrg.hasMany(Individuals, {
    foreignKey: "individual_uuid",
    sourceKey: "individual_uuid",
    constraints: false,
    allowNull: true,
    defaultValue: null,
});
IndividualOrg.hasOne(Individuals, {
    as: "org_individual",
    foreignKey: "individual_uuid",
    sourceKey: "individual_uuid",
});
IndividualOrg.hasOne(Organisations, {
    as: "ind_org",
    foreignKey: "organisation_uuid",
    sourceKey: "organisation_uuid",
    constraints: false,
    allowNull: true,
    defaultValue: null,
});
IndividualOrg.hasOne(FunctionAssignments, {
    as: "ind_org_fa",
    foreignKey: "organisation_uuid",
    sourceKey: "organisation_uuid",
});
IndividualOrg.hasOne(ContactTypes, {
    as: "contactType",
    foreignKey: "contact_type_uuid",
    sourceKey: "contact_type_uuid",
});

/* FunctionAssignment */
FunctionAssignments.hasOne(Organisations, {
    foreignKey: "organisation_uuid",
    sourceKey: "organisation_uuid",
    as: "org_data",
    constraints: false,
    allowNull: true,
    defaultValue: null,
});
FunctionAssignments.belongsTo(Functions, {
    foreignKey: "function_uuid",
    sourceKey: "function_uuid",
    constraints: false,
    allowNull: true,
    defaultValue: null,

});
FunctionAssignments.hasMany(FARelations, {
    foreignKey: "parent_uuid",
    as: "fa_relation_data"

});
FunctionAssignments.hasOne(FARelations, {
    foreignKey: "child_uuid",
    as: "fa_relation_child"

});
FunctionAssignments.hasOne(IndividualOrg, {
    as: "fa_individual_data",
    sourceKey: "organisation_uuid",
    foreignKey: "organisation_uuid",

});
FunctionAssignments.hasOne(AccountSubscriptions, {
    as: "account_subsc",
    sourceKey: "function_assignment_uuid",
    foreignKey: "provider_fa_uuid",

});
// FunctionAssignments.hasMany(InviteProvider, {
//     as: "provider_invited",
//     foreignKey: "client_fa_uuid"
// });
FunctionAssignments.hasOne(InviteProvider, {
    as: "invitedProvider",
    foreignKey: "provider_fa_uuid",
    sourceKey: "function_assignment_uuid"
});
FunctionAssignments.hasOne(ClientDetails, {
    as: "fa_client_details",
    foreignKey: "organisation_uuid",
    sourceKey: "organisation_uuid"
});
FunctionAssignments.hasOne(FAUserPermissions, {
    as: "fa_perm",
    foreignKey: "function_assignment_uuid",
});

/* ProviderOrgDetails */
ProviderOrgDetails.hasOne(MasterSettings, {
    foreignKey: "master_setting_uuid",
    sourceKey: "ind_master_setting_uuid"
});
ProviderOrgDetails.hasOne(ProivderTypes, {
    as: 'providerType',
    foreignKey: "provider_type_uuid",
    sourceKey: "provider_type_uuid"
});


/* FARelations */
FARelations.hasOne(FunctionAssignments, {
    foreignKey: "function_assignment_uuid",
    sourceKey: "child_uuid",//parent to chlid
    as: "fa_child_data"
});
FARelations.hasOne(Organisations, {
    foreignKey: "function_assignment_uuid",
    sourceKey: "child_uuid",//child org
    as: "fa_child_org"
});
FARelations.hasOne(Organisations, {
    foreignKey: "function_assignment_uuid",
    sourceKey: "parent_uuid",//parent org
    as: "fa_parent_org"
});
FARelations.hasOne(FunctionAssignments, {
    foreignKey: "function_assignment_uuid",
    sourceKey: "parent_uuid",//child to parent
    as: "fa_parent_data"
});
FARelations.hasOne(AccountSubscriptions, {
    as: "provider_subs",
    sourceKey: "child_uuid",
    foreignKey: "provider_fa_uuid",
});
// FARelations.hasMany(ComplianceDocs, {
//     as: "clientCompDoc",
//     sourceKey: "parent_uuid",//client
//     foreignKey: "function_assignment_uuid",//client 
//     constraints: false,
//     allowNull: true,
//     defaultValue: null,

// });

/* Users */
Users.hasOne(Individuals, {
    foreignKey: "individual_uuid",
    sourceKey: "individual_uuid"

});
Users.hasOne(RoleAssignments, {
    as: "role_assign",
    foreignKey: "user_uuid"
});
// Users.hasOne(Invite, {
//     as: "invite_user",
//     foreignKey: "user_uuid"
// });

Users.hasMany(FAUserPermissions, {
    as: "user_perms",
    foreignKey: "user_uuid"

});
Users.hasOne(FAUserPermissions, {
    as: "userPerm",
    foreignKey: "user_uuid"

});

/* Notes */
Notes.hasOne(Users, {
    as: "note_createdby",
    foreignKey: "user_uuid",
    sourceKey: "created_by"
});
Notes.hasMany(NotesAttachments, {
    as: "note_attachs",
    foreignKey: "note_uuid",

});
/* Permissions */
FAUserPermissions.belongsTo(FunctionAssignments, {
    as: "user_perm_fa",
    foreignKey: "function_assignment_uuid",
    sourceKey: "function_assignment_uuid"
});
FAUserPermissions.hasOne(Users, {
    as: "fa_user_perm",
    foreignKey: "user_uuid",
    sourceKey: "user_uuid"
});

/* MasterSettings */
MasterSettings.hasOne(Users, {
    as: "user_created",
    foreignKey: "user_uuid",
    sourceKey: "created_by"

});
/* DocumentTypes */
// DocumentTypes.hasOne(ComplianceDocs, {
//     as: "doctypeCompliance",
//     foreignKey: "document_type_uuid",


// });
DocumentTypes.hasOne(Documents, {
    as: "doctypeDocument",
    foreignKey: "document_type_uuid"

});

/* ProivderTypes  */
ProivderTypes.hasOne(Individuals, {
    as: "providerCreatedBy",
    sourceKey: "created_by",
    foreignKey: "user_uuid"

});
ProivderTypes.hasMany(ProviderTypeLogs, {
    as: "ProviderLogs",
    foreignKey: "provider_type_uuid"

});

/* ProviderTypeLogs */
ProviderTypeLogs.hasOne(Individuals, {
    as: "proLogCreatedBy",
    sourceKey: "created_by",
    foreignKey: "user_uuid"

});


/* SiteInductions */
SiteInductions.hasOne(Sites, {
    foreignKey: "site_uuid",
    sourceKey: "site_uuid"
});
SiteInductions.hasMany(SiteIndModule, {
    foreignKey: "site_induction_uuid"
});

SiteInductions.hasMany(SiteIndDocTypes, {
    foreignKey: "site_induction_uuid"
});
SiteInductions.hasMany(SiteIndIndustry, {
    foreignKey: "site_induction_uuid"
});
SiteInductions.hasOne(WorkerSiteInd, {
    as: "siteIndWorker",
    foreignKey: "site_induction_uuid",

});

/* SiteIndIndustry */
SiteIndIndustry.hasOne(MasterSettings, {
    sourceKey: "master_setting_uuid",
    foreignKey: "master_setting_uuid"
});

/* Sites */
Sites.hasMany(SiteInductions, {
    as: "siteInd",
    foreignKey: "site_uuid",
    sourceKey: "site_uuid"

});
Sites.hasOne(FunctionAssignments, {
    foreignKey: "function_assignment_uuid",
    sourceKey: "function_assignment_uuid"

});
Sites.hasOne(States, {
    as: "site_state",
    foreignKey: "state_id",
    sourceKey: "state_id"

});
Sites.hasOne(Countries, {
    as: "site_country",
    foreignKey: "country_id",
    sourceKey: "country_id"

});

Sites.hasOne(WorkerTrainingSite, {
    as: "siteTraining",
    foreignKey: "site_uuid",

});
Sites.hasMany(ClientSiteContacts, {
    as: "siteContacts",
    foreignKey: "site_uuid",

});
/* ClientSiteContacts */
ClientSiteContacts.hasOne(Individuals, {
    as: "siteContIndi",
    sourceKey: 'individual_uuid',
    foreignKey: 'individual_uuid'

});
/* WorkerTrainingSite */
WorkerTrainingSite.hasOne(Workers, {
    as: "siteInductee",
    sourceKey: "worker_uuid",
    foreignKey: "worker_uuid"

});

/* SiteIndDocTypes */
SiteIndDocTypes.hasOne(DocumentTypes, {
    foreignKey: "document_type_uuid",
    sourceKey: "document_type_uuid",
    constraints: false,
    allowNull: true,
    defaultValue: null,
});

/*SiteInductionModule  */
SiteIndModule.hasOne(Modules, {
    as: "module_data",
    foreignKey: "module_uuid",
    sourceKey: "module_uuid",

});
SiteIndModule.hasOne(ModuleQuestions, {
    as: "site_ind_ques",
    foreignKey: "module_uuid",
    sourceKey: "module_uuid",

});

/* Modules  */
Modules.hasMany(ModuleQuestions, {
    as: "module_ques_data",
    foreignKey: "module_uuid",

});
Modules.hasOne(WorkerModuleAttempt, {
    as: "ModuleAttempt",
    foreignKey: "module_uuid"
})

/* ModuleQuestions */
ModuleQuestions.hasMany(ModuleAnswers, {
    as: "ques_ans_data",
    foreignKey: "module_question_uuid",
    hooks: true
});
ModuleQuestions.hasOne(WorkerQuesAttempt, {
    as: "QuesAttempt",
    foreignKey: "module_question_uuid",

});

/* CompanyInductions */
CompanyInductions.belongsToMany(Modules, {
    through: CompanyInductionModule,
    as: 'company_ind_modules',
    constraints: false,
    allowNull: true,
    defaultValue: null,
    foreignKey: 'company_induction_uuid',
    otherKey: 'module_uuid'
});
CompanyInductions.hasMany(CompanyInductionModule, {
    foreignKey: "company_induction_uuid"

});
CompanyInductions.hasOne(Organisations, {
    as: 'CompIndOrg',
    sourceKey: 'function_assignment_uuid',
    foreignKey: "function_assignment_uuid"//client

});
CompanyInductions.hasOne(WorkerCompanyInd, {
    as: 'workerCompInd',
    sourceKey: 'company_induction_uuid',
    foreignKey: "company_induction_uuid"

});
CompanyInductions.hasOne(WorkerCompanyInd, {
    as: 'wrkrCI',
    sourceKey: 'company_induction_uuid',
    foreignKey: "company_induction_uuid"

});



/* CompanyInductionModule */
CompanyInductionModule.hasMany(ModuleQuestions, {
    as: "CompIndQues",
    sourceKey: "module_uuid",
    foreignKey: "module_uuid"

});
CompanyInductionModule.hasMany(Modules, {
    as: "compIndModules",
    sourceKey: "module_uuid",
    foreignKey: "module_uuid"
});

/* Invite */
Invite.hasMany(Individuals, {
    foreignKey: "individual_uuid",
    sourceKey: "individual_uuid",
    constraints: false,
    allowNull: true,
    defaultValue: null,

});
Invite.hasOne(Individuals, {
    as: "invite_individual",
    foreignKey: "individual_uuid",
    sourceKey: "individual_uuid",
});
Invite.hasOne(Users, {

    foreignKey: "user_uuid",
    sourceKey: "user_uuid",
    constraints: false,
    allowNull: true,
    defaultValue: null,

});
Invite.hasOne(Users, {
    as: "invited_by",
    foreignKey: "user_uuid",
    sourceKey: "created_by",
    constraints: false,
    allowNull: true,
    defaultValue: null,

});
Invite.hasOne(Roles, {
    as: "invite_role",
    foreignKey: "role_uuid",
    sourceKey: "role_uuid"
});
Invite.hasOne(FunctionAssignments, {
    as: "invite_fun_assign",
    foreignKey: "function_assignment_uuid",
    sourceKey: "function_assignment_uuid"
});

Invite.belongsToMany(Organisations, {
    through: InviteWorkerClientAssign,
    as: 'inviteWorkerClients',
    foreignKey: 'invite_uuid',
    otherKey: 'client_org_uuid',
    targetKey: 'organisation_uuid',
    constraints: false,
    allowNull: true,
    defaultValue: null,

});
/* RoleAssignments */
RoleAssignments.hasOne(Roles, {
    as: "role",
    foreignKey: "role_uuid",
    sourceKey: "role_uuid"
});
/* Roles */
Roles.belongsToMany(Users, {
    through: RoleAssignments,
    as: "roleAssigns",
    foreignKey: "role_uuid",
    otherKey: 'user_uuid',
    constraints: false,
    allowNull: true,
    defaultValue: null,
});

/* ChecklistDocs */
ChecklistDocs.hasOne(DocumentTypes, {
    foreignKey: "document_type_uuid",
    sourceKey: "document_type_uuid",
    constraints: false,
    allowNull: true,
    defaultValue: null,

});

// ComplianceDocs.hasOne(Organisations, {
//     as: "compDocOrg",
//     sourceKey: "function_assignment_uuid",
//     foreignKey: "function_assignment_uuid",
// });


ChecklistDocs.hasOne(ProviderDocApproval, {
    as: "DocAppr",
    foreignKey: "checklist_doc_uuid",
});
ChecklistDocs.hasOne(WorkerDocApproval, {
    as: "workerDocAppr",
    foreignKey: "checklist_doc_uuid",
});
ChecklistDocs.hasOne(WorkerDocApproval, {
    as: "WDA",
    foreignKey: "checklist_doc_uuid",
});
/* ComplianceChecklist  */
ComplianceChecklist.hasMany(ChecklistDocs, {
    as: "compDocs",
    sourceKey: "checklist_uuid",
    foreignKey: "checklist_uuid",
});
ComplianceChecklist.hasOne(ProviderChecklistAssign, {
    as: "compAssigns",
    sourceKey: "checklist_uuid",
    foreignKey: "checklist_uuid",
});


/* ProviderChecklistAssign */
ProviderChecklistAssign.hasMany(ChecklistDocs, {
    as: "ProvCheckDoc",
    sourceKey: "checklist_uuid",
    foreignKey: "checklist_uuid"
})
/* Emails */
Emails.hasOne(EmailTemplates, {
    foreignKey: "email_template_uuid",
    sourceKey: "email_template_uuid",
    constraints: false,
    allowNull: true,
    defaultValue: null,
});
Emails.hasOne(Users, {
    foreignKey: 'user_uuid',
    sourceKey: 'created_by'
});

Emails.hasOne(Individuals, {
    sourceKey: 'created_by',
    foreignKey: 'user_uuid',
});


/* EmailTemplates */
EmailTemplates.hasOne(Users, {
    foreignKey: 'user_uuid',
    sourceKey: 'created_by'
});
EmailTemplates.hasOne(Users, {
    as: 'deletedBy',
    foreignKey: 'user_uuid',
    sourceKey: 'deleted_by',
});
EmailTemplates.hasMany(EmailTempAttachments, {
    foreignKey: "email_template_uuid",
    as: "email_temp_attach"
});

/* Documents */
Documents.hasOne(DocumentTypes, {
    as: "document_type",
    foreignKey: "document_type_uuid",
    sourceKey: "document_type_uuid",
    constraints: false,
    allowNull: true,
    defaultValue: null,
});

Documents.hasMany(DocHistory, {
    as: "doc_history",
    foreignKey: "document_uuid"
});
Documents.hasMany(ProviderDocApproval, {
    as: "DocApprovals",
    foreignKey: "document_uuid"
});

// Documents.hasMany(ProviderDocApproval, {
//     as: "DocApprov",
//     foreignKey: "document_uuid"
// });

Documents.hasMany(WorkerDocApproval, {
    as: "DocsApprovWorker",
    foreignKey: "document_uuid"
});


/* ProviderDocApproval */
ProviderDocApproval.hasOne(Documents, {
    as: "provApprDoc",
    sourceKey: "document_uuid",
    foreignKey: "document_uuid"
});

ProviderDocApproval.hasOne(Organisations, {
    as: "provApprClient",
    sourceKey: "client_org_uuid",
    foreignKey: "organisation_uuid"
});

/* WorkerDocApproval */
WorkerDocApproval.hasOne(Documents, {
    as: "workerApprDoc",
    sourceKey: "document_uuid",
    foreignKey: "document_uuid"
});
WorkerDocApproval.hasOne(Organisations, {
    as: "WorkerDocApprClient",
    sourceKey: "client_org_uuid",
    foreignKey: "organisation_uuid"
});
/* WorkerSiteAccess */
WorkerSiteAccess.hasOne(Organisations, {
    as: "WorkerSiteClient",
    sourceKey: "client_org_uuid",
    foreignKey: "organisation_uuid"

});
WorkerSiteAccess.hasOne(Workers, {
    as: "SiteAccessWorker",
    sourceKey: "worker_uuid",
    foreignKey: "worker_uuid"

});

WorkerSiteAccess.hasOne(Sites, {
    as: "WorkerSite",
    sourceKey: "site_uuid",
    foreignKey: "site_uuid"

});
WorkerSiteAccess.hasOne(Individuals, {
    as: "WorkerSiteIndi",
    sourceKey: "individual_uuid",
    foreignKey: "individual_uuid"

});

/* InviteProvider */
InviteProvider.hasOne(FunctionAssignments, {
    as: "provInviteClient",
    foreignKey: "function_assignment_uuid",
    sourceKey: "client_fa_uuid",//invited against client

});
InviteProvider.hasOne(Individuals, {
    as: "invitedProvider",
    foreignKey: "individual_uuid",
    sourceKey: "individual_uuid",

});
InviteProvider.hasOne(ProivderTypes, {
    as: "invitedProviderType",
    foreignKey: "provider_type_uuid",
    sourceKey: "provider_type_uuid",

});
InviteProvider.hasOne(Organisations, {
    as: "invitedProviderOrg",//existing invited provider
    foreignKey: "function_assignment_uuid",
    sourceKey: "provider_fa_uuid",

});
InviteProvider.hasMany(InviteAttach, {
    as: "provInviteAttach",
    foreignKey: "invite_provider_uuid"

});
InviteProvider.hasOne(Individuals, {
    as: "provInvitedBy",
    sourceKey: "created_by",
    foreignKey: "user_uuid"

});
InviteProvider.hasOne(Individuals, {
    as: "ProvInvitedBy",
    foreignKey: "user_uuid",
    sourceKey: "created_by",
    constraints: false,
    allowNull: true,
    defaultValue: null,

});
/* InviteProviderCompliance */
InviteProviderCompliance.hasMany(ChecklistDocs, {
    as: "inviteProviComp",
    sourceKey: 'checklist_uuid',
    foreignKey: 'checklist_uuid'

});

/* Countries */
Countries.hasMany(States, {
    foreignKey: "country_id",
});

module.exports = {

    States,
    Countries,
    Organisations,
    Individuals,
    Users,
    ProviderOrgDetails,
    ProviderTempRegis,
    FunctionMainUsers,

    ProviderClientContact,

    MasterSettings,

    Addresses,
    OrgAddresses,
    IndividualOrg,

    Functions,
    FunctionAssignments,
    FARelations,

    ContactTypes,

    AccountSubscriptions,
    AccountInvoices,

    Sites,
    ClientSiteContacts,
    Notes,
    NotesAttachments,

    DocumentTypes,
    ProivderTypes,
    ProviderTypeLogs,
    Documents,
    DocHistory,
    OrgDocuments,
    IndividualDocuments,
    ProviderDocApproval,

    CompanyInductions,
    SiteInductions,
    SiteIndIndustry,
    SiteIndDocTypes,
    SiteIndModule,
    WorkerSiteInd,

    Modules,
    ModuleQuestions,
    ModuleAnswers,
    WorkerQuesAttempt,
    WorkerModuleAttempt,
    CompanyInductionModule,

    InviteProvider,
    InviteAttach,
    InviteProviderCompliance,
    Invite,
    InviteWorkerClientAssign,

    RoleAssignments,
    ClientDetails,
    ComplianceChecklist,
    ChecklistDocs,
    ProviderChecklistAssign,

    Emails,
    EmailTemplates,
    EmailTempAttachments,
    LoginHistory,

    FAUserPermissions,
    WorkerChecklistAssign,
    WorkerType,
    Workers,
    WorkerAssign,
    WorkerTrainingSite,
    WorkerDocApproval,
    WorkerSiteAccess,
    WorkerCompanyInd

};
