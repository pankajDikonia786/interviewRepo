const multer = require('multer');
const aws = require('aws-sdk');
const pdfLib = require('pdf-lib');
const multerS3 = require('multer-s3');

const s3 = new aws.S3();
//local storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./uploads");
    },
    filename: function (req, file, cb) {
        const split_mime = file.mimetype.split("/");
        const extension = typeof split_mime[1] !== "undefined" ? split_mime[1] : "jpeg";
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + "." + extension);
    },
});
//aws storage
aws.config.update({
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    region: process.env.REGION,
});

const multerS3Config = multerS3({
    bucket: process.env.BUCKET_NAME,
    s3,
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
        cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + "-" + file.originalname);
    },
});
//S3 bucket
const upload = multer({
    storage: multerS3Config,
    limits: { fileSize: 1024 * 1024 * 25 },
    acl: 'public-read',
    // fileFilter: imageFilter,
});

//upload local server 
const uploadLocal = multer({ storage: storage });

//Buffer
const storageMemo = multer.memoryStorage();
const uploadMemo = multer({ storage: storageMemo });


module.exports = {
    upload,
    uploadLocal,
    uploadMemo,
};
