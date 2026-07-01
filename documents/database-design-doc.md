# Database Design Document

## 1. Overview
The database supports "Urlify", a scalable URL shortening service. It manages user accounts, user authentication states (including email verification, password reset, and refresh tokens), and URL redirection mappings. The database facilitates converting long destination URLs into unique, short aliases, supporting expiration-based invalidation and user association.

---

## 2. Database Technology
Database technology is unspecified.

*(Note: A relational database engine such as PostgreSQL is assumed due to the schema's usage of data types like `uuid` and `bigint`.)*

---

## 3. Design Principles
- **Normalized Schema**: Structured in 3rd Normal Form (3NF) to reduce data redundancy.
- **Surrogate Keys**: Primary keys use system-generated IDs: UUIDs for `users` to prevent identifier enumeration, and auto-incrementing BIGINTs for all other tables.
- **Foreign Key Constraints**: Standard referential integrity constraints link user profiles to URLs and authentication tokens.
- **Logical Deletions**: Soft delete flags (`is_deleted`) are utilized in `users` and `urls` to preserve audit history and prevent orphaned historical data.
- **Token Audits**: Audit fields (`created_at`, `updated_at`) and lifecycle columns (`expires_at`, `is_expired`, `is_revoked`) are tracked for all token tables.

---

## 4. Entity Summary

| Entity | Purpose |
| :--- | :--- |
| `users` | Stores user account profiles, authentication hashes, and status flags. |
| `refresh_tokens` | Manages persistent user authentication sessions. |
| `urls` | Stores mappings between long destination URLs and shortened URL aliases. |
| `email_verification_tokens` | Stores tokens for verifying newly registered user email addresses. |
| `password_reset_tokens` | Stores temporary tokens for password recovery flows. |

---

## 5. Table Definitions

### Table: users

#### Purpose
Stores user profile information, authentication credentials, and account state settings.

#### Columns

| Column | Type | Nullable | Key | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | uuid | No | PK | Unique identifier for the user account. |
| `name` | varchar | No | | Full name of the user. |
| `email` | varchar | No | Unique | Unique email address used for authentication. |
| `password_hash` | varchar | No | | Hashed password string. |
| `is_email_verified` | boolean | No | | Indicates if the user email has been verified. |
| `is_blacklisted` | boolean | No | | Flag indicating if the user account is suspended. |
| `is_deleted` | boolean | No | | Soft-delete flag for logical deletion. |
| `last_login` | timestamp | Yes | | Timestamp of the user's last login. |
| `created_at` | timestamp | No | | Record creation timestamp. |
| `updated_at` | timestamp | No | | Record last update timestamp. |

#### Notes
- Primary key is `id` (UUID).
- Unique constraint enforced on `email`.

---

### Table: refresh_tokens

#### Purpose
Manages user session refresh tokens for authentication persistent state.

#### Columns

| Column | Type | Nullable | Key | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | bigint | No | PK | Auto-incrementing identifier. |
| `user_id` | uuid | No | FK | Foreign key field pointing to `users.id`. |
| `token_hash` | varchar | No | | Hashed value of the refresh token. |
| `is_revoked` | boolean | No | | Flag indicating if the token has been explicitly revoked. |
| `expires_at` | timestamp | No | | Expiration timestamp of the token. |
| `is_expired` | boolean | No | | Flag indicating if the token is expired. |
| `created_at` | timestamp | No | | Issuance timestamp. |
| `updated_at` | timestamp | No | | Record last update timestamp. |

#### Notes
- Primary key is `id` (BIGINT).
- Composite unique index on `(user_id, token_hash)`.

---

### Table: urls

#### Purpose
Stores the mapping of generated short URL aliases to their original destination URLs.

#### Columns

| Column | Type | Nullable | Key | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | bigint | No | PK | Auto-incrementing identifier. |
| `original_url` | varchar | No | | The long target URL to redirect to. |
| `short_url` | varchar | No | Unique | The unique shortened URL path/alias. |
| `created_by` | uuid | Yes | FK | References `users.id` (nullable for anonymous generation). |
| `is_deleted` | boolean | No | | Soft-delete flag for logical deletion. |
| `is_expired` | boolean | No | | Flag indicating if the URL mapping has expired. |
| `expires_at` | timestamp | Yes | | Expiration timestamp (null indicates no expiration). |
| `created_at` | timestamp | No | | Redirection creation timestamp. |
| `updated_at` | timestamp | No | | Record last update timestamp. |

#### Notes
- Primary key is `id` (BIGINT).
- Foreign key `created_by` points to `users.id`.
- Unique constraint enforced on `short_url`.
- Index on `created_by` to speed up query filtering by user.

---

### Table: email_verification_tokens

#### Purpose
Manages tokens used to verify user email addresses during sign-up.

#### Columns

| Column | Type | Nullable | Key | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | bigint | No | PK | Auto-incrementing identifier. |
| `token_hash` | varchar | No | | Hashed verification token. |
| `user_id` | uuid | No | FK | References the associated user in `users.id`. |
| `created_at` | timestamp | No | | Issuance timestamp. |
| `updated_at` | timestamp | No | | Record last update timestamp. |

#### Notes
- Primary key is `id` (BIGINT).
- Foreign key `user_id` points to `users.id`.
- Composite unique index on `(user_id, token_hash)`.

---

### Table: password_reset_tokens

#### Purpose
Manages short-lived tokens generated for user password recovery processes.

#### Columns

| Column | Type | Nullable | Key | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | bigint | No | PK | Auto-incrementing identifier. |
| `token_hash` | varchar | No | | Hashed password reset token. |
| `user_id` | uuid | No | FK | References the associated user in `users.id`. |
| `is_expired` | boolean | No | | Flag indicating if the token is expired. |
| `expires_at` | timestamp | No | | Expiration timestamp of the token. |
| `created_at` | timestamp | No | | Issuance timestamp. |
| `updated_at` | timestamp | No | | Record last update timestamp. |

#### Notes
- Primary key is `id` (BIGINT).
- Foreign key `user_id` points to `users.id`.
- Composite unique index on `(user_id, token_hash)`.

---

## 6. Relationships
- `users` &rarr; `refresh_tokens` (1:N)
- `users` &rarr; `urls` (1:N)
- `users` &rarr; `email_verification_tokens` (1:N)
- `users` &rarr; `password_reset_tokens` (1:N)

*Note: On-delete cascading behavior should be implemented for tokens to delete them automatically when the associated user is removed.*

---

## 7. Constraints
- **Primary Keys**:
  - `users.id`
  - `refresh_tokens.id`
  - `urls.id`
  - `email_verification_tokens.id`
  - `password_reset_tokens.id`
- **Foreign Keys**:
  - `urls.created_by` references `users.id`
  - `email_verification_tokens.user_id` references `users.id`
  - `password_reset_tokens.user_id` references `users.id`
  - `refresh_tokens.user_id` references `users.id` *(requires datatype alignment from `varchar` to `uuid`)*
- **Unique Constraints**:
  - `users.email`
  - `urls.short_url`
  - `refresh_tokens(user_id, token_hash)`
  - `email_verification_tokens(user_id, token_hash)`
  - `password_reset_tokens(user_id, token_hash)`

---

## 8. Indexing Strategy
- **Unique Indexes**:
  - `users(email)`
  - `urls(short_url)`
- **Foreign Key & Lookup Indexes**:
  - `urls(created_by)`
  - Composite indexes on `(user_id, token_hash)` for `refresh_tokens`, `email_verification_tokens`, and `password_reset_tokens`.

---

## 9. Data Integrity Rules
- **Type Safety**: The datatype for `refresh_tokens.user_id` must be corrected from `varchar` to `uuid` to match `users.id`. This ensures referential integrity enforcement at the database layer.
- **Orphan Prevention**: Use cascade delete rules for tokens and `set null` or cascade delete for `urls.created_by` when a user account is deleted.
- **Domain Constraints**: Ensure timestamps (`expires_at`, `created_at`, `updated_at`) are validated and updated consistently.
- **Logical Scopes**: Ensure queries utilize soft delete indicators (`is_deleted = false`) to exclude logically deleted records.

---

## 10. Scalability Considerations
- **Redirection Path Caching**: Cache active mappings of `short_url` to `original_url` (e.g., in Redis) to prevent hitting the relational database during redirects.
- **Table Partitioning**: As the `urls` table scales, consider partition schemes (e.g., by range of `created_at`) to keep the unique index on `short_url` memory-resident and lookup performance high.
- **Index Sizes**: Monitor the sizes of `urls(short_url)` and `users(email)` indexes, ensuring they fit in RAM to maintain sub-millisecond retrieval.
- **Token Pruning**: Implement background cleanup processes to regularly delete expired or revoked tokens, preventing table bloat.
