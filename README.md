# VRA Intelligent Image Optimizer

**Trusted name in education** · [https://vsa.edu.in/](https://vsa.edu.in/)

A free, offline Windows program that turns big mobile-phone photos into small, sharp **WebP** images for fast-loading websites, without visible quality loss.

Made by Vidyasagar Robotics Academy for web designers and website owners who receive large photos from clients and must convert them one by one.

## What it does

- **Any image to WebP by default.** JPG, PNG, HEIC (iPhone), BMP, GIF, TIFF, AVIF and WebP go in. Small WebP files come out.
- **Intelligent compression.** Finds the best quality for each photo by itself, and protects text, logos and sharp graphics.
- **Target file size.** Aims for under 200 KB (changeable) without going below a lowest quality (60% by default).
- **Quality slider.** Switch to Manual and set the compression yourself.
- **Smart resizing.** Limits the width to 1900 px (changeable). Smaller images are never enlarged.
- **Correct rotation.** Phone photos never come out sideways.
- **Hidden metadata removal.** Removes GPS location and camera details, for privacy and smaller files.
- **Whole folders.** Drop a folder and every image inside is converted, keeping the folder structure.
- **Website-friendly names.** Lowercase, no spaces, and an existing file is never overwritten.
- **Other conversions.** WebP to JPG or PNG, and any image to JPG or PNG.
- **Safe and offline.** Your original images are never changed, and nothing is uploaded anywhere.
- **Before and after.** Shows the size of every image before and after, and the total saved.
- **Built-in Help** with a search box, and an About page.

## Download and install

1. Open the **Releases** page of this repository.
2. Download `VRA.Intelligent.Image.Optimizer.Setup.1.0.0.exe` from the latest release.
3. Run it and follow the installer. Windows 10 and 11 (64-bit).

> The installer is not code-signed yet, so Windows SmartScreen may show "Windows protected your PC". Click **More info**, then **Run anyway**.

## How to use

1. Drag your photos, or a whole folder, into the window (or use **Add Images** / **Add Folder**).
2. Leave the settings as they are: **Any image to WebP** with **Auto (Intelligent)** compression.
3. Click **Optimize**. The first time, choose the folder where the new images are saved.
4. Upload the WebP files to your website.

Open **Help** inside the program for every setting explained in simple language.

## Build from source

You need [Node.js](https://nodejs.org/) (version 20 or newer) on Windows.

```bat
:: try the program without installing
RUN-WITHOUT-INSTALLING.bat

:: build the installer (output goes to the "release" folder)
BUILD-INSTALLER.bat
```

Or manually:

```bat
npm install
npm start
npm run dist
```

### Project layout

| Path | Purpose |
|---|---|
| `src/engine.js` | Image engine: resizing, WebP quality search, metadata removal |
| `src/main.js` | Window, settings, file dialogs |
| `src/index.html`, `styles.css`, `app.js` | Screens |
| `src/helpdata.js` | Help topics (edit to change the Help text) |
| `assets/logo.png` | VRA logo shown in the program |
| `build/icon.ico` | Application and installer icon |

Built with [Electron](https://www.electronjs.org/), [sharp](https://sharp.pixelplumbing.com/) and [heic-convert](https://github.com/catdad-experiments/heic-convert).

## Licence

Free software under the **GNU General Public License v3** (see [LICENSE](LICENSE)).
You may copy and share it freely. Please keep the VRA name and copyright notice with it.

Copyright (c) 2026 Vidyasagar Robotics Academy

## Developed by

Prof. Dattaraj Vidyasagar and Prof. Yash Vidyasagar
Vidyasagar Robotics Academy · [https://vsa.edu.in/](https://vsa.edu.in/)
