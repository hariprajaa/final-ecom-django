# products/utils/password_utils.py
import bcrypt
from django.conf import settings

def hash_password(plain_password: str) -> str:
    pepper = getattr(settings, "PASSWORD_PEPPER", "")
    combined = (plain_password + pepper).encode("utf-8")
    rounds = getattr(settings, "BCRYPT_ROUNDS", 12)
    salt = bcrypt.gensalt(rounds=rounds)
    hashed = bcrypt.hashpw(combined, salt)
    return hashed.decode("utf-8")  # store this

def verify_password(plain_password: str, stored_hash: str) -> bool:
    pepper = getattr(settings, "PASSWORD_PEPPER", "")
    combined = (plain_password + pepper).encode("utf-8")
    try:
        return bcrypt.checkpw(combined, stored_hash.encode("utf-8"))
    except ValueError:
        return False
