# GradingEngine Service - API Documentation

This document provides an overview of the API for the GradingEngine service. This service handles all aspects of grading, including grade entry, calculation, and reporting.

## Authentication

All API requests must be authenticated using a JWT bearer token included in the `Authorization` header.

## Endpoints

### Grades

- `GET /api/grades/student/{studentId}`: Retrieve all grades for a specific student.
- `GET /api/grades/course/{courseId}`: Retrieve all grades for a specific course.
- `POST /api/grades`: Submit a new grade for a student in a course.
- `PUT /api/grades/{id}`: Update an existing grade.

### Grade Calculation

- `POST /api/grades/calculate/student/{studentId}`: Trigger a recalculation of a student's overall grades.
- `POST /api/grades/calculate/course/{courseId}`: Trigger a recalculation of grades for an entire course.

### Reports

- `GET /api/reports/student/{studentId}`: Generate a grade report for a student.
- `GET /api/reports/course/{courseId}`: Generate a grade report for a course.

