const sampleComic = {
  title: "The Moonlight Bakery",
  logline: "A shy dragon discovers the secret ingredient to a very unlikely midnight rush.",
  panels: [
    { scene: "A little bakery at midnight", dialogue: "Just one more loaf, then bed...", caption: "At the end of a sleepy cobblestone lane." },
    { scene: "A tiny dragon at the oven", dialogue: "Oh! Was that me?", caption: "One sneeze later, the dough began to glow." },
    { scene: "The glowing bread draws a crowd", dialogue: "We'll take twelve!", caption: "Word about the warm, starry buns traveled fast." },
    { scene: "A full bakery under the moon", dialogue: "Same time tomorrow?", caption: "By sunrise, everyone had found a little magic." }
  ]
};

const projectStorageKey = "comiccraft-project-v1";
const keyStorageKey = "comiccraft-gemini-key";
const settingsStorageKey = "comiccraft-model-settings";
const elements = {
  idea: document.querySelector("#idea"),
  ideaCount: document.querySelector("#ideaCount"),
  style: document.querySelector("#style"),
  mood: document.querySelector("#mood"),
  panelCount: document.querySelector("#panelCount"),
  form: document.querySelector("#comicForm"),
  generateButton: document.querySelector("#generateButton"),
  illustrateButton: document.querySelector("#illustrateButton"),
  comicPaper: document.querySelector("#comicPaper"),
  panelSummary: document.querySelector("#panelSummary"),
  progressWrap: document.querySelector("#progressWrap"),
  progressText: document.querySelector("#progressText"),
  progressPercent: document.querySelector("#progressPercent"),
  progressBar: document.querySelector("#progressBar"),
  errorBanner: document.querySelector("#errorBanner"),
  saveStatus: document.querySelector("#saveStatus"),
  settingsDialog: document.querySelector("#settingsDialog"),
  apiKey: document.querySelector("#apiKey"),
  textModel: document.querySelector("#textModel"),
  imageModel: document.querySelector("#imageModel"),
  toast: document.querySelector("#toast")
};

let isSampleProject = true;
let comic = loadProject();
let toastTimer;

function loadProject() {
  try {
    const saved = JSON.parse(localStorage.getItem(projectStorageKey));
    if (saved?.title && Array.isArray(saved.panels) && saved.panels.length) {
      isSampleProject = false;
      return saved;
    }
  } catch { /* Ignore damaged local project data. */ }
  return structuredClone(sampleComic);
}

function getModelSettings() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(settingsStorageKey));
    const savedTextModel = saved?.textModel === "gemini-2.5-flash" ? "gemini-3.5-flash" : saved?.textModel;
    return {
      textModel: savedTextModel || "gemini-3.5-flash",
      imageModel: saved?.imageModel || "gemini-2.5-flash-image"
    };
  } catch {
    return { textModel: "gemini-3.5-flash", imageModel: "gemini-2.5-flash-image" };
  }
}

function saveProject() {
  const textOnlyComic = {
    title: comic.title,
    logline: comic.logline,
    panels: comic.panels.map(({ scene, dialogue, caption, imagePrompt }) => ({ scene, dialogue, caption, imagePrompt }))
  };
  try {
    localStorage.setItem(projectStorageKey, JSON.stringify(textOnlyComic));
    elements.saveStatus.textContent = "SAVED IN THIS BROWSER";
  } catch {
    elements.saveStatus.textContent = "PROJECT READY";
  }
}

