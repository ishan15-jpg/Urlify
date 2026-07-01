# Urlify

Urlify is a scalable, highly available URL shortening service designed to convert complex links into compact, unique, and shareable aliases with minimal redirection latency.

## Key Features

- **Shortening & Redirection**: Generate unique short links with user-defined expiration periods and low-latency redirects.
- **Authentication & Security**: Fully-featured auth including registration, email verification, and JWT-based session management.
- **Administrative Control**: Admin tools to manage user states, soft-delete accounts, and track shortened link metrics.
- **Modular Architecture**: A modular monolithic system designed to handle heavy read volumes (up to 20,000 average read RPS).

## Documentation

For technical details, see the directory [documents](documents):
- [Product Requirements (PRD)](documents/prd.md)
- [System Design Document](documents/system-design-doc.md)
- [Database Design Document](documents/database-design-doc.md)
- [API Design](documents/api-desgin-doc.md)
- [OpenAPI Specs](documents/openapi.yaml)  
*Note: This project is active and this documentation is subject to update as implementation progresses.*
