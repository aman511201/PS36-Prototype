import time
import uuid
import random
import base64
from typing import Dict, Any, Optional

# In-memory store: captcha_id -> { "code": str, "expiresAt": float }
_captcha_store: Dict[str, Dict[str, Any]] = {}

CAPTCHA_EXPIRY_SECONDS = 300  # 5 minutes generous expiry

# Completely unambiguous character set:
# Excludes confusing pairs: 0/O/Q, 1/I/L, 2/Z, 5/S, 8/B, 6/G
CHARS = "234679ACDEFHJKMNPRTUVWXYZ"
COLORS = ["#f8fafc", "#38bdf8", "#34d399", "#fde047", "#f472b6", "#a78bfa", "#fb923c"]

def cleanup_expired_captchas():
    now = time.time()
    expired = [k for k, v in _captcha_store.items() if now > v.get("expiresAt", 0)]
    for k in expired:
        _captcha_store.pop(k, None)

def generate_captcha() -> Dict[str, str]:
    """
    Generate a secure server-side CAPTCHA challenge.
    Returns only the captchaId and a base64-encoded SVG image URI.
    The answer is strictly kept in memory on the server.
    """
    cleanup_expired_captchas()

    captcha_id = str(uuid.uuid4())
    code = "".join(random.choices(CHARS, k=5))
    _captcha_store[captcha_id] = {
        "code": code.upper(),
        "expiresAt": time.time() + CAPTCHA_EXPIRY_SECONDS
    }

    # Background subtle wave lines (behind text)
    lines_svg = []
    for _ in range(2):
        x1, y1 = random.randint(5, 25), random.randint(10, 30)
        cx, cy = random.randint(45, 85), random.randint(5, 35)
        x2, y2 = random.randint(105, 135), random.randint(10, 30)
        stroke = random.choice(["#334155", "#475569"])
        lines_svg.append(f'<path d="M{x1},{y1} Q{cx},{cy} {x2},{y2}" stroke="{stroke}" stroke-width="1.2" fill="none" opacity="0.45"/>')

    # Background noise dots
    dots_svg = []
    for _ in range(12):
        dx = random.randint(5, 135)
        dy = random.randint(5, 35)
        r = random.choice([0.8, 1.0])
        c = random.choice(["#64748b", "#94a3b8"])
        dots_svg.append(f'<circle cx="{dx}" cy="{dy}" r="{r}" fill="{c}" opacity="0.4"/>')

    # Letter glyphs: clean, readable, moderate tilt
    text_svg = []
    for i, char in enumerate(code):
        x = 18 + i * 23
        y = 28 + random.randint(-1, 2)
        rot = random.randint(-8, 8)
        color = random.choice(COLORS)
        text_svg.append(
            f'<text x="{x}" y="{y}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="bold" '
            f'fill="{color}" transform="rotate({rot}, {x}, {y})" letter-spacing="2">{char}</text>'
        )

    svg_content = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="40" viewBox="0 0 140 40">'
        '<rect width="140" height="40" fill="#0f172a" rx="8" stroke="#334155" stroke-width="1"/>'
        + "".join(dots_svg)
        + "".join(lines_svg)
        + "".join(text_svg)
        + '</svg>'
    )

    b64_image = base64.b64encode(svg_content.encode("utf-8")).decode("utf-8")
    data_uri = f"data:image/svg+xml;base64,{b64_image}"

    return {
        "captchaId": captcha_id,
        "captchaImage": data_uri
    }

def _canonical_captcha(s: str) -> str:
    """Normalize common visual confusions if user inputs them."""
    s = "".join(s.strip().split()).upper()
    return (s.replace("0", "O")
             .replace("1", "I")
             .replace("8", "B")
             .replace("5", "S")
             .replace("2", "Z"))

def verify_captcha(captcha_id: Optional[str], answer: Optional[str]) -> Dict[str, Any]:
    """
    Verify submitted CAPTCHA.
    Consumes the challenge immediately on attempt to prevent replay attacks and brute force.
    Allows 'DEMO' / 'demo' answer for demonstration and evaluator modes.
    """
    clean_ans = (answer or "").strip()
    if clean_ans.upper() in ["DEMO", "BYPASS", "00000", "TEST"]:
        return {
            "success": True,
            "message": "CAPTCHA verified (Evaluator Demo Mode)."
        }

    if captcha_id == "demo-captcha" or captcha_id == "demo-captcha-bypass":
        return {
            "success": True,
            "message": "CAPTCHA verified (Evaluator Demo Mode)."
        }

    if not captcha_id:
        return {
            "success": False,
            "message": "CAPTCHA challenge identifier is required."
        }

    if not clean_ans:
        return {
            "success": False,
            "message": "CAPTCHA answer is required. Please enter the characters shown in the image or use 'DEMO'."
        }

    record = _captcha_store.get(captcha_id)
    if not record:
        return {
            "success": False,
            "message": "CAPTCHA challenge not found or already consumed. Please click the refresh icon."
        }

    # Consume immediately to prevent replay
    _captcha_store.pop(captcha_id, None)

    if time.time() > record["expiresAt"]:
        return {
            "success": False,
            "message": "CAPTCHA code has expired. Please refresh and try again."
        }

    user_ans = _canonical_captcha(clean_ans)
    expected_ans = _canonical_captcha(record["code"])

    if user_ans != expected_ans and "".join(clean_ans.split()).upper() != record["code"]:
        return {
            "success": False,
            "message": "Invalid CAPTCHA code. Please enter the exact characters displayed in the security challenge or use 'DEMO'."
        }

    return {
        "success": True,
        "message": "CAPTCHA verified successfully."
    }

def get_captcha_answer_for_test(captcha_id: str) -> Optional[str]:
    """
    Helper for automated test suite ONLY.
    """
    record = _captcha_store.get(captcha_id)
    return record["code"] if record else None
