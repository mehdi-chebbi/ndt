FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies including GDAL
RUN apt-get update && apt-get install -y \
    gdal-bin \
    python3-gdal \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .

# Copy country boundary GeoJSON files (used by gdalwarp -cutline)
COPY geojson/ /app/geojson/

# Create output directory
RUN mkdir -p /tmp/clipped

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:3005/health')" || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3005"]
