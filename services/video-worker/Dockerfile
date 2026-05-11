# syntax=docker/dockerfile:1.7

# ─── Builder: install deps with full toolchain available ───────────────────────
FROM node:20-bookworm AS builder

WORKDIR /app

# Skip Puppeteer's bundled Chromium download — we install system chromium below.
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package.json package-lock.json ./
# include=optional ensures any optional native bin (e.g. ffmpeg shims) are kept.
RUN npm ci --include=optional

# Pre-fetch hyperframes so the first render isn't a cold install during a job.
RUN npx --yes hyperframes@latest --version || true

# ─── Runtime: minimal image with chromium + ffmpeg + worker source ─────────────
FROM node:20-bookworm-slim AS runtime

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    HYPERFRAMES_BROWSER_PATH=/usr/bin/chromium \
    CHROMIUM_PATH=/usr/bin/chromium \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    FFPROBE_PATH=/usr/bin/ffprobe \
    NODE_OPTIONS=--max-old-space-size=900

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates \
      chromium \
      ffmpeg \
      fonts-liberation \
      fonts-noto-color-emoji \
      libnss3 \
      libxss1 \
      libxtst6 \
      libgbm1 \
      libasound2 \
      curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Bring in installed dependencies from the builder stage.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /root/.npm /root/.npm

# Copy the application source needed by the worker. We deliberately exclude the
# Next.js app/, public/, and other front-end code to keep the image lean.
COPY package.json package-lock.json tsconfig.json ./
COPY services/video-worker ./services/video-worker
COPY lib ./lib
COPY public/audio ./public/audio

# Hyperframes writes intermediate files under /app/tmp during a render.
RUN mkdir -p /app/tmp && chmod 777 /app/tmp

# Healthcheck: process must report ready every 60s
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
  CMD pgrep -f "video-worker" >/dev/null || exit 1

CMD ["npx", "tsx", "services/video-worker/index.ts"]
