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
  <p><strong>Developed by:</strong> Team Muscle Mommies</p>
  <p><strong>Lead Programmers:</strong> Aimee Harding & Tinotenda Gozho</p>
  <p><strong>Assistant Programmer:</strong> Tinotenda Gozho</p>
  <p><strong>Art & Design:</strong> Laaiqah Bayat</p>
  <p><strong>Sound & Music:</strong> McAtaaji Andongndou</p>
  <p><strong>Character Assets:</strong> Yurisha Govender</p>
  <p><strong>Story & Writing:</strong> Laaiqah Bayat & Yurisha Govender</p>
  <p><strong>Set Design and Textures:</strong> Yurisha Govender </p>

  <h3>Level 1</h3>
  <p><strong>Modified in Blender:</strong><br>
  Vintage Living Room by QuarizonStudio:<br>
  <a href="https://sketchfab.com/3d-models/vintage-living-room-3ac5d18" target="_blank">vintage living room - QuarizonStudio</a></p>

  <p><strong>Not Modified:</strong><br>
  <a href="https://sketchfab.com/3d-models/6-old-hotel-props-583563b200e5428397c6c53c1d6c3984" target="_blank">6 old hotel props by Asher M</a><br>
  <a href="https://sketchfab.com/3d-models/soap-a54053654e444d4b9fcdac3966db8d50" target="_blank">Soap by Kroko.blend</a><br>
  <a href="https://sketchfab.com/3d-models/sponge-97aee64edf0c4521b82416f3b30c61ce" target="_blank">Sponge by Aullwen</a><br>
  <a href="https://sketchfab.com/3d-models/feather-duster-73435282851340f0b6a09d4bb1c97811" target="_blank">Feather duster by johnny_3D</a><br>
  <a href="https://sketchfab.com/3d-models/cc0-bucket-3-cb484683659d465796ed5af8664cf58f" target="_blank">CC0 Bucket-3 by plaggy</a><br>
  <a href="https://sketchfab.com/3d-models/low-poly-bleach-bottle-e57dc206036448c5bbc137aa32d487a3" target="_blank">Low-poly Bleach Bottle by Gobster</a></p>

  <h3>Level 2</h3>
  <p><strong>Modified in Blender:</strong><br>
  <a href="https://sketchfab.com/3d-models/bathroom-8a34affd12a042b9b4b50907d73d474d" target="_blank">BathRoom by kiiztie</a></p>
  
  <p><strong>Not Modified:</strong><br>
  <a href="https://sketchfab.com/3d-models/simple-toilet-paper-7ca7ebcfad964498b49af73be442acf9" target="_blank">Simple Toilet Paper by Blender3D</a></p>

  <h3>Level 3</h3>
  <p><strong>Modified in Blender:</strong><br>
  <a href="https://sketchfab.com/3d-models/cartoon-style-minimalist-kitchen-scene-ec5728732add4d0fa14ae58714994012" target="_blank">Cartoon-Style Minimalist Kitchen Scene by Kirill</a></p>

  <p><strong>Not Modified:</strong><br>
  <a href="https://sketchfab.com/3d-models/frying-pan-36cm-ffebd77d0373462eb7c6d2d4941eb39c" target="_blank">Frying Pan Ø36cm by Aullwen</a><br>
  <a href="https://sketchfab.com/3d-models/black-steel-pot-11458b94d13b4c289af101c57e1c5fa6" target="_blank">Black Steel Pot by Dr_Kryzel</a><br>
  <a href="https://sketchfab.com/3d-models/kitchen-knives-block-838c5fbd4ec34f23abae67d89c91f8a0" target="_blank">Kitchen Knives Block by Will Adams</a><br>
  <a href="https://sketchfab.com/3d-models/low-poly-rolling-pin-2f3bbb4c123e4f7eb0fbae14a00bc74e" target="_blank">Low-poly rolling pin by Ярослав</a><br>
  <a href="https://sketchfab.com/3d-models/blender-f731dbfce6ea486095a39a0750e656ec" target="_blank">Blender by assetfactory</a></p>

  <h3>Hallway</h3>
  <p><a href="https://sketchfab.com/3d-models/small-hallway-low-poly-low-detail-7552b654cb3544bfa39e041d0a34c260" target="_blank">Small Hallway | Low poly | Low Detail by AshniNoWara</a></p>

  <h3>Ghost</h3>
  <p><strong>External Model:</strong><br>
  <a href="https://sketchfab.com/3d-models/ice-gun-63b73dcf59de461cb5a5a6adc8a557ff" target="_blank">Ice Gun by Andrey Gulev</a></p>

  <p><strong>Using Blender:</strong><br>
  Ghost by Yurisha<br>
  Based on tutorial: <a href="https://youtu.be/KWEcaU2SuJU?si=EWX_vNZKK1i3ytmm" target="_blank">YouTube Tutorial</a></p>

  <p><strong>Goatee by:</strong> Yurisha</p>

  <p><strong>Edited in Blender:</strong><br>
  <a href="https://sketchfab.com/3d-models/mustache-f9ffa8cf88df43409543c476950995b5" target="_blank">Mustache by assetfactory</a><br>
  <a href="https://sketchfab.com/3d-models/beard-from-poly-by-google-b112a784a0544cb298a4ef01838d89b1" target="_blank">Beard from Poly by Google by IronEqual</a><br>
  <a href="https://sketchfab.com/3d-models/bowtie-445c0b9916904ba2975ab3e09499da18" target="_blank">Bowtie by Mylom</a><br>
  <a href="https://sketchfab.com/3d-models/plunger-d0a2f0234b414e8bb2b95890c0d5d759" target="_blank">Plunger by FlevasGR</a><br>
  <a href="https://sketchfab.com/3d-models/chefs-hat-free-model-091c781e2d1941d68bf67d9ab2b6019f" target="_blank">Chef’s Hat - Free Model by Enrique Poppy</a><br>
  <a href="https://sketchfab.com/3d-models/officer-police-captain-pilot-hat-cap-whatever-9697ef10105a4e02a6074bc9bca464bd" target="_blank">Officer police captain pilot hat cap by Aramuor</a></p>

  <h3>Music & Sound</h3>
  <p><strong>Bell Sound:</strong> <a href="https://youtu.be/oLWSvP1SN0Y?si=ZU9covL0AdXpDn7d" target="_blank">YouTube Link</a><br>
  <strong>Violin:</strong> <a href="https://youtu.be/plDBAh2hkuM?si=i7fDQ67lvRkgGxUa" target="_blank">YouTube Link</a><br>
  <strong>Evil Laugh:</strong> <a href="https://youtu.be/Nd5iM61itKE?si=ZLo_4lgyR8Y4ntea" target="_blank">YouTube Link</a><br>
  <strong>Talking Noise:</strong> <a href="https://youtu.be/qZAvsClQoz0?si=BCUufUY9PF7UiVZe" target="_blank">YouTube Link</a><br>
  <strong>Background Music:</strong> <a href="https://pixabay.com/music/mystery-horror-scary-dark-music-413504/" target="_blank">Pixabay - Scary Dark Music</a></p>

  <br><br>
  <p><strong>Special Thanks To:</strong> You, the Player ❤️</p>
  <p>Thank you for playing!</p>
`;

    Object.assign(creditsText.style, {
      textAlign: "center",
      whiteSpace: "pre-line",
      animation: "scroll-up 60s linear forwards",
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