# Script para crear los 2 planes de suscripcion de Mi Progreso en Mercado Pago.
# Uso: corre este archivo con  .\scripts\crear-planes-mp.ps1
# Te va a pedir el Access Token en la propia terminal (pegalo con click derecho
# o Ctrl+V y Enter) - nunca queda guardado en este archivo.
#
# Los "id" que devuelva cada plan van a Vercel como MP_PLAN_ID_MONTHLY y
# MP_PLAN_ID_YEARLY (no son secretos, son solo identificadores).

Write-Host "En esta consola clasica, Ctrl+V NO pega -- hace CLICK DERECHO para pegar el token." -ForegroundColor Yellow
$MP_ACCESS_TOKEN = Read-Host "Pega tu Access Token de Mercado Pago (click derecho) y apreta Enter"
# El portapapeles a veces trae caracteres invisibles (saltos de linea, BOM,
# espacios de ancho raro) que rompen el header HTTP ("caracteres de control
# no validos"). Un Access Token de MP solo usa letras/numeros/guiones, asi
# que nos quedamos solo con caracteres ASCII imprimibles validos para eso.
$MP_ACCESS_TOKEN = ($MP_ACCESS_TOKEN -replace '[^A-Za-z0-9\-_.]', '')

if ([string]::IsNullOrWhiteSpace($MP_ACCESS_TOKEN)) {
    Write-Host "No se recibio ningun token." -ForegroundColor Red
    exit 1
}
Write-Host "Token recibido ($($MP_ACCESS_TOKEN.Length) caracteres, empieza con '$($MP_ACCESS_TOKEN.Substring(0, [Math]::Min(8, $MP_ACCESS_TOKEN.Length)))')" -ForegroundColor DarkGray

$headers = @{
    "Authorization" = "Bearer $MP_ACCESS_TOKEN"
    "Content-Type"  = "application/json"
}

Write-Host ""
Write-Host "Creando plan mensual (`$3.900 ARS/mes)..." -ForegroundColor Cyan
$monthlyBody = @{
    reason        = "Mi Progreso Premium Mensual"
    auto_recurring = @{
        frequency      = 1
        frequency_type = "months"
        transaction_amount = 3900
        currency_id    = "ARS"
    }
    back_url = "https://mi-progreso-one.vercel.app/premium/confirmacion"
} | ConvertTo-Json -Depth 5

try {
    $monthlyResponse = Invoke-RestMethod -Uri "https://api.mercadopago.com/preapproval_plan" -Method Post -Headers $headers -Body $monthlyBody
    Write-Host "Plan mensual creado. id = $($monthlyResponse.id)" -ForegroundColor Green
} catch {
    Write-Host "Error creando el plan mensual:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

Write-Host ""
Write-Host "Creando plan anual (`$32.000 ARS/anio)..." -ForegroundColor Cyan
$yearlyBody = @{
    reason        = "Mi Progreso Premium Anual"
    auto_recurring = @{
        frequency      = 12
        frequency_type = "months"
        transaction_amount = 32000
        currency_id    = "ARS"
    }
    back_url = "https://mi-progreso-one.vercel.app/premium/confirmacion"
} | ConvertTo-Json -Depth 5

try {
    $yearlyResponse = Invoke-RestMethod -Uri "https://api.mercadopago.com/preapproval_plan" -Method Post -Headers $headers -Body $yearlyBody
    Write-Host "Plan anual creado. id = $($yearlyResponse.id)" -ForegroundColor Green
} catch {
    Write-Host "Error creando el plan anual:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

Write-Host ""
Write-Host "===================================================="
Write-Host "MP_PLAN_ID_MONTHLY = $($monthlyResponse.id)"
Write-Host "MP_PLAN_ID_YEARLY  = $($yearlyResponse.id)"
Write-Host "===================================================="
Write-Host "Guarda estos 2 valores (no son secretos), van a Vercel en el paso siguiente."
