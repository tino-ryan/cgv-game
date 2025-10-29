# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` (starts Vite dev server on port 5173)
- **Build**: `npm run build` (creates production build)
- **Preview**: `npm run preview` (preview production build)
- **Test**: No tests currently configured

## Project Architecture

This is a **3D browser game** called "Cozy Ghost Hotel" built with Three.js and Vite. The game features multiple scenes, a player character (ghost), inventory system, combat mechanics, and cutscenes.

### Core Architecture

- **Entry point**: `src/main.js` - contains main game loop, camera controls, and input handling
- **Core systems** in `src/core/`:
  - `renderer.js` - Three.js renderer initialization
  - `scene.js` - Base scene setup utilities
  - `loop.js` - Game loop management
  - `loader.js` - Asset loading utilities

### Game Systems

- **Scene Management**: `src/systems/sceneManager.js` - handles scene switching and updates
- **Physics**: `src/systems/physics.js` - collision detection and movement constraints
- **Audio**: `src/systems/audio.js` - game audio management
- **Inventory**: `src/systems/inventory.js` - item management
- **Cutscenes**: `src/systems/cutsceneManager.js` - cutscene playback
- **Tutorial**: `src/systems/tutorial.js` - tutorial system
- **Room Transformation**: `src/systems/roomTransformation.js` - dynamic scene changes

### Game Scenes

- **Title Menu**: `src/scenes/titleMenu.js` - main menu
- **Lobby Scene**: `src/scenes/lobbyScene.js` - hotel lobby with service bell and boss fight
- **Bathroom Scene**: `src/scenes/bathroomScene.js` - bathroom level
- **Level 3**: `src/scenes/level3Scene.js` - additional game level

### Entities

- **Player**: `src/entities/player.js` - ghost character with combat modes
- **NPCs**: `src/entities/npc.js` - non-player characters
- **Bosses**: `src/entities/bellboyBoss.js` - boss enemy
- **Health System**: `src/entities/health.js` - health management

### UI Components

- **HUD**: `src/ui/hud.js` - heads-up display
- **Pause Menu**: `src/ui/pauseMenu.js` - in-game pause menu

### Testing Mode

The game includes a testing mode controlled by the `TESTING_MODE` constant in `src/main.js`:
- Set to `"lobby"` to load lobby scene directly
- Set to `"bathroom"` to load bathroom scene directly
- Set to `"normal"` for full game flow with title menu and cutscenes

### Key Game Features

- **First-person 3D movement** with WASD/arrow keys
- **Pointer lock controls** (double-click to enable, ESC to disable)
- **Combat system** with different movement modes
- **Inventory system** with item selection and usage (E key)
- **Service bell pickup** mechanism (F key in lobby)
- **Physics-based collision detection**
- **Boss fights** with camera snapping
- **Cutscene system** with overlay UI

### Debug Helpers

Global debug functions available in browser console:
- `enterCombat()` / `exitCombat()` - toggle combat mode
- `startBoss()` - trigger boss fight
- `toggleCollisionDebug()` - show/hide collision debug
- `switchToBathroom()` / `switchToLobby()` - scene switching

### File Structure Notes

- Main HTML: `index.html` with embedded crosshair and tutorial HUD
- Entry point: `src/main.js`
- Assets: Configure in `vite.config.js` (includes .gltf, .bin, .png)
- Global styles: `/styles/global.css`