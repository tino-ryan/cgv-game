// src/entities/health.js
export class Health {
  constructor(max = 5) {
    this.max = max;
    this.current = max;
  }

  takeDamage(amount = 1) {
    this.current = Math.max(0, this.current - amount);
  }

  heal(amount = 1) {
    this.current = Math.min(this.max, this.current + amount);
  }

  isDead() {
    return this.current <= 0;
  }

  getPercent() {
    return (this.current / this.max) * 100;
  }
}
