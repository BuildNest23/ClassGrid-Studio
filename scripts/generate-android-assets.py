import os
import subprocess

def run(cmd):
    subprocess.check_call(cmd, shell=True)

densities = {
    'mdpi': {'icon': 48, 'fg': 108, 'fg_icon': 72},
    'hdpi': {'icon': 72, 'fg': 162, 'fg_icon': 108},
    'xhdpi': {'icon': 96, 'fg': 216, 'fg_icon': 144},
    'xxhdpi': {'icon': 144, 'fg': 324, 'fg_icon': 216},
    'xxxhdpi': {'icon': 192, 'fg': 432, 'fg_icon': 288},
}

for d, sizes in densities.items():
    dir_path = f"android-res/res/mipmap-{d}"
    os.makedirs(dir_path, exist_ok=True)
    icon_s = sizes['icon']
    fg_s = sizes['fg']
    fg_icon_s = sizes['fg_icon']
    half = icon_s // 2

    # 1. Standard ic_launcher.png
    run(f"convert public/icons/icon-512.png -resize {icon_s}x{icon_s} {dir_path}/ic_launcher.png")

    # 2. Round ic_launcher_round.png
    # Create circular mask and composite
    run(f'convert public/icons/icon-512.png -resize {icon_s}x{icon_s} \\( -size {icon_s}x{icon_s} xc:black -fill white -draw "circle {half},{half} {half},1" \\) -alpha off -compose CopyOpacity -composite {dir_path}/ic_launcher_round.png')

    # 3. Adaptive ic_launcher_foreground.png
    run(f'convert -size {fg_s}x{fg_s} xc:none \\( public/icons/icon-512.png -resize {fg_icon_s}x{fg_icon_s} \\) -gravity center -composite {dir_path}/ic_launcher_foreground.png')

# Splash screens
splashes = [
    ('drawable', 480, 320, 160),
    ('drawable-port-mdpi', 320, 480, 140),
    ('drawable-port-hdpi', 480, 800, 200),
    ('drawable-port-xhdpi', 720, 1280, 300),
    ('drawable-port-xxhdpi', 960, 1600, 400),
    ('drawable-port-xxxhdpi', 1280, 1920, 512),
    ('drawable-land-mdpi', 480, 320, 140),
    ('drawable-land-hdpi', 800, 480, 200),
    ('drawable-land-xhdpi', 1280, 720, 300),
    ('drawable-land-xxhdpi', 1600, 960, 400),
    ('drawable-land-xxxhdpi', 1920, 1280, 512),
]

for folder, w, h, logo_s in splashes:
    dir_path = f"android-res/res/{folder}"
    os.makedirs(dir_path, exist_ok=True)
    run(f'convert -size {w}x{h} xc:"#991B1B" \\( public/icons/icon-512.png -resize {logo_s}x{logo_s} \\) -gravity center -composite {dir_path}/splash.png')

print("All Android launcher and splash assets successfully generated in android-res/res/")
