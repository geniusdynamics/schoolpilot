-- SQL Query to Extract Legacy Grading Schemes
-- Extracts all grading schemes from the `grading` and `s_grading` tables.
-- This data will be transformed into the `gradingSchemeSchema` in SchoolPilot3.

-- Extract class-based grading schemes
SELECT 
    id,
    Class,
    Term,
    Year,
    A,
    A_minus,
    B_plus,
    B,
    B_minus,
    C_plus,
    C,
    C_minus,
    D_plus,
    D,
    D_minus,
    E
FROM 
    grading;

-- Extract subject-based grading schemes
SELECT 
    id,
    Class,
    Subject,
    Term,
    Year,
    A,
    A_minus,
    B_plus,
    B,
    B_minus,
    C_plus,
    C,
    C_minus,
    D_plus,
    D,
    D_minus,
    E
FROM 
    s_grading;

