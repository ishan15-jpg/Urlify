# High-Level System Design

## 1. System Overview

### Business Objective
Design a scalable URL shortening service (Urlify) that allows users to convert long, cumbersome URLs into compact, easy-to-share links while ensuring low-latency redirection to the original destination. The service makes it convenient to store, remember, and distribute important web addresses.

### Functional Scope
1. **URL Generation**: Allow users (authenticated or anonymous) to generate unique, shortened versions of long URLs.
2. **Time-bound Redirection**: Enable the generated short URLs to reliably redirect users to the original destination URLs for a user-defined expiration duration (validity period).
3. **Expiration Handling**: Gracefully handle expired links, displaying a clear, helpful error message to users attempting to access them.

### Target Users
Anyone who wants to shorten long, complex URLs which are difficult to remember, share, or store efficiently.

### Architectural Goals
Implement a highly available, low-latency redirection service using a modular monolith architecture. This architecture keeps initial complexity low, matching the project's current scale, while organizing components (e.g., authentication vs. url shortening) cleanly to facilitate future microservices transitions if necessary.

### Assumptions
1. Users submit valid, well-formed long URLs to shorten.
2. Redirection requests are highly read-intensive, with a read-to-write ratio of approximately 100:1.
3. The system will run on a single primary database with read replicas and a caching layer.

### Out-of-Scope Features
1. **URL Click Analytics**: In-depth analytics tracking (e.g., click counts, geography, referrer metrics, user agents) is not supported in the initial version.
2. **Frequency-based Caching**: Caching URLs based on dynamic usage frequency analysis is out of scope; the system will instead cache the top 1% most active URLs using a standard cache-aside strategy.

---

## 2. Capacity Planning and Traffic Estimation

### Assumptions
- **Daily Active Users (DAU)**: 10,000,000 (10M)
- **Monthly Active Users (MAU)**: 30,000,000 (30M)
- **Concurrent Users**: 1% of DAU = 100,000 (100K) due to short user session durations.
- **Write Volume**: Each user creates 2 shortened URLs per day on average.
- **Read Volume**: Each shortened URL is redirected 100 times per day on average.
- **Record Size**: Average database record storage size per URL mapping is 1 KB.

### User Estimation

| Metric | Value |
|:---|---:|
| Daily Active Users (DAU) | 10,000,000 |
| Monthly Active Users (MAU) | 30,000,000 |
| Concurrent Users | 100,000 |

### Traffic Estimation

| Metric | Value |
|:---|---:|
| Average Write RPS | 200 RPS |
| Peak Write RPS | 1,000 RPS |
| Average Read RPS | 20,000 RPS |
| Peak Read RPS | 100,000 RPS |

*Note: Calculations are based on:*
- *Average Write RPS = 20,000,000 writes / 86,400 seconds ≈ 231 RPS (rounded to 200 RPS in design assumptions).*
- *Average Read RPS = 2,000,000,000 reads / 86,400 seconds ≈ 23,148 RPS (rounded to 20,000 RPS in design assumptions).*
- *Peak RPS is assumed to be 5x of the average RPS.*

### Data Growth

| Metric | Value |
|:---|---:|
| Daily Growth | 20 GB |
| Annual Growth | 7.3 TB |
| Total Storage (5 Years) | 36.5 TB |

*Note: Calculations are based on:*
- *Daily Growth = 20,000,000 URLs/day * 1 KB/record = 20 GB/day.*
- *Annual Growth = 20 GB/day * 365 days ≈ 7.3 TB/year (approx. 7.5 TB/year with database indices/metadata overhead).*
- *Total Storage (5 Years) = 7.3 TB/year * 5 years ≈ 36.5 TB (approx. 38 TB with database overhead).*

---

## 3. API Surface

