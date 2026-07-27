#!/usr/bin/env bash
set -e

# QckPages CLI Installer Script
# Usage: curl -fsSL https://qckpages.dev/install.sh | bash

REPO_URL="https://github.com/jR4dh3y/qckpages"
BINARY_NAME="qckpage"
INSTALL_DIR="/usr/local/bin"
USER_INSTALL_DIR="$HOME/.local/bin"

echo -e "\033[1;36mInstalling QckPages CLI (qckpage)...\033[0m"

OS="$(uname -s)"
ARCH="$(uname -m)"

case "${OS}" in
    Linux*)     os_name="linux";;
    Darwin*)    os_name="macos";;
    *)          echo -e "\033[0;31m[ERROR] Unsupported Operating System: ${OS}\033[0m"; exit 1;;
esac

echo -e "\033[0;33mDetected OS:\033[0m ${os_name} (${ARCH})"

# Determine target directory
if [ -w "${INSTALL_DIR}" ]; then
    TARGET_DIR="${INSTALL_DIR}"
else
    TARGET_DIR="${USER_INSTALL_DIR}"
    mkdir -p "${TARGET_DIR}"
fi

TARGET_PATH="${TARGET_DIR}/${BINARY_NAME}"

# If building from local repo or installing pre-built release
if [ -f "./dist/${BINARY_NAME}" ]; then
    cp "./dist/${BINARY_NAME}" "${TARGET_PATH}"
else
    echo -e "\033[0;33mDownloading latest binary release...\033[0m"
    LATEST_URL="${REPO_URL}/releases/latest/download/qckpage-${os_name}-${ARCH}"
    if ! curl -fsSL "${LATEST_URL}" -o "${TARGET_PATH}" 2>/dev/null; then
        echo -e "\033[0;33mFallback: Fetching standard Linux binary...\033[0m"
        curl -fsSL "${REPO_URL}/raw/main/dist/${BINARY_NAME}" -o "${TARGET_PATH}" || {
            echo -e "\033[0;31m[ERROR] Failed to download qckpage binary.\033[0m"
            exit 1
        }
    fi
fi

chmod +x "${TARGET_PATH}"

echo -e "\033[1;32m[OK] Successfully installed qckpage to ${TARGET_PATH}\033[0m"

# Path warning if install location is not in PATH
case ":$PATH:" in
  *":${TARGET_DIR}:"*) ;;
  *) echo -e "\033[0;33m[NOTE] Add '${TARGET_DIR}' to your PATH environment variable to run 'qckpage' from anywhere.\033[0m" ;;
esac

echo -e "\n\033[1;36mGet started with:\033[0m"
echo -e "  \033[1mqckpage login\033[0m"
echo -e "  \033[1mqckpage publish mypage.html -s my-slug\033[0m\n"
