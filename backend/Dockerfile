FROM python:3.13-slim AS builder

WORKDIR /app

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

FROM python:3.13-slim AS runtime

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN addgroup --system app && adduser --system --ingroup app app

WORKDIR /app

COPY --chown=app:app . .
RUN chmod +x entrypoint.sh

USER app

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
