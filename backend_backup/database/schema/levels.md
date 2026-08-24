# Table : levels

## Description

Represents the academic levels (e.g., Bac 1, Bac 2, Bac 3, Master 1) within the university system.

Decoupling this from the courses table allows flexible renaming and restructuring over time without altering course records.

---

## Fields

| Column | Type | Nullable | Key / Constraint | Description |
|---------|------|----------|------------------|-------------|
| id | BIGINT UNSIGNED | No | Primary Key, Auto Increment | Unique identifier |
| name | VARCHAR(100) | No | Unique | Full level name (e.g., Bachelor Year 3) |
| code | VARCHAR(30) | No | Unique | Short code (e.g., BAC3, M1) |
| slug | VARCHAR(100) | No | Unique | URL slug |
| position | SMALLINT UNSIGNED | No | Default 0 | Sort order in UI |
| status | BOOLEAN | No | Default TRUE | Active status |
| created_at | TIMESTAMP | Yes | - | Creation date |
| updated_at | TIMESTAMP | Yes | - | Last update |

---

## Relations

Has Many → Courses