| Method | Endpoint | Purpose |
|:---|:---|:---|
| `POST` | `/api/v1/auth/register` | Register a new user account |
| `POST` | `/api/v1/auth/login` | Authenticate a user and issue JWT tokens |
| `POST` | `/api/v1/auth/email-verification-link` | Send email verification link |
| `POST` | `/api/v1/auth/verify-email` | Verify a user's email address |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset email |
| `POST` | `/api/v1/auth/reset-password` | Reset user password using token |
| `POST` | `/api/v1/auth/refresh` | Refresh JWT access token using refresh token |
| `GET` | `/api/v1/admin/users` | List all users (Admin only) |
| `PATCH` | `/api/v1/admin/users/:userId/blocklist` | Block or unblock a user (Admin only) |
| `DELETE` | `/api/v1/admin/users/:userId` | Soft delete a user account (Admin only) |
| `POST` | `/api/v1/shorten` | Shorten a long destination URL (Public or Authenticated) |
| `GET` | `/:shortURL` | Redirect a shortened URL to its original destination URL (Public) |
| `GET` | `/api/v1/admin/short-urls` | List all shortened URLs (Admin only) |
| `GET` | `/api/v1/admin/short-urls/:shortURL` | Retrieve details and metrics of a short URL (Admin only) |

> **Reference:** See the [API Design Document](./api-desgin-doc.md) for complete endpoint specifications.

---

## 4. Data Model Overview

### Primary Entities

- **User**: Represents registered accounts, storing credentials, profile metadata, verification states, and administrative flags.
- **Refresh Token**: Manages active user authentication sessions and JWT refresh states.
- **URL Mapping**: Holds the primary relationship mapping short URL codes/aliases to original destination URLs, including owner details, soft deletion, and expirations.
- **Email Verification Token**: Temporarily stores hashes for sign-up email confirmation flows.
- **Password Reset Token**: Manages short-lived hashes for recovery flows.

### Relationships

- **User &rarr; Refresh Token (1:N)**: A user can have multiple active devices/sessions.
- **User &rarr; URL Mapping (1:N)**: A user can own multiple shortened URLs (nullable for anonymous generation).
- **User &rarr; Email Verification Token (1:N)**: A user can request multiple verification emails.
- **User &rarr; Password Reset Token (1:N)**: A user can request multiple password reset emails.

### Persistence Strategy

A relational database system (PostgreSQL) is used as the primary source of truth, enforcing foreign keys and integrity constraints across the tables. To support low latency at high read scales (2B reads/day), a distributed key-value cache (Redis) is deployed as a cache-aside layer containing the top 1% active URL mappings.

> **Reference:** See the [Database Design Document](database-design-doc.md) for schema and indexing details.

---

## 5. Database Technology Selection

### Selected Database

PostgreSQL (Relational Database Management System)

### Justification

1. **Fixed Schema and Structured Data**: The entity attributes for users, tokens, and URL mappings are well-defined and fit a relational schema.
2. **Relational Integrity**: Strong foreign key constraints between users, URLs, and security tokens guarantee data integrity and clean cascading behavior on deletions.
3. **Strong Consistency (ACID)**: Strong consistency is required to ensure that as soon as a user shortens a URL, it is instantly available for redirect resolution without replication lag delays on the write node.
4. **Scale Suitability**: The initial scale of the application does not immediately demand complex database sharding, which PostgreSQL can easily handle when coupled with vertical scaling and read replicas.
5. **Operational Simplicity**: PostgreSQL is mature, offers high developer productivity, fits the modular monolith architecture, and includes robust tools for backup, replication, and query optimization.

### Alternatives Considered

- **NoSQL (e.g., Cassandra / MongoDB)**:
  - *Why not selected*: While Cassandra provides high write availability and linear horizontal scaling, it only guarantees eventual consistency. This could lead to a race condition where a short URL is created but fails to redirect immediately due to replication delay. MongoDB's dynamic document structure is unnecessary for this fixed schema, and both databases add operational complexity and lack native relational constraints.
- **Key-Value Stores (e.g., Redis as a primary DB)**:
  - *Why not selected*: Redis is extremely fast but operates primarily in memory. Storing 38 TB of data in RAM over 5 years is financially and operationally prohibitive. It is, however, ideal as a caching layer.

---

## 6. Infrastructure Resource Estimation

### Storage

| Resource | Estimate |
|:---|---:|
| Database | 38 TB |
| Logs | 6 TB |

*Note: Calculations are based on:*
- *Database: 5-year storage growth for URL mappings, user tables, and indexes (approx. 38 TB).*
- *Logs: 2.02B daily requests generating ~200 GB of logs/day, retained for 30 days.*

