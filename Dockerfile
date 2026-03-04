FROM python:3.12-slim-bookworm

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

ENV PYTHONPATH=/app
ENV CORS_ORIGINS="http://localhost:3000,https://*.leapcell.dev,https://*.vercel.app"
ENV IDSS_PROJECT_ROOT=/app

CMD ["uvicorn", "backend.app.entry:app", "--host", "0.0.0.0", "--port", "8080"]
