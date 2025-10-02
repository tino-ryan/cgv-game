// src/core/state.js
import { PlayerHealth } from "../entities/player.js";

// Single instance of player health for the whole game
export const playerHealth = new PlayerHealth(5);
