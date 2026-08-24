# Table : users

## Description

Represents every ALPHIX platform user.

A user may be a student, teacher, contributor, moderator, administrator or super administrator.

The table also stores information required for analytics, personalization, notifications and platform administration.

---

## Fields

| Column | Type | Nullable | Key / Constraint | Description |
|---------|------|----------|------------------|-------------|
| id | BIGINT UNSIGNED | No | Primary Key, Auto Increment | Unique identifier |
| uuid | CHAR(36) | No | Unique, Index | Public identifier |
| name | VARCHAR(255) | No | - | Full name |
| email | VARCHAR(255) | No | Unique, Index | Email address |
| phone | VARCHAR(30) | Yes | - | Phone number |
| email_verified_at | TIMESTAMP | Yes | - | Email verification date |
| password | VARCHAR(255) | No | - | Hashed password |
| role | ENUM('student','teacher','contributor','moderator','administrator','super_admin') | No | Default 'student' | User role |
| faculty_id | BIGINT UNSIGNED | Yes | Foreign Key → faculties.id | Main faculty |
| department_id | BIGINT UNSIGNED | Yes | Foreign Key → departments.id | Main department |
| level_id | BIGINT UNSIGNED | Yes | Foreign Key → levels.id | Academic level |
| avatar | VARCHAR(255) | Yes | - | Profile picture |
| language | VARCHAR(20) | No | Default 'fr' | Preferred language |
| theme | ENUM('light','dark','system') | No | Default 'system' | UI theme |
| notification_enabled | BOOLEAN | No | Default TRUE | Push notifications enabled |
| device_type | VARCHAR(50) | Yes | - | Android, Web, Desktop |
| app_version | VARCHAR(30) | Yes | - | Installed application version |
| download_path | VARCHAR(255) | Yes | - | Download folder |
| last_login_at | TIMESTAMP | Yes | - | Last login |
| last_activity_at | TIMESTAMP | Yes | Index | Last activity |
| status | BOOLEAN | No | Default TRUE | Active account |
| remember_token | VARCHAR(100) | Yes | - | Laravel token |
| created_at | TIMESTAMP | Yes | - | Registration date |
| updated_at | TIMESTAMP | Yes | - | Last modification |

---

## Relations

Belongs To → Faculty

Belongs To → Department

Belongs To → Level

Has Many → Documents

Has Many → Document Downloads

Has Many → Document Views

Has Many → Document Favorites

Has Many → Notifications

Has Many → Activity Logs

Has Many → Search History

---

## Analytics

This table allows ALPHIX administrators to know:

- total users
- active users
- online users
- inactive users
- users by faculty
- users by department
- users by level
- Android versions
- application versions
- language distribution
- notification usage
- daily activity
- monthly activity
- returning users

---

## Security

Authentication is handled by Laravel.

Passwords are never stored in plain text.

UUIDs are used for public APIs instead of internal IDs.

Roles and permissions determine access to administrative features.
