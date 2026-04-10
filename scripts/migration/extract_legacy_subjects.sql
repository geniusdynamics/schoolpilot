-- SQL Query to Extract Legacy Subjects and Split Subjects
-- Extracts all subject and split-subject records.
-- This data will be transformed into the `subjectSchema` and `subjectPaperSchema` in SchoolPilot3.

-- Extract all subjects
SELECT 
    id,
    subject_name,
    subject_code,
    department
FROM 
    subjects;

-- Extract all split subjects
SELECT 
    id,
    subject as parent_subject,
    abbreviation,
    contribution,
    class
FROM 
    split_subjects;

