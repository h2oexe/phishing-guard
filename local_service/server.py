from __future__ import annotations

import argparse
import json
import secrets
import ssl
import sys
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
WEB_ROOT = REPO_ROOT / "addin" / "web"
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from phishguard.config_store import (  # noqa: E402
    build_factory_reset_config,
    build_admin_access_update,
    ensure_runtime_config,
    get_admin_access_public,
    get_admin_config,
    get_public_meta,
    load_runtime_config,
    save_runtime_config,
    verify_admin_password,
)
from phishguard.extractor import extract_features  # noqa: E402
from phishguard.models import MailInput  # noqa: E402
from phishguard.rules import evaluate_rules  # noqa: E402
from phishguard.scorer import score_analysis  # noqa: E402


ADMIN_TOKEN_HEADER = "X-PhishGuard-Admin-Token"


class PhishGuardHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self._send_cors_headers()
        self.end_headers()

    def do_POST(self) -> None:
        if self.path == "/api/analyze":
            self._handle_analyze()
            return
        if self.path == "/api/admin/login":
            self._handle_admin_login()
            return
        if self.path == "/api/admin/verify-password":
            self._handle_admin_password_check()
            return
        if self.path == "/api/admin/reset":
            self._handle_admin_reset()
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def do_GET(self) -> None:
        if self.path == "/api/meta":
            self._write_json(HTTPStatus.OK, get_public_meta())
            return
        if self.path == "/api/admin/access":
            self._write_json(HTTPStatus.OK, get_admin_access_public())
            return
        if self.path == "/api/admin/config":
            if not self._authorize_admin():
                return
            self._write_json(HTTPStatus.OK, get_admin_config())
            return
        super().do_GET()

    def do_PUT(self) -> None:
        if self.path != "/api/admin/config":
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        if not self._authorize_admin():
            return

        payload = self._read_json_payload()
        if payload is None:
            return
        if not isinstance(payload, dict):
            self._write_json_error(HTTPStatus.BAD_REQUEST, "Request payload must be a JSON object.")
            return

        try:
            current = load_runtime_config()
            audit = payload.pop("_audit", None) if isinstance(payload.get("_audit"), dict) else None
            next_config = self._merge_admin_payload(current, payload)
            saved = save_runtime_config(next_config, history_entry=self._build_history_entry(audit))
        except ValueError as exc:
            self._write_json_error(HTTPStatus.BAD_REQUEST, str(exc))
            return
        except Exception as exc:  # pragma: no cover - defensive
            self._write_json_error(HTTPStatus.INTERNAL_SERVER_ERROR, f"Configuration save failed: {exc}")
            return

        self._write_json(HTTPStatus.OK, self._sanitize_config(saved))

    def end_headers(self) -> None:
        self._send_cors_headers()
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def _handle_analyze(self) -> None:
        payload = self._read_json_payload()
        if payload is None:
            return
        if not isinstance(payload, dict):
            self._write_json_error(HTTPStatus.BAD_REQUEST, "Request payload must be a JSON object.")
            return

        try:
            attachments = payload.get("attachments", [])
            if not isinstance(attachments, list):
                raise TypeError("'attachments' must be a list.")

            mail = MailInput(
                subject=str(payload.get("subject", "")),
                sender_name=str(payload.get("sender_name", "")),
                sender_email=str(payload.get("sender_email", "")),
                sender_domain=str(payload.get("sender_domain", "")),
                body_text=str(payload.get("body_text", "")),
                body_html=str(payload.get("body_html", "")),
                attachments=[str(item) for item in attachments],
            )
            features = extract_features(mail)
            matches = evaluate_rules(features)
            result = score_analysis(features, matches).to_dict()
        except Exception as exc:
            self._write_json_error(HTTPStatus.INTERNAL_SERVER_ERROR, f"Analysis failed: {exc}")
            return

        self._write_json(HTTPStatus.OK, result)

    def _handle_admin_login(self) -> None:
        access = get_admin_access_public()
        if not access.get("password_enabled"):
            self._write_json(HTTPStatus.OK, {"token": "open-access", "password_enabled": False})
            return

        payload = self._read_json_payload()
        if payload is None:
            return

        password = ""
        if isinstance(payload, dict):
            password = str(payload.get("password", ""))

        if not password or not verify_admin_password(password):
            self._write_json_error(HTTPStatus.UNAUTHORIZED, "Parola doğrulanamadı.")
            return

        token = secrets.token_urlsafe(24)
        self.server.admin_tokens.add(token)
        self._write_json(HTTPStatus.OK, {"token": token, "password_enabled": True})

    def _handle_admin_password_check(self) -> None:
        if not self._authorize_admin():
            return

        payload = self._read_json_payload()
        if payload is None:
            return

        password = ""
        if isinstance(payload, dict):
            password = str(payload.get("password", ""))

        if not password or not verify_admin_password(password):
            self._write_json_error(HTTPStatus.UNAUTHORIZED, "Parola doğrulanamadı.")
            return

        self._write_json(HTTPStatus.OK, {"verified": True})

    def _handle_admin_reset(self) -> None:
        if not self._authorize_admin():
            return

        payload = self._read_json_payload()
        if payload is None:
            return

        password = ""
        confirmation = ""
        if isinstance(payload, dict):
            password = str(payload.get("password", ""))
            confirmation = str(payload.get("confirmation", ""))

        if not password or not verify_admin_password(password):
            self._write_json_error(HTTPStatus.UNAUTHORIZED, "Parola doğrulanamadı.")
            return

        if confirmation.strip().lower() != "evet":
            self._write_json_error(HTTPStatus.BAD_REQUEST, "İşlemi onaylamak için EVET yazmalısınız.")
            return

        current = load_runtime_config()
        reset_config = build_factory_reset_config(current)
        saved = save_runtime_config(
            reset_config,
            history_entry={
                "actor": "Yönetici",
                "section": "Yönetim araçları",
                "action": "Fabrika ayarlarına dönüldü",
                "details": ["Tüm ayarlar varsayılan değerlere sıfırlandı."],
            },
        )
        self._write_json(HTTPStatus.OK, self._sanitize_config(saved))

    def _read_json_payload(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length)
            if not raw_body:
                return {}
            return json.loads(raw_body.decode("utf-8"))
        except (ValueError, json.JSONDecodeError) as exc:
            self._write_json_error(HTTPStatus.BAD_REQUEST, f"Invalid request payload: {exc}")
            return None

    def _authorize_admin(self) -> bool:
        access = get_admin_access_public()
        if not access.get("password_enabled"):
            return True

        token = self.headers.get(ADMIN_TOKEN_HEADER, "")
        if token and token in self.server.admin_tokens:
            return True

        self._write_json_error(HTTPStatus.UNAUTHORIZED, "Yönetim paneli için giriş yapılması gerekiyor.")
        return False

    def _merge_admin_payload(self, current: dict, payload: dict) -> dict:
        merged = json.loads(json.dumps(current))

        for key, value in payload.items():
            if key == "admin_access":
                merged["admin_access"] = build_admin_access_update(value, current.get("admin_access", {}))
                continue
            if isinstance(merged.get(key), dict) and isinstance(value, dict):
                merged[key].update(value)
            else:
                merged[key] = value

        return merged

    def _sanitize_config(self, config: dict) -> dict:
        clean = json.loads(json.dumps(config))
        access = clean.setdefault("admin_access", {})
        access.pop("password_hash", None)
        access.pop("password_salt", None)
        return clean

    def _build_history_entry(self, audit: dict | None) -> dict | None:
        if not audit:
            return None

        details = audit.get("details", [])
        if not isinstance(details, list):
            details = [str(details)]

        cleaned_details = [str(item).strip() for item in details if str(item).strip()]
        return {
            "actor": str(audit.get("actor", "Yönetici")),
            "section": str(audit.get("section", "Genel")),
            "action": str(audit.get("action", "Ayarlar güncellendi")),
            "details": cleaned_details,
        }

    def _send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", f"Content-Type, {ADMIN_TOKEN_HEADER}")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")

    def _write_json_error(self, status: HTTPStatus, message: str) -> None:
        self._write_json(status, {"error": message})

    def _write_json(self, status: HTTPStatus, payload: dict) -> None:
        response = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="PhishGuard local add-in service")
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", type=int, default=3000)
    parser.add_argument("--cert-file", default="")
    parser.add_argument("--key-file", default="")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    server = ThreadingHTTPServer((args.host, args.port), PhishGuardHandler)
    server.admin_tokens = set()

    if args.cert_file and args.key_file:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certfile=args.cert_file, keyfile=args.key_file)
        server.socket = context.wrap_socket(server.socket, server_side=True)
        scheme = "https"
    else:
        scheme = "http"

    ensure_runtime_config()
    print(f"PhishGuard local service running at {scheme}://{args.host}:{args.port}")
    print(f"Web root: {WEB_ROOT}")
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
