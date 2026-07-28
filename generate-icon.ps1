Add-Type -AssemblyName System.Drawing

$bitmap = New-Object System.Drawing.Bitmap(256, 256)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Background dark circle
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
$graphics.FillRectangle($bgBrush, 0, 0, 256, 256)

# Outer glow / circle
$redPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 239, 68, 68), 16)
$bluePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 0, 102, 255), 16)

$graphics.DrawArc($bluePen, 32, 32, 192, 192, 200, 140)
$graphics.DrawArc($redPen, 64, 64, 128, 128, 200, 140)

# Freebox emblem dot
$redBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 239, 68, 68))
$graphics.FillEllipse($redBrush, 112, 160, 32, 32)

$bitmap.Save("icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()

Write-Host "icon.png généré avec succès !" -ForegroundColor Green
