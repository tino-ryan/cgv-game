// src/systems/inventory.js
export default class Inventory {
  constructor(hud) {
    this.hud = hud;
    this.items = [];
    this.maxSlots = 10;
    this.selectedIndex = 0;

    this.createInventoryUI();
  }

  createInventoryUI() {
    // Inventory container
    this.inventoryContainer = document.createElement("div");
    this.inventoryContainer.id = "inventory-container";
    this.inventoryContainer.style.position = "fixed";
    this.inventoryContainer.style.bottom = "80px";
    this.inventoryContainer.style.left = "50%";
    this.inventoryContainer.style.transform = "translateX(-50%)";
    this.inventoryContainer.style.display = "flex";
    this.inventoryContainer.style.gap = "5px";
    this.inventoryContainer.style.padding = "10px";
    this.inventoryContainer.style.background = "rgba(0, 0, 0, 0.7)";
    this.inventoryContainer.style.borderRadius = "8px";
    this.inventoryContainer.style.display = "none"; // Hidden by default

    document.body.appendChild(this.inventoryContainer);

    // Create inventory slots
    this.slots = [];
    for (let i = 0; i < this.maxSlots; i++) {
      const slot = document.createElement("div");
      slot.className = "inventory-slot";
      slot.style.width = "50px";
      slot.style.height = "50px";
      slot.style.border = "2px solid #666";
      slot.style.borderRadius = "5px";
      slot.style.background = "rgba(50, 50, 50, 0.8)";
      slot.style.display = "flex";
      slot.style.alignItems = "center";
      slot.style.justifyContent = "center";
      slot.style.fontSize = "12px";
      slot.style.color = "white";
      slot.style.cursor = "pointer";
      slot.style.transition = "all 0.2s";

      slot.addEventListener("click", () => this.selectSlot(i));
      slot.addEventListener("mouseenter", () => {
        slot.style.transform = "scale(1.1)";
      });
      slot.addEventListener("mouseleave", () => {
        slot.style.transform = "scale(1)";
      });

      this.inventoryContainer.appendChild(slot);
      this.slots.push(slot);
    }

    // Item notification
    this.notification = document.createElement("div");
    this.notification.style.position = "fixed";
    this.notification.style.top = "30%";
    this.notification.style.left = "50%";
    this.notification.style.transform = "translate(-50%, -50%)";
    this.notification.style.background = "rgba(0, 0, 0, 0.9)";
    this.notification.style.color = "gold";
    this.notification.style.padding = "20px 30px";
    this.notification.style.borderRadius = "10px";
    this.notification.style.fontSize = "24px";
    this.notification.style.fontWeight = "bold";
    this.notification.style.textAlign = "center";
    this.notification.style.border = "3px solid gold";
    this.notification.style.display = "none";
    this.notification.style.zIndex = "10001";
    document.body.appendChild(this.notification);
  }

  addItem(item) {
    if (this.items.length >= this.maxSlots) {
      console.warn("Inventory full!");
      return false;
    }

    this.items.push(item);
    this.updateUI();
    this.showNotification(`Obtained: ${item.name}`);

    // Show inventory if it was hidden
    this.inventoryContainer.style.display = "flex";

    return true;
  }

  removeItem(index) {
    if (index >= 0 && index < this.items.length) {
      const removed = this.items.splice(index, 1);
      this.updateUI();
      return removed[0];
    }
    return null;
  }

  getItem(index) {
    return this.items[index] || null;
  }

  getSelectedItem() {
    return this.items[this.selectedIndex] || null;
  }

  selectSlot(index) {
    if (index < this.items.length) {
      this.selectedIndex = index;
      this.updateUI();

      // Show item info
      const item = this.items[index];
      if (item && item.onUse) {
        this.showUsePrompt(item);
      }
    }
  }

  updateUI() {
    this.slots.forEach((slot, i) => {
      // Clear slot
      slot.innerHTML = "";
      slot.style.border = "2px solid #666";
      slot.style.background = "rgba(50, 50, 50, 0.8)";

      if (i < this.items.length) {
        const item = this.items[i];

        // Add item icon or name
        if (item.icon) {
          const icon = document.createElement("img");
          icon.src = item.icon;
          icon.style.width = "100%";
          icon.style.height = "100%";
          icon.style.objectFit = "contain";
          icon.style.padding = "5px";
          slot.appendChild(icon);
        } else if (item.iconEmoji) {
          // Use emoji as fallback
          slot.textContent = item.iconEmoji;
          slot.style.fontSize = "32px";
        } else {
          slot.textContent = item.name.substring(0, 8);
          slot.style.fontSize = "12px";
        }

        // Highlight selected slot
        if (i === this.selectedIndex) {
          slot.style.border = "3px solid gold";
          slot.style.background = "rgba(100, 100, 50, 0.8)";
        }
      }
    });
  }

  showNotification(message) {
    this.notification.textContent = message;
    this.notification.style.display = "block";

    setTimeout(() => {
      this.notification.style.opacity = "1";
    }, 10);

    setTimeout(() => {
      this.notification.style.opacity = "0";
      setTimeout(() => {
        this.notification.style.display = "none";
      }, 500);
    }, 3000);
  }

  showUsePrompt(item) {
    const prompt = document.createElement("div");
    prompt.style.position = "fixed";
    prompt.style.bottom = "150px";
    prompt.style.left = "50%";
    prompt.style.transform = "translateX(-50%)";
    prompt.style.background = "rgba(0, 0, 0, 0.8)";
    prompt.style.color = "white";
    prompt.style.padding = "15px 25px";
    prompt.style.borderRadius = "8px";
    prompt.style.fontSize = "18px";
    prompt.style.zIndex = "10000";
    prompt.textContent = `Press E to use ${item.name}`;
    prompt.id = "use-prompt";

    // Remove existing prompt
    const existing = document.getElementById("use-prompt");
    if (existing) {
      existing.remove();
    }

    document.body.appendChild(prompt);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (prompt.parentElement) {
        prompt.remove();
      }
    }, 5000);
  }

  hide() {
    this.inventoryContainer.style.display = "none";
  }

  show() {
    this.inventoryContainer.style.display = "flex";
  }
}
