"""Microsoft OAuth authentication for YEP Photo Finder."""
import secrets
from datetime import datetime, timedelta
from typing import Optional
import msal
from jose import jwt

from config import MS_CLIENT_ID, MS_TENANT_ID, MS_CLIENT_SECRET, ALLOWED_DOMAIN

# Microsoft OAuth Config
MS_AUTHORITY = f"https://login.microsoftonline.com/{MS_TENANT_ID}"
MS_SCOPE = ["User.Read"]
REDIRECT_PATH = "/auth/callback"

# JWT Config
JWT_SECRET = secrets.token_hex(32)
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

# Session store (in-memory for simplicity)
auth_states = {}  # state -> redirect_url


def get_msal_app(redirect_uri: str):
    """Create MSAL app instance."""
    return msal.ConfidentialClientApplication(
        MS_CLIENT_ID,
        authority=MS_AUTHORITY,
        client_credential=MS_CLIENT_SECRET,
    )


def get_auth_url(redirect_uri: str, final_redirect: str = "/") -> tuple[str, str]:
    """Generate Microsoft OAuth URL."""
    app = get_msal_app(redirect_uri)
    state = secrets.token_urlsafe(16)
    auth_states[state] = final_redirect

    auth_url = app.get_authorization_request_url(
        MS_SCOPE,
        redirect_uri=redirect_uri,
        state=state,
    )
    return auth_url, state


def exchange_code(code: str, redirect_uri: str) -> Optional[dict]:
    """Exchange auth code for tokens and user info."""
    app = get_msal_app(redirect_uri)
    result = app.acquire_token_by_authorization_code(
        code,
        scopes=MS_SCOPE,
        redirect_uri=redirect_uri,
    )

    if "error" in result:
        return None

    # Get user info from id_token claims
    id_token_claims = result.get("id_token_claims", {})
    return {
        "email": id_token_claims.get("preferred_username", ""),
        "name": id_token_claims.get("name", ""),
        "oid": id_token_claims.get("oid", ""),
    }


def validate_domain(email: str) -> bool:
    """Check if email domain is allowed."""
    if not email:
        return False
    domain = email.split("@")[-1].lower()
    return domain == ALLOWED_DOMAIN


def create_session_token(user_info: dict) -> str:
    """Create JWT session token."""
    payload = {
        "email": user_info["email"],
        "name": user_info["name"],
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_session_token(token: str) -> Optional[dict]:
    """Verify and decode JWT session token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        return None


def get_state_redirect(state: str) -> str:
    """Get and remove redirect URL for state."""
    return auth_states.pop(state, "/")
