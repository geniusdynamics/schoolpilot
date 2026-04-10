-- SQL Query to Extract Legacy Examination Records
-- Extracts all examination records from the `examinations` table.
-- This data will be transformed into the `examSessionSchema` in SchoolPilot3.

SELECT 
    id,
    Term,
    ExamName,
    TotalMarks,
    Year,
    last_date_of_entry
FROM 
    examinations;

