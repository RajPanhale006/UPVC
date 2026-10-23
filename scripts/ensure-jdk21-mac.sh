#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLING="$ROOT/.tooling"
JDK_HOME="$TOOLING/jdk-21/Contents/Home"

if [[ -x "$JDK_HOME/bin/java" ]]; then
  "$JDK_HOME/bin/java" -version
  exit 0
fi

mkdir -p "$TOOLING"
cd "$TOOLING"
echo "Downloading Temurin JDK 21..."
curl -fsSL "https://api.adoptium.net/v3/binary/latest/21/ga/mac/x64/jdk/hotspot/normal/eclipse?project=jdk" -o jdk21.tar.gz
tar -xzf jdk21.tar.gz
rm jdk21.tar.gz
mv jdk-21* jdk-21
"$JDK_HOME/bin/java" -version
