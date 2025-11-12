NiFi directory

This folder is a placeholder for Apache NiFi assets used by the system for ETL/log processing.

Suggested structure:
- flow_templates/ — export/import flow templates (*.json, *.xml)
- conf/ — custom configuration files (e.g., bootstrap.conf overrides)
- docs/ — notes and diagrams for dataflows

Notes:
- The current docker-compose uses the official NiFi image. If you want NiFi to auto-load flows, mount your templates and import them via the NiFi UI or use a startup script.
- Keep credentials and secrets out of this repository. Use environment variables or Docker secrets.


