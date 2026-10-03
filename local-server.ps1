param(
  [ValidateRange(1024, 65535)]
  [int]$Port = 8765
)

$ErrorActionPreference = 'Stop'
$Root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$RootPrefix = $Root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$Listener = $null

function Send-Response {
  param(
    [System.IO.Stream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [string]$ContentType,
    [byte[]]$Body,
    [switch]$HeadOnly
  )

  $headerText = "HTTP/1.1 $StatusCode $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nConnection: close`r`nCache-Control: no-cache`r`nX-Content-Type-Options: nosniff`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headerText)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if (-not $HeadOnly -and $Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
  $Stream.Flush()
}

function Send-TextResponse {
  param(
    [System.IO.Stream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [string]$Message,
    [switch]$HeadOnly
  )
  $body = [System.Text.Encoding]::UTF8.GetBytes($Message)
  Send-Response -Stream $Stream -StatusCode $StatusCode -StatusText $StatusText -ContentType 'text/plain; charset=utf-8' -Body $body -HeadOnly:$HeadOnly
}

try {
  $Listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
  $Listener.Start()
  Write-Host "灰冠のギルド ローカルサーバー: http://127.0.0.1:$Port/" -ForegroundColor Cyan
  Write-Host '停止するには Ctrl+C を押してください。'

  while ($true) {
    $client = $Listener.AcceptTcpClient()
    $stream = $null
    $reader = $null
    try {
      $client.ReceiveTimeout = 5000
      $client.SendTimeout = 5000
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($requestLine)) {
        continue
      }

      $parts = $requestLine -split ' ', 3
      if ($parts.Count -lt 2) {
        Send-TextResponse -Stream $stream -StatusCode 400 -StatusText 'Bad Request' -Message 'Bad request.'
        continue
      }

      $method = $parts[0].ToUpperInvariant()
      $headOnly = $method -eq 'HEAD'
      if ($method -ne 'GET' -and -not $headOnly) {
        Send-TextResponse -Stream $stream -StatusCode 405 -StatusText 'Method Not Allowed' -Message 'Only GET and HEAD are supported.'
        continue
      }

      $target = ($parts[1] -split '\?', 2)[0]
      try {
        $relativePath = [System.Uri]::UnescapeDataString($target).TrimStart('/')
      } catch {
        Send-TextResponse -Stream $stream -StatusCode 400 -StatusText 'Bad Request' -Message 'Invalid path.' -HeadOnly:$headOnly
        continue
      }
      if ([string]::IsNullOrWhiteSpace($relativePath)) {
        $relativePath = 'index.html'
      }
      $relativePath = $relativePath.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
      $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Root, $relativePath))
      if (-not $filePath.StartsWith($RootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        Send-TextResponse -Stream $stream -StatusCode 403 -StatusText 'Forbidden' -Message 'Forbidden.' -HeadOnly:$headOnly
        continue
      }
      if (-not [System.IO.File]::Exists($filePath)) {
        Send-TextResponse -Stream $stream -StatusCode 404 -StatusText 'Not Found' -Message 'Not found.' -HeadOnly:$headOnly
        continue
      }

      $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
      $contentType = switch ($extension) {
        '.html' { 'text/html; charset=utf-8' }
        '.css'  { 'text/css; charset=utf-8' }
        '.js'   { 'text/javascript; charset=utf-8' }
        '.json' { 'application/json; charset=utf-8' }
        '.svg'  { 'image/svg+xml' }
        '.png'  { 'image/png' }
        '.webp' { 'image/webp' }
        '.jpg'  { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.ico'  { 'image/x-icon' }
        default { 'application/octet-stream' }
      }
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      Send-Response -Stream $stream -StatusCode 200 -StatusText 'OK' -ContentType $contentType -Body $bytes -HeadOnly:$headOnly
    } catch {
      Write-Host "リクエスト処理エラー: $($_.Exception.Message)" -ForegroundColor Yellow
      if ($null -ne $stream -and $stream.CanWrite) {
        try { Send-TextResponse -Stream $stream -StatusCode 500 -StatusText 'Internal Server Error' -Message 'Internal server error.' } catch { }
      }
    } finally {
      if ($null -ne $reader) { $reader.Dispose() }
      if ($null -ne $client) { $client.Close() }
    }
  }
} catch {
  Write-Host "ローカルサーバーを起動できませんでした: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "ポート $Port が使用中でないか確認してください。"
  Read-Host 'Enterキーを押すとウィンドウを閉じます'
  exit 1
} finally {
  if ($null -ne $Listener) { $Listener.Stop() }
}
