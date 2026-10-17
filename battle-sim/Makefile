.PHONY: dev build test test-backend test-frontend test-e2e clean

# Start both servers in development mode (FastAPI on :8000, Vite on :5173)
dev:
	@echo "Starting backend and frontend dev servers..."
	@python -c "import subprocess, time, webbrowser; b = subprocess.Popen(['python', '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'], cwd='backend'); time.sleep(1); f = subprocess.Popen(['npm.cmd', 'run', 'dev'], cwd='frontend'); time.sleep(2); webbrowser.open('http://localhost:5173'); b.wait(); f.wait()"

# Production build: compiles frontend to frontend/dist
build:
	@echo "Building frontend production bundle..."
	cd frontend && npm.cmd run build

# Run all test suites: backend pytest, frontend vitest, and playwright e2e
test: test-backend test-frontend test-e2e

test-backend:
	@echo "Running backend pytest..."
	python -m pytest backend/tests -v

test-frontend:
	@echo "Running frontend vitest..."
	cd frontend && npm.cmd test

test-e2e:
	@echo "Running Playwright E2E smoke tests..."
	cd frontend && npx.cmd playwright test

clean:
	@echo "Cleaning caches and temporary files..."
	@python -c "import shutil, os; [shutil.rmtree(p, ignore_errors=True) for p in ['.pytest_cache', 'backend/__pycache__', 'frontend/dist']]"
