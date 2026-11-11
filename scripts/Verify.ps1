param([switch]$Format)

. (Join-Path $PSScriptRoot 'Common.ps1')
Add-Type -AssemblyName System.Net.Http
$artifacts = Join-Path $ProjectRoot 'artifacts'
New-Item -ItemType Directory -Force -Path $artifacts | Out-Null
$logName = 'verification-' + [DateTimeOffset]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '.log'
Start-Transcript -Path (Join-Path $artifacts $logName) -Force | Out-Null
$summary = [ordered]@{
    startedAt = [DateTimeOffset]::UtcNow.ToString('o')
    status = 'running'
    phase = 1
    project = 'manicule'
    log = $logName
    checks = @()
}
$client = [Net.Http.HttpClient]::new()
$client.Timeout = [TimeSpan]::FromSeconds(10)

function Assert-Verified {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw "Verification failed: $Message" }
    Write-Host "PASS: $Message"
    $script:summary.checks += $Message
}

function Read-LocalHttp {
    param([string]$Url)
    $response = $client.GetAsync($Url).GetAwaiter().GetResult()
    try {
        [pscustomobject]@{
            Status = [int]$response.StatusCode
            Body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        }
    } finally {
        $response.Dispose()
    }
}

function Get-RuntimeContainer {
    param([string]$Service)
    $id = & docker compose -p manicule -f $ComposeFile ps -q $Service
    if ($LASTEXITCODE -ne 0 -or -not $id) { throw "Cannot resolve Manicule service $Service." }
    $json = & docker inspect $id
    if ($LASTEXITCODE -ne 0) { throw "Cannot inspect Manicule service $Service." }
    ($json | ConvertFrom-Json)[0]
}

