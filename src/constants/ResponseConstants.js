
const SUCCESS = (res, data) => {
    res.status(200).json({
        status: 200,
        success: true,
        data,

    });
};
const VERIFYEMAILSUCCESS = (res, data, msg) => {
    res.status(200).json({
        status: 200,
        success: true,
        data,
        msg

    });
};
const GETSUCCESS = (res, data, msg) => res.json({
    status: 200,
    success: true,
    data: data,
    msg: msg
});

const AUTHSUCCESS = (res, data, message) => res.status(200).json({
    success: true,
    data,
    message
});

const NOTFOUND = (res, msg) => res.status(404).json({
    success: false,
    message: msg,
});

const INVALIDRESPONSE = (res, msg) => res.status(404).json({

    success: false,
    message: msg,
});

const CUSTOMRESPONSE = (res, msg) => res.status(200).json({
    status: 200,
    success: true,
    message: msg,
});

const ALREADYEXISTREPONSE = (res, msg) => res.json({
    status: 409,
    success: false,
    message: msg,
});

const FORBIDDENRESPONSE = (res) => res.status(409).json({
    success: false,
    message: 'User is forbidden!',
});
const LINKEXPIREDRESPONSE = (res, msg) => res.status(400).json({
    success: false,
    message: msg,
});
const UNAUTHORISEDRESPONSE = (res, msg) => res.status(404).json({
    success: false,
    message: msg,
});

module.exports = {
    SUCCESS,
    GETSUCCESS,
    AUTHSUCCESS,
    NOTFOUND,
    VERIFYEMAILSUCCESS,
    CUSTOMRESPONSE,
    INVALIDRESPONSE,
    ALREADYEXISTREPONSE,
    FORBIDDENRESPONSE,
    LINKEXPIREDRESPONSE,
    UNAUTHORISEDRESPONSE
};
