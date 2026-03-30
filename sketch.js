// PRELOAD
let font, font2, sound, amp;
let eyeIcon, wantedImg, bugGif;

let groups = [];
let startTime;
let spawnEnabled = false;

let maxGroups = 30;
let buttonAlpha = 0;
let clicked = false;

let video;
let buttonBounds;
let lastBeat = 0;
let beatThreshold = 0.25;

// PNG
let pngFiles = ['berlin', 'brussels', 'copenhagen', 'helsinki', 'rattvik']; 
let pngImages = [];
let pngAltImages = [];
let pngObjects = [];
let pngSpawnIndex = 0;
let lastPngSpawn = 0;
let pngSpawnObjectsStart = 0;

// BUGS
let bugs = [];
let bugsStarted = false;
let bugsTimerStarted = false;
let bugsStartTime = 0;
let maxBugs = 32;

// TEXT END
let showFinalText = false;
let textBlinkCount = 0;
let lastBlink = 0;

// WANTED
let wantedTimer = 0;
let wantedVisible = false;
let wantedX, wantedY;
let wantedDelay = 10000;
let finalTextShownTime = 0;

function preload() {
  font = loadFont('fonts/HelveticaNeue-Bold.otf');
  font2 = loadFont('fonts/IBMPlexMono-Regular.ttf');
  sound = loadSound('assets/risingson.mp3');

  eyeIcon = loadImage('assets/eye.png');
  wantedImg = loadImage('assets/wanted.png');
  bugGif = loadImage('assets/juk.gif');

  for (let name of pngFiles) {
    pngImages.push(loadImage(`assets/${name}.png`));
    pngAltImages.push(loadImage(`assets/${name}2.png`));
  }
}

function setup() {
  createCanvas(496, 701);
  textAlign(CENTER, CENTER);

  userStartAudio().then(() => sound.loop());

  amp = new p5.Amplitude();
  startTime = millis();

  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
}

function draw() {
  background(0);
  let t = millis() - startTime;

  if (clicked) {
    drawCamera();

    // PNG
    drawPNGs();
    updatePNGs();

    if (pngSpawnIndex < pngImages.length && millis() - lastPngSpawn > 500) {
      spawnSinglePNG(pngSpawnIndex);
      pngSpawnIndex++;
      lastPngSpawn = millis();
    }

    // BUGS
    let allHidden = pngObjects.length > 0 && pngObjects.every(p => !p.shown);

    if (allHidden && !bugsTimerStarted) {
      bugsTimerStarted = true;
      bugsStartTime = millis();
    }

    if (bugsTimerStarted && !bugsStarted) {
      if (millis() - bugsStartTime > 5000) {
        bugsStarted = true;
      }
    }

    if (bugsStarted) {
      if (bugs.length < maxBugs && frameCount % 10 === 0) {
        spawnBug();
      }

      blendMode(MULTIPLY);

      for (let b of bugs) {
        updateBug(b);
        drawBug(b);
      }

      blendMode(BLEND);

      bugs = bugs.filter(b => !b.dead);
    }

    // FINAL TEXT
    if (bugsStarted && millis() - bugsStartTime > 10000) {
      showFinalText = true;
      if (!finalTextShownTime) finalTextShownTime = millis();
    }

    if (showFinalText) drawFinalText();

    return;
  }

  push();
  translate(width / 2, height / 2);
  textFont(font);
  textSize(48);

  if (t > 3000) drawFullGroup();
  else drawBuildingGroup(t);

  pop();

  if (t > 6000) spawnEnabled = true;

  if (spawnEnabled && groups.length < maxGroups) {
    let level = amp.getLevel();
    if (level > beatThreshold && millis() - lastBeat > 300) {
      groups.push({ x: random(width), y: random(height), r: random(TWO_PI) });
      lastBeat = millis();
    }
  }

  for (let g of groups) {
    push();
    translate(g.x, g.y);
    rotate(g.r);
    textFont(font);
    textSize(48);
    drawFullGroup();
    pop();
  }

  if (groups.length >= maxGroups && t > 11000) drawButton();
}

// CAMERA
function drawCamera() {
  background(0);

  let scaleFactor = max(width / video.width, height / video.height);
  let drawW = video.width * scaleFactor;
  let drawH = video.height * scaleFactor;

  push();
  translate(width / 2, height / 2);
  scale(-1, 1);
  imageMode(CENTER);
  image(video, 0, 0, drawW, drawH);
  pop();

  // негатив
  loadPixels();
  for (let i = 0; i < pixels.length; i += 4) {
    let gray = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
    gray = 255 - gray;
    pixels[i] = gray;
    pixels[i+1] = gray;
    pixels[i+2] = gray;
  }
  updatePixels();

  fill('#FFFFFF');
  textFont(font);
  textSize(160);
  textAlign(CENTER, TOP);
  text("2026", width / 2, 20);
  textAlign(CENTER, BOTTOM);
  text("TOUR", width / 2, height - 10);
}

