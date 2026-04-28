#!/usr/bin/env bash
set -euo pipefail

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This script supports Debian/Ubuntu servers with apt-get." >&2
  exit 1
fi

sudo apt-get update

pick_package() {
  for package_name in "$@"; do
    if apt-cache show "$package_name" >/dev/null 2>&1; then
      printf '%s\n' "$package_name"
      return 0
    fi
  done

  printf '%s\n' "$1"
}

packages=(
  ca-certificates \
  fonts-liberation \
  "$(pick_package libasound2 libasound2t64)" \
  libatk-bridge2.0-0 \
  "$(pick_package libatk1.0-0 libatk1.0-0t64)" \
  libc6 \
  libcairo2 \
  "$(pick_package libcups2 libcups2t64)" \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc-s1 \
  "$(pick_package libglib2.0-0 libglib2.0-0t64)" \
  "$(pick_package libgtk-3-0 libgtk-3-0t64)" \
  libnspr4 \
  libnss3 \
  "$(pick_package libpango-1.0-0 libpango-1.0-0t64)" \
  "$(pick_package libpangocairo-1.0-0 libpangocairo-1.0-0t64)" \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils
)

sudo apt-get install -y "${packages[@]}"

chrome_path="$(find "$HOME/.cache/puppeteer/chrome" -path '*/chrome-linux64/chrome' -type f | sort | tail -n 1 || true)"

if [[ -n "$chrome_path" ]]; then
  missing_libs="$(ldd "$chrome_path" | grep 'not found' || true)"

  if [[ -n "$missing_libs" ]]; then
    echo "Chrome still has missing shared libraries:" >&2
    echo "$missing_libs" >&2
    exit 1
  fi

  echo "Puppeteer Chrome dependencies are installed."
else
  echo "Puppeteer Chrome binary not found yet. It will be checked after Puppeteer downloads Chrome."
fi
