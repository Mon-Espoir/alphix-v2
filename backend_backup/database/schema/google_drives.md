# Table : google_drives

## Description

Represents every Google Drive account, Shared Drive, or root folder used by ALPHIX to store academic resources.

This table allows the backend and the automation engine to automatically choose the appropriate storage space depending on the faculty, department, course, storage usage, or priority.

---

## Fields

| Column | Type | Nullable | Key / Constraint | Description |
|---------|------|----------|------------------|-------------|
| id | BIGINT UNSIGNED | No | Primary Key, Auto Increment | Unique identifier |
| uuid | CHAR(36) | No | Unique, Index | Public unique identifier |
| name | VARCHAR(255) | No | Index | Display name (e.g. Drive Sciences) |
| code | VARCHAR(50) | No | Unique | Internal code (DRV_SC, DRV_MED...) |
| folder_id | VARCHAR(255) | No | Unique | Google Drive Folder ID |
| email | VARCHAR(255) | Yes | Index | Google account email |
| type | ENUM('personal','shared_drive','service_account') | No | Default 'shared_drive' | Storage type |
| credentials_path | VARCHAR(255) | Yes | - | Service Account credentials path |
| storage_limit | BIGINT UNSIGNED | Yes | - | Maximum storage capacity (bytes) |
| used_storage | BIGINT UNSIGNED | No | Default 0 | Current used storage |
| available_storage | BIGINT UNSIGNED | No | Default 0 | Remaining storage |
| priority | SMALLINT UNSIGNED | No | Default 1 | Drive selection priority |
| health_status | ENUM('healthy','warning','critical') | No | Default 'healthy' | Drive health |
| upload_count | BIGINT UNSIGNED | No | Default 0 | Total uploaded files |
| last_sync_at | TIMESTAMP | Yes | - | Last synchronization |
| is_default | BOOLEAN | No | Default FALSE | Default storage |
| status | BOOLEAN | No | Default TRUE | Active status |
| notes | TEXT | Yes | - | Internal administrator notes |
| created_at | TIMESTAMP | Yes | - | Creation date |
| updated_at | TIMESTAMP | Yes | - | Last modification |

---

## Relations

Has Many → Faculties

Has Many → Departments

Has Many → Courses

Has Many → Documents

---

## Automation

Python automatically:

- monitors available storage
- chooses the best Drive
- balances uploads
- avoids full Drives
- updates used storage
- updates synchronization date
- reports unhealthy Drives
