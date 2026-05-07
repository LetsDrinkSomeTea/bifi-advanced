.PHONY: dev up down logs migrate db-generate db-setup db-studio shell

DC = docker compose -f docker-compose.dev.yml

# Start full dev stack (build if needed)
dev:
	$(DC) up --build --renew-anon-volumes

# Start in background
up:
	$(DC) up -d --build --renew-anon-volumes

# Stop services
down:
	$(DC) down

# Follow logs
logs:
	$(DC) logs -f

# App logs only
logs-app:
	$(DC) logs -f app

# Generate migration SQL from schema (run after changing schema.ts)
db-generate:
	$(DC) --profile tools run --rm migrate sh -c "npm run db:generate"

# Apply pending migrations
migrate:
	$(DC) --profile tools run --rm migrate

# First-time setup: generate + migrate in one step
db-setup: db-generate migrate

# Open Drizzle Studio (then open http://localhost:4983)
db-studio:
	$(DC) exec app npm run db:studio

# Shell into running app container
shell:
	$(DC) exec app sh

# Run static analysis
lint:
	$(DC) exec app npm run lint

format:
	$(DC) exec app npm run format

typecheck:
	$(DC) exec app npm run typecheck

check:
	$(DC) exec app npm run check

test:
	$(DC) exec app npm run test

DCT = docker compose -f docker-compose.test.yml -p bifi-test

test-isolated:
	$(DCT) up --build --exit-code-from tester; \
	RET=$$?; \
	$(DCT) down -v; \
	exit $$RET
