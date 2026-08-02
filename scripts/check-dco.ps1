[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BaseSha,

    [Parameter(Mandatory = $true)]
    [string]$HeadSha
)

$ErrorActionPreference = 'Stop'

$commitOutput = & git rev-list --no-merges "$BaseSha..$HeadSha"
if ($LASTEXITCODE -ne 0) {
    throw "Unable to enumerate commits between $BaseSha and $HeadSha."
}

$commits = @($commitOutput | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
$failures = [System.Collections.Generic.List[string]]::new()

foreach ($sha in $commits) {
    $authorName = (& git show -s --format=%an $sha).Trim()
    $authorEmail = (& git show -s --format=%ae $sha).Trim()
    $message = (& git show -s --format=%B $sha) -join "`n"

    if ($authorName -match '\[bot\]$' -or $authorEmail -match 'bots?\.noreply\.github\.com$') {
        continue
    }

    $escapedEmail = [regex]::Escape($authorEmail)
    $signOffPattern = "(?im)^Signed-off-by:\s+.+\s+<$escapedEmail>\s*$"
    if ($message -notmatch $signOffPattern) {
        $failures.Add("$sha ($authorName <$authorEmail>) is missing a matching Signed-off-by trailer.")
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    Write-Host 'Amend each affected commit with: git commit --amend -s'
    exit 1
}

Write-Host "DCO check passed for $($commits.Count) non-merge commit(s)."
