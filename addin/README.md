# PhishGuard Outlook Add-in

This folder contains a minimal Outlook task pane add-in scaffold for PhishGuard.

## Architecture

- `manifest.xml`: Outlook add-in manifest
- `web/taskpane.html`: task pane UI
- `web/taskpane.js`: Outlook item read + localhost API call
- `web/taskpane.css`: panel styling

## Current Direction

The add-in reads the current email in Outlook using Office.js and posts it to a local analysis endpoint:

```text
POST https://localhost:3000/api/analyze
```

## Important

This scaffold is prepared for the side-pane direction, but Outlook desktop sideloading typically requires a local HTTPS endpoint and trusted certificate.

The current repo does not yet include the HTTPS cert setup. That is the next setup step.

## Local Service

Run the local service from the repo root:

```bash
python local_service/server.py --host localhost --port 3000
```

For Outlook desktop sideloading, the next step is serving the same endpoint over HTTPS with a trusted localhost certificate.

See:

- `local_service/README.md`
