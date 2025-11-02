// audiomanager.js
export default class AudioManager {
  constructor() {
    this.backgroundMusic = null;
    this.currentTrack = null;
    this.volume = 0.5; // 50% volume (moderate)
    this.isInitialized = false;
    this.isMuted = false;

    console.log("AudioManager created");
  }

  /**
   * Initialize and load background music
   * @param {string} musicPath - Path to the music file
   */
  async loadBackgroundMusic(musicPath) {
    try {
      this.backgroundMusic = new Audio(musicPath);
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = this.volume;
      
      this.currentTrack = musicPath;
      this.isInitialized = true;

      console.log(`Background music loaded: ${musicPath}`);
      
      // Handle loading errors
      this.backgroundMusic.addEventListener('error', (e) => {
        console.error('Error loading music:', e);
      });

      // Log when music starts playing
      this.backgroundMusic.addEventListener('play', () => {
        console.log('Background music started playing');
      });

    } catch (error) {
      console.error('Failed to load background music:', error);
    }
  }

  /**
   * Play the background music with fade in
   * @param {number} fadeInDuration - Fade in time in milliseconds (default: 2000ms)
   */
  async playMusic(fadeInDuration = 2000) {
    if (!this.isInitialized || !this.backgroundMusic) {
      console.warn('Background music not loaded yet');
      return;
    }

    if (this.isMuted) {
      console.log('Music is muted, not playing');
      return;
    }

    try {
      // Start with volume at 0 for fade in
      this.backgroundMusic.volume = 0;
      
      // Play the audio
      await this.backgroundMusic.play();
      
      // Fade in
      this.fadeIn(fadeInDuration);
      
    } catch (error) {
      console.error('Error playing music:', error);
      console.log('Tip: Audio might need user interaction (click/key press) to start');
    }
  }

  /**
   * Pause the background music with fade out
   * @param {number} fadeOutDuration - Fade out time in milliseconds (default: 1000ms)
   */
  pauseMusic(fadeOutDuration = 1000) {
    if (!this.backgroundMusic) return;

    this.fadeOut(fadeOutDuration, () => {
      this.backgroundMusic.pause();
      console.log('Background music paused');
    });
  }

  /**
   * Resume the background music
   */
  resumeMusic() {
    if (!this.backgroundMusic || this.isMuted) return;

    this.backgroundMusic.play().catch(error => {
      console.error('Error resuming music:', error);
    });
    
    this.fadeIn(1000);
    console.log('Background music resumed');
  }

  /**
   * Stop the background music completely
   */
  stopMusic() {
    if (!this.backgroundMusic) return;

    this.backgroundMusic.pause();
    this.backgroundMusic.currentTime = 0;
    console.log('Background music stopped');
  }

  /**
   * Set the volume
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
    
    if (this.backgroundMusic && !this.isMuted) {
      this.backgroundMusic.volume = this.volume;
    }
    
    console.log(`Volume set to ${(this.volume * 100).toFixed(0)}%`);
  }

  /**
   * Mute the music
   */
  mute() {
    this.isMuted = true;
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = 0;
    }
    console.log('Music muted');
  }

  /**
   * Unmute the music
   */
  unmute() {
    this.isMuted = false;
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.volume;
    }
    console.log('Music unmuted');
  }

  /**
   * Toggle mute/unmute
   */
  toggleMute() {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  /**
   * Fade in effect
   * @param {number} duration - Duration in milliseconds
   */
  fadeIn(duration) {
    if (!this.backgroundMusic) return;

    const steps = 50;
    const stepDuration = duration / steps;
    const volumeIncrement = this.volume / steps;
    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      
      if (currentStep >= steps) {
        this.backgroundMusic.volume = this.volume;
        clearInterval(fadeInterval);
        return;
      }

      this.backgroundMusic.volume = Math.min(
        volumeIncrement * currentStep,
        this.volume
      );
    }, stepDuration);
  }

  /**
   * Fade out effect
   * @param {number} duration - Duration in milliseconds
   * @param {Function} callback - Function to call after fade out completes
   */
  fadeOut(duration, callback) {
    if (!this.backgroundMusic) return;

    const steps = 50;
    const stepDuration = duration / steps;
    const startVolume = this.backgroundMusic.volume;
    const volumeDecrement = startVolume / steps;
    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      
      if (currentStep >= steps) {
        this.backgroundMusic.volume = 0;
        clearInterval(fadeInterval);
        if (callback) callback();
        return;
      }

      this.backgroundMusic.volume = Math.max(
        startVolume - (volumeDecrement * currentStep),
        0
      );
    }, stepDuration);
  }

  /**
   * Switch to a different music track
   * @param {string} newMusicPath - Path to the new music file
   * @param {number} transitionDuration - Crossfade duration in milliseconds
   */
  async switchTrack(newMusicPath, transitionDuration = 2000) {
    if (this.currentTrack === newMusicPath) {
      console.log('Already playing this track');
      return;
    }

    console.log(`Switching track to: ${newMusicPath}`);

    // Fade out current track
    if (this.backgroundMusic) {
      this.fadeOut(transitionDuration / 2, () => {
        this.stopMusic();
      });
    }

    // Wait for fade out
    await new Promise(resolve => setTimeout(resolve, transitionDuration / 2));

    // Load and play new track
    await this.loadBackgroundMusic(newMusicPath);
    await this.playMusic(transitionDuration / 2);
  }

  /**
   * Get current playback time
   * @returns {number} Current time in seconds
   */
  getCurrentTime() {
    return this.backgroundMusic ? this.backgroundMusic.currentTime : 0;
  }

  /**
   * Get total duration
   * @returns {number} Duration in seconds
   */
  getDuration() {
    return this.backgroundMusic ? this.backgroundMusic.duration : 0;
  }

  /**
   * Check if music is playing
   * @returns {boolean}
   */
  isPlaying() {
    if (!this.backgroundMusic) return false;
    return !this.backgroundMusic.paused;
  }

  /**
   * Play a one-shot SFX with optional duration and pitch variation
   * @param {string} path - Relative path to audio file
   * @param {number} duration - Max play time in ms (default: full clip)
   * @param {number} volume - 0.0 to 1.0
   * @param {boolean} randomPitch - Add ±20% pitch variation
   */
  playOneShotWithPitch(path, duration = null, volume = 0.7, randomPitch = true) {
    const audio = new Audio(path);
    audio.volume = this.isMuted ? 0 : Math.max(0, Math.min(1, volume));

    if (randomPitch) {
      audio.playbackRate = 0.8 + Math.random() * 0.4; // 0.8x – 1.2x
    }

    audio.play().catch(err => {
      console.warn("SFX play failed (user gesture needed?):", err);
    });

    if (duration) {
      const stopTimer = setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, duration);

      // Cleanup if audio ends early
      audio.addEventListener('ended', () => {
        clearTimeout(stopTimer);
      });
    }

    return audio;
  }

  /**
   * Cleanup and dispose
   */
  dispose() {
    if (this.backgroundMusic) {
      this.stopMusic();
      this.backgroundMusic = null;
    }
    this.isInitialized = false;
    console.log('AudioManager disposed');
  }
}