# Table : document_views

## Description

Stores every consultation of a document.

A view is recorded whenever a user opens the document page or preview.

Views are separated from downloads to improve analytics accuracy.

---

## Fields

| Column | Type | Nullable | Key / Constraint | Description |
|---------|------|----------|------------------|-------------|
| id | BIGINT UNSIGNED | No | Primary Key, Auto Increment | Unique identifier |
| document_id | BIGINT UNSIGNED | No | Foreign Key → documents.id (On Delete Cascade) | Viewed document |
| user_id | BIGINT UNSIGNED | Yes | Foreign Key → users.id (On Delete Set Null) | Viewer |
| ip_address | VARCHAR(45) | Yes | Index | IPv4 / IPv6 address |
| user_agent | TEXT | Yes | - | Browser / Device |
| platform | VARCHAR(100) | Yes | - | Android, Web, Linux... |
| app_version | VARCHAR(30) | Yes | - | Application version |
| viewed_at | TIMESTAMP | No | Index | View timestamp |
| created_at | TIMESTAMP | Yes | - | Creation timestamp |
| updated_at | TIMESTAMP | Yes | - | Last update |

---

## Relations

Belongs To → Document

Belongs To → User

---

## Notes

- Every opening creates one row.
- Used for popularity.
- Used for recommendations.
- Used for statistics.
