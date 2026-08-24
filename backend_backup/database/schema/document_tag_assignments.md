# Table : document_tag_assignments

## Description

Implements the Many-to-Many relationship between `documents` and `document_tags`.

This pivot table allows a single document to have multiple tags (e.g., Exam, Organic Chemistry, Semester 1) and a single tag to be associated with many documents.

It improves search, filtering, recommendations, and automatic document organization.

---

## Fields

| Column | Type | Nullable | Key / Constraint | Description |
|---------|------|----------|------------------|-------------|
| document_id | BIGINT UNSIGNED | No | Foreign Key → documents.id (On Delete Cascade) | Associated document |
| tag_id | BIGINT UNSIGNED | No | Foreign Key → document_tags.id (On Delete Cascade) | Associated tag |
| created_at | TIMESTAMP | Yes | Default CURRENT_TIMESTAMP | Assignment timestamp |

---

## Constraints

* **Composite Primary Key:** (`document_id`, `tag_id`)
* Prevents assigning the same tag more than once to the same document.

---

## Relations

Belongs To → Document

Belongs To → Document Tag

---

## Example

Document:
Organic Chemistry Exam 2024

Tags:
- Exam
- Organic Chemistry
- Bac 3
- Semester 2

