FROM node:22-slim

RUN apt-get update && apt-get install -y python3 python3-pip python3-venv && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN python3 -m venv /opt/venv && /opt/venv/bin/pip install -r backend/requirements.txt
RUN cd frontend && corepack enable && corepack prepare pnpm@latest --activate && pnpm install && pnpm run build

EXPOSE 3000

CMD ["bash", "-c", "cd backend && /opt/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 & cd frontend && pnpm start -p 3000"]
