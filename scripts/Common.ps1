Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:ProjectRoot = Split-Path -Parent $PSScriptRoot
$script:ComposeFile = Join-Path $ProjectRoot 'infra\docker\compose.yaml'
$env:COMPOSE_PARALLEL_LIMIT = '1'

function Invoke-ManiculeCompose {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)
    Write-Host ("+ docker compose --ansi never -p manicule -f infra\docker\compose.yaml " + ($Arguments -join ' '))
    & docker compose --ansi never -p manicule -f $ComposeFile @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Manicule Compose command failed with exit code $LASTEXITCODE."
    }
}

function Initialize-Manicule {
    & docker info --format 'Docker ready: {{.ServerVersion}} / {{.OSType}}'
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker is unavailable. Start Docker Desktop with Linux containers and retry.'
    }
    $localDirectory = Join-Path $ProjectRoot '.local'
    New-Item -ItemType Directory -Force -Path $localDirectory | Out-Null
    $missing = @('db-admin-password', 'db-app-password') | Where-Object { -not (Test-Path -LiteralPath (Join-Path $localDirectory $_)) }
    if ($missing) {
        $existingVolume = & docker volume ls --filter label=com.docker.compose.project=manicule --filter label=com.docker.compose.volume=postgres_data --format '{{.Name}}'
        if ($LASTEXITCODE -ne 0) { throw 'Cannot check for an existing Manicule database volume.' }
        if ($existingVolume) {
            throw 'Database credentials are missing but persistent Manicule data exists. Restore .local credentials; do not reset the database.'
        }
    }
    foreach ($name in @('db-admin-password', 'db-app-password')) {
        $path = Join-Path $localDirectory $name
        if (-not (Test-Path -LiteralPath $path)) {
            $bytes = New-Object byte[] 32
            $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
            try {
                $generator.GetBytes($bytes)
                [IO.File]::WriteAllText($path, [Convert]::ToBase64String($bytes), [Text.UTF8Encoding]::new($false))
            } finally {
                $generator.Dispose()
                [Array]::Clear($bytes, 0, $bytes.Length)
            }
        }
        if ((Get-Item -LiteralPath $path).Length -eq 0) {
            throw "Local credential file is empty: $name. Restore it; do not reset the database."
        }
    }
    if ([Environment]::OSVersion.Platform -eq [PlatformID]::Unix) {
        & chmod 700 $localDirectory
        if ($LASTEXITCODE -ne 0) { throw 'Cannot protect the local credential directory.' }
        foreach ($name in @('db-admin-password', 'db-app-password')) {
            & chmod 444 (Join-Path $localDirectory $name)
            if ($LASTEXITCODE -ne 0) { throw 'Cannot set container-readable credential permissions.' }
        }
    }
    Invoke-ManiculeCompose -Arguments @('config', '--quiet')
}

function Ensure-ManiculeDependencies {
    Write-Host '+ docker compose -p manicule -f infra\docker\compose.yaml run --rm --no-deps web-check npm ls --depth=0'
    & docker compose -p manicule -f $ComposeFile run --rm --no-deps web-check npm ls --depth=0
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Dependency validation failed; restoring the locked dependencies.'
        Invoke-ManiculeCompose -Arguments @('run', '--rm', '--no-deps', 'web-check', 'npm', 'ci')
    }
}
