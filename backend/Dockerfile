FROM oven/bun:1

# Install Python and geospatial dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    gdal-bin \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment and install Python packages
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python geospatial libraries
RUN pip install --no-cache-dir \
    rasterio \
    shapely \
    numpy

WORKDIR /app

# Copy package files
COPY package.json ./

# Remove existing lockfile and install fresh
RUN rm -f bun.lock && bun install --production

# Copy source code
COPY . .

EXPOSE 3001

CMD ["bun", "run", "src/index.ts"]