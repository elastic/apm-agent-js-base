#!/usr/bin/env bash

STACK_VERSION=${1:-7.13.3}
USER_ID="$(id -u):$(id -g)"
NODEJS_VERSION=$(cat ./dev-utils/.node-version)

USER_ID="${USER_ID}" \
NODEJS_VERSION="${NODEJS_VERSION}" \
STACK_VERSION=${STACK_VERSION} \
docker-compose -f ./dev-utils/docker-compose.yml down \
  --remove-orphans \
  --volumes || true

USER_ID="${USER_ID}" \
NODEJS_VERSION="${NODEJS_VERSION}" \
STACK_VERSION=${STACK_VERSION} \
docker-compose -f ./dev-utils/docker-compose.yml up \
  --build \
  --abort-on-container-exit \
  --exit-code-from load-testing \
  --remove-orphans \
  load-testing
