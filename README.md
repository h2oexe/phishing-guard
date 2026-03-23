# Balıkçı MVP

This repository contains the first local analyzer prototype for Balıkçı.

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

## Note

The visible app name is `Balıkçı`. The internal Python package name remains `phishguard` for now so the working integration does not break.
