# Kill Ports Script
# Mata todos los procesos de Node.js y libera los puertos 3000 y 5173

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Limpiando puertos ocupados..." -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Función para matar proceso en un puerto específico
function Kill-ProcessOnPort {
    param (
        [int]$Port
    )

    Write-Host "Verificando puerto $Port..." -ForegroundColor Yellow

    $connections = netstat -ano | Select-String ":$Port\s" | Select-String "LISTENING"

    if ($connections) {
        foreach ($conn in $connections) {
            $parts = $conn -split '\s+' | Where-Object { $_ -ne '' }
            $pid = $parts[-1]

            if ($pid -match '^\d+$') {
                try {
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Host "  ✗ Matando proceso $($process.ProcessName) (PID: $pid)" -ForegroundColor Red
                        Stop-Process -Id $pid -Force
                        Write-Host "  ✓ Proceso eliminado" -ForegroundColor Green
                    }
                } catch {
                    Write-Host "  ⚠ No se pudo matar el proceso PID: $pid" -ForegroundColor Yellow
                }
            }
        }
    } else {
        Write-Host "  ✓ Puerto $Port está libre" -ForegroundColor Green
    }
}

# Matar todos los procesos de Node.js (más agresivo)
Write-Host ""
Write-Host "Matando todos los procesos de Node.js..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    foreach ($proc in $nodeProcesses) {
        Write-Host "  ✗ Matando Node.js (PID: $($proc.Id))" -ForegroundColor Red
        Stop-Process -Id $proc.Id -Force
    }
    Write-Host "  ✓ Procesos de Node.js eliminados" -ForegroundColor Green
} else {
    Write-Host "  ✓ No hay procesos de Node.js corriendo" -ForegroundColor Green
}

# Verificar puertos específicos
Write-Host ""
Kill-ProcessOnPort -Port 3000
Kill-ProcessOnPort -Port 5173
Kill-ProcessOnPort -Port 4567

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✓ Limpieza completada" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ahora puedes iniciar el servidor:" -ForegroundColor White
Write-Host "  1. cd server" -ForegroundColor Gray
Write-Host "  2. pnpm dev" -ForegroundColor Gray
Write-Host ""
