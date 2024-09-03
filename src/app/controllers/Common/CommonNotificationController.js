const Sq = require("sequelize");
const notifications = require("../../../models/common/Notifications");
const NotificationReadReceipt = require("../../../models/common/NotifcationsReadReceipt");
const { GETSUCCESS, SUCCESS } = require("../../../constants/ResponseConstants");
const { Sequelize, Op } = require("sequelize");
const sequelize = require("../../../config/DbConfig");

const GetCommonNotifications = async (req, res, next) => {
    let { role_name, userUuid, organisation } = req.query;
    let { limit } = req.query;
    // console.log("roomName:", roomName);
    limit = limit ? limit : 10;
    if (organisation) {
        role_name = organisation;
    }
    let where_data ={}
    if(userUuid){
      where_data ={
        ...where_data,
        user_uuid:userUuid
      }
    }

    if(organisation){
       let org_uuid = organisation.split('_')[1]
       where_data ={
        ...where_data,
        organisation_uuid:org_uuid
       }
    }
    try {
        const queryOptions = {
            where: {
                [Op.and]: [
                     {
                    [Op.or]: [
                        {
                            rooms: {
                                [Op.contains]: [role_name] // Fetch notifications for the specified room
                            }
                        },
                        {
                            ...where_data // Additional conditions dynamically added
                        }
                    ],
                },
                    {
                        is_notification: true, // Additional condition for is_task
                    },
                ],
            },
        };
        let innerWhere = {};
        if (userUuid) {
            innerWhere.user_uuid = userUuid; // Filter by user UUID if provided
        }
        const notificationsRes = await notifications.findAndCountAll({
            ...queryOptions,
            attributes: [
                "notification_uuid",
                "message",
                "created_date",
                [
                    Sq.literal(
                        '(SELECT "is_read" FROM "common"."notification_read_receipt" WHERE "notification_uuid" = "notifications"."notification_uuid" AND "user_uuid" = :userUuid LIMIT 1)'
                    ),
                    "is_read",
                ],
          
            ],
            replacements: { userUuid: userUuid }, // Pass the userUuid for the subquery

            include: [
                {
                    model: NotificationReadReceipt,
                    as: "notification_read_status",
                    attributes: [],
                    where: innerWhere,
                    required: false, // Optional join
                },
            ],
            limit: limit,
            order: [["created_date", "desc"]],
        });
        // Use raw SQL to get the count of is_read statuses directly
        const countQuery = `
             SELECT 
                 COUNT(CASE WHEN "is_read" = TRUE THEN 1 END) AS count_is_read_true,
                 COUNT(CASE WHEN "is_read" IS NULL THEN 1 END) AS count_is_read_null
             FROM (
                 SELECT 
                     (SELECT "is_read" 
                      FROM "common"."notification_read_receipt" 
                      WHERE "notification_uuid" = "notifications"."notification_uuid" 
                        AND "user_uuid" = ${sequelize.escape(userUuid)} 
                      LIMIT 1) AS "is_read"
                 FROM "common"."notifications" AS "notifications"
                 WHERE "rooms" @> ARRAY[${sequelize.escape(
            role_name
        )}]::VARCHAR(255)[]
             ) AS "subquery"
         `;

        // Execute the count query
        const countResults = await sequelize.query(countQuery, {
            type: Sequelize.QueryTypes.SELECT,
            logging: false,
        });

        // Extract counts from the results
        const [counts] = countResults;
        const countIsReadTrue = parseInt(counts.count_is_read_true, 10) || 0;
        const countIsReadNull = parseInt(counts.count_is_read_null, 10) || 0;
        let data = {
            count: notificationsRes.count,
            rows: notificationsRes.rows,
            readCount: countIsReadTrue,
            unreadCount: countIsReadNull,
        };
        return GETSUCCESS(res, data, "Get All notifications successfully!");
        // const notificationss = await notifications.findAndCountAll(queryOptions);
        // return res.json(notificationss); // Return the notifications as JSON response
    } catch (error) {
        console.error("Error fetching notifications:", error);
        next(error);
    }
};


