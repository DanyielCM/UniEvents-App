# ============================================================
# Stage 1: Builder — install dependencies into a virtual env
# ============================================================
FROM python:3.13-slim AS builder

WORKDIR /app

# Create an isolated virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies first (cached layer if requirements.txt unchanged)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ============================================================
# Stage 2: Runtime — minimal image for running the app
# ============================================================
FROM python:3.13-slim AS runtime

# Copy the pre-built virtual environment from the builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create a non-root user and group for security
RUN addgroup --system app && adduser --system --ingroup app app

WORKDIR /app

# Copy source code and make entrypoint executable
COPY --chown=app:app . .
RUN chmod +x entrypoint.sh

# Switch to non-root user
USER app

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
