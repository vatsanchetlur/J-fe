document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById("downloadJsonBtn").disabled = true;
  document.getElementById("downloadPdfBtn").disabled = true;
  document.getElementById("createInJiraBtn").disabled = true;

  try {
    const res = await fetch('https://j-be-yxgx.onrender.com/api/prompts');
    const promptData = await res.json();
    const edgeSelect = document.getElementById('edge');
    promptData.prompts.forEach(prompt => {
      const option = document.createElement('option');
      option.value = prompt;
      option.textContent = prompt;
      edgeSelect.appendChild(option);
    });
  } catch (err) {
    console.error('Failed to load prompt library:', err);
  }
});

let latestJson = null;

document.getElementById("userForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const spinner = document.getElementById("spinner");
  const resultMessage = document.getElementById("resultMessage");
  spinner.style.display = "block";
  resultMessage.style.display = "none";

  const container = document.querySelector(".main-content");
  if (spinner && container) {
    const offsetTop = spinner.offsetTop;
    container.scrollTo({ top: offsetTop - 20, behavior: "smooth" });
  }

  const persona = document.getElementById("persona").value;
  const edge = document.getElementById("edge").value;
  const projectKey = document.getElementById("projectKey").value;
  const jiraUser = document.getElementById("jiraUser").value;
  const jiraLabel = document.getElementById("jiraLabel").value;

  const prompt = `
You are a product owner generating Agile documentation.

Persona:
${persona}

Task:
${edge}

Return the response as JSON in this format:
{
  "epic": {
    "summary": "string",
    "description": "string"
  },
  "stories": [
    {
      "summary": "string",
      "description": "string",
      "acceptanceCriteria": ["criteria1", "criteria2"],
      "tasks": ["task1", "task2"]
    }
  ]
}
`;

  const payload = { persona, edge, projectKey, jiraUser, jiraLabel, prompt };

  try {
    const response = await fetch("https://j-be-yxgx.onrender.com/api/generate-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    spinner.style.display = "none";

    if (response.ok && result.epic && result.stories) {
      latestJson = result;
      document.getElementById("downloadJsonBtn").disabled = false;
      document.getElementById("downloadPdfBtn").disabled = false;
      document.getElementById("createInJiraBtn").disabled = false;

      resultMessage.innerText = "✅ Results are ready";
      resultMessage.style.display = "block";
    } else {
      alert("Error: " + (result.error || "Invalid response structure."));
    }
  } catch (err) {
    spinner.style.display = "none";
    console.error("Fetch error:", err);
    alert("Something went wrong while submitting the form.");
  }
});

document.getElementById("downloadJsonBtn").addEventListener("click", () => {
  if (!latestJson) return;
  const blob = new Blob([JSON.stringify(latestJson, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'epic-stories.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("downloadPdfBtn").addEventListener("click", () => {
  if (!latestJson) return;
  const { epic, stories } = latestJson;
  const doc = new window.jspdf.jsPDF();

  doc.setFontSize(16);
  doc.text("EZEPICS - Epic & Stories", 10, 15);
  doc.setFontSize(12);
  doc.text(`Epic Summary: ${epic.summary}`, 10, 30);
  doc.text(`Epic Description: ${epic.description}`, 10, 40);

  let y = 55;
  stories.forEach((story, i) => {
    doc.text(`Story ${i + 1}: ${story.summary}`, 10, y);
    y += 7;
    doc.text(`Description: ${story.description}`, 10, y);
    y += 7;
    if (story.acceptanceCriteria?.length) {
      doc.text("Acceptance Criteria:", 10, y);
      y += 6;
      story.acceptanceCriteria.forEach(c => {
        doc.text(`• ${c}`, 14, y);
        y += 6;
      });
    }
    if (story.tasks?.length) {
      doc.text("Tasks:", 10, y);
      y += 6;
      story.tasks.forEach(t => {
        doc.text(`- ${t}`, 14, y);
        y += 6;
      });
    }
    y += 10;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save('epic-stories.pdf');
});

document.getElementById("createInJiraBtn").addEventListener("click", async () => {
  if (!latestJson) return;

  const projectKey = document.getElementById("projectKey").value;
  const jiraLabel = document.getElementById("jiraLabel").value;
  const jiraUser = document.getElementById("jiraUser").value;

  const payload = {
    epic: latestJson.epic,
    stories: latestJson.stories,
    projectKey,
    jiraLabel,
    jiraUser
  };

  try {
    const response = await fetch("https://j-be-yxgx.onrender.com/api/jira/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      alert(`✅ Created in JIRA! Epic Key: ${data.epicKey}`);
    } else {
      alert("❌ Error creating in JIRA: " + (data.error || "Unknown error"));
    }
  } catch (err) {
    console.error("Error posting to JIRA:", err);
    alert("Something went wrong when sending data to JIRA.");
  }
});
const micBtn = document.getElementById("micBtn");
const personaInput = document.getElementById("persona");

if ('webkitSpeechRecognition' in window) {
  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.continuous = false;

  micBtn.addEventListener("click", () => {
    recognition.start();
    micBtn.innerText = "🎙️ Listening...";
  });

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    personaInput.value += (personaInput.value ? " " : "") + transcript;
    micBtn.innerText = "🎤 Speak";
  };

  recognition.onerror = function (event) {
    console.error("Speech recognition error:", event);
    micBtn.innerText = "🎤 Speak";
  };

  recognition.onend = function () {
    micBtn.innerText = "🎤 Speak";
  };
} else {
  micBtn.disabled = true;
  micBtn.innerText = "❌ Speech not supported";
}
