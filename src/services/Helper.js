const aws = require('aws-sdk');
const Sq = require("sequelize");
const s3 = new aws.S3();
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');
const fs = require("fs");
const path = require("path");
const upload_folderpath = "uploads/";
const { Individuals, IndividualOrg, Users } = require("../models/common/");
const { Roles } = require("../models/public/");

(() => {
    /*** this function will create 'temp upload' folder if it doesn't exists already */
    fs.access(upload_folderpath, function (error) {
        if (error) {
            /*** folder doesn't exists, creating now. */
            fs.mkdir(upload_folderpath, (error) => {
                if (error) {
                    return console.error(error);
                };
                console.log("Directory created successfully!");
            });
        };
    });
})();

const commonAttributes = ["created_by", "updated_by", "deleted_by",
    "created_date", "updated_date", "deleted_date"];

const deleteFolder = async (folderPath) => {
    fs.rm(folderPath, { recursive: true }, (error) => {
        if (error) {
            console.error('Error:', error);
        } else {
            console.log('Folder deleted successfully');
        }
    });
};
//not deleting work
// const deleteS3BucketFile = (fileBasename) => {
//     return new Promise((resolve, reject) => {
//         s3.deleteObject({ Bucket: process.env.BUCKET_NAME, Key: fileBasename }, (err, data) => {
//             if (err) {
//                 console.log(err);
//                 reject(err); // Reject the Promise in case of an error.
//             } else {
//                 console.log("AWS file deleted successfully --------", data);
//                 resolve(data); // Resolve the Promise when the file is deleted successfully.
//             }
//         });
//     });
// };

const deleteS3BucketFile = (fileBasenames) => {
    return new Promise((resolve, reject) => {
        let objects;

        if (Array.isArray(fileBasenames)) {
            // Convert fileBasenames to an array of objects with Key property
            objects = fileBasenames.map((basename) => ({ Key: basename }));
        } else {
            // If fileBasenames is a string, convert it to an array with a single object
            objects = [{ Key: fileBasenames }];
        };
        const params = {
            Bucket: process.env.BUCKET_NAME,
            Delete: {
                Objects: objects,
                Quiet: false, // Set to true to suppress the response output
            },
        };
        s3.deleteObjects(params, (err, data) => {
            if (err) {
                console.error(err);
                reject(err); // Reject the Promise in case of an error.
            } else {
                console.log("AWS files deleted successfully --------", data.Deleted);
                resolve(data.Deleted); // Resolve the Promise when the files are deleted successfully.
            };
        });
    });
};

