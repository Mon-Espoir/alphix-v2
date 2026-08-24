# Table : search_queries

## Description

Stores all search queries performed by users.

This table helps identify missing documents, improve search quality, and understand student needs.

---

## Fields

| Column | Type | Nullable | Key / Constraint | Description |
|---------|------|----------|------------------|-------------|
| id | BIGINT UNSIGNED | No | Primary Key, Auto Increment | Unique identifier |
| user_id | BIGINT UNSIGNED | Yes | Foreign Key → users.id (On Delete Set Null) | User who performed the search |
| faculty_id | BIGINT UNSIGNED | Yes | Foreign Key → faculties.id | Associated faculty |
| department_id | BIGINT UNSIGNED | Yes | Foreign Key → departments.id | Associated department |
| query | VARCHAR(255) | No | Index | Search keywords |
| results_count | INT UNSIGNED | No | Default 0 | Number of results returned |
| ip_address | VARCHAR(45) | Yes | - | IPv4 / IPv6 address |
| created_at | TIMESTAMP | Yes | Index | Search timestamp |
| updated_at | TIMESTAMP | Yes | - | Last update |

---

## Relations

Belongs To → User

Belongs To → Faculty

Belongs To → Department

