param(
    [string]$RepoRoot = $PSScriptRoot,
    [string]$PythonExe = ""
)

$resolvedRepoRoot = (Resolve-Path $RepoRoot).Path
[Environment]::SetEnvironmentVariable("PHISHGUARD_ROOT", $resolvedRepoRoot, "User")

if ($PythonExe -and $PythonExe.Trim().Length -gt 0) {
    [Environment]::SetEnvironmentVariable("PHISHGUARD_PYTHON", $PythonExe.Trim(), "User")
    Write-Host "PHISHGUARD_PYTHON set to: $($PythonExe.Trim())"
} else {
    Write-Host "PHISHGUARD_PYTHON not changed. VBA will fall back to 'py -3'."
}

Write-Host "PHISHGUARD_ROOT set to: $resolvedRepoRoot"
Write-Host ""
Write-Host "Restart Outlook after changing environment variables."
