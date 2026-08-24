# Table : faculties

## Description

Représente une faculté, un institut ou une école de l'université.

Cette table est le point d'entrée de toute la hiérarchie académique.

---

## Champs

| Colonne | Type | Nullable | Clé / Contrainte | Description |
|---------|------|----------|------------------|-------------|
| id | BIGINT UNSIGNED | Non | Primary Key, Auto Increment | Identifiant unique |
| name | VARCHAR(255) | Non | Unique | Nom complet de la faculté |
| code | VARCHAR(30) | Non | Unique | Code court (FS, FM, FD...) |
| slug | VARCHAR(255) | Non | Unique | Nom utilisé dans les URLs |
| description | TEXT | Oui | - | Description de la faculté |
| logo | VARCHAR(255) | Oui | - | Logo éventuel |
| color | VARCHAR(30) | Oui | - | Couleur officielle dans l'application |
| icon | VARCHAR(100) | Oui | - | Icône utilisée dans le frontend |
| drive_id | BIGINT UNSIGNED | Oui | Foreign Key | Google Drive principal associé |
| status | BOOLEAN | Non | Default TRUE | Faculté active ou non |
| created_at | TIMESTAMP | Oui | - | Date de création |
| updated_at | TIMESTAMP | Oui | - | Dernière modification |

---

## Relations

Has Many → Departments

Has Many → Courses (via Departments)

Has Many → Documents (via Courses)

Belongs To → Google Drive

---

## Exemple

Faculté des Sciences

Code : FS

Slug : sciences

Drive : Drive Sciences

Couleur : Bleu

Statut : Active
