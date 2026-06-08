#!/bin/bash
# scripts/generate-certs.sh
# Generates self-signed certificates in the certs/ directory for local HTTPS development.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="$SCRIPT_DIR/../certs"
KEY_PATH="$CERTS_DIR/privkey.pem"
CERT_PATH="$CERTS_DIR/fullchain.pem"

mkdir -p "$CERTS_DIR"

if command -v openssl >/dev/null 2>&1; then
    echo "Generating self-signed certificate using OpenSSL..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$KEY_PATH" \
        -out "$CERT_PATH" \
        -subj "/C=US/ST=State/L=City/O=Development/CN=localhost"
    
    if [ -f "$KEY_PATH" ]; then
        echo "Successfully generated certificate files:"
        echo "  Private Key: $KEY_PATH"
        echo "  Certificate: $CERT_PATH"
    else
        echo "Error: Failed to generate certificates."
        exit 1
    fi
else
    echo "Error: OpenSSL was not found. Please install OpenSSL first."
    exit 1
fi
