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

  // Speech recognition setup
  const micBtn = document.getElementById('micBtn');
  const personaTextarea = document.getElementById('persona');

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    micBtn.addEventListener('click', function () {
      recognition.start();
    });

    recognition.onresult = function (event) {
      const transcript = event.results[0][0].transcript;
      personaTextarea.value = transcript;
    };

    recognition.onerror = function (event) {
      console.error('Speech recognition error:', event.error);
    };

    recognition.onend = function () {
      console.log('Speech recognition ended.');
    };
  } else {
    console.warn('Speech recognition not supported in this browser.');
    micBtn.disabled = true;
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
  const pageWidth = 210;
  const margin = 15;
  const wrapWidth = pageWidth - margin * 2;

  doc.setFontSize(16);
  doc.text("EZEPICS - Epic & Stories", margin, 20);

  doc.setFontSize(12);
  let y = 30;

  const epicSummary = doc.splitTextToSize(`Epic Summary: ${epic.summary}`, wrapWidth);
  const epicDescription = doc.splitTextToSize(`Epic Description: ${epic.description}`, wrapWidth);

  doc.text(epicSummary, margin, y);
  y += epicSummary.length * 7;
  doc.text(epicDescription, margin, y);
  y += epicDescription.length * 7 + 10;

  stories.forEach((story, i) => {
    const summary = doc.splitTextToSize(`Story ${i + 1}: ${story.summary}`, wrapWidth);
    const description = doc.splitTextToSize(`Description: ${story.description}`, wrapWidth);

    doc.text(summary, margin, y);
    y += summary.length * 7;
    doc.text(description, margin, y);
    y += description.length * 7;

    if (story.acceptanceCriteria?.length) {
      doc.text("Acceptance Criteria:", margin, y);
      y += 6;
      story.acceptanceCriteria.forEach(c => {
        const crit = doc.splitTextToSize(`• ${c}`, wrapWidth - 4);
        doc.text(crit, margin + 4, y);
        y += crit.length * 6;
      });
    }

    if (story.tasks?.length) {
      doc.text("Tasks:", margin, y);
      y += 6;
      story.tasks.forEach(t => {
        const task = doc.splitTextToSize(`- ${t}`, wrapWidth - 4);
        doc.text(task, margin + 4, y);
        y += task.length * 6;
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
    const epicRes = await axios.post(`${JIRA_BASE_URL}/rest/api/3/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    const result = await epicRes.data;

    if (epicRes.status === 200 && result.epicKey) {
        alert(`✅ Created in JIRA! Epic Key: ${result.epicKey}`);
    } else {
        alert("❌ Error creating in JIRA: " + (result.error || "Unknown error"));
    }
} catch (err) {
    console.error("Error posting to JIRA:", err);
    alert("Something went wrong when sending data to JIRA.");
}})
