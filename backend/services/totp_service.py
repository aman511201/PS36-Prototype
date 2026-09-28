import hmac
import hashlib
import time
import struct
import base64
import os
from typing import Optional

# Standard RFC 6238 Parameters
TOTP_STEP_SECONDS = 30
TOTP_DIGITS = 6

def generate_secret() -> str:
    """Generate a 160-bit (32 character) base32 secret."""
    raw = os.urandom(20)
    return base64.b32encode(raw).decode("ascii").replace("=", "")

def get_current_totp(secret_b32: str, t: Optional[float] = None) -> str:
    """
    Generate the current 6-digit TOTP code for a base32 secret.
    Standard RFC 6238 implementation using HMAC-SHA1.
    """
    if t is None:
        t = time.time()
    counter = int(t) // TOTP_STEP_SECONDS
    key = base64.b32decode(secret_b32.upper(), casefold=True)
    counter_bytes = struct.pack(">Q", counter)
    h = hmac.new(key, counter_bytes, hashlib.sha1).digest()
    offset = h[-1] & 0x0F
    code = struct.unpack(">I", h[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(code % (10 ** TOTP_DIGITS)).zfill(TOTP_DIGITS)

def verify_totp(secret_b32: str, token: str, window: int = 1) -> bool:
    """
    Verify a submitted 6-digit TOTP code against a secret.
    Allows clock drift of +/- `window` steps (default window=1 allows +/- 30s).
    """
    if not secret_b32 or not token:
        return False
    clean = token.strip().replace(" ", "").replace("-", "")
    if not clean.isdigit() or len(clean) != TOTP_DIGITS:
        return False

    now = time.time()
    current_counter = int(now) // TOTP_STEP_SECONDS
    try:
        key = base64.b32decode(secret_b32.upper(), casefold=True)
    except Exception:
        return False

    for c in range(current_counter - window, current_counter + window + 1):
        counter_bytes = struct.pack(">Q", c)
        h = hmac.new(key, counter_bytes, hashlib.sha1).digest()
        offset = h[-1] & 0x0F
        code = struct.unpack(">I", h[offset:offset + 4])[0] & 0x7FFFFFFF
        if str(code % (10 ** TOTP_DIGITS)).zfill(TOTP_DIGITS) == clean:
            return True
    return False

def get_remaining_seconds() -> int:
    """Return remaining seconds in the current 30-second TOTP cycle (1 to 30)."""
    now = time.time()
    rem = int(TOTP_STEP_SECONDS - (now % TOTP_STEP_SECONDS))
    return max(1, rem)
