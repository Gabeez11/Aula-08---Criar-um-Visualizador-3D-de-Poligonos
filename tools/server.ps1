param(
  [int]$Port = 5173
)

$RootPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Server = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)

function Get-ContentType {
  param([string]$Path)

  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".css" { "text/css; charset=utf-8"; break }
    ".html" { "text/html; charset=utf-8"; break }
    ".js" { "text/javascript; charset=utf-8"; break }
    ".json" { "application/json; charset=utf-8"; break }
    ".mtl" { "text/plain; charset=utf-8"; break }
    ".obj" { "text/plain; charset=utf-8"; break }
    default { "application/octet-stream"; break }
  }
}

function Write-HttpResponse {
  param(
    [System.IO.Stream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [string]$ContentType,
    [byte[]]$Body,
    [bool]$SkipBody = $false
  )

  $Headers = "HTTP/1.1 $StatusCode $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nConnection: close`r`n`r`n"
  $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($Headers)
  $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)

  if (-not $SkipBody -and $Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
}

function Get-RequestedFilePath {
  param([string]$RequestTarget)

  $PathOnly = $RequestTarget.Split("?")[0]
  $RequestPath = [System.Uri]::UnescapeDataString($PathOnly)

  if ($RequestPath -eq "/") {
    $RequestPath = "/index.html"
  }

  $RelativePath = $RequestPath.TrimStart("/") -replace "/", [System.IO.Path]::DirectorySeparatorChar
  $FullPath = [System.IO.Path]::GetFullPath((Join-Path $RootPath $RelativePath))

  if (-not $FullPath.StartsWith($RootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $null
  }

  if ((Test-Path -LiteralPath $FullPath -PathType Container)) {
    $FullPath = Join-Path $FullPath "index.html"
  }

  return $FullPath
}

function Read-HttpHeader {
  param([System.IO.Stream]$Stream)

  $Buffer = New-Object byte[] 4096
  $Bytes = [System.Collections.Generic.List[byte]]::new()
  $Deadline = [System.DateTime]::UtcNow.AddSeconds(2)

  while ([System.DateTime]::UtcNow -lt $Deadline) {
    if ($Stream.DataAvailable) {
      $Read = $Stream.Read($Buffer, 0, $Buffer.Length)

      if ($Read -le 0) {
        break
      }

      for ($Index = 0; $Index -lt $Read; $Index++) {
        $Bytes.Add($Buffer[$Index])
      }

      if ($Bytes.Count -gt 8192) {
        throw "HTTP header too large"
      }

      $Header = [System.Text.Encoding]::ASCII.GetString($Bytes.ToArray())

      if ($Header.Contains("`r`n`r`n") -or $Header.Contains("`n`n")) {
        return $Header
      }
    }
    else {
      Start-Sleep -Milliseconds 20
    }
  }

  return $null
}

$Server.Start()
Write-Host "Servidor local em http://localhost:$Port"

try {
  while ($true) {
    $Client = $Server.AcceptTcpClient()

    try {
      $Client.ReceiveTimeout = 2000
      $Client.SendTimeout = 2000
      $Stream = $Client.GetStream()
      $Header = Read-HttpHeader $Stream

      if ([string]::IsNullOrWhiteSpace($Header)) {
        continue
      }

      $RequestLine = ($Header -split "\r?\n")[0]
      $Parts = $RequestLine.Split(" ")

      if ($Parts.Length -lt 2) {
        $Body = [System.Text.Encoding]::UTF8.GetBytes("Bad request")
        Write-HttpResponse $Stream 400 "Bad Request" "text/plain; charset=utf-8" $Body $false
        continue
      }

      $Method = $Parts[0]
      $RequestTarget = $Parts[1]

      if ($Method -ne "GET" -and $Method -ne "HEAD") {
        $Body = [System.Text.Encoding]::UTF8.GetBytes("Method not allowed")
        Write-HttpResponse $Stream 405 "Method Not Allowed" "text/plain; charset=utf-8" $Body ($Method -eq "HEAD")
        continue
      }

      $FullPath = Get-RequestedFilePath $RequestTarget

      if ($null -eq $FullPath) {
        $Body = [System.Text.Encoding]::UTF8.GetBytes("Forbidden")
        Write-HttpResponse $Stream 403 "Forbidden" "text/plain; charset=utf-8" $Body ($Method -eq "HEAD")
        continue
      }

      if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
        $Body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
        Write-HttpResponse $Stream 404 "Not Found" "text/plain; charset=utf-8" $Body ($Method -eq "HEAD")
        continue
      }

      $Body = [System.IO.File]::ReadAllBytes($FullPath)
      Write-HttpResponse $Stream 200 "OK" (Get-ContentType $FullPath) $Body ($Method -eq "HEAD")
    }
    catch {
      try {
        if ($null -ne $Stream -and $Stream.CanWrite) {
          $Body = [System.Text.Encoding]::UTF8.GetBytes("Internal server error")
          Write-HttpResponse $Stream 500 "Internal Server Error" "text/plain; charset=utf-8" $Body $false
        }
      }
      catch {
      }
    }
    finally {
      $Client.Close()
    }
  }
}
finally {
  $Server.Stop()
}
