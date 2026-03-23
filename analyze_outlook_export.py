from __future__ import annotations

import json
from pathlib import Path

from phishguard.main import run


BASE_DIR = Path(__file__).resolve().parent
INPUT_PATH = BASE_DIR / "outlook" / "last_selected_mail.json"
OUTPUT_PATH = BASE_DIR / "outlook" / "last_analysis_result.json"


def main() -> int:
    if not INPUT_PATH.exists():
        print(f"Input file not found: {INPUT_PATH}")
        return 1

    result = run(INPUT_PATH)
    OUTPUT_PATH.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Analysis result written to: {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