### Memory

| Resource | Estimate |
|:---|---:|
| Cache | 75 GB |

*Note: Calculations are based on:*
- *Cache: Memory required to store the top 1% active URL mappings (75 GB) in Redis.*

---

## 7. Network Bandwidth Estimation

### Assumptions

- **Average Write Request / Response Size**: 1 KB
- **Average Read Request Size**: 700 Bytes
- **Average Read Response Size (HTTP 302 Redirect)**: 300 Bytes
- **RPS Values**: Write Average = 200 RPS, Write Peak = 1,000 RPS. Read Average = 20,000 RPS, Read Peak = 100,000 RPS.

### Calculations

| Metric | Value |
|:---|---:|
| Incoming Traffic (Average) | 14.2 MB/s |
| Outgoing Traffic (Average) | 6.2 MB/s |
| Peak Bandwidth (Combined) | 102.0 MB/s |
| Daily Transfer | 2.04 TB/day |
| Monthly Transfer | 61.20 TB/month |

*Note: Calculations are based on:*
- *Incoming Traffic = (200 RPS * 1 KB) + (20,000 RPS * 700 B) = 200 KB/s + 14,000 KB/s = 14.2 MB/s.*
- *Outgoing Traffic = (200 RPS * 1 KB) + (20,000 RPS * 300 B) = 200 KB/s + 6,000 KB/s = 6.2 MB/s.*
- *Peak Incoming Traffic = (1,000 RPS * 1 KB) + (100,000 RPS * 700 B) = 1 MB/s + 70 MB/s = 71 MB/s.*
- *Peak Outgoing Traffic = (1,000 RPS * 1 KB) + (100,000 RPS * 300 B) = 1 MB/s + 30 MB/s = 31 MB/s.*
- *Peak Bandwidth (Combined) = 71 MB/s + 31 MB/s = 102 MB/s.*
- *Daily Transfer = (14.2 MB/s + 6.2 MB/s) * 86,400 seconds ≈ 2.04 TB/day.*
- *Monthly Transfer = 2.04 TB/day * 30 days = 61.2 TB/month.*

---

## 8. Architectural Trade-off Analysis

| Decision | Alternatives | Justification | Consequences |
|:---|:---|:---|:---|
| **SQL Database (PostgreSQL)** | NoSQL (MongoDB, Cassandra) | Provides strong consistency, complex queries, referential integrity for auth profiles, and low operational complexity. | Horizontal scaling of writes requires manual sharding or partitioning in the future when tables grow past single-node capability. |
| **Modular Monolith** | Microservices Architecture | Significantly reduces operational complexity, setup time, and network latency between application domains at current scale. | The application must be scaled as a single unit, and a crash or resource leak in one module affects all other modules. |
| **Synchronous Communication** | Asynchronous Event-driven Communication (Kafka/RabbitMQ) | Simplifies application architecture, code maintainability, and request tracing, as there is no tight inter-entity dependency. | Higher latency on requests that require sequential processing, and susceptible to thread exhaustion during massive traffic spikes. |
| **Cache-aside Caching (Redis)** | Write-through Caching / No Cache | Read-to-write ratio is high (100:1). Storing the top 1% active links in Redis offloads the database and provides sub-millisecond redirection latency. | Cache misses incur a latency penalty for the first read. Cache invalidation logic is needed to prevent stale mappings. |
| **Availability (AP-leaning Redirection Path)** | Strong Consistency (CP) on Redirects | High availability is prioritized for shortened URL lookups to ensure redirects work even if the primary database is momentarily unreachable. | Caching can result in serving expired or soft-deleted URLs for a short duration until cache keys expire (24h TTL) or are explicitly purged. |
| **Database Read Replicas** | Vertical Scaling Only | Offloads the highly read-intensive lookup workload (20K RPS) from the primary database, keeping replication costs low. | Introduces a replication lag, leading to eventual consistency where updates (e.g., link expirations) may take a few milliseconds to reflect on replicas. |

---

## 9. High-Level Architecture

> **Reference:** The asset is available at: [assets/high-level-architecture-diagram.png](assets/high-level-architecture-diagram.png)