# EducationSystem Service - API Documentation

This document provides an overview of the API for the EducationSystem service. This service is responsible for managing core educational entities such as students, staff, courses, and enrollments.

## Authentication

All API requests must be authenticated using a JWT bearer token included in the `Authorization` header.

## Endpoints

### Students

- `GET /api/students`: Retrieve a list of all students.
- `GET /api/students/{id}`: Retrieve a specific student by ID.
- `POST /api/students`: Create a new student.
- `PUT /api/students/{id}`: Update an existing student.
- `DELETE /api/students/{id}`: Delete a student.

### Staff

- `GET /api/staff`: Retrieve a list of all staff members.
- `GET /api/staff/{id}`: Retrieve a specific staff member by ID.
- `POST /api/staff`: Create a new staff member.

### Courses

- `GET /api/courses`: Retrieve a list of all courses.
- `POST /api/courses`: Create a new course.