const GetAllDeshboardTasks = async (req, res, next) => {
    const {userUuid, is_archived, organisation, search,dashboardType} =req.query;
    let {role_name} =req.query
    let { limit } = req.query;
    limit = limit ? parseInt(limit, 10): 10; // Ensure limit is a number

    
    if (organisation && role_name) {
        role_name = organisation;
    }

    let where_data = {};

    if(dashboardType){
        where_data = {
      ...where_data,
         task_assgined: {
            [Op.contains]: [dashboardType], // Fetch notifications for the specified room
        },
    }
}

    if (search) {
        where_data = {
            ...where_data,
            [Sq.Op.or]: [
                {
                    trading_name: {
                        [Sq.Op.iLike]: `%${search}%`,
                    },
                },
                {
                    message: {
                        [Sq.Op.iLike]: `%${search}%`,
                    },
                },
            ],
        };
    }

    try {
        // Base query options
        const queryOptions = {
            where: {
                [Op.and]: [
                    {
                        rooms: {
                            [Op.contains]: [role_name], // Fetch notifications for the specified room
                        },
                    },
                    {
                        is_task: true, // Additional condition for is_task
                    },
                ],
                ...where_data,
            },
            attributes: [
                "notification_uuid",
                "message",
                "trading_name",
                "created_date",
                [
                    Sq.literal(
                        '(SELECT "task_read" FROM "common"."notification_read_receipt" WHERE "notification_uuid" = "notifications"."notification_uuid" AND "user_uuid" = :userUuid LIMIT 1)'
                    ),
                    "task_read",
                ],
                [
                    Sq.literal(`
                        COALESCE(
                            (SELECT "is_archived"
                             FROM "common"."notification_read_receipt"
                             WHERE "notification_uuid" = "notifications"."notification_uuid"
                               AND "user_uuid" = :userUuid
                             LIMIT 1),
                            false
                        )
                    `),
                    "is_archived",
                ],
            ],
            replacements: { userUuid: userUuid }, // Pass the userUuid for the subquery
            include: [
                {
                    model: NotificationReadReceipt,
                    as: "notification_read_status",
                    attributes: [],
                    where: {
                        ...(userUuid ? { user_uuid: userUuid } : {}), // Conditionally filter by user UUID
                    },
                    required: false, // Optional join
                },
            ],
            limit: limit,
            order: [["created_date", "desc"]],
            logging: false,
        };

        // Apply the is_archived filter if provided
        if (is_archived !== undefined) {
            // Convert is_archived to boolean for accurate filtering
            const isArchivedBool = is_archived === "true";
            queryOptions.where[Op.and].push(
                Sq.literal(`
                    COALESCE(
                        (SELECT "is_archived"
                         FROM "common"."notification_read_receipt"
                         WHERE "notification_uuid" = "notifications"."notification_uuid"
                           AND "user_uuid" = :userUuid
                         LIMIT 1),
                        false
                    ) = :isArchived
                `)
            );
            queryOptions.replacements = {
                ...queryOptions.replacements,
                isArchived: isArchivedBool,
            };
        }
        // Fetch notifications with the updated query options
        const notificationsRes = await notifications.findAndCountAll(queryOptions);

 
        const countQuery = `
    SELECT 
        COUNT(CASE WHEN "task_read" = TRUE THEN 1 END) AS count_task_read_true,
        COUNT(CASE WHEN "task_read" = FALSE OR "task_read" IS NULL THEN 1 END) AS count_task_read_null
    FROM (
        SELECT 
            (
                SELECT "task_read" 
                FROM "common"."notification_read_receipt" 
                WHERE "notification_uuid" = "notifications"."notification_uuid"
                  AND "user_uuid" = ${sequelize.escape(userUuid)} 
                LIMIT 1
            ) AS "task_read"
        FROM "common"."notifications" AS "notifications"
        WHERE "rooms" @> ARRAY[${sequelize.escape(role_name)}]::VARCHAR(255)[]
          AND "is_task" = true 
    ) AS "subquery"
`;


        // Execute the count query
        const countResults = await sequelize.query(countQuery, {
            type: Sequelize.QueryTypes.SELECT,
            logging: false,
        });
 
        // Extract counts from the results
        const [counts] = countResults;
        const countIsReadTrue = parseInt(counts.count_task_read_true, 10) || 0;
        const countIsReadNull = parseInt(counts.count_task_read_null, 10) || 0;
        let data = {
            count: notificationsRes.count,
            rows: notificationsRes.rows,
            readCount: countIsReadTrue,
            unreadCount: countIsReadNull,
        };
        return GETSUCCESS(res, data, "Get All notifications successfully!");
    } catch (error) {
        console.error("Error fetching notifications:", error);
        console.log("Error fetching notifications");
        next(error);
    }
};



