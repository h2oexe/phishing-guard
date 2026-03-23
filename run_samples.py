from __future__ import annotations

import json
from pathlib import Path

from phishguard.main import run


def main() -> int:
    sample_dir = Path("sample_emails")
    for sample_path in sorted(sample_dir.glob("*.json")):
        result = run(sample_path)
        print(f"=== {sample_path.name} ===")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
