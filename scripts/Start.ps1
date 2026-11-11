. (Join-Path $PSScriptRoot 'Common.ps1')
Initialize-Manicule
Ensure-ManiculeDependencies
Invoke-ManiculeCompose -Arguments @('run', '--rm', '--no-deps', 'web-check', 'npm', 'run', 'build')
Invoke-ManiculeCompose -Arguments @('run', '--rm', '--no-deps', 'api-check', 'mvn', '-B', '-ntp', '-DskipTests', 'package')
Invoke-ManiculeCompose -Arguments @('build', 'api', 'web')
Invoke-ManiculeCompose -Arguments @('up', '-d', '--wait', '--wait-timeout', '180', 'db', 'api', 'web')
Write-Host 'Manicule is ready at http://localhost:18107 (API http://localhost:18207).'
