param(
  [Parameter(Mandatory=$true)]
  [string]$ZipPath,
  [string]$RepoPath = (Get-Location).Path,
  [string]$Branch = "ui/solstice-frosted-brand-system"
)

$ErrorActionPreference = "Stop"

$repo = (Resolve-Path $RepoPath).Path
$zip = (Resolve-Path $ZipPath).Path

function Run-Git([string[]]$GitArgs) {
  & git -C $repo @GitArgs
  if ($LASTEXITCODE -ne 0) { throw "git $($GitArgs -join ' ') failed with exit code $LASTEXITCODE" }
}

$currentBranch = (& git -C $repo branch --show-current).Trim()
if ($LASTEXITCODE -ne 0) { throw "Unable to read current Git branch." }
if ($currentBranch -ne $Branch) {
  throw "Safety stop: current branch is '$currentBranch', expected '$Branch'. Switch to the target branch and rerun."
}

$status = & git -C $repo status --porcelain
if ($LASTEXITCODE -ne 0) { throw "Unable to read Git status." }
if ($status) {
  Write-Host "Working tree has changes; nothing has been copied or committed." -ForegroundColor Yellow
  $status | ForEach-Object { Write-Host $_ }
  throw "Commit/stash your existing work first, or use a separate clean worktree. This script intentionally will not overwrite uncommitted work."
}

$temp = Join-Path $env:TEMP ("51job-migration-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $temp | Out-Null
try {
  Expand-Archive -LiteralPath $zip -DestinationPath $temp -Force
  $roots = Get-ChildItem -LiteralPath $temp -Directory
  if ($roots.Count -ne 1) { throw "Could not identify a single project root inside the ZIP." }
  $sourceRoot = $roots[0].FullName

  $files = @(
    "src/lib/51job-source-adapter.ts",
    "src/lib/51job-source-adapter.test.ts",
    "src/lib/51job-source-adapter.acceptance.ts",
    "src/routes/api.discover-51job.ts",
    "src/lib/job-search-preferences.ts",
    "src/lib/job-platform.ts",
    "src/lib/job-source.ts",
    "src/lib/job-source-types.ts",
    "src/lib/job-dedup.ts"
  )

  $changed = @()
  foreach ($relative in $files) {
    $source = Join-Path $sourceRoot ($relative -replace '/', '\')
    $destination = Join-Path $repo ($relative -replace '/', '\')

    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
      throw "ZIP is missing expected source file: $relative. No Git commit has been made."
    }

    $sourceHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
    $destinationHash = if (Test-Path -LiteralPath $destination -PathType Leaf) {
      (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
    } else { $null }

    if ($sourceHash -ne $destinationHash) {
      $destinationDir = Split-Path -Parent $destination
      New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
      Copy-Item -LiteralPath $source -Destination $destination -Force
      $changed += $relative
    }
  }

  if ($changed.Count -eq 0) {
    Write-Host "All selected 51Job files already match the ZIP; no commit is needed." -ForegroundColor Green
    exit 0
  }

  Write-Host "`nFiles copied from the local System ZIP:" -ForegroundColor Cyan
  $changed | ForEach-Object { Write-Host "  $_" }

  Run-Git (@("add") + $changed)
  Run-Git @("diff", "--cached", "--check")

  Write-Host "`nStaged diff summary:" -ForegroundColor Cyan
  & git -C $repo diff --cached --stat
  if ($LASTEXITCODE -ne 0) { throw "Unable to inspect staged diff." }

  $confirm = Read-Host "`nReview the staged diff above. Commit and push these 51Job files to '$Branch'? Type YES to continue"
  if ($confirm -cne "YES") {
    Run-Git @("reset")
    Write-Host "Cancelled. Copied files remain in the working tree but are not committed."
    exit 0
  }

  Run-Git @("commit", "-m", "Port local System 51Job search implementation")
  Run-Git @("push", "origin", $Branch)

  Write-Host "`nMigration commit pushed successfully." -ForegroundColor Green
  Run-Git @("log", "-1", "--oneline")
  Run-Git @("status", "--short", "--branch")
}
finally {
  if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Recurse -Force }
}
