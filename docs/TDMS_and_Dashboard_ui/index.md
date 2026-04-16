# TDMS And Dashboard UI

This section documents the integrated local workflow between TDMS (Test Data Management System) and the Test Case Execution Dashboard without Docker.

TDMS is used to curate and manage evaluation data. The dashboard is used to execute runs, monitor progress, and review analysis outputs.

Frontend run options in this section:

- `without NGINX`: direct development servers
- `with NGINX`: static build hosting for both UIs

## UI And Service Count

- Frontend UIs: `2`
- User-facing login interface (served by auth backend): `1`
- Backend services to run locally: `4` (`auth-service`, `tdms-backend`, `dashboard-backend`, `interface-manager`)
- Typical local processes: `6+` (4 backends + frontend processes depending on chosen mode)

## What This Section Covers

- end-to-end local setup for TDMS, dashboard, auth service, and interface manager
- both frontend run modes (with and without NGINX)
- system architecture and component responsibilities
- authentication flow and role-based access
- TDMS module usage and dashboard run workflows
- key API endpoints and troubleshooting guidance

## Chapters

- [Setup](./setup.md)
- [Architecture And Components](./architecture_and_components.md)
- [Authentication And Roles](./authentication_and_roles.md)
- [TDMS Module Guide](./tdms_module_guide.md)
- [Dashboard Workflows](./dashboard_workflows.md)
- [API Reference](./api_reference.md)
- [Troubleshooting](./troubleshooting.md)

## Typical Operator Flow

- Sign in through the centralized auth service.
- Prepare and maintain test data in TDMS.
- Move to the dashboard and start or continue test runs.
- Analyse completed runs and download reports.
- Use TDMS and dashboard history views for audit and review.