function spawnSinglePNG(i) {
  let scale = 0.23;
  let w = 560 * scale;
  let h = 738 * scale;

  pngObjects.push({
    img: pngImages[i],
    altImg: pngAltImages[i],
    x: random(w/2, width-w/2),
    y: random(100 + h/2, height-100 - h/2),
    w, h,
    shown: true,
    blink: false,
    showTime: millis(),
    blinkStart: 0
  });

  pngSpawnObjectsStart = millis();
}

function drawPNGs() {
  for (let p of pngObjects) {
    if (!p.shown) continue;
    let img = p.blink ? p.altImg : p.img;
    imageMode(CENTER);
    image(img, p.x, p.y, p.w, p.h);
  }
}

function updatePNGs() {
  let now = millis();
  for (let p of pngObjects) {
    if (p.shown && !p.blink && now - p.showTime > 5000) {
      p.blink = true;
      p.blinkStart = now;
    } else if (p.blink && now - p.blinkStart > 1000) {
      p.shown = false;
    }
  }
}

function allPNGsGone() {
  return pngObjects.every(p => !p.shown);
}

// BUGS
function spawnBug() {
  let margin = 200;
  let x = random([-margin, width + margin]);
  let y = random([-margin, height + margin]);
  let angle = random(TWO_PI);
  let scaleFactor = random([0.5, 0.8, 1.2]);
  let baseSize = 400;

  bugs.push({
    x,
    y,
    angle,
    speed: random(6, 14),
    size: baseSize * scaleFactor,
    dead: false
  });
}

function updateBug(b) {
  b.x += cos(b.angle) * b.speed;
  b.y += sin(b.angle) * b.speed;

  if (b.x < -400 || b.x > width + 400 || b.y < -400 || b.y > height + 400) {
    b.dead = true;
  }
}

function drawBug(b) {
  if (b.dead) return;
  let ratio = bugGif.width / bugGif.height;

  push();
  imageMode(CENTER);
  translate(b.x, b.y);
  rotate(b.angle + HALF_PI);
  image(bugGif, 0, 0, b.size, b.size / ratio);
  pop();
}

function drawFinalText() {
  let now = millis();

  if (textBlinkCount < 7) {
    if (now - lastBlink > 150) {
      lastBlink = now;
      textBlinkCount++;
    }
    if (textBlinkCount % 2 === 0) return;
  }

  fill(255);
  textFont(font2);
  textSize(20);
  textAlign(CENTER, CENTER);

  text(
`Helsinki ------------------- 27.05.2026
Rattvik -------------------- 30.05.2026
Copenhagen ---------------- 01.06.2026
Berlin --------------------- 07.06.2026
Brussels ------------------ 08.06.2026`,
    width / 2,
    height / 2
  );

  if (!wantedVisible && millis() - finalTextShownTime > wantedDelay) {
    wantedVisible = true;
    wantedTimer = millis();
    wantedX = random(0, width - 120);
    wantedY = random(0, height - 160);
  }

  if (wantedVisible) {
    image(wantedImg, wantedX, wantedY, 120, 160);

    if (millis() - wantedTimer > 1000) {
      wantedTimer = millis();
      wantedX = random(0, width - 120);
      wantedY = random(0, height - 160);
    }
  }
}

// ***
function drawBuildingGroup(t) {
  fill('#F10C67'); push(); rotate(0); text('MASSIVE ATTACK', 0, 0); pop();
  if (t > 1000) { fill('#0EF398'); push(); rotate(HALF_PI); text('MASSIVE ATTACK', 0, 0); pop(); }
  if (t > 2000) { fill('#1E00FF'); push(); rotate(PI / 4); text('MASSIVE ATTACK', 0, 0); pop(); }
  if (t > 3000) { fill('#FF0000'); push(); rotate(-PI / 4); text('MASSIVE ATTACK', 0, 0); pop(); }
}

function drawFullGroup() {
  fill('#F10C67'); push(); rotate(0); text('MASSIVE ATTACK', 0, 0); pop();
  fill('#0EF398'); push(); rotate(HALF_PI); text('MASSIVE ATTACK', 0, 0); pop();
  fill('#1E00FF'); push(); rotate(PI / 4); text('MASSIVE ATTACK', 0, 0); pop();
  fill('#FF0000'); push(); rotate(-PI / 4); text('MASSIVE ATTACK', 0, 0); pop();
}

// BUTTON
function drawButton() {
  buttonAlpha = min(buttonAlpha + 20, 255);

  let bx = width / 2;
  let by = height / 2;

  buttonBounds = { x: bx, y: by, w: 280, h: 80 }; 

  fill(0, buttonAlpha);
  rectMode(CENTER);
  rect(bx, by, buttonBounds.w, buttonBounds.h);

  fill(255, buttonAlpha);
  textFont(font2);
  textSize(24);
  text("Let us see you", bx, by -20 );

  tint(255, buttonAlpha);
  image(eyeIcon, bx -30, by -7, 48, 48);
  noTint();
}

// CLICK
function mousePressed() {
  if (!buttonBounds || clicked) return;

  let inside =
    mouseX > buttonBounds.x - buttonBounds.w / 2 &&
    mouseX < buttonBounds.x + buttonBounds.w / 2 &&
    mouseY > buttonBounds.y - buttonBounds.h / 2 &&
    mouseY < buttonBounds.y + buttonBounds.h / 2;

  if (inside) clicked = true;
}