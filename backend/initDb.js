const getConnection = require("./db");
const bcrypt = require("bcryptjs");

async function initDatabase() {
  let connection;
  try {
    connection = await getConnection();
    console.log("Connected to Oracle Database. Initializing tables...");

    const tables = [
      {
        name: "USERS",
        sql: `CREATE TABLE USERS (
          id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          name VARCHAR2(100) NOT NULL,
          email VARCHAR2(150) UNIQUE NOT NULL,
          password_hash VARCHAR2(255) NOT NULL,
          role VARCHAR2(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
      },
      {
        name: "STUDENTS",
        sql: `CREATE TABLE STUDENTS (
          id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          user_id NUMBER REFERENCES USERS(id) ON DELETE CASCADE,
          roll_number VARCHAR2(50) UNIQUE NOT NULL,
          department VARCHAR2(100) NOT NULL,
          semester VARCHAR2(10) NOT NULL,
          section VARCHAR2(10) NOT NULL,
          phone VARCHAR2(20),
          status VARCHAR2(20) DEFAULT 'Active'
        )`,
      },
      {
        name: "ATTENDANCE",
        sql: `CREATE TABLE ATTENDANCE (
          id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          student_roll VARCHAR2(50) NOT NULL,
          subject_code VARCHAR2(20) NOT NULL,
          subject_name VARCHAR2(100) NOT NULL,
          attended_classes NUMBER DEFAULT 0,
          total_classes NUMBER DEFAULT 0,
          faculty_name VARCHAR2(100)
        )`,
      },
      {
        name: "NOTICES",
        sql: `CREATE TABLE NOTICES (
          id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          title VARCHAR2(255) NOT NULL,
          author VARCHAR2(150) NOT NULL,
          tag VARCHAR2(50) DEFAULT 'ACADEMIC',
          tag_color VARCHAR2(100),
          category VARCHAR2(50) DEFAULT 'academic',
          content CLOB,
          ai_summary CLOB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
      },
      {
        name: "ASSIGNMENTS",
        sql: `CREATE TABLE ASSIGNMENTS (
          id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          student_roll VARCHAR2(50) NOT NULL,
          title VARCHAR2(200) NOT NULL,
          subject VARCHAR2(100) NOT NULL,
          due_date VARCHAR2(50) NOT NULL,
          priority VARCHAR2(20) DEFAULT 'Medium',
          status VARCHAR2(20) DEFAULT 'Pending'
        )`,
      },
    ];

    for (const table of tables) {
      try {
        await connection.execute(table.sql);
        console.log(`✓ Table ${table.name} created successfully.`);
      } catch (err) {
        if (err.errorNum === 955) {
          // ORA-00955: name is already used by an existing object
          console.log(`ℹ Table ${table.name} already exists.`);
        } else {
          console.error(`Error creating table ${table.name}:`, err.message);
        }
      }
    }

    // Seed default admin if not exists
    const adminCheck = await connection.execute(
      `SELECT id FROM USERS WHERE email = :email`,
      ["admin@campus.edu"]
    );

    if (adminCheck.rows.length === 0) {
      const hashedAdminPassword = await bcrypt.hash("Admin@123", 10);
      await connection.execute(
        `INSERT INTO USERS (name, email, password_hash, role) VALUES (:name, :email, :password, :role)`,
        ["Campus Administrator", "admin@campus.edu", hashedAdminPassword, "admin"],
        { autoCommit: true }
      );
      console.log("✓ Default Admin account created (admin@campus.edu / Admin@123).");
    }

    // Seed default notices if table is empty
    const noticeCheck = await connection.execute(`SELECT COUNT(*) AS count FROM NOTICES`, [], {
      outFormat: require("oracledb").OUT_FORMAT_OBJECT,
    });
    const noticeCount = noticeCheck.rows[0]?.COUNT || 0;

    if (noticeCount === 0) {
      const initialNotices = [
        {
          title: "Semester Examination Schedule & Assessment Guidelines",
          author: "Department of Controller of Examinations",
          tag: "URGENT",
          tagColor: "bg-error-container text-on-error-container",
          category: "exam",
          content: `End-of-Semester Examinations commence on September 12, 2026. Students must complete exam registration on the student portal before Sep 02, 2026. Admit cards will be available on the Digital Student ID pass portal on Sep 08.`,
          summary: JSON.stringify([
            "Registration deadline on the campus portal is Sep 02, 2026.",
            "Admit cards available on Digital Student ID portal on Sep 08, 2026.",
            "Examinations begin Sep 12, 2026 in Halls A & B.",
          ]),
        },
        {
          title: "Annual Hackathon & AI Innovation Challenge 2026",
          author: "Department of Computer Science & ACM Student Chapter",
          tag: "EVENT",
          tagColor: "bg-secondary-container text-on-secondary-container",
          category: "event",
          content: `48-hour continuous hackathon on Smart Campus & Generative AI. Teams of 2-4 members will build autonomous agents. Cash pool of $5,000 + cloud credits for top 5 teams. Registration closes Aug 28, 2026.`,
          summary: JSON.stringify([
            "48-hour continuous hackathon on Smart Campus & Generative AI.",
            "Cash pool of $5,000 + cloud credits for top 5 teams.",
            "Registration closes Aug 28, 2026.",
          ]),
        },
      ];

      for (const n of initialNotices) {
        await connection.execute(
          `INSERT INTO NOTICES (title, author, tag, tag_color, category, content, ai_summary)
           VALUES (:title, :author, :tag, :tagColor, :category, :content, :ai_summary)`,
          n,
          { autoCommit: true }
        );
      }
      console.log("✓ Default notices seeded.");
    }

    console.log("Database initialization finished successfully.");
  } catch (error) {
    console.error("Database initialization failed:", error);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
