#!/bin/bash
set -e

# Install & start backend
cd backend
python3 -m venv /opt/venv && /opt/venv/bin/pip install -r requirements.txt
/opt/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 &
cd ..

# Install, build & start frontend on Railway's PORT
cd frontend
npx -y pnpm@latest install
npx -y pnpm@latest install
npx -y pnpm@latest run build
npx -y pnpm@latest run start -- -p ${PORT:-3000}
