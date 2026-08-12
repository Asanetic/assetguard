# sim-multiport.ps1 - fire GL-28 packets at 5 listener ports AT THE SAME TIME.
# Same test IMEI (863957075080470); each port gets a different, NON-CONFLICTING scenario.
#   5000 Normal | 5023 Disturbance | 5039 Low battery | 5088 Geofence | 5027 Critical motion
# Usage:
#   .\sim-multiport.ps1
#   .\sim-multiport.ps1 -Target 157.173.110.127
#   .\sim-multiport.ps1 -Print
# If blocked:  Set-ExecutionPolicy -Scope Process Bypass   (then run it)

param(
  [string]$Target = "127.0.0.1",
  [switch]$Print
)

$IMEI = "863957075080470"

function New-Frame($fix,$lat,$latH,$lng,$lngH,$speed,$batt,$motion,$mems) {
  $utc  = (Get-Date).ToUniversalTime()
  $d    = $utc.ToString("ddMMyy")
  $t    = $utc.ToString("HHmmss")
  $body = "UD,$d,$t,$fix,$lat,$latH,$lng,$lngH,$speed,0,1650,9,80,$batt,0,0,$motion,1,255,639,02,10256,93847880,155,HomeWiFi,F4:2A:7D:50:DD:C6,-87$mems"
  $len  = "{0:X4}" -f $body.Length
  return "[3G*$IMEI*$len*$body]"
}
$MEMS_OK  = ",+1,20,-12,1010,0.4,0.9,30.2"
$MEMS_HOT = ",+1,200,200,200,2,-3,30"

# every arg quoted on purpose: bare 00000008 would parse as int 8 and corrupt the status word
$jobs = @(
  @{ Port=5000; Count=1; Frame=(New-Frame "A" "1.542000" "S" "37.262000" "E" "0" "90" "00000008" $MEMS_OK) },
  @{ Port=5023; Count=1; Frame=(New-Frame "A" "1.542000" "S" "37.262000" "E" "0" "90" "00100008" $MEMS_OK) },
  @{ Port=5039; Count=1; Frame=(New-Frame "A" "1.542000" "S" "37.262000" "E" "0" "12" "00000009" $MEMS_OK) },
  @{ Port=5088; Count=1; Frame=(New-Frame "A" "1.541400" "S" "37.262600" "E" "0" "90" "00000008" $MEMS_OK) },
  @{ Port=5027; Count=3; Frame=(New-Frame "V" "0.0"      "N" "0.0"       "E" "0" "90" "00000008" $MEMS_HOT) }
)

if ($Print) {
  $jobs | ForEach-Object { "{0}  ({1}x)  {2}" -f $_.Port, $_.Count, $_.Frame }
  return
}

$sender = {
  param($Target, $Port, $Frame, $Count)
  for ($i = 0; $i -lt $Count; $i++) {
    try {
      $c = New-Object System.Net.Sockets.TcpClient
      $c.Connect($Target, $Port)
      $s = $c.GetStream()
      $b = [System.Text.Encoding]::ASCII.GetBytes($Frame)
      $s.Write($b, 0, $b.Length); $s.Flush()
      Start-Sleep -Milliseconds 300
      $c.Close()
      Write-Output ("  :{0}  sent {1}B  {2}..." -f $Port, $Frame.Length, $Frame.Substring(0,38))
    } catch {
      Write-Output ("  :{0}  UNREACHABLE ({1})" -f $Port, $_.Exception.Message)
      break
    }
    if ($Count -gt 1) { Start-Sleep -Milliseconds 500 }
  }
}

Write-Host "Firing all 5 ports at $Target simultaneously (IMEI $IMEI)..."
$running = foreach ($j in $jobs) {
  Start-Job -ScriptBlock $sender -ArgumentList $Target, $j.Port, $j.Frame, $j.Count
}
$running | Wait-Job | Receive-Job
$running | Remove-Job
Write-Host "Done. Check /mainapp/ports (raw) and /mainapp/tcplogs (parsed)."