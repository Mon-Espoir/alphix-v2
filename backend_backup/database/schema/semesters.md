# Table : semesters

## Description

Represents academic semesters (e.g., Semester 1, Semester 2) or periods during the academic year.

---

## Fields

| Column | Type | Nullable | Key / Constraint | Description |
|---------|------|----------|------------------|-------------|
| id | BIGINT UNSIGNED | No | Primary Key, Auto Increment | Unique identifier |
| name | VARCHAR(100) | No | Unique | Semester name (e.g., Semester 1) |
| code | VARCHAR(30) | No | Unique | Short code (e.g., S1, S2) |
| slug | VARCHAR(100) | No | Unique | URL slug |
| position | SMALLINT UNSIGNED | No | Default 0 | Sort order in UI |
| status | BOOLEAN | No | Default TRUE | Active status |
| created_at | TIMESTAMP | Yes | - | Creation date |
| updated_at | TIMESTAMP | Yes | - | Last update |

---

## Relations

Has Many → Courses