const UpdateTaskArchiveStatus = async (req, res, next) => {
    const { notification_uuid, is_archived, userUuid,dashboardType,role_name} = req.body;
    console.log("Received UUID:", notification_uuid);

      // Set dashboard-specific fields based on dashboardType
      let updateFields={}
      if (role_name === "support team" || role_name === "client service team" || role_name === "super admin") {
      switch (dashboardType) {
        case 'adminClient':
            updateFields.task_archived_client_dashboard = is_archived;
            break;
        case 'adminProvider':
            updateFields.task_archived_provider_dashboard = is_archived;
            break;
        case 'adminWorker':
            updateFields.task_archived_worker_dashboard = is_archived;
            break;
        default:
            return res.status(400).json({ error: 'Invalid dashboard type' });
    }
}

    try {
        await NotificationReadReceipt.upsert({
            notification_uuid: notification_uuid, // Ensure this is a UUID
            user_uuid: userUuid,
            is_read: true,
            is_archived,
            ...updateFields
        });

        SUCCESS(
            res,
            is_archived
                ? `Task marked archived successfully!`
                : `Task marked Unarchived successfully!`
        );
    } catch (error) {
        console.error("Error marking archived and unarchied the task:", error);
        next(error);
    }
};



const MarkNotificationAsRead = async (req, res, next) => {
    const { notification_uuid, is_archived, userUuid } = req.body;
    console.log("Received UUID:", notification_uuid);
    try {
        await NotificationReadReceipt.upsert({
            notification_uuid: notification_uuid, // Ensure this is a UUID
            user_uuid: userUuid,
            is_read: true,
            is_archived,
        });

        console.log(
            is_archived
                ? `task marked archived by user`
                : `task marked Un -archived by user`
        );
    } catch (error) {
        console.error("Error marking archived and unarchied the task:", error);
        next(error);
    }
};



const MarkTaskAsRead = async (req, res, next) => {
    const { notification_uuid, task_read, userUuid,dashboardType,role_name } = req.body;
      // Set dashboard-specific fields based on dashboardType
      let updateFields={}
      if (role_name === "support team" || role_name === "client service team" || role_name === "super admin") {
      switch (dashboardType) {
        case 'amdinClient':
            updateFields.task_read_client_dashboard = task_read;
            break;
        case 'amdinProvider':
            updateFields.task_read_provider_dashboard = task_read;
            break;
        case 'adminWorker':
            updateFields.task_read_worker_dashboard = task_read;
            break;
        default:
            return res.status(400).json({ error: 'Invalid dashboard type' });
    }
}
    console.log("updateFields",updateFields)
    try {
        await NotificationReadReceipt.upsert({
            notification_uuid: notification_uuid, // Ensure this is a UUID
            user_uuid: userUuid,
            task_read,
            ...updateFields
        });
        SUCCESS(res, `Task read successfully!`);
    } catch (error) {
        console.error("Error marking archived and unarchied the task:", error);
        next(error);
    }
};



//api's for 
     //client section 
     //provider section && 
     //worker section for get the
