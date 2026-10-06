#!/bin/bash
set -e

# Install & start backend
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 &
cd ..

# Install, build & start frontend on Railway's PORT
cd frontend
pnpm install
pnpm run build
pnpm run start -- -p ${PORT:-3000}
