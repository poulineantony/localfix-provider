
Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\veera\Downloads\PROVIDER (18).png"
$destPath = "C:\Users\veera\Downloads\PROVIDER_zoomed.png"
$zoomFactor = 1.35

if (-not (Test-Path $sourcePath)) {
    Write-Error "Source file not found: $sourcePath"
    exit 1
}

$img = [System.Drawing.Image]::FromFile($sourcePath)
$width = $img.Width
$height = $img.Height

$newWidth = [int]($width / $zoomFactor)
$newHeight = [int]($height / $zoomFactor)

$x = [int](($width - $newWidth) / 2)
$y = [int](($height - $newHeight) / 2)

$bmp = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$destRect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
$srcRect = New-Object System.Drawing.Rectangle($x, $y, $newWidth, $newHeight)

$graphics.DrawImage($img, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

$bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bmp.Dispose()
$img.Dispose()

Write-Host "Zoomed image saved to $destPath"
