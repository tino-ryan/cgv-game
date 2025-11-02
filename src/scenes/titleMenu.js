// src/scenes/titleMenu.js - UPDATED VERSION

export default class TitleMenu {
  constructor(onStartGame) {
    this.onStartGame = onStartGame; // Callback to start the game
    this.container = document.createElement("div");
    this.container.id = "title-menu";

    Object.assign(this.container.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.95)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      zIndex: "2000",
      color: "white",
    });

    // 👻 Logo
    const logo = document.createElement("img");
    logo.src = "./src/ui/1000095088.png"; // Update path as needed
    Object.assign(logo.style, {
      width: "400px",
      height: "auto",
      marginBottom: "40px",
      filter: "drop-shadow(0 0 15px rgba(255,255,255,0.4))",
    });

    // 🎮 Buttons
    const startBtn = this.createButton("Start Game", () => this.startGame());
    const optionsBtn = this.createButton("Options", () => this.showOptions());
    const creditsBtn = this.createButton("Credits", () => this.showCredits());
    const quitBtn = this.createButton("Quit", () => this.quitGame());

    // Append to container
    this.container.append(logo, startBtn, optionsBtn, creditsBtn, quitBtn);
    document.body.appendChild(this.container);

    // Prevent clicks on the menu from affecting underlying layers
    this.container.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    console.log("🎮 Title Menu displayed");
  }

  createButton(text, onClick) {
    const btn = document.createElement("button");
    btn.textContent = text;

    Object.assign(btn.style, {
      width: "220px",
      height: "60px",
      padding: "14px 36px",
      margin: "10px",
      fontSize: "20px",
      fontWeight: "600",
      border: "2px solid #ffffff55",
      borderRadius: "30px",
      cursor: "pointer",
      background: "linear-gradient(145deg, #ca4c4f, #a83b3e)",
      color: "#fff",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      transition: "all 0.25s ease",
    });

    btn.onmouseenter = () => {
      btn.style.background = "linear-gradient(145deg, #e05558, #ca4c4f)";
      btn.style.transform = "translateY(-3px)";
      btn.style.boxShadow = "0 6px 14px rgba(202, 76, 79, 0.5)";
    };

    btn.onmouseleave = () => {
      btn.style.background = "linear-gradient(145deg, #ca4c4f, #a83b3e)";
      btn.style.transform = "translateY(0)";
      btn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
    };

    btn.onclick = onClick;
    return btn;
  }

  async startGame() {
    console.log("🎬 Start Game clicked!");
    
    // Fade out animation
    this.container.style.transition = "opacity 0.5s";
    this.container.style.opacity = "0";
    
    setTimeout(() => {
      this.container.remove();
      
      // Call the callback to start the game
      if (this.onStartGame) {
        this.onStartGame();
      }
    }, 500);
  }

  showOptions() {
    alert("⚙️ Options menu coming soon!");
  }

  showCredits() {
    // Create credits overlay
    const creditsOverlay = document.createElement("div");
    Object.assign(creditsOverlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      backgroundColor: "black",
      color: "white",
      overflow: "hidden",
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-end",
      zIndex: "3000",
      fontFamily: "monospace",
    });

    const creditsText = document.createElement("div");
    creditsText.innerHTML = `
      <h2 style="text-align:center;">Game Credits</h2>
      <p>Developed by: Team Muscle Mommies</p>
      <p>Lead Programmer: Aimee Harding</p>
      <p>Assistant Programmer: Tinotenda Gozho</p>
      <p>Art & Design: Laaiqah Bayat</p>
      <p>Sound & Music: McAtaaji Andongndou</p>
      <p>Character Assets: Yurisha Govender</p>
      <p>Story & Writing: Laaiqah Bayat</p>
      <p>This is just placeholder text</p>
      <p>This is just placeholder text</p>
      <p>This is just placeholder text</p>
      <p>This is just placeholder text</p>
      <p>This is just placeholder text</p>
      <p>This is just placeholder text</p>
      <p>This is just placeholder text</p>
      <p>This is just placeholder text</p>
      <p>This is just placeholder text</p>
      <p>This is just placeholder text</p>
      <p>This is just placeholder text</p>
      <p>This is just placeholder text</p>
      <p>This is just placeholder text</p>
      <p>This is just placeholder text</p>
      <p>This is just placeholder text</p>
      <p>This is just placeholder text</p>
      <p>Special Thanks To: You, the Player ❤️</p>
      <br><br>
      <p>Thank you for playing!</p>
    `;

    Object.assign(creditsText.style, {
      textAlign: "center",
      whiteSpace: "pre-line",
      animation: "scroll-up 40s linear forwards",
    });

    creditsOverlay.appendChild(creditsText);
    document.body.appendChild(creditsOverlay);

    // Add keyframe animation dynamically
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @keyframes scroll-up {
        from { transform: translateY(100%); }
        to { transform: translateY(-120%); }
      }
    `;
    document.head.appendChild(styleSheet);

    // Allow exit on click
    creditsOverlay.addEventListener("click", () => {
      document.body.removeChild(creditsOverlay);
      document.head.removeChild(styleSheet);
    });

    // Prevent clicks on the menu from affecting underlying layers
    creditsOverlay.addEventListener("mousedown", (e) => e.stopPropagation());
    creditsOverlay.addEventListener("mouseup", (e) => e.stopPropagation());
    creditsOverlay.addEventListener("click", (e) => {
      e.stopPropagation();
      document.body.removeChild(creditsOverlay);
      document.head.removeChild(styleSheet);
    });

  }


  quitGame() {
    if (confirm("Are you sure you want to quit?")) {
      window.location.reload();
    }
  }
} 