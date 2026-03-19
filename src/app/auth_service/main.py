from fastapi import FastAPI, Depends, Response, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from controllers import auth
from database.database import get_db, init_db, seed_users
from schemas.auth import LoginRequest, RefreshTokenRequest, LogoutRequest
from contextlib import asynccontextmanager
from urllib.parse import urlencode
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Auth Service...")
    init_db()
    seed_users()
    yield
    logging.info("Shutting down Auth Service...")

app = FastAPI(
    title="Auth Service",
    description="Central Authentication Service for AI Evaluation Tool",
    version="1.0.0",
    lifespan=lifespan,
)

raw_origins = os.getenv("CORS_ALLOW_ORIGINS", "")
cors_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
allow_origin_regex = None
if not cors_origins:
    cors_origins = ["*"]
    # Allow any localhost/127.0.0.1 port in dev (covers Vite/CRA port changes)
    # allow_origin_regex = r"^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/login")
async def login(
    user: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """Authenticate user and return JWT tokens."""
    token_response = auth.login(db, user)
    cookie_secure = os.getenv("COOKIE_SECURE", "").lower() in {"1", "true", "yes"}
    cookie_samesite = os.getenv("COOKIE_SAMESITE", "lax")
    response.set_cookie(
        "access_token",
        token_response.access_token,
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_samesite,
    )
    response.set_cookie(
        "refresh_token",
        token_response.refresh_token,
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_samesite,
    )
    return token_response

@app.post("/refresh")
async def refresh_token(token_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token using refresh token."""
    return auth.refresh_access_token(db, token_data)

@app.post("/logout")
async def logout(token_data: LogoutRequest, response: Response):
    """Logout user by revoking refresh token."""
    result = auth.logout(token_data)
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return result

@app.get("/web/login", response_class=HTMLResponse)
async def web_login(
    request: Request,
    return_url: str = "http://localhost:7500/web/portal",
    db: Session = Depends(get_db),
):
    refresh_token_cookie = request.cookies.get("refresh_token")
    if refresh_token_cookie:
        try:
            tokens = auth.refresh_access_token(db, RefreshTokenRequest(refresh_token=refresh_token_cookie))
            redirect_params = {
                "access_token": tokens.access_token,
                "refresh_token": tokens.refresh_token,
                "user_name": tokens.user_name,
                "role": tokens.role,
            }
            redirect_url = f"{return_url}#{urlencode(redirect_params)}"
            response = RedirectResponse(redirect_url)
            cookie_secure = os.getenv("COOKIE_SECURE", "").lower() in {"1", "true", "yes"}
            cookie_samesite = os.getenv("COOKIE_SAMESITE", "lax")
            response.set_cookie("access_token", tokens.access_token, httponly=True, secure=cookie_secure, samesite=cookie_samesite, path="/")
            response.set_cookie("refresh_token", tokens.refresh_token, httponly=True, secure=cookie_secure, samesite=cookie_samesite, path="/")
            return response
        except Exception:
            pass

    html = """
    <!DOCTYPE html>
    <html lang='en'>
    <head>
      <meta charset='UTF-8' />
      <meta name='viewport' content='width=device-width, initial-scale=1.0' />
      <title>Central Login</title>
      <style>
        body {{ font-family: Arial, sans-serif; background:#f5f7ff; display:flex; justify-content:center; align-items:center; min-height:100vh; margin:0; }}
        .card {{ background:white; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.08); width:min(95%,420px); padding:24px; }}
        input{{ width:100%; padding:10px; margin:0.33rem 0; border:1px solid #ced4da; border-radius:6px; }}
        button{{ width:100%; padding:10px; margin-top:10px; border:none; border-radius:6px; background:#4338ca; color:white; font-size:1rem; }}
      </style>
    </head>
    <body>
    <div class='card'>
      <h2>Central Login</h2>
      <p>Use your shared credentials across applications.</p>
      <form id='login-form'>
        <input id='user_name' name='user_name' placeholder='Username' required />
        <input id='password' name='password' placeholder='Password' type='password' required />
        <button type='submit'>Sign in</button>
      </form>
      <div id='error' style='color:#c53030;margin-top:12px; font-size:.9rem;'></div>
    </div>
    <script>
      const q = new URLSearchParams(window.location.search);
      const returnUrl = q.get('return_url') || 'http://localhost:7500/web/portal';
      document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        const user_name = document.getElementById('user_name').value;
        const password = document.getElementById('password').value;
        const res = await fetch('/login', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ user_name, password })
        });
        const data = await res.json();
        if (!res.ok) {
          document.getElementById('error').innerText = data.detail || 'Login failed';
          return;
        }
        const url = new URL(returnUrl, window.location.origin);
        const fragment = new URLSearchParams({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user_name: data.user_name,
          role: data.role,
        }).toString();
        window.location.href = `${url.toString()}#${fragment}`;
      };
    </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

@app.get("/web/portal", response_class=HTMLResponse)
async def web_portal():
    tdms_url = os.getenv("TDMS_APP_URL", "http://localhost:3000/dashboard")
    tce_url = os.getenv("TCE_APP_URL", "http://localhost:8080/dashboard")
    html = f"""
    <!DOCTYPE html>
    <html lang='en'>
    <head>
      <meta charset='UTF-8' />
      <meta name='viewport' content='width=device-width, initial-scale=1.0' />
      <title>Choose Application</title>
      <style>
        body {{ font-family: Arial, sans-serif; background:#f5f7ff; display:flex; justify-content:center; align-items:center; min-height:100vh; margin:0; }}
        .card {{ background:white; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.08); width:min(95%,520px); padding:24px; }}
        .btn {{ display:block; width:100%; padding:12px; margin:10px 0; border:none; border-radius:8px; background:#1f2937; color:white; font-size:1rem; text-align:center; text-decoration:none; }}
        .muted {{ color:#6b7280; font-size:.9rem; }}
      </style>
    </head>
    <body>
    <div class='card'>
      <h2>Continue to an application</h2>
      <p class='muted'>Select where you want to go. Your login tokens will be passed automatically.</p>
      <a id='tdms-link' class='btn' href='{tdms_url}'>TDMS</a>
      <a id='tce-link' class='btn' href='{tce_url}'>TestCaseExecutorDashboard</a>
      <p id='status' class='muted'></p>
    </div>
    <script>
      const hash = window.location.hash.replace(/^#/, '');
      const values = Object.fromEntries(new URLSearchParams(hash));
      const hasTokens = values.access_token && values.refresh_token;
      const tdmsBase = '{tdms_url}';
      const tceBase = '{tce_url}';
      if (hasTokens) {{
        const fragment = new URLSearchParams(values).toString();
        document.getElementById('tdms-link').href = `${{tdmsBase}}#${{fragment}}`;
        document.getElementById('tce-link').href = `${{tceBase}}#${{fragment}}`;
      }} else {{
        document.getElementById('status').innerText = 'No login tokens found. Please sign in again.';
      }}
    </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)
@app.get("/web/logout")
async def web_logout(
    request: Request,
    return_url: str = "http://localhost:8000",
    db: Session = Depends(get_db),
):
    refresh_token_cookie = request.cookies.get("refresh_token")
    if refresh_token_cookie:
        try:
            auth.logout(LogoutRequest(refresh_token=refresh_token_cookie))
        except Exception:
            pass
    response = RedirectResponse(url=return_url)
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=7500, reload=True)
