const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

dotenv.config();

async function createAdmin() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    charset: "utf8mb4"
  });

  const username = "admin";
  const plainPassword = "Admin123456";

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  await db.query(
    "INSERT INTO admins (username, password) VALUES (?, ?)",
    [username, hashedPassword]
  );

  console.log("管理员创建成功");
  console.log("用户名：admin");
  console.log("密码：Admin123456");

  await db.end();
}

createAdmin().catch(function (error) {
  console.error("创建管理员失败：", error.message);
});
