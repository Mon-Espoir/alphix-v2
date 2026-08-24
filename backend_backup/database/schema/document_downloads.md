# Table : document_downloads

## Description

Stores every download event performed on a document.

This table is used for:

- download history
- popularity calculation
- statistics
- user activity
- security analysis
- recommendation engine

Every download creates one record.

---

## Fields

| Column | Type | Nullable | Key / Constraint | Description |
|---------|------|----------|------------------|-------------|
| id | BIGINT UNSIGNED | No | Primary Key, Auto Increment | Unique identifier |
| document_id | BIGINT UNSIGNED | No | Foreign Key → documents.id (On Delete Cascade) | Downloaded document |
| user_id | BIGINT UNSIGNED | Yes | Foreign Key → users.id (On Delete Set Null) | User who downloaded the document |
| ip_address | VARCHAR(45) | Yes | Index | IPv4 / IPv6 address |
| user_agent | TEXT | Yes | - | Browser / Device information |
| platform | VARCHAR(100) | Yes | - | Android, Web, Windows, Linux... |
| app_version | VARCHAR(30) | Yes | - | Version of ALPHIX used |
| downloaded_at | TIMESTAMP | No | Index | Download timestamp |
| created_at | TIMESTAMP | Yes | - | Creation timestamp |
| updated_at | TIMESTAMP | Yes | - | Last update |

---

## Relations

Belongs To → Document

Belongs To → User

---

## Notes

- One download = one row.
- Used for analytics.
- Used to compute popularity_score.
- Used to build personal history.
- Used for recommendation algorithms.
