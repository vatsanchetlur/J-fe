// === FRONTEND INTEGRATION FOR JIRA BUTTON + MODAL ===

// Enable 'Create in JIRA' button when results are ready
function enableJiraButton() {
    document.getElementById("createInJiraBtn").disabled = false;
  }
  
  // Inject confirmation modal into DOM
  function injectConfirmationModal() {
    const modal = document.createElement("div");
    modal.id = "jiraModal";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100vw";
    modal.style.height = "100vh";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "9999";
  
    modal.innerHTML = `
      <div style="background:white; padding:20px; border-radius:10px; max-width:600px; width:100%; text-align:center; color:#000;">
        <h3>Confirm Push to JIRA</h3>
        <p>Are you sure you want to create this Epic and ${latestJson?.stories?.length || 0} stories in JIRA?</p>
        <div style="text-align:left; max-height:200px; overflow:auto; font-size:0.9em; margin-top:10px;">
          <strong>Epic:</strong> ${latestJson?.epic?.summary}<br />
          <strong>Stories:</strong>
          <ul>
            ${latestJson?.stories?.map(s => `<li>${s.summary}</li>`).join('')}
          </ul>
        </div>
        <div style="margin-top: 20px;">
          <button id="confirmJiraBtn">✅ Confirm</button>
          <button onclick="document.getElementById('jiraModal').remove()">❌ Cancel</button>
        </div>
      </div>
    `;
  
    document.body.appendChild(modal);
    document.getElementById("confirmJiraBtn").addEventListener("click", () => {
      modal.remove();
      createInJira();
    });
  }
  
  // Handle click on 'Create in JIRA' button (with modal)
  document.getElementById("createInJiraBtn").addEventListener("click", () => {
    if (!latestJson) return;
    injectConfirmationModal();
  });
  
  // Call backend to push to JIRA
  async function createInJira() {
    const button = document.getElementById("createInJiraBtn");
    const resultMessage = document.getElementById("resultMessage");
    button.disabled = true;
    button.innerText = "⏳ Sending to JIRA...";
  
    try {
      const response = await fetch("https://ezepics-backend.onrender.com/api/jira/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...latestJson, mock: false }) // set mock: true to test without sending
      });
  
      const result = await response.json();
      if (response.ok) {
        resultMessage.innerText = `✅ Successfully created in JIRA! Epic Key: ${result.epicKey}`;
        resultMessage.style.display = "block";
      } else {
        alert("❌ Failed to create in JIRA: " + result.error);
      }
    } catch (err) {
      console.error("JIRA API Error:", err);
      alert("❌ Error calling JIRA backend.");
    } finally {
      button.disabled = false;
      button.innerText = "🚀 Create in JIRA";
    }
  }
  
  // Optionally expose test mode
  window.setMockJira = (flag) => {
    if (latestJson) latestJson.mock = !!flag;
  };
  
  // ✅ Explicit enable hook for results (can be called from main app logic)
  if (typeof latestJson !== 'undefined') {
    enableJiraButton();
  }
  