function renderComic() {
  elements.comicPaper.replaceChildren();
  const heading = document.createElement("div");
  heading.className = "comic-title-row";
  const textGroup = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = comic.title || "Untitled comic";
  const logline = document.createElement("p");
  logline.textContent = comic.logline || "A story made one panel at a time.";
  textGroup.append(title, logline);
  const mark = document.createElement("span");
  mark.className = "issue-mark";
  mark.textContent = `NO. ${String(comic.panels.length).padStart(2, "0")}`;
  heading.append(textGroup, mark);

  const grid = document.createElement("div");
  grid.className = "panel-grid";
  comic.panels.forEach((panel, index) => {
    const panelElement = document.createElement("article");
    panelElement.className = "panel";
    const art = document.createElement("div");
    art.className = `panel-art art-${(index % 4) + 1}`;
    const number = document.createElement("span");
    number.className = "panel-number";
    number.textContent = `PANEL ${String(index + 1).padStart(2, "0")}`;
    art.append(number);
    if (panel.image) {
      const image = document.createElement("img");
      image.src = panel.image;
      image.alt = panel.scene || `Illustration for panel ${index + 1}`;
      art.append(image);
    }
    const copy = document.createElement("div");
    copy.className = "panel-copy";
    const dialogue = document.createElement("p");
    dialogue.className = "dialogue";
    dialogue.textContent = panel.dialogue || "...";
    const caption = document.createElement("p");
    caption.className = "caption";
    caption.textContent = panel.caption || panel.scene || "";
    copy.append(dialogue, caption);
    panelElement.append(art, copy);
    grid.append(panelElement);
  });
  elements.comicPaper.append(heading, grid);
  elements.panelSummary.textContent = `${comic.panels.length} PANELS`;
  elements.illustrateButton.disabled = !comic.panels.length;
  elements.saveStatus.textContent = isSampleProject ? "SAMPLE PROJECT" : "PROJECT READY";
}

function setProgress(message, percent) {
  elements.progressWrap.hidden = false;
  elements.progressText.textContent = message;
  elements.progressPercent.textContent = `${Math.round(percent)}%`;
  elements.progressBar.style.width = `${percent}%`;
}

function hideProgress() {
  elements.progressWrap.hidden = true;
  elements.progressBar.style.width = "0%";
}

function showError(message) {
  elements.errorBanner.textContent = message;
  elements.errorBanner.hidden = false;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), 2600);
}

function apiKeyOrAsk() {
  const key = sessionStorage.getItem(keyStorageKey);
  if (key) return key;
  elements.settingsDialog.showModal();
  elements.apiKey.focus();
  showToast("Add your Gemini API key to get started.");
  return null;
}

async function requestGemini(model, key, body) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = result.error?.message || `Gemini returned HTTP ${response.status}.`;
    throw new Error(detail);
  }
  return result;
}

function textFromResponse(result) {
  return result.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim() || "";
}

async function generateStory(event) {
  event.preventDefault();
  const idea = elements.idea.value.trim();
  if (!idea) {
    elements.idea.focus();
    return;
  }
  const key = apiKeyOrAsk();
  if (!key) return;

  elements.errorBanner.hidden = true;
  elements.generateButton.disabled = true;
  elements.illustrateButton.disabled = true;
  setProgress("Finding the shape of your story...", 9);
  try {
    const { textModel } = getModelSettings();
    const count = Number(elements.panelCount.value);
    const schema = {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        logline: { type: "STRING" },
        panels: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              scene: { type: "STRING" },
              dialogue: { type: "STRING" },
              caption: { type: "STRING" },
              imagePrompt: { type: "STRING" }
            },
            required: ["scene", "dialogue", "caption", "imagePrompt"]
          }
        }
      },
      required: ["title", "logline", "panels"]
    };
    const prompt = `Create an original, family-friendly comic from this idea: ${idea}\nArt direction: ${elements.style.value}. Mood: ${elements.mood.value}.\nReturn exactly ${count} panels. Give the story a clear beginning, middle, and satisfying ending. Keep dialogue punchy and captions short. Each imagePrompt must describe only the visual composition of that panel, use consistent character descriptions across panels, and explicitly request no text, letters, speech bubbles, or watermarks in the image. Return only the requested structured data.`;
    const response = await requestGemini(textModel, key, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.8 }
    });
    setProgress("Inking the panels...", 76);
    const raw = textFromResponse(response);
    const generated = JSON.parse(raw);
    if (!Array.isArray(generated.panels) || generated.panels.length === 0) throw new Error("Gemini returned a story without any panels. Try again.");
    comic = {
      title: String(generated.title || "Untitled comic"),
      logline: String(generated.logline || ""),
      panels: generated.panels.slice(0, count).map(panel => ({
        scene: String(panel.scene || ""),
        dialogue: String(panel.dialogue || ""),
        caption: String(panel.caption || ""),
        imagePrompt: String(panel.imagePrompt || "")
      }))
    };
    isSampleProject = false;
    renderComic();
    saveProject();
    elements.saveStatus.textContent = "SAVED IN THIS BROWSER";
    setProgress("Your story is ready.", 100);
    showToast("Your comic is ready to read.");
  } catch (error) {
    showError(`${error.message} Check your API key and model settings, then try again.`);
  } finally {
    elements.generateButton.disabled = false;
    elements.illustrateButton.disabled = comic.panels.length === 0;
    setTimeout(hideProgress, 900);
  }
}

