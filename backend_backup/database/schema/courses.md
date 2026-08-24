# Table : courses

## Description

Represents an academic course taught within a department.

Each course belongs to one department, one academic level and one semester.

It is the central table of ALPHIX because every document is attached to a course.

---

## Fields

| Column | Type | Nullable | Key / Constraint | Description |
|---------|------|----------|------------------|-------------|
| id | BIGINT UNSIGNED | No | Primary Key | Unique identifier |
| department_id | BIGINT UNSIGNED | No | Foreign Key → departments.id | Parent department |
| level_id | BIGINT UNSIGNED | No | Foreign Key → levels.id | Academic level |
| semester_id | BIGINT UNSIGNED | No | Foreign Key → semesters.id | Semester |
| name | VARCHAR(255) | No | - | Course name |
| code | VARCHAR(50) | No | Unique | Course code |
| slug | VARCHAR(255) | No | Unique | URL slug |
| description | TEXT | Yes | - | Course description |
| credits | SMALLINT | Yes | - | Academic credits |
| coefficient | DECIMAL(4,2) | Yes | - | Course coefficient |
| hours | SMALLINT | Yes | - | Total teaching hours |
| teacher | VARCHAR(255) | Yes | - | Main teacher |
| color | VARCHAR(30) | Yes | - | UI color |
| icon | VARCHAR(100) | Yes | - | UI icon |
| drive_id | BIGINT UNSIGNED | Yes | Foreign Key → google_drives.id | Google Drive |
| total_documents | INTEGER | No | Default 0 | Cached number of documents |
| total_downloads | INTEGER | No | Default 0 | Cached downloads |
| total_views | INTEGER | No | Default 0 | Cached views |
| status | BOOLEAN | No | Default TRUE | Active course |
| created_at | TIMESTAMP | Yes | - | Creation date |
| updated_at | TIMESTAMP | Yes | - | Last update |

---

## Relations

Belongs To → Faculty (through Department)

Belongs To → Department

Belongs To → Level

Belongs To → Semester

Belongs To → Google Drive

Has Many → Documents

Has Many → Favorites

Has Many → Downloads

Has Many → SearchHistory

Has Many → Notifications

---

## Example

Faculty

Faculty of Sciences

Department

Chemistry

Level

BAC III

Semester

Semester 5

Course

Organic Chemistry III

Code

CHI3509

Credits

5

Teacher

Prof. David Nahimana

Documents

48

Downloads

15230
