export class PlayerHealth {
  constructor(maxHearts = 5) {
    this.maxHearts = maxHearts;
    this.currentHearts = maxHearts;
  }

  takeDamage(amount = 1) {
    this.currentHearts = Math.max(0, this.currentHearts - amount);
  }

  heal(amount = 1) {
    this.currentHearts = Math.min(this.maxHearts, this.currentHearts + amount);
  }

  isDead() {
    return this.currentHearts <= 0;
  }
}
