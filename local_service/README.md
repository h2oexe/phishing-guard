# PhishGuard Local HTTPS Setup

This folder contains the local HTTPS service for the Outlook add-in.

## Recommended First Step

From the repo root, set the standard user environment variables:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup_phishguard_env.ps1
```

If Python is not available through `py -3`, set it explicitly:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup_phishguard_env.ps1 -PythonExe "C:\Path\To\python.exe"
```

## 1. Generate localhost certificate

```bash
python local_service/generate_dev_cert.py
```

Generated files:

- `local_service/certs/localhost-cert.pem`
- `local_service/certs/localhost-cert.cer`
- `local_service/certs/localhost-key.pem`

## 2. Trust the certificate in Windows

Run in PowerShell:

```powershell
Import-Certificate -FilePath "C:\Users\stajyer_it1\Desktop\phish\local_service\certs\localhost-cert.cer" -CertStoreLocation Cert:\CurrentUser\Root
```

## 3. Start the HTTPS service

```bash
python local_service/server.py --host localhost --port 3000 --cert-file local_service/certs/localhost-cert.pem --key-file local_service/certs/localhost-key.pem
```

Or use:

```powershell
.\local_service\start_https_service.ps1
```

## 4. Sideload the add-in

Use:

- `addin/manifest.xml`

The manifest expects:

- `https://localhost:3000/taskpane.html`
- `https://localhost:3000/commands.html`
- `https://localhost:3000/assets/...`
