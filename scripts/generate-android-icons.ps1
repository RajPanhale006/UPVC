# Generate Android launcher icons from public/shivshakti-logo.png
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$ProjectRoot = Split-Path $PSScriptRoot -Parent
$Source = Join-Path $ProjectRoot "public\shivshakti-logo.png"
$ResRoot = Join-Path $ProjectRoot "android\app\src\main\res"

$sizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

$src = [System.Drawing.Image]::FromFile($Source)

foreach ($folder in $sizes.Keys) {
    $px = $sizes[$folder]
    $dir = Join-Path $ResRoot $folder
    New-Item -ItemType Directory -Force -Path $dir | Out-Null

    $bmp = New-Object System.Drawing.Bitmap $px, $px
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White)
    $g.DrawImage($src, 0, 0, $px, $px)
    $g.Dispose()

    $launcher = Join-Path $dir "ic_launcher.png"
    $round = Join-Path $dir "ic_launcher_round.png"
    $foreground = Join-Path $dir "ic_launcher_foreground.png"

    $bmp.Save($launcher, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save($round, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save($foreground, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    Write-Host "Generated $folder ($px px)"
}

$src.Dispose()
Write-Host "Android launcher icons updated."
