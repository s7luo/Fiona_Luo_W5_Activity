let video; // Live webcam video.
let classifier; // ml5.js MobileNet classifier.
let mappings = []; // Records loaded from the JSON file.
let currentLabel = "Waiting for classification..."; // Latest model label.
let currentConfidence = 0; // Confidence from 0 to 1.
let currentRecord = null; // Matching JSON record, if found.
let jsonLoaded = false; // Whether JSON loading succeeded.
let jsonError = false; // Whether JSON loading failed.

function preload() {
  // p5 waits for the dataset before setup().
  mappings = loadJSON("finalImageNetLabelsAndEmojis.json", jsonLoadedSuccessfully, jsonFailedToLoad);
}

function jsonLoadedSuccessfully(data) {
  // Store the loaded records.
  mappings = data;
  jsonLoaded = true;
}

function jsonFailedToLoad(error) {
  // An empty array allows the interface to show failure without crashing.
  console.error("Could not load JSON dataset:", error);
  jsonError = true;
  mappings = [];
}

function setup() {
  createCanvas(960, 720);
  video = createCapture(VIDEO, { flipped: true });
  video.size(width, height);
  video.hide();
  classifier = ml5.imageClassifier("MobileNet", { flipped: true });
  classifier.classifyStart(video, gotResults);
}

function normalizeLabel(labelText) {
  // Lowercase and trim a label so comparisons are less sensitive to formatting.
  return String(labelText).toLowerCase().trim();
}

function firstTerm(labelText) {
  // Keep the first term from a comma-separated synonym list.
  return normalizeLabel(labelText).split(",")[0].trim();
}

function labelTerms(labelText) {
  // Turn a comma-separated label into clean, searchable terms.
  return normalizeLabel(labelText)
    .split(",")
    .map(function (term) {
      return term.trim();
    })
    .filter(function (term) {
      return term.length > 0;
    });
}

function findMapping(modelLabel) {
  // Do not search until the JSON has loaded.
  if (!jsonLoaded || !Array.isArray(mappings)) return null;
  let modelFull = normalizeLabel(modelLabel);
  let modelFirst = firstTerm(modelLabel);
  let modelTerms = labelTerms(modelLabel);

  // PASS 1: exact full-label match.
  for (let item of mappings) {
    if (!item || !item.label) continue;
    if (modelFull === normalizeLabel(item.label)) return item;
  }

  // PASS 2: first-term match.
  for (let item of mappings) {
    if (!item || !item.label) continue;
    if (modelFirst === firstTerm(item.label)) return item;
  }

  // PASS 3: exact synonym-term match.
  for (let item of mappings) {
    if (!item || !item.label) continue;
    let datasetTerms = labelTerms(item.label);
    for (let modelTerm of modelTerms) {
      for (let datasetTerm of datasetTerms) {
        if (modelTerm === datasetTerm) return item;
      }
    }
  }

  // PASS 4: containment match, restricted to terms of four or more characters.
  for (let item of mappings) {
    if (!item || !item.label) continue;
    let datasetTerms = labelTerms(item.label);
    for (let modelTerm of modelTerms) {
      for (let datasetTerm of datasetTerms) {
        if (modelTerm.length < 4 || datasetTerm.length < 4) continue;
        if (modelTerm.includes(datasetTerm) || datasetTerm.includes(modelTerm)) return item;
      }
    }
  }
  console.log("No mapping found for:", modelLabel);
  return null;
}

function gotResults(results) {
  // Store the latest prediction and search the JSON for its translation.
  if (!results || results.length === 0) return;
  currentLabel = results[0].label;
  currentConfidence = results[0].confidence;
  currentRecord = findMapping(currentLabel);
  console.log("MobileNet label:", currentLabel);
  console.log("Confidence:", currentConfidence);
  console.log("Matching record:", currentRecord);
}

function draw() {
  image(video, 0, 0, width, height);

 
  textAlign(CENTER, CENTER);
  
  let emojiToDraw = "❓";
  if (currentRecord && currentRecord.emoji) {
    emojiToDraw = currentRecord.emoji;
  }

  let emojiSize = map(currentConfidence, 0, 1, 80, 250);
  let emojiAlpha = map(currentConfidence, 0, 1, 80, 255); 
  
  textSize(emojiSize);
  fill(255, emojiAlpha); 
  text(emojiToDraw, width / 2, height / 2);

 
  fill(0, 160);
  noStroke();
  rect(20, 20, 420, 200, 8); 

  fill(255);
  textAlign(LEFT, TOP);
  textSize(16);
  text("Misrecognition Mirror", 40, 40);

  fill(200);
  textSize(14);
  text("Label: " + currentLabel, 40, 75, 380); 
  text("Confidence: " + nf(currentConfidence * 100, 2, 1) + "%", 40, 100);

  fill(100); 
  rect(40, 125, 380, 4, 2); 
  fill(255); // 进度色
  rect(40, 125, 380 * currentConfidence, 4, 2);

  textSize(14);
  if (jsonError) {
    fill(255, 100, 100);
    text("Dataset: Error loading", 40, 150);
  } else if (!jsonLoaded) {
    fill(255, 200, 100);
    text("Dataset: Loading...", 40, 150);
  } else {
    if (currentRecord) {
      fill(150, 255, 150); 
      text("Category: " + currentRecord.workshopCategory, 40, 150, 380);
      text("Emoji: " + currentRecord.emoji, 40, 175);
    } else {
      fill(255, 150, 150); 
      text("No match found (Fallback: ❓)", 40, 150, 380);
    }
  }
}