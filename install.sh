#!/usr/bin/env bash
set -euo pipefail

# QckPages CLI Installer Script
# Usage: curl -fsSL https://github.com/jR4dh3y/qckpages/releases/latest/download/install.sh | bash

REPO_URL="https://github.com/jR4dh3y/qckpages"
DOWNLOAD_URL="${REPO_URL}/releases/latest/download"
BINARY_NAME="qckpage"
INSTALL_DIR="/usr/local/bin"
USER_INSTALL_DIR="$HOME/.local/bin"

echo -e "\033[1;36mInstalling QckPages CLI (qckpage)...\033[0m"

OS="$(uname -s)"
ARCH="$(uname -m)"

case "${OS}" in
    Linux*)     os_name="linux";;
    Darwin*)    os_name="darwin";;
    *)          echo -e "\033[0;31m[ERROR] Unsupported Operating System: ${OS}\033[0m"; exit 1;;
esac

case "${ARCH}" in
    x86_64|amd64)   arch_name="x64";;
    aarch64|arm64)  arch_name="aarch64";;
    *)              echo -e "\033[0;31m[ERROR] Unsupported architecture: ${ARCH}\033[0m"; exit 1;;
esac

echo -e "\033[0;33mDetected OS:\033[0m ${os_name} (${arch_name})"

# Determine target directory
if [ -w "${INSTALL_DIR}" ]; then
    TARGET_DIR="${INSTALL_DIR}"
else
    TARGET_DIR="${USER_INSTALL_DIR}"
    mkdir -p "${TARGET_DIR}"
fi

TARGET_PATH="${TARGET_DIR}/${BINARY_NAME}"
ASSET_NAME="qckpage-${os_name}-${arch_name}.tar.gz"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TEMP_DIR}"' EXIT

echo -e "\033[0;33mDownloading latest binary release...\033[0m"
curl --proto '=https' --tlsv1.2 -fsSL "${DOWNLOAD_URL}/${ASSET_NAME}" -o "${TEMP_DIR}/${ASSET_NAME}"
curl --proto '=https' --tlsv1.2 -fsSL "${DOWNLOAD_URL}/SHA256SUMS" -o "${TEMP_DIR}/SHA256SUMS"

expected_checksum="$(awk -v asset="${ASSET_NAME}" '$2 == asset { print $1 }' "${TEMP_DIR}/SHA256SUMS")"
if [ -z "${expected_checksum}" ]; then
    echo -e "\033[0;31m[ERROR] No checksum published for ${ASSET_NAME}.\033[0m"
    exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
    actual_checksum="$(sha256sum "${TEMP_DIR}/${ASSET_NAME}" | awk '{ print $1 }')"
else
    actual_checksum="$(shasum -a 256 "${TEMP_DIR}/${ASSET_NAME}" | awk '{ print $1 }')"
fi

if [ "${actual_checksum}" != "${expected_checksum}" ]; then
    echo -e "\033[0;31m[ERROR] Checksum verification failed for ${ASSET_NAME}.\033[0m"
    exit 1
fi

tar -xzf "${TEMP_DIR}/${ASSET_NAME}" -C "${TEMP_DIR}"
install -m 0755 "${TEMP_DIR}/${BINARY_NAME}" "${TARGET_PATH}"

echo -e "\033[1;32m[OK] Successfully installed qckpage to ${TARGET_PATH}\033[0m"

# Path warning if install location is not in PATH
case ":$PATH:" in
  *":${TARGET_DIR}:"*) ;;
  *) echo -e "\033[0;33m[NOTE] Add '${TARGET_DIR}' to your PATH environment variable to run 'qckpage' from anywhere.\033[0m" ;;
esac

echo -e "\n\033[1;36mGet started with:\033[0m"
echo -e "  \033[1mqckpage login\033[0m"
echo -e "  \033[1mqckpage publish mypage.html -s my-slug\033[0m\n"