const GetNotificationTasksForAdminPortal = async (req, res, next) => {
    const { userUuid, is_archived, search, dashboardType, organisation } = req.query;
    let { role_name, limit } = req.query;
    limit = limit ? parseInt(limit, 10) : 10; // Ensure limit is a number

    // Validate and set dashboard-specific fields
    const taskReadField = {
        client: "task_read_client_dashboard",
        provider: "task_read_provider_dashboard",
        worker: "task_read_worker_dashboard",
    }[dashboardType];

    const taskArchivedField = {
        client: "task_archived_client_dashboard",
        provider: "task_archived_provider_dashboard",
        worker: "task_archived_worker_dashboard",
    }[dashboardType];

    if (!taskReadField || !taskArchivedField) {
        return res.status(400).json({ error: 'Invalid dashboard type' });
    }

    // Default value for role_name if organisation is present
    if (organisation) {
        role_name = organisation;
    }

    // Build where clause dynamically based on query parameters
    const whereConditions = {
        rooms: {
            [Op.contains]: [role_name], // Fetch notifications for the specified room
        },
        is_task: true, // Additional condition for is_task
    };

    if (search) {
        whereConditions[Op.or] = [
            { trading_name: { [Op.iLike]: `%${search}%` } },
            { message: { [Op.iLike]: `%${search}%` } },
        ];
    }

    if (userUuid) {
        whereConditions[Op.and] = [
            ...(whereConditions[Op.and] || []),
            {
                task_assgined: {
                    [Op.contains]: [dashboardType], // Fetch notifications for the specified dashboard type
                },
            },
        ];
    }

    try {
        // Query options for finding notifications
        const queryOptions = {
            where: whereConditions,
            attributes: [
                "notification_uuid",
                "message",
                "trading_name",
                "created_date",
                [
                    Sequelize.literal(
                        `(SELECT "${taskReadField}" FROM "common"."notification_read_receipt" WHERE "notification_uuid" = "notifications"."notification_uuid" AND "user_uuid" = :userUuid LIMIT 1)`
                    ),
                    "task_read",
                ],
                                  [
                        Sq.literal(`
                            COALESCE(
                                (SELECT "${taskArchivedField}"
                                 FROM "common"."notification_read_receipt"
                                 WHERE "notification_uuid" = "notifications"."notification_uuid"
                                   AND "user_uuid" = :userUuid
                                 LIMIT 1),
                                false
                            )
                        `),
                        "is_archived",
                    ],
            ],
            replacements: { userUuid },
            include: [
                {
                    model: NotificationReadReceipt,
                    as: "notification_read_status",
                    attributes: [],
                    where: userUuid ? { user_uuid: userUuid } : {},
                    required: false,
                },
            ],
            limit,
            order: [["created_date", "desc"]],
            logging: false,
        };

               // Apply the is_archived filter if provided
               if (is_archived !== undefined) {
                // Convert is_archived to boolean for accurate filtering
                const isArchivedBool = is_archived === "true";
                queryOptions.where[Op.and].push(
                    Sq.literal(`
                        COALESCE(
                            (SELECT "${taskArchivedField}"
                             FROM "common"."notification_read_receipt"
                             WHERE "notification_uuid" = "notifications"."notification_uuid"
                               AND "user_uuid" = :userUuid
                             LIMIT 1),
                            false
                        ) = :isArchived
                    `)
                );
                queryOptions.replacements = {
                    ...queryOptions.replacements,
                    isArchived: isArchivedBool,
                };
            }

        // Fetch notifications with the updated query options
        const notificationsRes = await notifications.findAndCountAll(queryOptions);

        const countQuery = `
        SELECT 
            COUNT(CASE WHEN "${taskReadField}" = TRUE THEN 1 END) AS count_task_read_true,
            COUNT(CASE WHEN "${taskReadField}" = FALSE OR "${taskReadField}" IS NULL THEN 1 END) AS count_task_read_null
        FROM (
            SELECT 
                (
                    SELECT "${taskReadField}"
                    FROM "common"."notification_read_receipt" 
                    WHERE "notification_uuid" = "notifications"."notification_uuid"
                      AND "user_uuid" = ${sequelize.escape(userUuid)} 
                    LIMIT 1
                ) AS "${taskReadField}"
            FROM "common"."notifications" AS "notifications"
            WHERE "rooms" @> ARRAY[${sequelize.escape(role_name)}]::VARCHAR(255)[]
            AND "is_task" = true  AND "task_assgined" @> ARRAY[${sequelize.escape(dashboardType)}]::VARCHAR(255)[]
        ) AS "subquery"
    `;



    
            // Execute the count query
            const countResults = await sequelize.query(countQuery, {
                type: Sequelize.QueryTypes.SELECT,
                logging: false,
            });
    
    

        // // Extract counts from the results
        const [counts] = countResults;
        const countTaskReadTrue = parseInt(counts.count_task_read_true, 10) || 0;
        const countTaskReadNull = parseInt(counts.count_task_read_null, 10) || 0;

        // Prepare response data
        const responseData = {
            count: notificationsRes.count,
            rows: notificationsRes.rows,
            readCount: countTaskReadTrue,
            unreadCount: countTaskReadNull,
        };

        GETSUCCESS(res,responseData,"Get all tasks notifications successfully!")

    } catch (error) {
        console.error("Error fetching notifications:", error);
        return next(error);
    }
};

// module.exports = { GetProviderDashboardTasks };

    
module.exports = {
    GetCommonNotifications,
    GetAllDeshboardTasks,
    UpdateTaskArchiveStatus,
    MarkNotificationAsRead,
    MarkTaskAsRead,
    //admin protal spreate 
    GetNotificationTasksForAdminPortal
};
