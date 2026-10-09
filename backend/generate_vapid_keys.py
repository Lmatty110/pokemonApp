"""Print a persistent VAPID key pair for the backend environment.

Run locally once after installing backend/requirements.txt. Never commit the
private key. This helper prints configuration and does not modify any files.
"""
import argparse
import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def generate_keys():
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_bytes = private_key.public_key().public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    private_bytes = private_key.private_bytes(
        serialization.Encoding.DER, serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption())
    encode = lambda data: base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")
    return encode(public_bytes), encode(private_bytes)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Genera le chiavi VAPID per le notifiche web push")
    parser.add_argument("--subject", required=True, help="Contatto del servizio, es. mailto:admin@example.com")
    args = parser.parse_args()
    if not args.subject.startswith("mailto:") or "@" not in args.subject:
        parser.error("Usa un indirizzo di contatto nel formato mailto:admin@example.com")
    public_key, private_key = generate_keys()
    print(f"VAPID_PUBLIC_KEY={public_key}")
    print(f"VAPID_PRIVATE_KEY={private_key}")
    print(f"VAPID_SUBJECT={args.subject}")