const unixToDate = async (unixDate) => {
    const date_ob = new Date(unixDate * 1000);
    const day = ("0" + date_ob.getDate()).slice(-2);
    const month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    const year = date_ob.getFullYear();
    return year + "-" + month + "-" + day;
};
const convert_key_array = (array_objects, object_key) => {
    let custom_array = {};
    for (let key in array_objects) {
        let array_object = array_objects[key];
        if (Array.isArray(array_object)) {
            let new_key = array_object[object_key];
            if (typeof custom_array[array_object[object_key]] === "undefined") {
                custom_array[new_key] = [];
            }
            custom_array[new_key].push(array_object);

        } else {
            custom_array[array_object[object_key]] = array_object;

        };
    };
    // console.log("----------------",custom_array)
    return custom_array;
};
const OrgindividualGetQuery = async (individualDetails) => {
    try {
        const { individual_uuid, organisation_uuid, is_user } = individualDetails
        const individualRes = await Individuals.findOne({
            where: { individual_uuid },
            attributes: ["individual_uuid", "first_name", "last_name", "email", "phone", "avatar",
                [Sq.col("org_ind.job_title"), "job_title"],
                [Sq.col("org_ind.organisation_uuid"), "organisation_uuid"],
                [Sq.col("org_ind.is_client_site_contact"), "is_client_site_contact"]
            ],
            include: {//job_title users org wise 
                model: IndividualOrg, as: "org_ind",
                required: false,
                where: { organisation_uuid, is_user }, attributes: []
            }
        });
        // if (!individualRes) {
        //     throw new Error("Individual not found");
        // };
        return individualRes;
    } catch (error) {
        throw error;
    };
};
const CommonGetIndividualQuery = async (details) => {
    try {
        const { individual_uuid, search } = details;

        const individualRes = await Individuals.findAll({
            where: {
                is_conserve_team: false,
                individual_uuid: { [Sq.Op.ne]: individual_uuid },
                [Sq.Op.or]: [
                    Sq.where(Sq.col("email"), { [Sq.Op.iLike]: `%${search}%` }),
                ],
            },
            attributes: ["individual_uuid", "user_uuid", "first_name", "last_name", "email", "phone", "is_conserve_team"],
        });
        return individualRes;

    } catch (error) {
        console.log(error);
        throw error;
    };
};
const GeneratePdfRangePages = async (pdfDetails) => {
    return new Promise(async (resolve, reject) => {
        const maxRetries = 3; // Set the maximum number of retries
        let retryCount = 0;

        const downloadPdf = async () => {
            try {
                let { content_info, startPage, endPage } = pdfDetails;

                content_info = decodeURIComponent(content_info);

                // Download the PDF from the URL
                const { data } = await axios.get(content_info, {
                    responseType: 'arraybuffer', timeout: 30000, headers: {
                        'Accept': 'application/pdf',
                        'Accept-Encoding': 'identity'
                    },
                });

                // Load the PDF document
                const pdfDoc = await PDFDocument.load(data);

                const extractedDoc = await PDFDocument.create();

                for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
                    const [copiedPage] = await extractedDoc.copyPages(pdfDoc, [pageNum - 1]);
                    extractedDoc.addPage(copiedPage);
                };

                // Serialize the extracted PDF
                const pdfBytes = await extractedDoc.save();

                const folderName = `Temp-Module-Range-PDF` + Date.now(); // Format the date
                // New Folder path
                const uploadFolder = `uploads/${folderName}`;

                // Create the folder if it doesn't exist using fs.promises.mkdir
                await fs.promises.mkdir(uploadFolder, { recursive: true });

                // Create a writable stream to save the extracted PDF to a file within the folder
                const uploadPdfPath = path.join(uploadFolder, path.basename(content_info));
                const writeStream = fs.createWriteStream(uploadPdfPath);

                await writeStream.write(pdfBytes);
                writeStream.end();

                // Wait for the file to be saved and then resolve the Promise
                await writeStream.on('finish', () => {
                    console.log('PDF file created successfully');
                    resolve(uploadPdfPath);
                });

                await writeStream.on('error', (err) => {
                    console.error('Write stream error:', err);
                    // Handle the error, e.g., reject the Promise
                    reject(err);
                });

                // Delete the file and folder after seconds
                setTimeout(async () => {
                    deleteFolder(uploadFolder); // Delete the folder
                    console.log(`Temp PDF-Range file and folder (${folderName}) deleted successfully`);
                }, 15000);

            } catch (error) {
                console.error(error);
                if (error.code === 'EAI_AGAIN' && retryCount < maxRetries) {
                    // Retry the operation for DNS resolution error
                    retryCount++;
                    console.log(`Retrying pdf-Range operation. Retry count: ${retryCount}`);
                    await downloadPdf();
                } else {
                    // Reject the Promise if the maximum retries are reached or if it's not a DNS resolution error
                    reject(error);
                };
            };
        };
        // Start the initial download attempt
        downloadPdf();
    });
};

const supportTeamQuery = async () => {
    try {
        const supportTeamDetails = await Roles.findAll({
            where: { role_name: 'support team' },
            attributes: [[Sq.col('roleAssigns.individual.email'), 'email'],],
            // plain:true,
            include: {
                model: Users, as: "roleAssigns",
                through: { attributes: [] },
                attributes: [],
                required: true,
                include: { model: Individuals, attributes: [] },
                // attributes: ["role_assignment_uuid",],
            },
            raw: true
        });
        return supportTeamDetails;
    } catch (error) {
        console.log(error);
        throw error;
    };
};
//for primary user registration
const ProviderPrimaryUserPerm = {
    documents_view: true,
    documents_write: true,
    client_view: true,
    client_write: true,
    workers_view: true,
    workers_write: true,
    contacts_view: true,
    contacts_write: true,
    invoices_view: true,
    invoices_write: true,
    settings_view: true,
    settings_write: true,
    messages_view: true,
    messages_write: true
};


module.exports = {
    commonAttributes,
    deleteS3BucketFile,
    unixToDate,
    convert_key_array,
    OrgindividualGetQuery,
    CommonGetIndividualQuery,
    GeneratePdfRangePages,
    supportTeamQuery,
    ProviderPrimaryUserPerm

};