try {
    Initialize-Manicule
    Ensure-ManiculeDependencies
    if ($Format) {
        Invoke-ManiculeCompose -Arguments @('run', '--rm', '--no-deps', 'web-check', 'npm', 'run', 'format')
        Invoke-ManiculeCompose -Arguments @('run', '--rm', '--no-deps', 'api-check', 'mvn', '-B', '-ntp', 'spotless:apply')
    }
    Invoke-ManiculeCompose -Arguments @('run', '--rm', '--no-deps', 'web-check', 'sh', '-c', 'npm run format:check && npm run lint && npm run test && npm run build')
    $summary.checks += 'Frontend formatting, lint, unit tests, TypeScript check and production build'
    try {
        Invoke-ManiculeCompose -Arguments @('up', '-d', '--wait', '--wait-timeout', '90', 'db-bootstrap-check')
        Invoke-ManiculeCompose -Arguments @('exec', '-T', 'db-bootstrap-check', 'psql', '-U', 'postgres', '-d', 'manicule', '-v', 'ON_ERROR_STOP=1', '-c', 'SELECT current_database(), rolname, rolsuper FROM pg_roles WHERE rolname = ''manicule''')
        $summary.checks += 'Fresh PostgreSQL bootstrap from SQL succeeds on an isolated temporary filesystem'
    } finally {
        Invoke-ManiculeCompose -Arguments @('stop', 'db-bootstrap-check')
        Invoke-ManiculeCompose -Arguments @('rm', '-f', 'db-bootstrap-check')
    }
    Invoke-ManiculeCompose -Arguments @('up', '-d', '--wait', '--wait-timeout', '90', 'db')
    Invoke-ManiculeCompose -Arguments @('run', '--rm', '--no-deps', 'api-check', 'mvn', '-B', '-ntp', 'spotless:check', 'verify')
    $summary.checks += 'Java formatting, compilation, unit tests, PostgreSQL integration tests and JAR packaging'
    Invoke-ManiculeCompose -Arguments @('build', 'api', 'web')
    Invoke-ManiculeCompose -Arguments @('up', '-d', '--wait', '--wait-timeout', '180', 'db', 'api', 'web')
    Invoke-ManiculeCompose -Arguments @('run', '--rm', '--no-deps', 'e2e')
    $summary.checks += 'Real Chromium browser and direct API E2E smoke tests'

    $web = Read-LocalHttp 'http://127.0.0.1:18107/'
    Assert-Verified ($web.Status -eq 200 -and $web.Body.Contains('<div id="root">')) 'Host web port 18107 serves the production frontend'
    $before = Read-LocalHttp 'http://127.0.0.1:18207/api/status'
    Assert-Verified ($before.Status -eq 200 -and ($before.Body | ConvertFrom-Json).schemaVersion -eq 1) 'Host API port 18207 reads migrated schema version 1'

    foreach ($service in @('db', 'api', 'web')) {
        $container = Get-RuntimeContainer $service
        Assert-Verified ($container.State.Health.Status -eq 'healthy') "$service is healthy"
        Assert-Verified ($container.HostConfig.Memory -gt 0 -and $container.HostConfig.NanoCpus -gt 0 -and $container.HostConfig.PidsLimit -gt 0) "$service has memory, CPU and PID limits"
        Assert-Verified ($container.HostConfig.CapDrop -contains 'ALL' -and $container.HostConfig.SecurityOpt -contains 'no-new-privileges:true') "$service drops capabilities and prevents privilege escalation"
        Assert-Verified ($container.HostConfig.ReadonlyRootfs -eq $true -and $container.Config.User -notin @('', '0', 'root', '0:0', 'root:root')) "$service has a read-only root filesystem and non-root user"
        $networks = @($container.NetworkSettings.Networks.PSObject.Properties.Name)
        $bindings = @($container.HostConfig.PortBindings.PSObject.Properties)
        if ($service -in @('db', 'api')) {
            Assert-Verified ($networks.Count -eq 1 -and $networks[0] -eq 'manicule_runtime') "$service uses only the isolated runtime network"
            Assert-Verified ($bindings.Count -eq 0) "$service has no directly published host port"
        } else {
            Assert-Verified ($networks.Count -eq 2 -and $networks -contains 'manicule_runtime' -and $networks -contains 'manicule_edge') 'Only the fixed-upstream nginx gateway joins the ingress network'
            Assert-Verified ($bindings.Count -eq 2) 'Gateway publishes exactly the two reserved ports'
            foreach ($port in @(@('8080/tcp', '18107'), @('8081/tcp', '18207'))) {
                $actual = $container.NetworkSettings.Ports.($port[0])
                Assert-Verified ($actual.Count -eq 1 -and $actual[0].HostIp -eq '127.0.0.1' -and $actual[0].HostPort -eq $port[1]) "Gateway actually publishes loopback port $($port[1])"
            }
        }
    }
    $internal = & docker network inspect manicule_runtime --format '{{.Internal}}'
    if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect the Manicule runtime network.' }
    Assert-Verified ($internal -eq 'true') 'Runtime network is internal with external routing disabled'

    try {
        Invoke-ManiculeCompose -Arguments @('stop', 'db')
        $unready = Read-LocalHttp 'http://127.0.0.1:18207/actuator/health/readiness'
        Assert-Verified ($unready.Status -eq 503) 'Database outage makes readiness HTTP 503'
        $unavailable = Read-LocalHttp 'http://127.0.0.1:18207/api/status'
        Assert-Verified ($unavailable.Status -eq 503 -and ($unavailable.Body | ConvertFrom-Json).title -eq 'Database unavailable') 'Database outage returns an explicit status API failure'
        $liveness = Read-LocalHttp 'http://127.0.0.1:18207/actuator/health/liveness'
        Assert-Verified ($liveness.Status -eq 200) 'Process liveness remains available during the DB outage'
    } finally {
        Invoke-ManiculeCompose -Arguments @('up', '-d', '--wait', '--wait-timeout', '180', 'db', 'api', 'web')
    }
    $after = Read-LocalHttp 'http://127.0.0.1:18207/api/status'
    Assert-Verified ($after.Status -eq 200 -and $after.Body -eq $before.Body) 'Database recovery preserves the migrated marker'
    Invoke-ManiculeCompose -Arguments @('ps')
    Invoke-ManiculeCompose -Arguments @('exec', '-T', 'api', 'java', '-version')
    Invoke-ManiculeCompose -Arguments @('exec', '-T', 'db', 'postgres', '--version')
    & docker image inspect manicule-api:local manicule-web:local postgres:17-alpine --format '{{json .RepoTags}} {{.Id}}'
    if ($LASTEXITCODE -ne 0) { throw 'Cannot record the runtime image IDs.' }
    $summary.status = 'passed'
    Write-Host 'All Manicule Phase 1 verification gates passed. No later phase was implemented.'
} catch {
    $summary.status = 'failed'
    $summary.failure = $_.Exception.Message
    throw
} finally {
    $summary.completedAt = [DateTimeOffset]::UtcNow.ToString('o')
    $summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $artifacts 'verification.json') -Encoding UTF8
    $client.Dispose()
    Stop-Transcript | Out-Null
}
