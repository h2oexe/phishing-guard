from __future__ import annotations

import json
import sys
from pathlib import Path

from phishguard.extractor import extract_features
from phishguard.models import MailInput
from phishguard.rules import evaluate_rules
from phishguard.scorer import score_analysis


def load_mail_input(path: Path) -> MailInput:
    payload = json.loads(read_json_text(path))
    return MailInput(
        subject=payload.get("subject", ""),
        sender_name=payload.get("sender_name", ""),
        sender_email=payload.get("sender_email", ""),
        sender_domain=payload.get("sender_domain", ""),
        body_text=payload.get("body_text", ""),
        body_html=payload.get("body_html", ""),
        attachments=payload.get("attachments", []),
    )


def read_json_text(path: Path) -> str:
    encodings = ("utf-8", "utf-8-sig", "cp1254", "cp1252")
    last_error: UnicodeDecodeError | None = None
    for encoding in encodings:
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError as exc:
            last_error = exc
    if last_error is not None:
        raise last_error
    return path.read_text()


def run(path: Path) -> dict:
    mail = load_mail_input(path)
    features = extract_features(mail)
    matches = evaluate_rules(features)
    result = score_analysis(features, matches)
    return result.to_dict()


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python -m phishguard.main <input.json>")
        return 1

    input_path = Path(sys.argv[1])
    result = run(input_path)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
