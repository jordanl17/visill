#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

pnpm build

SKILL_DIR=$(find skill -mindepth 1 -maxdepth 1 -type d | head -n 1)
SKILL_NAME=$(basename "${SKILL_DIR}")

rm -f "skill/${SKILL_NAME}.zip"
(cd skill && zip -rq "${SKILL_NAME}.zip" "${SKILL_NAME}" -x '*/__pycache__/*' '*.pyc')

echo "Built skill/${SKILL_NAME}.zip"
unzip -l "skill/${SKILL_NAME}.zip"
