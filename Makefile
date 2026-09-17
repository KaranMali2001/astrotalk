.PHONY: start dev-install dev-start dev prod prod-install prod-start prod-build redis-start redis-check

# Check if Redis container exists and start/create it
redis-check:
	@echo "Checking Redis container..."
	@if docker ps -a --filter "name=astrotalkclone" --format "{{.Names}}" | grep -q "^astrotalkclone$$"; then \
		echo "Redis container 'astrotalkclone' exists. Starting it..."; \
		docker start astrotalkclone || true; \
	else \
		echo "Redis container 'astrotalkclone' does not exist. Creating it..."; \
		docker run -d --name astrotalkclone -p 6379:6379 redis:latest || docker start astrotalkclone; \
	fi
	@echo "Redis is running on localhost:6379"

# Start Redis
redis-start: redis-check

# Install all dependencies
dev-install:
	@echo "Installing API dependencies..."
	cd API && pnpm install
	@echo "\nInstalling Next.js Frontend dependencies..."
	cd nextjs-frontend && pnpm install
	@echo "\nInstalling Production Frontend dependencies..."
	cd Prod-Frontend && pnpm install
	@echo "\nInstalling WebSocket dependencies..."
	cd Websocket && pnpm install

# Start development servers
dev-start: redis-start
	@echo "Starting development servers..."
	@echo "API: http://localhost:3000"
	@echo "Frontend: http://localhost:5173"
	cd API && pnpm run dev & \
	cd Prod-Frontend && pnpm run dev

# Alias for dev-start
start: dev-start

# Start development servers with dev command
dev: redis-start
	@echo "Starting development servers..."
	@echo "WebSocket Server: http://localhost:8080"
	@echo "Next.js Frontend: http://localhost:3001"
	@echo "API: http://localhost:3000"
	cd API && pnpm run dev & \
	cd nextjs-frontend && pnpm run dev & \
	cd Websocket && pnpm run dev

# Install all dependencies for production
prod-install:
	@echo "Installing production dependencies..."
	@echo "Installing API dependencies..."
	cd API && pnpm install
	@echo "Installing Next.js Frontend dependencies..."
	cd nextjs-frontend && pnpm install
	@echo "Installing WebSocket dependencies..."
	cd Websocket && pnpm install
	@echo "Generating Prisma client..."
	cd API && pnpm run generate
	@echo "All dependencies installed and Prisma client generated!"

# Build all services for production
prod-build: prod-install
	@echo "Building production services..."
	@echo "Building API..."
	cd API && pnpm run build
	@echo "Building Next.js Frontend..."
	cd nextjs-frontend && pnpm run build
	@echo "Building WebSocket Server..."
	cd Websocket && pnpm run build
	@echo "All services built successfully!"

# Start production servers
prod-start: redis-start
	@echo "Starting production servers..."
	@echo "Starting API on http://localhost:3000..."
	cd API && pnpm run start &
	@echo "Starting Next.js Frontend on http://localhost:3000..."
	cd nextjs-frontend && PORT=3000 pnpm run start &
	@echo "Starting WebSocket Server on http://localhost:8080..."
	cd Websocket && pnpm run start &
	@echo "All production services started!"
	@echo "API: http://localhost:3000"
	@echo "Next.js Frontend: http://localhost:3000"
	@echo "WebSocket Server: http://localhost:8080"

# Complete production setup: install, build, and start everything
prod: prod-build prod-start
	@echo "✅ Production environment is ready!"
