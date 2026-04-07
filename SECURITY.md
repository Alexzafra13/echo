# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Echo, **please do not open a public issue**.

Instead, report it privately via [GitHub Security Advisories](https://github.com/Alexzafra13/echo/security/advisories/new).

Please include:

- A description of the vulnerability
- Steps to reproduce it
- The potential impact
- Suggested fix (if any)

You should receive an initial response within **72 hours**. We will work with you to understand the issue and coordinate a fix before any public disclosure.

## Scope

The following areas are considered in scope:

- **Authentication & authorization** — JWT handling, session management, user roles
- **API** — REST endpoints, input validation, injection vulnerabilities
- **WebSocket** — Real-time communication and event handling
- **Federation** — Server-to-server communication and trust
- **File access** — Library scanning, media file serving, path traversal
- **Docker deployment** — Default configuration, exposed ports, secrets management
- **Dependencies** — Known vulnerabilities in third-party packages

## Out of Scope

- Vulnerabilities in upstream dependencies that are already publicly disclosed (please open a regular issue instead)
- Denial of service attacks against self-hosted instances
- Social engineering
- Issues requiring physical access to the host

## Disclosure Policy

We follow coordinated disclosure. Once a fix is released, we will:

1. Credit the reporter (unless anonymity is requested)
2. Publish a security advisory on GitHub
3. Release a patched version

Thank you for helping keep Echo and its users safe.
