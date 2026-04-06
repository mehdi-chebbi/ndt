# AI Configuration Guide

## Changes Made

### 1. Environment Variables (docker-compose.yml)
The backend now uses these environment variables for AI configuration:

| Variable | Description | Required |
|----------|-------------|----------|
| `AI_BASE_URL` | Base URL of the AI API (e.g., `http://192.168.2.97:8080/v1` or `https://openrouter.ai/api/v1`) | ✅ Yes |
| `AI_MODEL` | Model name (e.g., `qwen35`, `openai/gpt-4o`, `anthropic/claude-3.5-sonnet`) | ✅ Yes |
| `AI_API_KEY` | API key (use `dummy-key` for local models) | ✅ Yes |
| `AI_APP_URL` | App URL (only for OpenRouter/remote APIs) | ❌ No |
| `AI_APP_NAME` | App name (only for OpenRouter/remote APIs) | ❌ No |

### 2. Code Changes (backend/src/controllers/aiController.ts)
- Replaced `OPENROUTER_API_KEY` → `AI_API_KEY`
- Replaced `MODEL_NAME` → `AI_MODEL`
- Removed hardcoded OpenRouter URL
- Made headers conditional (OpenRouter-specific headers only sent when `AI_APP_URL` is set)
- Updated both `chat()` and `analyzeAreaWithAI()` functions

---

## How to Switch Between Local and Remote AI

### Using Local Model (e.g., your Qwen3.5)

Create or edit `.env` file:

```bash
AI_BASE_URL=http://192.168.2.97:8080/v1
AI_MODEL=qwen35
AI_API_KEY=dummy-key
```

**Then restart the backend:**
```bash
docker-compose restart backend
```

### Using OpenRouter

Create or edit `.env` file:

```bash
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=openai/gpt-4o
AI_API_KEY=sk-or-v1-your-actual-key-here
AI_APP_URL=http://localhost:3000
AI_APP_NAME=NDT Platform
```

**Then restart the backend:**
```bash
docker-compose restart backend
```

---

## Docker Compose Usage

You can also set the environment variables inline with docker-compose:

### For Local Model:
```bash
docker-compose up -d backend \
  -e AI_BASE_URL=http://192.168.2.97:8080/v1 \
  -e AI_MODEL=qwen35 \
  -e AI_API_KEY=dummy-key
```

### For OpenRouter:
```bash
docker-compose up -d backend \
  -e AI_BASE_URL=https://openrouter.ai/api/v1 \
  -e AI_MODEL=openai/gpt-4o \
  -e AI_API_KEY=sk-or-v1-your-key-here \
  -e AI_APP_URL=http://localhost:3000 \
  -e AI_APP_NAME="NDT Platform"
```

---

## Notes

1. **Network Access**: For local model access, ensure the backend container can reach `http://192.168.2.97:8080`. If your backend is running in Docker, you may need to use `host.docker.internal` instead of the LAN IP.

2. **API Key**: The code validates that `AI_API_KEY` is set, but for local models like llama.cpp, you can use any dummy value like `dummy-key` since it won't be validated by the server.

3. **OpenRouter Headers**: The `HTTP-Referer` and `X-Title` headers are only sent when `AI_APP_URL` is configured, making them optional for local models.

4. **Streaming**: Both local and remote AI implementations support streaming, which is enabled by default.

5. **Multimodal Support**: Your local Qwen3.5 model claims multimodal capabilities. The image upload feature sends base64-encoded images in the OpenAI-compatible format. Test this with your local model to confirm it works as expected.
