RabbitMQ directory

This folder stores RabbitMQ configuration artifacts for local/dev use.

Files:
- definitions.json — optional exported definitions (vhosts, users, permissions, policies)

Usage:
- The docker-compose currently uses the official RabbitMQ image. To auto-load definitions, mount `definitions.json` and pass `RABBITMQ_SERVER_ADDITIONAL_ERL_ARGS` or `RABBITMQ_LOAD_DEFINITIONS` env as needed.
- Keep production credentials out of source control.


