"""QR generation utilities for UniEvents."""

import base64
import io

import segno


def generate_qr_png(data: str, scale: int = 10) -> bytes:
    """Generate a PNG-encoded QR code.

    Args:
        data: The text or URL to encode in the QR code.
        scale: The pixel scale factor for the generated image.

    Returns:
        The PNG image bytes for the generated QR code.
    """
    qr = segno.make(data, error="M")
    buf = io.BytesIO()
    qr.save(buf, kind="png", scale=scale)
    return buf.getvalue()


def generate_qr_b64(data: str, scale: int = 10) -> str:
    """Generate a base64-encoded PNG QR code.

    Args:
        data: The text or URL to encode in the QR code.
        scale: The pixel scale factor for the generated image.

    Returns:
        A base64 string containing the PNG QR image.
    """
    return base64.b64encode(generate_qr_png(data, scale)).decode()


def generate_qr_svg(data: str, scale: int = 4) -> str:
    """Generate an SVG QR code.

    Args:
        data: The text or URL to encode in the QR code.
        scale: The scale factor for the generated SVG.

    Returns:
        The SVG document as a string.
    """
    qr = segno.make(data, error="M")
    buf = io.StringIO()
    qr.save(buf, kind="svg", scale=scale)
    return buf.getvalue()
