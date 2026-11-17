Write-Host "Compilando frontend React..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\c3po-kanban-web"
npm run build

Write-Host "Copiando build para o backend FastAPI..." -ForegroundColor Cyan
$staticDir = "$PSScriptRoot\c3po-kanban-api\static"
if (Test-Path $staticDir) { Remove-Item -Recurse -Force $staticDir }
Copy-Item -Recurse -Path ".\dist" -Destination $staticDir

Set-Location -Path "$PSScriptRoot\c3po-kanban-api"
$zipPath = "$PSScriptRoot\c3po-kanban-shard.zip"
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }

Write-Host "Gerando pacote c3po-kanban-shard.zip (padrão Linux /)..." -ForegroundColor Cyan
tar -a -c -f $zipPath app static requirements.txt .shardcloud

Set-Location -Path $PSScriptRoot
Write-Host "Pronto! Suba o arquivo c3po-kanban-shard.zip na Shard Cloud." -ForegroundColor Green
