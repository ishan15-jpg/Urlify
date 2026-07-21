# API Documentation

This document covers two services sharing the same API gateway and conventions: **Authify** (authentication & user management) and **Snip** (URL shortening).

## Base URL

```
https://api.yourapp.com/api/v1
```

## Authentication Scheme

This API uses **Bearer JWT** authentication for protected routes.

```
Authorization: Bearer <access_token>
```

- Unless explicitly marked **(Authenticated)**, all routes below are public.
- Tokens are issued on successful login and must be included in the `Authorization` header for protected routes.
- Access tokens expire in **15 minutes**; call `POST /auth/refresh` (see [§7](#7-post-authrefresh)) to get a new one without forcing re-login.

## Standard Response Envelope

All responses — success or error — follow this shape so clients can parse predictably:

**Success**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Human-readable message",
  "data": {},
  "meta": {
    "requestId": "req_7c2563a341704890",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

**Error**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Human-readable error message",
  "error": "ErrorType",
  "path": "/api/v1/auth/login",
  "meta": {
    "requestId": "req_1ec13c7a144b4c1a",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

| `meta` field | Type   | Description                                              |
|--------------|--------|------------------------------------------------------------|
| requestId    | string | Unique ID for this request — log it server-side and surface it in support/bug reports so any request can be traced end-to-end |
| timestamp    | string | ISO 8601 UTC timestamp of when the response was generated  |

> 💡 **Tip:** Generate `requestId` at the very start of your request pipeline (e.g., in middleware) rather than per-controller — that way it's available to attach to *every* log line for that request, not just the final response.

---

## Table of Contents

**Section 1 — Authentication**
1. [POST /auth/login](#1-post-authlogin)
2. [POST /auth/register](#2-post-authregister)
3. [POST /auth/email-verification-link](#3-post-authemail-verification-link)
4. [POST /auth/verify-email](#4-post-authverify-email)
5. [POST /auth/forgot-password](#5-post-authforgot-password)
6. [POST /auth/reset-password](#6-post-authreset-password)
7. [POST /auth/refresh](#7-post-authrefresh)
8. [GET /admin/users](#8-get-adminusers)
9. [PATCH /admin/users/:userId/blocklist](#9-patch-adminusersuseridblocklist)
10. [DELETE /admin/users/:userId](#10-delete-adminusersuserid)

**Section 2 — URL Shortening**
11. [POST /shorten](#11-post-shorten)
12. [GET /:shortURL](#12-get-shorturl)
13. [GET /admin/short-urls](#13-get-adminshort-urls)
14. [GET /admin/short-urls/:shortURL](#14-get-adminshort-urlsshorturl)

**Appendix**
15. [Common Error Codes](#common-error-codes)
16. [Rate Limiting](#rate-limiting)

---

# Section 1: Authentication

## 1. POST /auth/login

Authenticates a user with email and password, and issues an access token.

**Auth required:** No

### Request

```http
POST /api/v1/auth/login
Content-Type: application/json
```

| Field    | Type   | Required | Description              |
|----------|--------|----------|---------------------------|
| email    | string | Yes      | Registered user email     |
| password | string | Yes      | Account password           |

```json
{
  "email": "ishan@example.com",
  "password": "StrongP@ssw0rd!"
}
```

### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "f3a1c2e4-9b2d-4a3e-8c1a-2d4e6f8a9b0c",
      "email": "ishan@example.com",
      "name": "Ishan Sharma",
      "role": "USER",
      "isEmailVerified": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  },
  "meta": {
    "requestId": "req_c2d36dd849e54a20",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

### Error Responses

| Status | Scenario                        |
|--------|----------------------------------|
| 400    | Validation failed (missing/invalid fields) |
| 401    | Invalid email or password         |
| 403    | Email not verified / account blocklisted |
| 429    | Too many login attempts           |

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Invalid email or password",
  "error": "Unauthorized",
  "path": "/api/v1/auth/login",
  "meta": {
    "requestId": "req_7e1b5ef4191f4be8",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

> 🔒 **Note:** Return the same generic message for "user not found" and "wrong password" — never reveal which one failed. This prevents account enumeration.

---

## 2. POST /auth/register

Creates a new user account and triggers an email verification flow.

**Auth required:** No

### Request

```http
POST /api/v1/auth/register
Content-Type: application/json
```

| Field    | Type   | Required | Description                          |
|----------|--------|----------|----------------------------------------|
| name     | string | Yes      | Full name                              |
| email    | string | Yes      | Must be a valid, unique email          |
| password | string | Yes      | Min 8 chars, 1 uppercase, 1 number, 1 special char |

```json
{
  "name": "Ishan Sharma",
  "email": "ishan@example.com",
  "password": "StrongP@ssw0rd!"
}
```

### Success Response — `201 Created`

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Account created. Please verify your email to continue.",
  "data": {
    "user": {
      "id": "f3a1c2e4-9b2d-4a3e-8c1a-2d4e6f8a9b0c",
      "email": "ishan@example.com",
      "name": "Ishan Sharma",
      "isEmailVerified": false
    }
  },
  "meta": {
    "requestId": "req_44bb3e3ec32e4132",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

### Error Responses

| Status | Scenario                                  |
|--------|---------------------------------------------|
| 400    | Validation failed (weak password, invalid email format) |
| 409    | Email already registered                     |

```json
{
  "success": false,
  "statusCode": 409,
  "message": "An account with this email already exists",
  "error": "Conflict",
  "path": "/api/v1/auth/register",
  "meta": {
    "requestId": "req_dc67b6aab4084ca4",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

---

## 3. POST /auth/logout

Logs out the currently authenticated user by blacklisting their refresh token in the database and storing their access token in Redis until it expires, preventing further use.

**Auth required:** Yes — `Authorization: Bearer <access_token>`

### Request

```http
POST /api/v1/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

_No request body required._

### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged out successfully",
  "data": null,
  "meta": {
    "requestId": "req_63f6d2bca8194b63",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

### Error Responses

| Status | Scenario                              |
|--------|------------------------------------------|
| 401    | Missing, invalid, or expired access token |

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized",
  "path": "/api/v1/auth/logout",
  "meta": {
    "requestId": "req_9c4ad0bc3774418a",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

---

## 4. POST /auth/email-verification-link

Generates and sends a fresh email verification token/link to the logged-in user's registered email. Useful when the original link expired or was never received.

**Auth required:** Yes — `Authorization: Bearer <access_token>`

### Request

```http
POST /api/v1/auth/email-verification-link
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

_No request body needed — the user is identified via the access token._

### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Verification link sent to your registered email",
  "data": {
    "email": "ishan@example.com",
    "expiresIn": 3600
  },
  "meta": {
    "requestId": "req_5d8f8bc7b22e49b9",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

### Error Responses

| Status | Scenario                              |
|--------|------------------------------------------|
| 401    | Missing/invalid/expired access token      |
| 409    | Email is already verified                 |
| 429    | Resend requested too soon (cooldown active) |

```json
{
  "success": false,
  "statusCode": 409,
  "message": "This email is already verified",
  "error": "Conflict",
  "path": "/api/v1/auth/email-verification-link",
  "meta": {
    "requestId": "req_a62262a21304485e",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

> 💡 **Forward-thinking tip:** Add a cooldown (e.g., 60s) and a daily cap per user on this endpoint — it's a classic abuse vector for spamming someone's inbox or hammering your email provider's quota.

---

## 5. POST /auth/verify-email

Verifies a user's email using the token issued via the verification link.

**Auth required:** No (the token itself is the credential)

### Request

```http
POST /api/v1/auth/verify-email
Content-Type: application/json
```

| Field | Type   | Required | Description                       |
|-------|--------|----------|--------------------------------------|
| token | string | Yes      | Email verification token from the link |

```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0"
}
```

### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Email verified successfully",
  "data": {
    "email": "ishan@example.com",
    "isEmailVerified": true
  },
  "meta": {
    "requestId": "req_6419267b1d3d437b",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

### Error Responses

| Status | Scenario                          |
|--------|--------------------------------------|
| 400    | Token missing or malformed            |
| 401    | Token invalid or expired              |
| 409    | Email already verified                |

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Verification link is invalid or has expired",
  "error": "Unauthorized",
  "path": "/api/v1/auth/verify-email",
  "meta": {
    "requestId": "req_9c4ad0bc3774418a",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

---

## 6. POST /auth/forgot-password

Generates a password reset token and emails a reset link to the user.

**Auth required:** No

### Request

```http
POST /api/v1/auth/forgot-password
Content-Type: application/json
```

| Field | Type   | Required | Description           |
|-------|--------|----------|--------------------------|
| email | string | Yes      | Registered user email     |

```json
{
  "email": "ishan@example.com"
}
```

### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "If an account exists with this email, a reset link has been sent",
  "data": null,
  "meta": {
    "requestId": "req_b839d9cc71ec4b13",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

### Error Responses

| Status | Scenario                  |
|--------|------------------------------|
| 400    | Invalid email format          |
| 429    | Too many reset requests in a short window |

```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "error": "TooManyRequests",
  "path": "/api/v1/auth/forgot-password",
  "meta": {
    "requestId": "req_7c3d5b97ba56400c",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

> 🔒 **Security note:** Always return the same `200` success message whether or not the email exists in your system. A `404` here is a textbook account-enumeration leak.

---

## 7. POST /auth/reset-password

Resets the user's password using the token issued by `/forgot-password`.

**Auth required:** No (the token is the credential)

### Request

```http
POST /api/v1/auth/reset-password
Content-Type: application/json
```

| Field            | Type   | Required | Description                       |
|-------------------|--------|----------|--------------------------------------|
| token             | string | Yes      | Password reset token from the email link |
| newPassword       | string | Yes      | Min 8 chars, 1 uppercase, 1 number, 1 special char |
| confirmPassword   | string | Yes      | Must match `newPassword`             |

```json
{
  "token": "z9y8x7w6v5u4t3s2r1q0",
  "newPassword": "NewStrongP@ss1",
  "confirmPassword": "NewStrongP@ss1"
}
```

### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password reset successfully. Please log in with your new password.",
  "data": null,
  "meta": {
    "requestId": "req_5de2dd040e65479a",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

### Error Responses

| Status | Scenario                                  |
|--------|---------------------------------------------|
| 400    | Validation failed / passwords don't match    |
| 401    | Reset token invalid or expired                |

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Passwords do not match",
  "error": "BadRequest",
  "path": "/api/v1/auth/reset-password",
  "meta": {
    "requestId": "req_f70351b9f9924d89",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

> 💡 **Tip:** Invalidate all existing sessions/refresh tokens for the user right after a password reset — a classic gap if you skip it.

---

## 8. POST /auth/refresh

Issues a new short-lived access token using a valid refresh token, so the user stays logged in without re-entering credentials.

**Auth required:** No `Authorization` header needed — the refresh token itself is the credential.

### Request

The refresh token is sent via an **httpOnly, Secure, SameSite=Strict cookie** (set during login), not in the request body. This keeps it inaccessible to JavaScript and reduces XSS-based theft risk.

```http
POST /api/v1/auth/refresh
Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

_No request body required._

> ⚠️ **Alternative (not recommended):** Some clients (mobile apps without cookie support) send the refresh token in the JSON body instead: `{ "refreshToken": "..." }`. If you support this, ensure it's only ever sent over HTTPS and never logged.

### Success Response — `200 OK`

A new access token is returned in the body. If you implement **refresh token rotation** (recommended), a new refresh token is also issued via `Set-Cookie`, replacing the old one.

```http
Set-Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh
```

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Access token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  },
  "meta": {
    "requestId": "req_9a4c2e7b3f1d4860",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

### Error Responses

| Status | Scenario                                          |
|--------|------------------------------------------------------|
| 400    | Refresh token missing (no cookie/body present)        |
| 401    | Refresh token invalid or expired                       |
| 403    | Refresh token reused after rotation (possible theft) — all sessions for that user are revoked |

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Refresh token is invalid or has expired. Please log in again.",
  "error": "Unauthorized",
  "path": "/api/v1/auth/refresh",
  "meta": {
    "requestId": "req_5d8e1f4a2b9c4730",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

> 🔒 **Security note — reuse detection:** With rotation, each refresh token should be valid for exactly one use. If a refresh token is presented a second time after it's already been rotated out, that's a strong signal of token theft — revoke **every** active session for that user immediately and force a fresh login, rather than just rejecting that one request.

> 💡 **Forward-thinking tip:** Store refresh tokens server-side (hashed, like passwords) keyed by a token family/session ID rather than trusting the JWT alone. That way you can revoke a single session on logout, or all sessions on suspected compromise, without waiting for token expiry.

---

## 9. GET /admin/users

Returns a paginated list of all users. Admin-only.

**Auth required:** Yes — `Authorization: Bearer <access_token>` (role: `ADMIN`)

### Request

```http
GET /api/v1/admin/users?page=1&limit=20&search=ishan&status=active
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

| Query Param | Type   | Required | Description                                   |
|-------------|--------|----------|------------------------------------------------|
| page        | number | No       | Page number (default: 1)                       |
| limit       | number | No       | Items per page (default: 20, max: 100)          |
| search      | string | No       | Filter by name/email                            |
| status      | string | No       | `active` \| `blocklisted` \| `unverified`        |

### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users fetched successfully",
  "data": {
    "users": [
      {
        "id": "f3a1c2e4-9b2d-4a3e-8c1a-2d4e6f8a9b0c",
        "name": "Ishan Sharma",
        "email": "ishan@example.com",
        "role": "USER",
        "isEmailVerified": true,
        "isBlocklisted": false,
        "createdAt": "2026-01-15T08:30:00.000Z"
      }
    ],
    "pagination": {
      "totalItems": 142,
      "currentPage": 1,
      "totalPages": 8,
      "limit": 20
    }
  },
  "meta": {
    "requestId": "req_88ab47461b104f20",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

### Error Responses

| Status | Scenario                          |
|--------|--------------------------------------|
| 401    | Missing/invalid access token          |
| 403    | Authenticated user is not an admin     |

```json
{
  "success": false,
  "statusCode": 403,
  "message": "You do not have permission to access this resource",
  "error": "Forbidden",
  "path": "/api/v1/admin/users",
  "meta": {
    "requestId": "req_41ae983e20114839",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

---

## 10. PATCH /admin/users/:userId/blocklist

Blocklists (or un-blocklists) a user account, preventing future logins. Admin-only.

**Auth required:** Yes — `Authorization: Bearer <access_token>` (role: `ADMIN`)

### Request

```http
PATCH /api/v1/admin/users/f3a1c2e4-9b2d-4a3e-8c1a-2d4e6f8a9b0c/blocklist
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

| Field      | Type    | Required | Description                              |
|------------|---------|----------|---------------------------------------------|
| blocklisted| boolean | Yes      | `true` to blocklist, `false` to lift it      |
| reason     | string  | No       | Internal note for audit logs                 |

```json
{
  "blocklisted": true,
  "reason": "Multiple reports of abusive behavior"
}
```

### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User has been blocklisted successfully",
  "data": {
    "id": "f3a1c2e4-9b2d-4a3e-8c1a-2d4e6f8a9b0c",
    "isBlocklisted": true,
    "blocklistedAt": "2026-06-29T10:15:30.000Z"
  },
  "meta": {
    "requestId": "req_c70a49e0c69840d9",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

### Error Responses

| Status | Scenario                              |
|--------|------------------------------------------|
| 401    | Missing/invalid access token              |
| 403    | Authenticated user is not an admin         |
| 404    | User not found                             |
| 409    | Admin attempting to blocklist themselves / another admin (if disallowed by policy) |

```json
{
  "success": false,
  "statusCode": 404,
  "message": "User not found",
  "error": "NotFound",
  "path": "/api/v1/admin/users/f3a1c2e4-9b2d-4a3e-8c1a-2d4e6f8a9b0c/blocklist",
  "meta": {
    "requestId": "req_9c4c0daec521462d",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

> 💡 **Tip:** On blocklisting, immediately revoke that user's active sessions/refresh tokens so the block takes effect right away rather than only on next login attempt.

---

## 11. DELETE /admin/users/:userId

Permanently deletes a user account. Admin-only.

**Auth required:** Yes — `Authorization: Bearer <access_token>` (role: `ADMIN`)

### Request

```http
DELETE /api/v1/admin/users/f3a1c2e4-9b2d-4a3e-8c1a-2d4e6f8a9b0c
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User account deleted successfully",
  "data": {
    "id": "f3a1c2e4-9b2d-4a3e-8c1a-2d4e6f8a9b0c",
    "deletedAt": "2026-06-29T10:15:30.000Z"
  },
  "meta": {
    "requestId": "req_4940724d48e24516",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

### Error Responses

| Status | Scenario                          |
|--------|--------------------------------------|
| 401    | Missing/invalid access token          |
| 403    | Authenticated user is not an admin     |
| 404    | User not found                         |

```json
{
  "success": false,
  "statusCode": 404,
  "message": "User not found",
  "error": "NotFound",
  "path": "/api/v1/admin/users/f3a1c2e4-9b2d-4a3e-8c1a-2d4e6f8a9b0c",
  "meta": {
    "requestId": "req_996747f9a9664e01",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

> 💡 **Forward-thinking tip:** Consider a **soft delete** (`deletedAt` timestamp + anonymized PII) instead of a hard delete — it keeps you audit-friendly and recoverable for accidental admin actions, while still meeting "right to erasure" needs if you scrub PII on the soft-deleted record.

---

# Section 2: URL Shortening

## 12. POST /shorten

Creates a shortened URL for a given destination link.

**Auth required:** Optional. Anonymous users can shorten URLs with default settings. Authenticated users additionally get ownership tracking, custom aliases, and expiry control.

### Request

```http
POST /api/v1/shorten
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (optional)
```

| Field        | Type   | Required | Description                                                        |
|--------------|--------|----------|------------------------------------------------------------------------|
| originalUrl  | string | Yes      | The destination URL. Must be a valid `http`/`https` URL.                |
| customAlias  | string | No       | Requested short code (4–20 chars, alphanumeric + hyphens). **Requires authentication.** |
| expiresAt    | string | No       | ISO 8601 expiry timestamp. **Requires authentication.** Omit for a non-expiring link. |

```json
{
  "originalUrl": "https://example.com/blog/system-design-interview-prep-guide",
  "customAlias": "sd-prep",
  "expiresAt": "2026-12-31T23:59:59.000Z"
}
```

### Success Response — `201 Created`

```json
{
  "success": true,
  "statusCode": 201,
  "message": "URL shortened successfully",
  "data": {
    "shortCode": "sd-prep",
    "shortUrl": "https://snip.io/sd-prep",
    "originalUrl": "https://example.com/blog/system-design-interview-prep-guide",
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "createdAt": "2026-06-29T10:15:30.000Z"
  },
  "meta": {
    "requestId": "req_3b7e9f1a4c2d4e85",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

### Error Responses

| Status | Scenario                                              |
|--------|----------------------------------------------------------|
| 400    | `originalUrl` missing or not a valid URL                  |
| 401    | `customAlias` or `expiresAt` provided without authentication |
| 409    | `customAlias` already taken                                |
| 422    | URL points to a known malicious/blocklisted domain          |
| 429    | Anonymous shortening rate limit exceeded                    |

```json
{
  "success": false,
  "statusCode": 409,
  "message": "This custom alias is already in use",
  "error": "Conflict",
  "path": "/api/v1/shorten",
  "meta": {
    "requestId": "req_e41a6c2f9b3d4170",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

> 🔒 **Security note:** Screen `originalUrl` against a safe-browsing/threat-intelligence API (e.g., Google Safe Browsing) before generating a short code. URL shorteners are a favorite phishing vector since the destination is hidden — don't let your service become a redirect-for-malware machine.

> 💡 **Forward-thinking tip:** For auto-generated short codes, use a base62-encoded counter or sequence (not a naive random string) to avoid collision retries at scale, and reserve a denylist of codes that collide with your own routes (e.g., `admin`, `api`, `login`).

---

## 13. GET /:shortURL

Redirects the client to the original destination URL associated with a short code.

**Auth required:** No

### Request

```http
GET /sd-prep
```

_`:shortURL` is the generated short code (e.g., `sd-prep`), not a full URL — it's just named to match the route segment._

### Success Response — `302 Found`

No JSON body is returned on success — the response is an HTTP redirect.

```http
HTTP/1.1 302 Found
Location: https://example.com/blog/system-design-interview-prep-guide
```

> Click metadata (timestamp, referrer, user agent, coarse geo from IP) should be logged **asynchronously** after issuing the redirect — never make the user wait on analytics writes before they reach their destination.

### Error Responses

These return the standard JSON error envelope, since there's no destination to redirect to.

| Status | Scenario                          |
|--------|--------------------------------------|
| 404    | Short code does not exist             |
| 410    | Short URL has expired                  |

```json
{
  "success": false,
  "statusCode": 410,
  "message": "This short link has expired",
  "error": "Gone",
  "path": "/sd-prep",
  "meta": {
    "requestId": "req_82c4f1e7a9b34d62",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

> 💡 **Tip:** Use `302 Found` rather than `301 Moved Permanently`. A `301` gets cached by browsers/CDNs, which means you lose the ability to update the destination, expire the link, or reliably count clicks on subsequent visits.

---

## 14. GET /admin/short-urls

Returns a paginated list of all short URLs in the system, for moderation and oversight. Admin-only.

**Auth required:** Yes — `Authorization: Bearer <access_token>` (role: `ADMIN`)

### Request

```http
GET /api/v1/admin/short-urls?page=1&limit=20&search=example.com&sortBy=clicks&status=active
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

| Query Param | Type   | Required | Description                                          |
|-------------|--------|----------|----------------------------------------------------------|
| page        | number | No       | Page number (default: 1)                                  |
| limit       | number | No       | Items per page (default: 20, max: 100)                     |
| search      | string | No       | Filter by `shortCode` or `originalUrl`                       |
| sortBy      | string | No       | `clicks` \| `createdAt` (default: `createdAt`)               |
| status      | string | No       | `active` \| `expired`                                        |

### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Short URLs fetched successfully",
  "data": {
    "shortUrls": [
      {
        "id": "9c4d2a1b-7e3f-4a8c-9b1d-3e5f7a9c1b2d",
        "shortCode": "sd-prep",
        "originalUrl": "https://example.com/blog/system-design-interview-prep-guide",
        "ownerId": "f3a1c2e4-9b2d-4a3e-8c1a-2d4e6f8a9b0c",
        "clicks": 482,
        "isActive": true,
        "createdAt": "2026-06-29T10:15:30.000Z",
        "expiresAt": "2026-12-31T23:59:59.000Z"
      }
    ],
    "pagination": {
      "totalItems": 364,
      "currentPage": 1,
      "totalPages": 19,
      "limit": 20
    }
  },
  "meta": {
    "requestId": "req_15a8b3d2e4f9c760",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

### Error Responses

| Status | Scenario                          |
|--------|--------------------------------------|
| 401    | Missing/invalid access token          |
| 403    | Authenticated user is not an admin     |

```json
{
  "success": false,
  "statusCode": 403,
  "message": "You do not have permission to access this resource",
  "error": "Forbidden",
  "path": "/api/v1/admin/short-urls",
  "meta": {
    "requestId": "req_6f1e9c3a2b4d8750",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

---

## 15. GET /admin/short-urls/:shortURL

Returns detailed metadata and click analytics for a single short URL. Admin-only.

**Auth required:** Yes — `Authorization: Bearer <access_token>` (role: `ADMIN`)

### Request

```http
GET /api/v1/admin/short-urls/sd-prep
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Short URL details fetched successfully",
  "data": {
    "id": "9c4d2a1b-7e3f-4a8c-9b1d-3e5f7a9c1b2d",
    "shortCode": "sd-prep",
    "originalUrl": "https://example.com/blog/system-design-interview-prep-guide",
    "ownerId": "f3a1c2e4-9b2d-4a3e-8c1a-2d4e6f8a9b0c",
    "isActive": true,
    "createdAt": "2026-06-29T10:15:30.000Z",
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "analytics": {
      "totalClicks": 482,
      "clicksLast7Days": [12, 30, 45, 28, 60, 51, 40]
    }
  },
  "meta": {
    "requestId": "req_4c2e8b1d9a3f5760",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

### Error Responses

| Status | Scenario                          |
|--------|--------------------------------------|
| 401    | Missing/invalid access token          |
| 403    | Authenticated user is not an admin     |
| 404    | Short URL not found                    |

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Short URL not found",
  "error": "NotFound",
  "path": "/api/v1/admin/short-urls/sd-prep",
  "meta": {
    "requestId": "req_7d3f1a9c2e4b8650",
    "timestamp": "2026-06-29T10:15:30.000Z"
  }
}
```

> 💡 **Tip:** Aggregate `clicksLast7Days`/`topReferrers`/`topCountries` from a separate analytics table (or even a time-series store) rather than computing them on read from raw click logs — it keeps this admin endpoint fast as click volume grows.

---

## Common Error Codes

| Status Code | Error            | Typical Cause                                  |
|--------------|------------------|--------------------------------------------------|
| 400          | BadRequest       | Validation failure on request body/params          |
| 401          | Unauthorized     | Missing, invalid, or expired token/credentials      |
| 403          | Forbidden        | Authenticated but lacking required role/permission  |
| 404          | NotFound         | Resource (user/token) does not exist                |
| 409          | Conflict         | Duplicate resource or invalid state transition       |
| 410          | Gone             | Resource existed but is no longer available (e.g., expired short URL) |
| 422          | UnprocessableEntity | Semantically invalid input (rare, business-rule violations) |
| 429          | TooManyRequests  | Rate limit exceeded                                 |
| 500          | InternalServerError | Unhandled server-side failure                    |

## Rate Limiting

| Endpoint                          | Limit                          |
|------------------------------------|----------------------------------|
| `POST /auth/login`                 | 5 requests / 15 min / IP+email   |
| `POST /auth/register`              | 5 requests / hour / IP            |
| `POST /auth/email-verification-link` | 1 request / 60 sec / user      |
| `POST /auth/forgot-password`       | 3 requests / hour / email         |
| `POST /auth/refresh`               | 10 requests / 5 min / refresh token |
| `POST /shorten`                    | 10 requests / hour / IP (anonymous) — relaxed or removed for authenticated users |
| `GET /:shortURL`                   | 100 requests / min / IP (protects against redirect-abuse/scraping) |

Rate-limited responses include standard headers:

```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1719655200
```
