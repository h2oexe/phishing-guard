$repoRoot = Split-Path -Parent $PSScriptRoot
$certFile = Join-Path $PSScriptRoot "certs\localhost-cert.pem"
$keyFile = Join-Path $PSScriptRoot "certs\localhost-key.pem"

python (Join-Path $PSScriptRoot "server.py") `
  --host localhost `
  --port 3000 `
  --cert-file $certFile `
  --key-file $keyFile
