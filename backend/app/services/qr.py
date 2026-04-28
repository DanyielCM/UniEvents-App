import base64
import io

import segno


def generate_qr_png(data: str, scale: int = 10) -> bytes:
    qr = segno.make(data, error="M")
    buf = io.BytesIO()
    qr.save(buf, kind="png", scale=scale)
    return buf.getvalue()


def generate_qr_b64(data: str, scale: int = 10) -> str:
    return base64.b64encode(generate_qr_png(data, scale)).decode()


def generate_qr_svg(data: str, scale: int = 4) -> str:
    qr = segno.make(data, error="M")
    buf = io.StringIO()
    qr.save(buf, kind="svg", scale=scale)
    return buf.getvalue()
