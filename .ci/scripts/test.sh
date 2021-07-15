#!/usr/bin/env bash
set -xeo pipefail
STACK_VERSION=${STACK_VERSION:-7.13.3}

pip install docker-compose>=1.25.4

USER_ID="$(id -u):$(id -g)" \
NODEJS_VERSION=$(cat ./dev-utils/.node-version) \
STACK_VERSION=${STACK_VERSION} \
docker-compose \
  -f ./dev-utils/docker-compose.yml \
  --log-level INFO \
  up \
  --quiet-pull \
  --exit-code-from node-puppeteer \
  --remove-orphans \
  node-puppeteer
echo "Exit code from docker-compose $?"
