const getConnection = require("./db");

async function testDatabase() {
    let connection;

    try {
        connection = await getConnection();

        console.log("Oracle Database connected successfully!");

        const result = await connection.execute(`
            SELECT
                s.name,
                s.student_roll,
                sub.subject_name,
                a.attended_classes,
                a.total_classes
            FROM attendance a
            JOIN students s
                ON a.student_roll = s.student_roll
            JOIN subjects sub
                ON a.subject_code = sub.subject_code
        `);

        console.log("Attendance data:");
        console.log(result.rows);

    } catch (error) {
        console.error("Database connection failed:");
        console.error(error);

    } finally {
        if (connection) {
            await connection.close();
            console.log("Connection closed.");
        }
    }
}

testDatabase();