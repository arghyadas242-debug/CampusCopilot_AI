const getConnection = require("./db");

async function testDatabase() {
    let connection;

    try {
        connection = await getConnection();

        console.log("Oracle Database connected successfully!");

        const result = await connection.execute(
    "SELECT * FROM students"
);

console.log("Students from Oracle:");
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