function imageFromResponse(result) {
  const parts = result.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(part => part.inlineData?.data);
  if (!imagePart) throw new Error("The image model did not return an image. Check that your selected model supports image generation.");
  return `data:${imagePart.inlineData.mimeType || "image/png"};base64,${imagePart.inlineData.data}`;
}

async function illustrateComic() {
  const key = apiKeyOrAsk();
  if (!key || !comic.panels.length) return;
  elements.errorBanner.hidden = true;
  elements.generateButton.disabled = true;
  elements.illustrateButton.disabled = true;
  const { imageModel } = getModelSettings();
  let completed = 0;
  try {
    for (let index = 0; index < comic.panels.length; index += 1) {
      const panel = comic.panels[index];
      setProgress(`Painting panel ${index + 1} of ${comic.panels.length}...`, 4 + (completed / comic.panels.length) * 92);
      const prompt = `Create a single comic-book illustration for this panel. Art direction: ${elements.style.value}. Mood: ${elements.mood.value}. Visual scene: ${panel.imagePrompt || panel.scene}. Keep recurring characters visually consistent with this description: ${comic.logline}. Composition should read clearly at a small panel size. Image only: no text, letters, speech bubbles, captions, borders, or watermark.`;
      const response = await requestGemini(imageModel, key, {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] }
      });
      panel.image = imageFromResponse(response);
      completed += 1;
      renderComic();
    }
    setProgress("Your panels are illustrated.", 100);
    showToast("Panel art is ready.");
  } catch (error) {
    showError(`${error.message} Any panels already illustrated are still here.`);
  } finally {
    elements.generateButton.disabled = false;
    elements.illustrateButton.disabled = false;
    setTimeout(hideProgress, 900);
  }
}

function exportComic() {
  const exportData = {
    title: comic.title,
    logline: comic.logline,
    panels: comic.panels.map(({ scene, dialogue, caption, imagePrompt }) => ({ scene, dialogue, caption, imagePrompt }))
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${(comic.title || "comic").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "comic"}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Comic script downloaded as JSON.");
}

function openSettings() {
  elements.apiKey.value = sessionStorage.getItem(keyStorageKey) || "";
  const settings = getModelSettings();
  elements.textModel.value = settings.textModel;
  elements.imageModel.value = settings.imageModel;
  elements.settingsDialog.showModal();
}

elements.idea.addEventListener("input", () => {
  elements.ideaCount.textContent = `${elements.idea.value.length} / 700`;
});
elements.form.addEventListener("submit", generateStory);
elements.illustrateButton.addEventListener("click", illustrateComic);
document.querySelector("#openSettings").addEventListener("click", openSettings);
document.querySelector("#saveSettings").addEventListener("click", () => {
  const key = elements.apiKey.value.trim();
  if (key) sessionStorage.setItem(keyStorageKey, key);
  else sessionStorage.removeItem(keyStorageKey);
  sessionStorage.setItem(settingsStorageKey, JSON.stringify({
    textModel: elements.textModel.value.trim() || "gemini-2.5-flash",
    imageModel: elements.imageModel.value.trim() || "gemini-2.5-flash-image"
  }));
  elements.settingsDialog.close();
  showToast(key ? "Gemini settings saved for this session." : "Model settings saved. Add a key before generating.");
});
document.querySelector("#removeKey").addEventListener("click", () => {
  sessionStorage.removeItem(keyStorageKey);
  elements.apiKey.value = "";
  showToast("API key cleared from this session.");
});
document.querySelector("#toggleKey").addEventListener("click", event => {
  const isHidden = elements.apiKey.type === "password";
  elements.apiKey.type = isHidden ? "text" : "password";
  event.currentTarget.textContent = isHidden ? "HIDE" : "SHOW";
});
document.querySelector("#exportButton").addEventListener("click", exportComic);
document.querySelector("#printButton").addEventListener("click", () => window.print());

renderComic();