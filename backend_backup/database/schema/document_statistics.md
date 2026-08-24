# Table : document_statistics

## Description

Stores precomputed statistics for each document.

These values are periodically updated by automation scripts to avoid expensive calculations during user requests.

---

## Fields

| Column | Type | Nullable | Key / Constraint | Description |
|---------|------|----------|------------------|-------------|
| document_id | BIGINT UNSIGNED | No | Primary Key, Foreign Key → documents.id (On Delete Cascade) | Associated document |
| total_views | INT UNSIGNED | No | Default 0 | Total document views |
| total_downloads | INT UNSIGNED | No | Default 0 | Total downloads |
| weekly_views | INT UNSIGNED | No | Default 0 | Views during current week |
| monthly_views | INT UNSIGNED | No | Default 0 | Views during current month |
| popularity_score | DECIMAL(10,2) | No | Default 0.00 | Calculated popularity score |
| last_view_at | TIMESTAMP | Yes | - | Last view |
| last_download_at | TIMESTAMP | Yes | - | Last download |
| updated_at | TIMESTAMP | Yes | - | Last calculation |

---

## Relations

Belongs To → Document

