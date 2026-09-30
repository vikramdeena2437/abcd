# ComicCraft

ComicCraft turns a short idea into a panel-by-panel comic script with Gemini, then can generate a separate illustration for each panel with a Gemini image model. The finished comic can be printed or its script exported as JSON.

## Run locally

From this folder, start a static server:

```sh
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000).

## Connect Gemini

1. Create an API key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Open the key icon in ComicCraft and enter the key.
3. Generate the story. Choose **Illustrate all panels** when you want to spend image-generation quota on panel art.

The default models are `gemini-3.5-flash` for story generation and `gemini-2.5-flash-image` for image generation. Model names can be changed in settings. The API key is held in browser session storage and is not written into the project or exported. Generated story text is saved in local storage; generated image data stays in memory for the current page session.

This browser-only setup is intended for personal/local use. For a shared or public deployment, route Gemini requests through a server so API credentials are not exposed to visitors.# abcd