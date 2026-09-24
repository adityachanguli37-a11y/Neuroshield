$wscript = New-Object -ComObject WScript.Shell
$projectDir = "c:\Users\adity\OneDrive\Desktop\Projects\NeuroShield"
$targetBat = Join-Path $projectDir "launch.bat"
$iconPath = Join-Path $projectDir "assets\icons\icon.ico"

$desktopPaths = @(
    [Environment]::GetFolderPath('Desktop'),
    "C:\Users\adity\OneDrive\Desktop"
) | Select-Object -Unique

foreach ($desktop in $desktopPaths) {
    if (Test-Path $desktop) {
        $shortcutPath = Join-Path $desktop "Launch NeuroShield.lnk"
        $shortcut = $wscript.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $targetBat
        $shortcut.WorkingDirectory = $projectDir
        $shortcut.IconLocation = "$iconPath,0"
        $shortcut.Description = "Launch NeuroShield Desktop Security Platform"
        $shortcut.Save()
        Write-Output "Created shortcut: $shortcutPath"
    }
}
