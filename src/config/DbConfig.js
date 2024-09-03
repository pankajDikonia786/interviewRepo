const Sequelize = require('sequelize');

const sequelize = new Sequelize(
  {
    database: process.env.DB_DATABASE,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: 5432,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true, // This will help you. But you will see nwe error
        rejectUnauthorized: false // This line will fix new error
      }
    },
  }

);
try {
  sequelize
    .authenticate()
    .then(async () => {
      console.log('Connection has been established successfully.');
    })
    .catch((err) => {
      console.log('Unable to connect to the database:', err);
    });
} catch (err) {
  console.log('an error occured', err);
}

module.exports = sequelize;
