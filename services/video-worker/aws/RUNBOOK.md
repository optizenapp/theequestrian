# Video Worker — AWS Fargate Runbook

End-to-end setup for the always-on Fargate worker that renders campaign videos
queued by the Vercel app.

* Region: `ap-southeast-2` (Sydney)
* Cluster: `theequestrian`
* Service: `theequestrian-video-worker` (desired count = 1)
* Task size: `0.5 vCPU / 1 GB RAM / 21 GB ephemeral`, ARM64 Fargate
* Image: `<ACCOUNT_ID>.dkr.ecr.ap-southeast-2.amazonaws.com/theequestrian-video-worker:latest`

---

## 0. Prereqs on your laptop

```bash
sudo chown -R "$(whoami)" /opt/homebrew
brew install awscli docker          # docker only if you don't already have Docker Desktop
docker buildx version               # must print a version
```

---

## 1. Create an IAM user for the CLI (AWS Console)

1. IAM → **Users** → **Create user** → name `theequestrian-deploy`.
2. **Attach policies directly**:
   * `AmazonEC2ContainerRegistryFullAccess`
   * `AmazonECS_FullAccess`
   * `IAMFullAccess` (you can detach this after step 3 — only needed to create roles)
   * `CloudWatchLogsFullAccess`
   * `AmazonSSMFullAccess`
3. After creation → **Security credentials** → **Create access key** → "Command Line Interface (CLI)" → save the access key id + secret somewhere safe.

Then locally:

```bash
aws configure --profile theequestrian
# Access Key ID:     <paste>
# Secret Access Key: <paste>
# Default region:    ap-southeast-2
# Default output:    json

aws sts get-caller-identity --profile theequestrian
# → should print your account id + the user arn
```

Export the profile so subsequent commands pick it up:

```bash
export AWS_PROFILE=theequestrian
export AWS_REGION=ap-southeast-2
```

---

## 2. Create ECR repo

```bash
aws ecr create-repository \
  --repository-name theequestrian-video-worker \
  --image-scanning-configuration scanOnPush=true \
  --region ap-southeast-2
```

---

## 3. Create the two IAM roles

```bash
# Execution role — lets ECS pull from ECR, write logs, read SSM secrets
aws iam create-role \
  --role-name theequestrian-video-worker-execution \
  --assume-role-policy-document file://services/video-worker/aws/execution-role-trust.json

aws iam put-role-policy \
  --role-name theequestrian-video-worker-execution \
  --policy-name execution-inline \
  --policy-document file://services/video-worker/aws/execution-role-policy.json

# Task role — lets the worker process talk to S3 and SES
aws iam create-role \
  --role-name theequestrian-video-worker-task \
  --assume-role-policy-document file://services/video-worker/aws/execution-role-trust.json

aws iam put-role-policy \
  --role-name theequestrian-video-worker-task \
  --policy-name task-inline \
  --policy-document file://services/video-worker/aws/task-role-policy.json
```

---

## 4. Seed secrets into SSM Parameter Store

```bash
bash services/video-worker/aws/seed-ssm.sh
```

This reads `.env.local` and writes every required secret as a `SecureString`
under `/theequestrian/video-worker/<KEY>`. Re-run any time `.env.local` changes.

---

## 5. Create the ECS cluster + log group

```bash
aws ecs create-cluster --cluster-name theequestrian
aws logs create-log-group --log-group-name /ecs/theequestrian-video-worker
aws logs put-retention-policy --log-group-name /ecs/theequestrian-video-worker --retention-in-days 14
```

---

## 6. Register the task definition

The template at `services/video-worker/aws/task-definition.json` has
`ACCOUNT_ID` placeholders. Substitute them:

```bash
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
sed "s/ACCOUNT_ID/${ACCOUNT_ID}/g" \
  services/video-worker/aws/task-definition.json \
  > services/video-worker/aws/task-definition.rendered.json

aws ecs register-task-definition \
  --cli-input-json file://services/video-worker/aws/task-definition.rendered.json
```

---

## 7. Build + push the first image

```bash
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="${ACCOUNT_ID}.dkr.ecr.ap-southeast-2.amazonaws.com"

aws ecr get-login-password \
  | docker login --username AWS --password-stdin "$REGISTRY"

docker buildx create --use --name theequestrian-builder 2>/dev/null || true
docker buildx build \
  --platform linux/arm64 \
  --file services/video-worker/Dockerfile \
  --tag "$REGISTRY/theequestrian-video-worker:latest" \
  --push \
  .
```

---

## 8. Find your default VPC + a public subnet

```bash
VPC_ID="$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)"
SUBNET_ID="$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC_ID --query 'Subnets[0].SubnetId' --output text)"
SG_ID="$(aws ec2 describe-security-groups --filters Name=vpc-id,Values=$VPC_ID Name=group-name,Values=default --query 'SecurityGroups[0].GroupId' --output text)"
echo "vpc=$VPC_ID subnet=$SUBNET_ID sg=$SG_ID"
```

The worker only makes outbound calls (Postgres, S3, OpenAI, ElevenLabs, etc.),
so a public subnet with `assignPublicIp=ENABLED` is the simplest route. The
default security group already allows all egress.

---

## 9. Create the ECS service

```bash
aws ecs create-service \
  --cluster theequestrian \
  --service-name theequestrian-video-worker \
  --task-definition theequestrian-video-worker \
  --desired-count 1 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
  --enable-execute-command
```

---

## 10. Watch it boot

```bash
aws logs tail /ecs/theequestrian-video-worker --follow
# you should see:  [video-worker] starting workerId=...
```

---

## 11. Day-to-day deploys

After this is all wired up, every code change ships with one command:

```bash
bash services/video-worker/aws/deploy.sh
```

That builds the image, pushes to ECR, and forces a rolling deployment.

---

## Vercel side — env vars

The Next.js app keeps its existing env vars (`POSTGRES_URL`, OpenAI keys, etc.)
because the API routes still need to call `enqueueCampaignVideoJob`, which
writes to Postgres. **No new Vercel env vars are required**.

The video-related Vercel routes have already been changed to:
* `POST /api/admin/email/campaigns/[id]/video/create` → enqueue, return 202
* `POST /api/admin/email/campaigns/[id]/video/regenerate` → enqueue, return 202
* `POST /api/admin/email/campaigns/[id]/video/regenerate-music` → enqueue, return 202
* `POST /api/admin/email/campaigns/[id]/video/regenerate-thumbnail` → enqueue, return 202

The status polling routes (`/video/status`, etc.) are unchanged and continue to
read `email_campaign_videos.status`, which the worker updates as it progresses
(`queued` → `rendering` → `ready_for_review` / `render_failed`).

---

## Cost estimate

* `0.5 vCPU / 1 GB / 21 GB` ARM64 Fargate, always on, ap-southeast-2:
  * ~ **$11–13 USD/month** for compute
  * + a few cents/month for ECR storage, SSM, and CloudWatch logs

---

## Troubleshooting

* `Tasks immediately stop with "ResourceInitializationError"` → execution role
  is missing the SSM permissions. Re-apply
  `services/video-worker/aws/execution-role-policy.json`.
* `exec /usr/local/bin/docker-entrypoint.sh: exec format error` → image was
  built for a different architecture. Re-run with `--platform linux/arm64`.
* `Worker logs show "Missing AWS credentials for article images"` → the SSM
  secrets weren't loaded. Confirm with:
  ```bash
  aws ssm get-parameters-by-path --path /theequestrian/video-worker
  ```
* `Render fails with "browser not found"` → Chromium install missing in image.
  Re-build (the Dockerfile already installs it).
