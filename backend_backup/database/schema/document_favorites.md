# Table : document_favorites

## Description

Stores the list of documents bookmarked by users.

Favorites allow users to quickly access important documents without searching again.

---

## Fields

| Column | Type | Nullable | Key / Constraint | Description |
|---------|------|----------|------------------|-------------|
| id | BIGINT UNSIGNED | No | Primary Key, Auto Increment | Unique identifier |
| user_id | BIGINT UNSIGNED | No | Foreign Key → users.id (On Delete Cascade) | Owner of the favorite |
| document_id | BIGINT UNSIGNED | No | Foreign Key → documents.id (On Delete Cascade) | Favorited document |
| created_at | TIMESTAMP | Yes | - | Date added |
| updated_at | TIMESTAMP | Yes | - | Last update |

---

## Constraints

Unique Composite Index

(user_id, document_id)

A user cannot favorite the same document twice.

---

## Relations

Belongs To → User

Belongs To → Document

---

## Notes

Used for:

- quick access
- personalized dashboard
- recommendation engine
- favorite statistics
