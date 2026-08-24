# Table : document_tags

## Description

Stores the master list of tags used to classify and organize documents.

Tags improve search, filtering, recommendations, and automatic categorization.

A document may have multiple tags, and a tag may belong to multiple documents.

---

## Fields

| Column | Type | Nullable | Key / Constraint | Description |
|---------|------|----------|------------------|-------------|
| id | BIGINT UNSIGNED | No | Primary Key, Auto Increment | Unique identifier |
| name | VARCHAR(100) | No | Unique | Display name of the tag |
| slug | VARCHAR(100) | No | Unique | URL-friendly identifier |
| description | TEXT | Yes | - | Optional description |
| color | VARCHAR(30) | Yes | - | UI color |
| created_at | TIMESTAMP | Yes | - | Creation date |
| updated_at | TIMESTAMP | Yes | - | Last update |

---

## Relations

Belongs To Many → Documents

---

## Notes

The many-to-many relationship is implemented using a pivot table:

document_tag_assignments

