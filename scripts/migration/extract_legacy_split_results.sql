-- SQL Query to Extract Legacy Split Subject Exam Results
-- Extracts all exam split subject result records from the `exam_split_subject_results` table.
-- This data will be used to populate the `studentPaperMark` entities in SchoolPilot3.

SELECT 
    id,
    admno,
    Examination,
    Term,
    Year,
    Class,
    Stream,
    -- Add all split subject columns that exist in the table
    BIO_P1,
    BIO_P2,
    CHEM_P1,
    CHEM_P2
    -- Include any other split subject columns that may be present
FROM 
    exam_split_subject_results;

