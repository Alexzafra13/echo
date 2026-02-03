# ============================================
# ECHO STEMS PLUGIN
# ============================================
# Python + Demucs for audio stem separation
# Run as optional sidecar container
# ============================================

FROM python:3.11-slim

LABEL org.opencontainers.image.title="Echo Stems Plugin" \
      org.opencontainers.image.description="Audio stem separation plugin for Echo Music Server"

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
# Using CPU-only PyTorch to reduce image size
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Create non-root user
RUN useradd -m -u 1001 stems && \
    mkdir -p /app/data /app/models && \
    chown -R stems:stems /app

USER stems

# Expose API port
ENV PORT=5000
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')"

# Run the API server
CMD ["python", "app.py"]
