
const { Individuals, Users,IndividualOrg} = require("../models/common")
const Notifications =require("../models/common/Notifications.js");
const NotificationReadReceipt =require("../models/common/NotifcationsReadReceipt.js")

const userSockets = {}; // Track user connections

module.exports.socketHandlers = (io) => {
    const superadminSockets = new Map();
    const supportTeamSockets =new Map();
    const clientserviceteam =new Map();
  
    io.on("connection", async (socket) => {
      console.log(`User ${socket.id} connected`);
      // Get user type and handle room joining
      const userType = socket.handshake.query.userType;
      const userUuid = socket.handshake.query.userUuid;
      const userRole = socket.handshake.query.userRole;
      const organisationUuid =socket.handshake.query.organisationUuid
      
      // sendNotificationPersonally("hay this notification for you personal health care please esure", userUuid, "options", userSockets);
      socket.userUuid=userUuid
    //connection track with socket
    if (userSockets[userUuid]) {
        userSockets[userUuid].disconnect(); // Disconnect the previous socket
    }
    // Store the current socket
    userSockets[userUuid] = socket
    socket.on('disconnect', () => {
        console.log(`User ${userUuid} disconnected`);
        delete userSockets[userUuid]; // Remove the socket from the tracking object
    });
    

     if(userType==="super admin"){
        superadminSockets.set(userUuid, socket.id);
        socket.join("super admin");
     } 

     const room = io.sockets.adapter.rooms.get("super admin");
     if (room) {
         console.log(`Room "roomName" exists with ${room.size} members.`);
     } else {
         console.log('Room "roomName" does not exist or is empty.');
     }
     

      if (userType === "support team") {
        supportTeamSockets.set(userUuid,socket.id)
        socket.join("support team");
      } 

      else if (userType === "client service team") {
        clientserviceteam.set(userUuid,socket.id)
        socket.join("client service team");
      } 


    socket.on("userLoggedIn", async (data) => {
        const organisationUuid = data.organisation_uuid;
        const userUuid = data.userUuid;
        console.log(organisationUuid, userUuid);
      
        if (organisationUuid && userUuid) {
          let where_obj = { organisation_uuid: organisationUuid, is_user: true };
      
          try {
            const individualOrgRes = await IndividualOrg.findAll({
              where: where_obj,
              include: {
                model: Individuals,
                as: "org_individual",
                attributes: ["individual_uuid", "first_name", "last_name", "email"],
                where: { is_conserve_team: false },
                include: {
                  model: Users,
                  as: "user_data",
                  attributes: ["user_uuid", "last_login"],
                },
              },
            });
      
            const user = individualOrgRes.find((org) => org.org_individual.user_data.user_uuid === userUuid);
            if (user) {
              const roomName = `org_${organisationUuid}`;
              console.log("Joining room:", roomName);
              socket.join(roomName);
              // let notificationData ={
              //   message:'You have a new notification',
              //   notification_uuid:"898484548578489547534987",
              //   created_date:"2024-08-21 12:04:53.843+00",
              //  }
              // io.to(roomName).emit('notification', {notificationData });
      
              const room = io.sockets.adapter.rooms.get(roomName);
              console.log(room)
            } else {
              console.log("User not found in the organization.");
            }
          } catch (error) {
            console.error("Error handling organization Notifications:", error);
            socket.emit("error", { message: "Error handling notification" });
          }
        }
      });
      
    socket.on('markNotificationAsRead', async (data) => {
        const { notification_uuid } = data;
        console.log("Received UUID:", notification_uuid);
    
        try {
            const userId = socket.userUuid; // Assuming user ID is available on socket
            console.log("User ID:", userId);
    
            await NotificationReadReceipt.upsert({
                notification_uuid: notification_uuid, // Ensure this is a UUID
                user_uuid: userId,
                is_read: true
            });
    
            console.log("Notification marked as read by user:", notification_uuid);
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    });
 
    });

  };
  

  module.exports.sendNotification =async(message, rooms,additionalData, options) => {
    try {
        console.log("Sending notification with message:", message);
        console.log("Target rooms:", rooms);
        if(options){
        var {is_task ,is_notification,organisation_uuid,trading_name,task_assgined} =options
        task_assgined =Array.isArray(task_assgined) ? task_assgined : [task_assgined];
        }
        // Ensure rooms is an array
          rooms = Array.isArray(rooms) ? rooms : [rooms];
     
        
            // Save notification to the database
            const notification = await Notifications.create({
                message,
                rooms,
                user_uuid: null, // Optional user_uuid,
                is_task,
                is_notification,
                organisation_uuid,
                trading_name,
                task_assgined,
            });
           let notificationData ={
            message,
            notification_uuid:notification.notification_uuid,
            created_date:notification.created_date,
           }

        rooms.forEach(room => {
            io.to(room).emit('notification', {notificationData}, (response) => {
                console.log(`Acknowledgment received for room ${room}:`, response);
            });
        });
    } 
    catch (error) {

        console.error("Error sending notification:", error);
    }
};




module.exports.sendNotificationPersonally =async(message,userUuid,options) => {
  try {
      console.log("Sending notification with message:", message);
      console.log("Target uerId:", userUuid);
      if(options){
      // var {is_task ,is_notification,trading_name,organisation_uuid} =options
      var {is_task ,is_notification,organisation_uuid,trading_name} =options
      }

          // Save notification to the database
          const notification = await Notifications.create({
              message,
              user_uuid:userUuid, // Optional user_uuid,
              is_task,
              is_notification,
              trading_name,
              organisation_uuid,
          });

         let notificationData ={
          message,
          notification_uuid:notification.notification_uuid,
          created_date:notification.created_date,
         }
         console.log(":::::::::::::::",userUuid)
         const targetSocket = userSockets[userUuid]
    
        if (targetSocket) {
          console.log("Emitting notification with data:", notificationData);
              // Emit the notification
              targetSocket.emit('notification', notificationData, (response) => {
                console.log('Acknowledgment received for notification:', response);
            });

      } else {
          console.log(`No active socket found for user ${userUuid}`);
      }
  } catch (error) {
      console.error("Error sending notification:", error);
  }
}


// // module.exports.
// const sendNotificationPersonally = async (message, userUuid, options) => {
//   // message ="ffbfnmbfvbmnfvmnbf",
//   // userUuid ="6e0f2c01-a41f-417e-b7de-6093c118182a"
// console.log(":::::::::userUuiduserUuiduserUuid::;;",userUuid)
//   try {
//     console.log("Sending notification with message:", message);
//     console.log("Target uerId:", userUuid);

//     if (options) {
//       var { is_task, is_notification, trading_name } = options;
//     }

//     // Save notification to the database
//     const notification = await Notifications.create({
//       message,
//       user_uuid: userUuid, // Optional user_uuid,
//       is_task,
//       is_notification,
//       trading_name,
//     });
// console.log("userSockets",userSockets)
//     let notificationData = {
//       message,
//       // notification_uuid: notification.notification_uuid,
//       // created_date: notification.created_date,
//     };

//     console.log(":::::::::::::::", userSockets);

//     const targetSocket = userSockets[userUuid];
//     console.log("Emitting notification with data:", targetSocket);

//     if (targetSocket) {
//       console.log("Emitting notification with data:", notificationData);

//       // Emit the notification
//       targetSocket.emit('notification', notificationData, (response) => {
//         console.log('Acknowledgment received for notification:', response);
//       });
//     } else {
//       console.log(`No active socket found for user ${userUuid}`);

//       // Handle the case where the socket is not found (e.g., retry sending later or store for later delivery)
//       // ...
//     }
//   } catch (error) {
//     console.error("Error sending notification:", error);

//     // Handle the error (e.g., log details, retry sending, or notify the user)
//     // ...
//   }
// };





       
 





