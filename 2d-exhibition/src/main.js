import { startExhibition } from "./exhibitionLevel.js";

// --- 1. Inject Stunning CSS Styles ---
const style = document.createElement("style");
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500&display=swap');

  #museum-overlay {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(10, 10, 10, 0.85);
    backdrop-filter: blur(12px);
    z-index: 9999;
    display: flex; justify-content: center; align-items: center;
    opacity: 0; pointer-events: none; 
    transition: opacity 0.4s ease;
  }
  #museum-overlay.active {
    opacity: 1; pointer-events: all;
  }
  .museum-modal {
    background: linear-gradient(145deg, rgba(40,40,40,0.9), rgba(20,20,20,0.9));
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 24px; padding: 50px;
    max-width: 900px; width: 90%;
    box-shadow: 0 30px 60px rgba(0,0,0,0.8);
    transform: translateY(30px) scale(0.95);
    transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
    color: #fff; font-family: 'Inter', sans-serif;
  }
  #museum-overlay.active .museum-modal {
    transform: translateY(0) scale(1);
  }
  .modal-header h2 {
    font-family: 'Playfair Display', serif;
    font-size: 2.8rem; font-weight: 400; letter-spacing: 3px;
    margin: 0; text-align: center; color: #fdfdfd;
  }
  .divider {
    height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    margin: 24px 0;
  }
  .curatorial-text {
    font-size: 1.1rem; line-height: 1.8; color: #bbb; text-align: center;
    margin-bottom: 45px; font-weight: 300; max-width: 700px; margin-inline: auto;
  }
  .art-grid {
    display: flex; gap: 30px; justify-content: center; margin-bottom: 45px;
  }
  .art-card {
    width: 200px; height: 260px;
    background: #111; border-radius: 12px; padding: 10px;
    box-shadow: 0 10px 20px rgba(0,0,0,0.5);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    cursor: pointer;
  }
  .art-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 20px 40px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.05);
  }
  .art-placeholder {
    width: 100%; height: 100%;
    border: 1px dashed rgba(255,255,255,0.15);
    border-radius: 8px; display: flex; justify-content: center; align-items: center;
    color: #666; font-size: 0.85rem; letter-spacing: 2px; text-transform: uppercase;
  }
  .modal-footer { text-align: center; }
  .resume-btn {
    background: #fff; color: #000;
    border: none; border-radius: 30px;
    padding: 14px 36px; font-size: 1rem; font-weight: 500;
    cursor: pointer; transition: all 0.2s ease;
    font-family: 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 1px;
  }
  .resume-btn:hover {
    background: #e5e5e5; transform: scale(1.05);
  }
`;
document.head.appendChild(style);

// --- 2. Create the HTML Structure ---
const overlayContainer = document.createElement("div");
overlayContainer.id = "museum-overlay";
overlayContainer.innerHTML = `
  <div class="museum-modal">
    <div class="modal-header">
      <h2 id="modal-title">SECTION 1</h2>
      <div class="divider"></div>
    </div>
    <div class="modal-body">
      <p class="curatorial-text">The AI curatorial explanation goes here. This text seamlessly bridges the thematic elements selected by the user with the stylistic choices of the generated artworks below.</p>
      <div class="art-grid">
        <div class="art-card"><div class="art-placeholder">Artwork 1</div></div>
        <div class="art-card"><div class="art-placeholder">Artwork 2</div></div>
        <div class="art-card"><div class="art-placeholder">Artwork 3</div></div>
      </div>
    </div>
    <div class="modal-footer">
      <button id="close-btn" class="resume-btn">Resume Exploring</button>
    </div>
  </div>
`;
document.body.appendChild(overlayContainer);

const overlay = document.getElementById("museum-overlay");
const modalTitle = document.getElementById("modal-title");
const closeBtn = document.getElementById("close-btn");

// --- 2. Setup Game Canvas ---
let gameCanvas = document.getElementById("game-canvas");

if (!gameCanvas) {
  gameCanvas = document.createElement("canvas");
  gameCanvas.id = "game-canvas";
  document.body.appendChild(gameCanvas);
  document.body.style.display = "flex";
  document.body.style.justifyContent = "center";
  document.body.style.alignItems = "center";
  document.body.style.height = "100vh";
  document.body.style.margin = "0";
  document.body.style.backgroundColor = "#121212";
}

gameCanvas.setAttribute("tabindex", "0");
gameCanvas.style.outline = "none";
gameCanvas.focus();

// --- 3. Start the Game ---
const userSelectedSections = 4; // Mocking 4 sections

const gameControls = startExhibition(
  gameCanvas,
  userSelectedSections,
  (sectionId) => {
    // Pause the game
    gameControls.pause();

    // Update UI data and trigger animation
    modalTitle.innerText = `Curatorial Room: ${sectionId}`;
    overlay.classList.add("active");
  },
);

// Resume when the user clicks close
closeBtn.onclick = () => {
  overlay.classList.remove("active");
  gameControls.resume();
  gameCanvas.focus();
};
