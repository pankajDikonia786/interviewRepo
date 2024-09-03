const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");

const app = express();
const swaggerUi = require("swagger-ui-express");
const publicDir = require("path").join(__dirname, "public");
const swaggerDocument = require("./swagger/swagger.json");
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);
const io = new Server(server);
const { socketHandlers } = require('./src/app/controllers/Common/socketHandlers');
const {Notifications} =require("./models")
socketHandlers(io);

io.on("connection", (socket) => {
  console.log(":::::::::::::",socket)
// //   const userType = socket.handshake.query.userType; // Get userType from query params when connecting

//   if (userType === "superAdmin") {
//     socket.join("superAdmin");
//   }
//   if (userType === "clientServices") {
//     socket.join("clientServices");
//   }
//   if (userType === "client service team") {
//     socket.join("clientServiceTeam");
//   }

//   // if (userType === "provider") {
//   //   socket.join("provider");
//   // } else if (userType === "worker") {
//   //   socket.join("worker");
//   // } else if (userType === "superadmin") {
//   //   socket.join("superadmin");
//   // }

//   // Handle notifications
//   socket.on("sendNotificationInRoom", (data) => {
//     const { message, targetType } = data;
//     console.log("message", message, "targetType", targetType);
//     // Emit to the specific room
//     io.to(targetType).emit("receiveNotification", { message });
  });

//   socket.on("sendNotificationIndivualy", (data) => {
//     const { message, user_id } = data;
//     console.log("message", message, "targetType", targetType);
//     // Emit to the specific room
//     io.to(user_id).emit("sendNotificationIndivualy", { message });
//   });
// });



// const io = new Server(ser)
require("dotenv").config();
//Set global variable
global.appRoot = __dirname;
// db config 🐰
require("./src/config/DbConfig");

// providing a Connect/Express middleware that can be used to enable CORS with various options.
app.use(cors());

app.use(compression());

// parse application/json
app.use(express.json({ limit: "5mb" }));
app.use(
  express.urlencoded({
    extended: true,
  })
);

// another logger to show logs in console as well
app.use(morgan("dev"));

// Helmet helps you secure your Express apps by setting various HTTP headers.
// It’s not a silver bullet, but it can help! DOC: https://helmetjs.github.io/ 😎
// app.use(helmet());

app.use(express.static(publicDir));
const buildPath = path.join(__dirname, "public");
app.use(express.static(buildPath));
//uploads
app.use("/uploads/", express.static(path.join(__dirname, "/uploads")));
// app.use("backend-assets", express.static(path.join(__dirname, "backend
// default api route 😈
// app.get('/', (req, res) => {
// 	res.json({
// 		status: true,
// 		message: 'Welcome to backend',
// 		cheers: '🍎',
// 		docs: `${process.env.APP_URL}api-docs`,
// 	});
// });
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// import all routes at once
require("./src/utils/RoutesUtils")(app);
require("./src/app/controllers/Crone/CroneController");

//conserve live dev serve frontend (CICD)
const conserveDevBuildPath =
  "/home/ubuntu/conserveDevFrontend/frontend/conserveplatformfrontend/conserveplatformfrontend/build";
app.use("/", express.static(path.join(conserveDevBuildPath)));
app.use("/*", express.static(path.join(conserveDevBuildPath)));

// initilizing server 😻
/** ***Get the port from environment and store in Express*** */
const port = process.env.PORT;
app.set("port", port);
server.listen(port, () => {
  console.log("\x1b[36m", `🚀 Server is listening on port ${port} `);
});

app.get("/api/v1", (req, res) => res.json({ version: 0.1 }));
// Handling non-existing routes
require("./src/utils/ErrorHandlerUtils")(app);
module.exports.handler = app;
global.socket = io;