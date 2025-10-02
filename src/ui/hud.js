export function initHUD() {
  // Hearts container
  const heartsContainer = document.createElement("div");
  heartsContainer.id = "hearts-container";
  heartsContainer.style.position = "absolute";
  heartsContainer.style.top = "20px";
  heartsContainer.style.left = "20px";
  heartsContainer.style.fontSize = "32px";
  heartsContainer.style.color = "red";
  document.body.appendChild(heartsContainer);
}
