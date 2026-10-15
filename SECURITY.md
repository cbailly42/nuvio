# Security Policy

## Supported versions

Only the latest release of Nuvio receives security fixes. Please update to the newest version before you report a problem.

| Version | Supported |
|---|---|
| Latest release | Yes |
| Older releases | No |

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately through [GitHub private vulnerability reporting](https://github.com/kczepiec/nuvio/security/advisories/new). Include the Nuvio and Home Assistant versions, what an attacker could do and the steps to reproduce it.

You can expect a first answer within a few days. When the problem is confirmed, a fix is released as soon as possible and you will be credited in the release notes unless you prefer not to be.

## What is in scope

Nuvio is a frontend plugin that runs in the browser with the rights of the signed in Home Assistant user. Reports about Nuvio itself are in scope, for example cross site scripting through entity names or card settings, leaking data between users of a shared dashboard, or bypassing the wall tablet PIN lock in a way that exposes more than the dashboard.

The wall tablet PIN lock only keeps a tablet from casual use and does not replace the Home Assistant password. Problems in Home Assistant itself or in other integrations should be reported to their own projects.
