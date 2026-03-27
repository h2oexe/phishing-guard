# PhishGuard MVP

This repository contains the first local analyzer prototype for PhishGuard.

## Run

```bash
python -m phishguard.main sample_emails/phishing_sample.json
python -m phishguard.main sample_emails/normal_sample.json
python run_samples.py
python analyze_outlook_export.py
```

## Current Scope

- Parse links from text and HTML
- Extract basic phishing-related features
- Evaluate a small rule set
- Produce a 0-100 risk score with explanations

## Sample Inputs

- `sample_emails/phishing_sample.json`
- `sample_emails/normal_sample.json`

## Outlook Bridge

- Outlook export input: `outlook/last_selected_mail.json`
- Analyzer output: `outlook/last_analysis_result.json`

## Windows Setup Standard

For multi-user Windows setups, PhishGuard now checks these user environment variables first:

- `PHISHGUARD_ROOT`
- `PHISHGUARD_PYTHON`

Recommended setup:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup_phishguard_env.ps1
```

If Python is not available through `py -3`, set it explicitly:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup_phishguard_env.ps1 -PythonExe "C:\Path\To\python.exe"
```

## Note

The visible app name is `PhishGuard`. The internal Python package name remains `phishguard`.
