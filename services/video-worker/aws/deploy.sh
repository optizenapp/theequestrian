#!/usr/bin/env bash
# Build the worker image, push to ECR, and force a new ECS deployment.
#
# Pre-reqs (one-shot, see services/video-worker/aws/RUNBOOK.md):
#   * IAM user, AWS CLI profile `theequestrian` configured
#   * ECR repo `theequestrian-video-worker` exists
#   * IAM roles created and SSM secrets seeded
#   * ECS cluster + service registered
#
# Usage:
#   AWS_PROFILE=theequestrian bash services/video-worker/aws/deploy.sh

set -euo pipefail

cd "$(dirname "$0")/../../.."

PROFILE="${AWS_PROFILE:-theequestrian}"
REGION="${AWS_REGION:-ap-southeast-2}"
REPO="theequestrian-video-worker"
CLUSTER="theequestrian"
SERVICE="theequestrian-video-worker"
PLATFORM="${PLATFORM:-linux/arm64}"

ACCOUNT_ID="$(aws sts get-caller-identity --profile "$PROFILE" --query Account --output text)"
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE="${REGISTRY}/${REPO}:latest"

echo "==> account=${ACCOUNT_ID} region=${REGION} platform=${PLATFORM}"
echo "==> image=${IMAGE}"

echo "==> ECR login"
aws ecr get-login-password --profile "$PROFILE" --region "$REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"

echo "==> docker buildx build"
docker buildx create --use --name theequestrian-builder >/dev/null 2>&1 || true
docker buildx build \
  --platform "$PLATFORM" \
  --file services/video-worker/Dockerfile \
  --tag "$IMAGE" \
  --push \
  .

echo "==> trigger ECS rolling deploy"
aws ecs update-service \
  --profile "$PROFILE" \
  --region "$REGION" \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --force-new-deployment \
  --no-cli-pager > /dev/null

echo "==> done. Tail logs with:"
echo "    aws logs tail /ecs/theequestrian-video-worker --follow --profile $PROFILE --region $REGION"
