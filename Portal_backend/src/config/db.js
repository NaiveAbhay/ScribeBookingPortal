// import mysql from "mysql2/promise";
// import dotenv from "dotenv";

// dotenv.config();

// // console.log("DB USER:", process.env.DB_USER);

// export const pool = mysql.createPool({
//  host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   port: process.env.DB_PORT,
//   connectionLimit: 2,   // 🔴 VERY IMPORTANT
//   queueLimit: 0,
//   ssl: {
//     rejectUnauthorized: false,
//   },
// });


import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  connectionLimit: 1, // 🟢 Forces your app to use only 1 of your 5 allowed slots
  queueLimit: 0,
  enableKeepAlive: true,
  ssl: {
    rejectUnauthorized: false,
  },
}); 