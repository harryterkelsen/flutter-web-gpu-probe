#!/usr/bin/env bash
# Rebuilds app/ from app-src/. Use Flutter 3.47.5 to match the affected release:
#   FLUTTER=/path/to/flutter-3.47.5/bin/flutter ./build.sh
set -euo pipefail
cd "$(dirname "$0")"
FLUTTER="${FLUTTER:-flutter}"
(cd app-src && "$FLUTTER" build web --release --no-web-resources-cdn --base-href /flutter-web-gpu-probe/app/)
rm -rf app && cp -r app-src/build/web app && rm -f app/flutter_service_worker.js
