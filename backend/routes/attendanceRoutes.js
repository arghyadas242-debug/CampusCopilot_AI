const express = require("express");
const oracledb = require("oracledb");
const getConnection = require("../db");

const router = express.Router();


// GET all attendance records
// URL: http://localhost:5000/api/attendance
router.get("/", async (req, res) => {
    let connection;

    try {
        connection = await getConnection();

        const result = await connection.execute(
            `
            SELECT
                s.name,
                s.student_roll,
                sub.subject_code,
                sub.subject_name,
                a.attended_classes,
                a.total_classes
            FROM attendance a
            JOIN students s
                ON a.student_roll = s.student_roll
            JOIN subjects sub
                ON a.subject_code = sub.subject_code
            ORDER BY s.student_roll, sub.subject_code
            `,
            [],
            {
                outFormat: oracledb.OUT_FORMAT_OBJECT
            }
        );

        res.json(result.rows);

    } catch (error) {
        console.error("Attendance route error:", error);

        res.status(500).json({
            error: "Unable to load attendance",
            details: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});


// GET attendance of one student
// Example:
// http://localhost:5000/api/attendance/CSE001
router.get("/:studentRoll", async (req, res) => {
    let connection;

    try {
        const studentRoll = req.params.studentRoll;

        connection = await getConnection();

        const result = await connection.execute(
            `
            SELECT
                s.name,
                s.student_roll,
                sub.subject_code,
                sub.subject_name,
                a.attended_classes,
                a.total_classes
            FROM attendance a
            JOIN students s
                ON a.student_roll = s.student_roll
            JOIN subjects sub
                ON a.subject_code = sub.subject_code
            WHERE s.student_roll = :studentRoll
            ORDER BY sub.subject_code
            `,
            {
                studentRoll: studentRoll
            },
            {
                outFormat: oracledb.OUT_FORMAT_OBJECT
            }
        );

        res.json(result.rows);

    } catch (error) {
        console.error("Student attendance error:", error);

        res.status(500).json({
            error: "Unable to load student attendance",
            details: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});


module.exports = router;