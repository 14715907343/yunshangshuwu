const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// 让上传的图片可以被浏览器访问
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 创建上传目录
const uploadDir = path.join(__dirname, "uploads", "covers");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 封面上传设置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, filename);
  }
});

const upload = multer({ storage });

// 连接 MySQL
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  charset: "utf8mb4"
});

// 管理员 token 验证
function verifyAdminToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "未登录，请先登录后台"
    });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "登录已过期，请重新登录"
    });
  }
}

// 首页测试接口
app.get("/", function (req, res) {
  res.send("Book backend is running.");
});

// 测试数据库连接
app.get("/api/test-db", async function (req, res) {
  try {
    const [rows] = await db.query("SELECT 1 + 1 AS result");

    res.json({
      message: "数据库连接成功",
      result: rows[0].result
    });
  } catch (error) {
    res.status(500).json({
      message: "数据库连接失败",
      error: error.message
    });
  }
});

// 管理员登录
app.post("/api/admin/login", async function (req, res) {
  // 修改管理员密码
app.put("/api/admin/password", verifyAdminToken, async function (req, res) {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        message: "旧密码和新密码不能为空"
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "新密码至少需要 8 位"
      });
    }

    const [rows] = await db.query(
      "SELECT * FROM admins WHERE id = ?",
      [req.admin.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "管理员不存在"
      });
    }

    const admin = rows[0];

    const isMatch = await bcrypt.compare(oldPassword, admin.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "旧密码不正确"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      "UPDATE admins SET password = ? WHERE id = ?",
      [hashedPassword, req.admin.id]
    );

    res.json({
      message: "密码修改成功，请重新登录"
    });
  } catch (error) {
    res.status(500).json({
      message: "修改密码失败",
      error: error.message
    });
  }
});
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "用户名和密码不能为空"
      });
    }

    const [rows] = await db.query(
      "SELECT * FROM admins WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message: "用户名或密码错误"
      });
    }

    const admin = rows[0];

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "用户名或密码错误"
      });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h"
      }
    );

    res.json({
      message: "登录成功",
      token: token
    });
  } catch (error) {
    res.status(500).json({
      message: "登录失败",
      error: error.message
    });
  }
});

// 获取所有书籍
app.get("/api/books", async function (req, res) {
  try {
    const [rows] = await db.query(
      "SELECT * FROM books ORDER BY created_at DESC"
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: "获取书籍失败",
      error: error.message
    });
  }
});

// 获取单本书
app.get("/api/books/:id", async function (req, res) {
  try {
    const [rows] = await db.query(
      "SELECT * FROM books WHERE id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "书籍不存在"
      });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({
      message: "获取书籍详情失败",
      error: error.message
    });
  }
});

// 获取某本书的章节列表
app.get("/api/books/:id/chapters", async function (req, res) {
  try {
    const [rows] = await db.query(
      "SELECT id, book_id, chapter_no, title FROM chapters WHERE book_id = ? ORDER BY chapter_no ASC",
      [req.params.id]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: "获取章节列表失败",
      error: error.message
    });
  }
});

// 获取章节正文
app.get("/api/chapters/:id", async function (req, res) {
  try {
    const [rows] = await db.query(
      "SELECT * FROM chapters WHERE id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "章节不存在"
      });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({
      message: "获取章节正文失败",
      error: error.message
    });
  }
});

// 新增书籍
app.post("/api/books", verifyAdminToken, upload.single("cover"), async function (req, res) {
  try {
    const { title, author, category, intro } = req.body;

    if (!title) {
      return res.status(400).json({
        message: "书名不能为空"
      });
    }

    let coverUrl = "";

    if (req.file) {
      coverUrl = "/uploads/covers/" + req.file.filename;
    }

    const [result] = await db.query(
      "INSERT INTO books (title, author, category, intro, cover_url) VALUES (?, ?, ?, ?, ?)",
      [title, author, category, intro, coverUrl]
    );

    res.json({
      message: "书籍添加成功",
      bookId: result.insertId
    });
  } catch (error) {
    res.status(500).json({
      message: "添加书籍失败",
      error: error.message
    });
  }
});

// 编辑书籍
app.put("/api/books/:id", verifyAdminToken, upload.single("cover"), async function (req, res) {
  try {
    const { title, author, category, intro } = req.body;

    if (!title) {
      return res.status(400).json({
        message: "书名不能为空"
      });
    }

    if (req.file) {
      const coverUrl = "/uploads/covers/" + req.file.filename;

      await db.query(
        "UPDATE books SET title = ?, author = ?, category = ?, intro = ?, cover_url = ? WHERE id = ?",
        [title, author, category, intro, coverUrl, req.params.id]
      );
    } else {
      await db.query(
        "UPDATE books SET title = ?, author = ?, category = ?, intro = ? WHERE id = ?",
        [title, author, category, intro, req.params.id]
      );
    }

    res.json({
      message: "书籍修改成功"
    });
  } catch (error) {
    res.status(500).json({
      message: "修改书籍失败",
      error: error.message
    });
  }
});

// 删除书籍
app.delete("/api/books/:id", verifyAdminToken, async function (req, res) {
  try {
    await db.query("DELETE FROM books WHERE id = ?", [req.params.id]);

    res.json({
      message: "书籍删除成功"
    });
  } catch (error) {
    res.status(500).json({
      message: "删除书籍失败",
      error: error.message
    });
  }
});

// 新增章节
app.post("/api/books/:id/chapters", verifyAdminToken, async function (req, res) {
  try {
    const { chapter_no, title, content } = req.body;

    if (!chapter_no || !title || !content) {
      return res.status(400).json({
        message: "章节序号、标题和正文不能为空"
      });
    }

    const [result] = await db.query(
      "INSERT INTO chapters (book_id, chapter_no, title, content) VALUES (?, ?, ?, ?)",
      [req.params.id, chapter_no, title, content]
    );

    res.json({
      message: "章节添加成功",
      chapterId: result.insertId
    });
  } catch (error) {
    res.status(500).json({
      message: "添加章节失败",
      error: error.message
    });
  }
});

// 编辑章节
app.put("/api/chapters/:id", verifyAdminToken, async function (req, res) {
  try {
    const { chapter_no, title, content } = req.body;

    if (!chapter_no || !title || !content) {
      return res.status(400).json({
        message: "章节序号、标题和正文不能为空"
      });
    }

    await db.query(
      "UPDATE chapters SET chapter_no = ?, title = ?, content = ? WHERE id = ?",
      [chapter_no, title, content, req.params.id]
    );

    res.json({
      message: "章节修改成功"
    });
  } catch (error) {
    res.status(500).json({
      message: "修改章节失败",
      error: error.message
    });
  }
});

// 删除章节
app.delete("/api/chapters/:id", verifyAdminToken, async function (req, res) {
  try {
    await db.query("DELETE FROM chapters WHERE id = ?", [req.params.id]);

    res.json({
      message: "章节删除成功"
    });
  } catch (error) {
    res.status(500).json({
      message: "删除章节失败",
      error: error.message
    });
  }
});

const port = process.env.PORT || 3000;

app.listen(port, function () {
  console.log("Server is running at http://localhost:" + port);
});