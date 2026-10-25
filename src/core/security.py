"""Cryptographic and security utilities."""

import hashlib
import hmac
import os
import secrets


def generate_session_token() -> str:
    """Generates a cryptographically secure 64-character hexadecimal session token."""
    return secrets.token_hex(32)


def hash_session_token(token: str) -> str:
    """Computes deterministic SHA-256 hash of a session token for secure database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2-HMAC-SHA512 with 100,000 iterations and a 16-byte salt.
    Returns format: 'salt:hex_digest' compatible with packages/core/src/password.ts.
    """
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha512", password.encode("utf-8"), salt, 100000, dklen=64)
    return f"{salt.hex()}:{key.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verifies a plain password against the 'salt:hex_digest' format."""
    try:
        parts = stored_hash.split(":")
        if len(parts) != 2:
            return False
        salt = bytes.fromhex(parts[0])
        expected_key = bytes.fromhex(parts[1])
        actual_key = hashlib.pbkdf2_hmac("sha512", password.encode("utf-8"), salt, 100000, dklen=64)
        return hmac.compare_digest(actual_key, expected_key)
    except Exception:
        return False

