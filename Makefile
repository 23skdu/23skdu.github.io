.PHONY: help up down logs restart lint lint-html lint-css lint-js lint-json lint-svg validate clean hooks serve serve-jekyll jekyll-build jekyll-down

LINT := docker compose run --rm -T lint

help:
	@echo "Targets:"
	@echo "  up          Start the local dev server (http://localhost:8080)"
	@echo "  down        Stop the local dev server"
	@echo "  logs        Tail dev server logs"
	@echo "  restart     Restart the dev server"
	@echo "  serve       Serve this branch via Jekyll (branch-aware port)"
	@echo "  jekyll-build Build the site with Jekyll (validates build)"
	@echo "  lint        Run all linters/validators"
	@echo "  validate    Alias for lint (pre-publish checks)"
	@echo "  clean       Remove venv, caches, containers and lint image"
	@echo "  hooks       Install pre-commit hooks"

up:
	docker compose up -d web

down:
	docker compose down

logs:
	docker compose logs -f web

restart: down up

# Jekyll local preview (branch-aware port via scripts/serve.sh)
serve: serve-jekyll

serve-jekyll:
	./scripts/serve.sh

jekyll-build:
	docker build -t 23skdu-jekyll:local -f Dockerfile .
	docker run --rm -v "$(PWD):/srv/jekyll" 23skdu-jekyll:local sh -c 'cd /srv/jekyll && jekyll build'

jekyll-down:
	docker rm -f jekyll-$(shell git rev-parse --abbrev-ref HEAD 2>/dev/null | tr '/' '-') 2>/dev/null || true

lint-html:
	$(LINT) sh -c 'htmlhint "*.html"'

lint-css:
	$(LINT) sh -c 'stylelint "*.css"'

lint-js:
	$(LINT) sh -c 'eslint script.js'

lint-json:
	$(LINT) sh -c 'for f in data/*.json; do echo "validating $$f"; jq empty "$$f"; done'

lint-svg:
	$(LINT) sh -c 'for f in favicon.svg images/*.svg; do echo "validating $$f"; xmllint --noout "$$f"; done'

lint: lint-html lint-css lint-js lint-json lint-svg

validate: lint

clean:
	rm -rf .venv venv env
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	find . -type f -name '*.pyc' -delete
	rm -rf .pytest_cache .mypy_cache .ruff_cache .cache node_modules
	docker compose down --rmi local --volumes --remove-orphans

hooks:
	python3 -m pip install --quiet --break-system-packages pre-commit
	python3 -m pre_commit install
