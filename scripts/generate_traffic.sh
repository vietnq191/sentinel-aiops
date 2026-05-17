#!/bin/bash

# Find and load environment variables from the root .env file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_PATH="$SCRIPT_DIR/../.env"

if [ -f "$ENV_PATH" ]; then
  echo "📥 Sourcing environment configurations from: $ENV_PATH"
  # Read .env file, ignoring comments and empty lines
  export $(grep -v '^#' "$ENV_PATH" | grep -v '^$' | xargs)
else
  echo "⚠️  No root .env file found at $ENV_PATH, using default configuration."
fi

# Dynamic Simulator URL fallback (loaded from env)
SIMULATOR_URL=${VITE_SIMULATOR_URL:-"http://localhost:8080"}

echo "🌐 Targeting Simulator Endpoint: $SIMULATOR_URL"
echo "🚀 Starting traffic generation for Sentinel-AIOps..."
echo "Press [CTRL+C] to stop."

while true
do
  # 20% Slow requests
  # 10% Error requests
  
  RANDOM_VAL=$((1 + $RANDOM % 100))

  if [ $RANDOM_VAL -le 50 ]; then
    curl -s "$SIMULATOR_URL/" > /dev/null
    echo "[INFO] Normal request sent"
  elif [ $RANDOM_VAL -le 60 ]; then
    echo "[WARN] Sending slow request..."
    curl -s "$SIMULATOR_URL/slow" > /dev/null
    echo "[WARN] Slow request completed"
  else
    # Randomize error types
    ERROR_TYPE=$((1 + $RANDOM % 4))
    case $ERROR_TYPE in
      1)
        echo "[ERROR] Database timeout..."
        curl -s "$SIMULATOR_URL/error" > /dev/null
        ;;
      2)
        echo "[ERROR] Auth failure..."
        curl -s "$SIMULATOR_URL/auth-error" > /dev/null
        ;;
      3)
        echo "[ERROR] OOM crash simulation..."
        curl -s "$SIMULATOR_URL/oom-error" > /dev/null
        ;;
      4)
        echo "[ERROR] Rate limiting..."
        curl -s "$SIMULATOR_URL/rate-limit" > /dev/null
        ;;
    esac
    echo "[ERROR] Error request sent"
  fi

  sleep 0.5
done
