[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$failures = [System.Collections.Generic.List[string]]::new()
$ignoredDirectoryPattern = '[\\/](?:\.git|node_modules|\.next|\.pnpm-store|coverage)[\\/]'

function Add-Failure {
    param([string]$Message)
    $script:failures.Add($Message)
}

$requiredFiles = @(
    'README.md',
    'CONTEXT.md',
    'LICENSE',
    'NOTICE',
    'ASSET_LICENSES.md',
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
    'SECURITY.md',
    '.github/CODEOWNERS',
    '.github/PULL_REQUEST_TEMPLATE.md',
    '.github/ISSUE_TEMPLATE/bug_report.yml',
    '.github/ISSUE_TEMPLATE/feature_request.yml',
    '.github/ISSUE_TEMPLATE/architecture_change.yml',
    '.github/rulesets/main.json',
    '.github/workflows/governance.yml',
    '.github/workflows/quality.yml',
    'package.json',
    'pnpm-lock.yaml',
    'docs/decision-register.md',
    'docs/adr/README.md',
    'docs/adr/template.md'
)

foreach ($relativePath in $requiredFiles) {
    $fullPath = Join-Path $repositoryRoot $relativePath
    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        Add-Failure "Required file is missing: $relativePath"
    }
}

$markdownFiles = Get-ChildItem -LiteralPath $repositoryRoot -Recurse -Filter '*.md' -File |
    Where-Object { $_.FullName -notmatch $ignoredDirectoryPattern }

foreach ($file in $markdownFiles) {
    $lines = Get-Content -Encoding UTF8 -LiteralPath $file.FullName
    $fenceCount = @($lines | Where-Object { $_ -match '^```' }).Count
    if ($fenceCount % 2 -ne 0) {
        Add-Failure "Unbalanced fenced code blocks in $($file.FullName)."
    }

    $text = [string]::Join("`n", $lines)
    $links = [regex]::Matches($text, '\[[^\]]+\]\(([^)]+)\)')
    foreach ($link in $links) {
        $target = $link.Groups[1].Value
        if ($target -match '^(https?://|mailto:|#)') {
            continue
        }

        $relativeTarget = $target.Split('#')[0].Trim('<', '>')
        if ([string]::IsNullOrWhiteSpace($relativeTarget)) {
            continue
        }

        $decodedTarget = [Uri]::UnescapeDataString($relativeTarget)
        $resolvedTarget = [System.IO.Path]::GetFullPath((Join-Path $file.DirectoryName $decodedTarget))
        if (-not (Test-Path -LiteralPath $resolvedTarget)) {
            Add-Failure "Broken relative link in $($file.FullName): $target"
        }
    }
}

$decisionRegister = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $repositoryRoot 'docs/decision-register.md')
$decisionCount = [regex]::Matches($decisionRegister, '(?m)^\| D[0-9]{2} \|').Count
if ($decisionCount -ne 31) {
    Add-Failure "Expected 31 accepted decisions, found $decisionCount."
}

$adrDirectory = Join-Path $repositoryRoot 'docs/adr'
$acceptedAdrs = @(Get-ChildItem -LiteralPath $adrDirectory -File |
    Where-Object { $_.Name -match '^\d{4}-.+\.md$' })
if ($acceptedAdrs.Count -lt 7) {
    Add-Failure "Expected at least 7 numbered ADRs, found $($acceptedAdrs.Count)."
}

$adrIndex = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $adrDirectory 'README.md')
foreach ($adr in $acceptedAdrs) {
    if ($adrIndex -notmatch [regex]::Escape($adr.Name)) {
        Add-Failure "ADR index does not reference $($adr.Name)."
    }
}

$licenseText = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $repositoryRoot 'LICENSE')
if ($licenseText -notmatch 'Apache License\s+Version 2\.0') {
    Add-Failure 'LICENSE is not recognizable as Apache License 2.0.'
}

$secretPatterns = @(
    '-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----',
    '\bgh[pousr]_[A-Za-z0-9]{20,}\b',
    '\bAKIA[0-9A-Z]{16}\b',
    '(?i)\b(api[_-]?key|client[_-]?secret|database[_-]?password)\s*[:=]\s*["''][^"'']{8,}["'']'
)
$textExtensions = @('.md', '.txt', '.yml', '.yaml', '.json', '.toml', '.ps1', '.ts', '.tsx', '.js', '.mjs', '.cjs')
$textFiles = Get-ChildItem -LiteralPath $repositoryRoot -Recurse -File |
    Where-Object {
        $_.FullName -notmatch $ignoredDirectoryPattern -and
        ($textExtensions -contains $_.Extension.ToLowerInvariant() -or $_.Name -in @('NOTICE', 'LICENSE'))
    }
foreach ($file in $textFiles) {
    $text = Get-Content -Raw -Encoding UTF8 -LiteralPath $file.FullName
    foreach ($pattern in $secretPatterns) {
        if ($text -match $pattern) {
            Add-Failure "Possible secret pattern detected in $($file.FullName)."
        }
    }
}

$assetLicenseText = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $repositoryRoot 'ASSET_LICENSES.md')
$mediaExtensions = @('.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg', '.mp3', '.wav', '.flac', '.mp4', '.mov', '.woff', '.woff2')
$mediaFiles = Get-ChildItem -LiteralPath $repositoryRoot -Recurse -File |
    Where-Object {
        $_.FullName -notmatch $ignoredDirectoryPattern -and
        $mediaExtensions -contains $_.Extension.ToLowerInvariant()
    }
foreach ($file in $mediaFiles) {
    $relativePath = [System.IO.Path]::GetRelativePath($repositoryRoot, $file.FullName).Replace('\', '/')
    if ($assetLicenseText -notmatch [regex]::Escape($relativePath)) {
        Add-Failure "Media asset is not registered in ASSET_LICENSES.md: $relativePath"
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Host "Governance check passed: $($markdownFiles.Count) Markdown files, $decisionCount decisions, $($acceptedAdrs.Count) numbered ADRs, $($mediaFiles.Count) registered media assets."
