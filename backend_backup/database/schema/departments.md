# Table : departments

## Description

Represents an academic department belonging to a faculty.

Departments organize courses, documents, teachers and students.

---

## Fields

| Column | Type | Nullable | Key / Constraint | Description |
|---------|------|----------|------------------|-------------|
| id | BIGINT UNSIGNED | No | Primary Key, Auto Increment | Unique identifier |
| faculty_id | BIGINT UNSIGNED | No | Foreign Key → faculties.id | Parent faculty |
| name | VARCHAR(255) | No | - | Full department name |
| code | VARCHAR(30) | No | Unique | Department code (CHM, BIO, INF...) |
| slug | VARCHAR(255) | No | Unique | URL slug |
| short_name | VARCHAR(100) | Yes | - | Optional short name |
| description | TEXT | Yes | - | Department description |
| logo | VARCHAR(255) | Yes | - | Logo path |
| banner | VARCHAR(255) | Yes | - | Banner image |
| color | VARCHAR(30) | Yes | - | Theme color |
| icon | VARCHAR(100) | Yes | - | Frontend icon |
| drive_id | BIGINT UNSIGNED | Yes | Foreign Key → google_drives.id | Main Google Drive |
| total_courses | INTEGER | No | Default 0 | Cached number of courses |
| total_documents | INTEGER | No | Default 0 | Cached number of documents |
| total_students | INTEGER | No | Default 0 | Cached number of subscribed students |
| is_public | BOOLEAN | No | Default TRUE | Visible in application |
| status | BOOLEAN | No | Default TRUE | Active / Inactive |
| created_at | TIMESTAMP | Yes | - | Creation date |
| updated_at | TIMESTAMP | Yes | - | Last update |

---

## Relations

Belongs To → Faculty

Has Many → Levels

Has Many → Courses

Has Many → Teachers

Has Many → Students

Has Many → Documents (through Courses)

Belongs To → Google Drive

---

## Example

Faculty : Faculty of Sciences

Department : Chemistry

Code : CHM

Slug : chemistry

Drive : Chemistry Drive

Courses : 42

Documents : 2,845

Students : 4,312

Status : Active
