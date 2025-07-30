-- SQL Query to Extract Legacy Exam Results
-- Extracts all exam result records from the `exam_results` table.
-- This data will be transformed into the `studentExamResultSchema` and `studentPaperMark` entities in SchoolPilot3.

SELECT 
    id,
    admno,
    Examination,
    Term,
    Year,
    Class,
    Stream,
    -- Add all subject columns that exist in the table
    ENG,
    KIS,
    MAT,
    BIO,
    PHY,
    CHEM,
    HIS,
    GEO,
    CRE,
    -- Include any other subject columns that may be present
    total,
    mean,
    mean_grade,
    points,
    stream_pos,
    overall_pos
FROM 
    exam_results;

