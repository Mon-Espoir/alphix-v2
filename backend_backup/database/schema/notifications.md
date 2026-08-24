# Table : notifications

## Description

Stores notifications sent by the ALPHIX platform.

Notifications may concern new documents, announcements, maintenance, or administrative messages.

---

## Fields

| Column | Type | Nullable | Key / Constraint | Description |
|---------|------|----------|------------------|-------------|
| id | CHAR(36) | No | Primary Key | Notification UUID |
| user_id | BIGINT UNSIGNED | No | Foreign Key → users.id (On Delete Cascade) | Recipient |
| type | VARCHAR(255) | No | Index | Notification type |
| title | VARCHAR(255) | No | - | Notification title |
| data | JSON | No | - | Notification payload |
| read_at | TIMESTAMP | Yes | - | Read timestamp |
| sent_at | TIMESTAMP | Yes | - | Delivery timestamp |
| created_at | TIMESTAMP | Yes | - | Creation date |
| updated_at | TIMESTAMP | Yes | - | Last update |

---

## Relations

Belongs To → User

