# OBOL inference server container.
#
# Build context must include the .gguf model file — see DEPLOY.md for
# the exact filename expected below.

FROM python:3.11-slim

# llama-cpp-python may need to compile from source depending on platform/
# version availability; these are the build tools that requires.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY obol_server.py lore_store.py system_prompt.txt ./

# Model file — must match this exact name in the build context.
COPY qwen2.5-coder-1.5b-instruct-q8_0.gguf ./model.gguf

ENV OBOL_MODEL_PATH=/app/model.gguf
# Override at deploy time with the real frontend origin — do not ship
# this default to a publicly reachable endpoint.
ENV OBOL_ALLOWED_ORIGIN=*

EXPOSE 8765

CMD ["gunicorn", "--bind", "0.0.0.0:8765", "--workers", "1", "--timeout", "120", "obol_server:app"]
