#!/usr/bin/env bash
# Seed all worker secrets into SSM Parameter Store.
# Reads values from .env.local at the repo root and writes them under:
#   /theequestrian/video-worker/<KEY>
#
# Idempotent — uses `put-parameter --overwrite`.
#
# Usage:
#   AWS_PROFILE=theequestrian bash services/video-worker/aws/seed-ssm.sh

set -euo pipefail

cd "$(dirname "$0")/../../.."
ENV_FILE=".env.local"
PROFILE="${AWS_PROFILE:-theequestrian}"
REGION="${AWS_REGION:-ap-southeast-2}"
PREFIX="/theequestrian/video-worker"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found"
  exit 1
fi

# Variables the worker actually needs (skip Vercel/front-end-only ones).
KEYS=(
  POSTGRES_URL
  DATABASE_URL
  OPENAI_API_KEY
  ANTHROPIC_API_KEY
  ELEVENLABS_API_KEY
  ELEVENLABS_AU_FEMALE_VOICES
  ELEVENLABS_AU_MALE_VOICES
  EVOLINK_API_KEY
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  AWS_ARTICLES_ACCESS_KEY_ID
  AWS_ARTICLES_SECRET_ACCESS_KEY
  AWS_ARTICLES_S3_BUCKET_NAME
  SHOPIFY_ADMIN_ACCESS_TOKEN
  SHOPIFY_STORE_DOMAIN
  SHOPIFY_STOREFRONT_ACCESS_TOKEN
  NEXT_PUBLIC_SITE_URL
  SOCIAL_TOKEN_ENC_KEY
)

read_env() {
  local key="$1"
  # Pulls VALUE out of  KEY="VALUE"  or  KEY=VALUE  (last occurrence wins)
  grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | sed -E "s/^${key}=//; s/^\"//; s/\"$//"
}

put_secret() {
  local key="$1" value="$2"
  if [ -z "$value" ]; then
    echo "skip $key (empty)"
    return
  fi
  echo "put $PREFIX/$key"
  aws ssm put-parameter \
    --profile "$PROFILE" \
    --region "$REGION" \
    --name "$PREFIX/$key" \
    --type SecureString \
    --value "$value" \
    --overwrite \
    --no-cli-pager > /dev/null
}

for k in "${KEYS[@]}"; do
  v="$(read_env "$k" || true)"
  put_secret "$k" "$v"
done

echo "done — listing parameters under $PREFIX"
aws ssm get-parameters-by-path \
  --profile "$PROFILE" \
  --region "$REGION" \
  --path "$PREFIX" \
  --query "Parameters[].Name" \
  --output table
