const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Menu elements
const mainMenu = document.getElementById('mainMenu');
const startGameButton = document.getElementById('startGameButton');
const instructionsButton = document.getElementById('instructionsButton');
const exitButton = document.getElementById('exitButton');

// Canvas resize functionality
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial call to set canvas size

let gameOver = false;
let highScore = 0;
let backgroundImage = new Image();
let animationFrame = 0;
let characterImage1 = new Image();
let characterImage2 = new Image();
let floorImage = new Image();
let explosionImage = new Image();

function loadAssets(callback) {
  backgroundImage.src = 'gamebackground2.png';
  backgroundImage.onload = function () {
    characterImage1.src = 'character1.png';
    characterImage1.onload = function () {
      characterImage2.src = 'character2.png';
      characterImage2.onload = function () {
        floorImage.src = 'lavafloor.png';
        floorImage.onload = function () {
          explosionImage.src = 'T-fireexplosion.png';
          explosionImage.onload = function () {
            callback();
          };
        };
      };
    };
  };
}

const camera = {
  x: 0,
  y: 0,
  width: canvas.width,
  height: canvas.height,
  update: function() {
    this.x = player.x - this.width / 2;
    if (this.x < 0) {
      this.x = 0;
    }
  },
};

const player = {
  x: 50,
  y: canvas.height - 150 - 50,
  width: 30,
  height: 50,
  velocityX: 0,
  velocityY: 0,
  isJumping: false,
  speed: 4, // Initial speed, same as the right arrow key
  jumpHeight: 12,
  score: 0,
  currentImage: null,
  explosionCounter: 0,
};

function setPlayerPositionOnPlatform(platform) {
  player.x = platform.x;
  player.y = platform.y - player.height;
}

class Platform {
  constructor(x, y, width, height, color) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
  }

  draw() {
    ctx.fillStyle = this.color;
    const radius = 10;
    ctx.beginPath();
    ctx.moveTo(this.x + radius, this.y);
    ctx.lineTo(this.x + this.width - radius, this.y);
    ctx.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + radius);
    ctx.lineTo(this.x + this.width, this.y + this.height - radius);
    ctx.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - radius, this.y + this.height);
    ctx.lineTo(this.x + radius, this.y + this.height);
    ctx.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - radius);
    ctx.lineTo(this.x, this.y + radius);
    ctx.quadraticCurveTo(this.x, this.y, this.x + radius, this.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

class Coin {
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.rotation = 0;
  }

  draw() {
    this.rotation += 0.1;
    if (this.rotation >= Math.PI * 2) {
      this.rotation = 0;
    }
    const currentWidth = this.radius * (1 - 0.5 * Math.abs(Math.sin(this.rotation)));
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(
      this.x - camera.x,
      this.y,
      currentWidth,
      this.radius,
      0,
      0,
      Math.PI * 2
    );
    ctx.closePath();
    ctx.fill();
  }
}

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

const platforms = [];

function generatePlatforms() {
  if (platforms.length === 0 || platforms[platforms.length - 1].x - camera.x < canvas.width - 200) {
    const platformWidth = 200;
    const platformHeight = 20;
    const platformColor = getRandomColor();
    let minHeight = canvas.height / 2;
    let maxHeight = canvas.height - 150;
    const minGap = 50;
    const maxGap = 200;
    const randomGap = Math.floor(Math.random() * (maxGap - minGap + 1) + minGap);
    const xPos = platforms.length === 0 ? player.x + randomGap : platforms[platforms.length - 1].x + platformWidth + randomGap;

    let yPos;
    if (platforms.length === 0) {
      yPos = player.y;
    } else {
      const lastPlatformHeight = platforms[platforms.length - 1].y;
      const reachableMinHeight = Math.max(minHeight, lastPlatformHeight - player.jumpHeight * 2);
      const reachableMaxHeight = Math.min(maxHeight, lastPlatformHeight + player.jumpHeight * 2);
      yPos = Math.floor(Math.random() * (reachableMaxHeight - reachableMinHeight + 1) + reachableMinHeight);
    }

    platforms.push(new Platform(xPos, yPos, platformWidth, platformHeight, platformColor));

    if (platforms.length === 1) {
      setPlayerPositionOnPlatform(platforms[0]);
    }

    generateCoins();
  }
}

const coins = [];

function generateCoins() {
  platforms.forEach((platform) => {
    if (!platform.coinsGenerated) {
      const numberOfCoins = Math.floor(Math.random() * 4) + 1;
      const coinSpacing = platform.width / (numberOfCoins + 1);
      for (let i = 0; i < numberOfCoins; i++) {
        const coinX = platform.x + coinSpacing * (i + 1);
        const coinY = platform.y - 25;
        coins.push(new Coin(coinX, coinY, 10, 'gold'));
      }
      platform.coinsGenerated = true;
    }
  });
}

function handlePlayerMovement() {
  player.x += player.speed; // Automatische beweging naar rechts
  player.velocityX = player.speed;
  player.speed += 0.00000000001; // Verhoog de snelheid geleidelijk naarmate het spel vordert
}

function handlePlayerVerticalMovement() {
  player.velocityY += 0.5; // Zwaartekracht
  player.y += player.velocityY;

  let onPlatform = false;
  const floorHeight = 50;
  if (player.y + player.height >= canvas.height - floorHeight) {
    onPlatform = true;
    player.y = canvas.height - player.height - floorHeight;
    player.velocityY = 0;
  }
  platforms.forEach((platform) => {
    if (
      player.x < platform.x + platform.width &&
      player.x + player.width > platform.x &&
      player.y + player.height >= platform.y - 5 &&
      player.y + player.height <= platform.y + platform.height
    ) {
      onPlatform = true;
      player.y = platform.y - player.height;
      player.velocityY = 0;
    }
  });

  player.isJumping = !onPlatform;
}

// Toevoegen van touch ondersteuning voor springen
canvas.addEventListener('click', () => {
  if (!player.isJumping) {
    player.velocityY = -player.jumpHeight; // Springen bij een klik
  }
});

canvas.addEventListener('touchstart', () => {
  if (!player.isJumping) {
    player.velocityY = -player.jumpHeight; // Springen bij aanraking
  }
});

function detectPlatformCollision() {
  const prevY = player.y - player.velocityY;

  let onPlatform = false;

  platforms.forEach((platform) => {
    if (
      player.x < platform.x + platform.width &&
      player.x + player.width > platform.x
    ) {
      if (
        prevY + player.height <= platform.y &&
        player.y + player.height >= platform.y &&
        player.velocityY >= 0
      ) {
        player.y = platform.y - player.height;
        player.velocityY = 0;
        onPlatform = true;
      } else if (
        prevY >= platform.y + platform.height &&
        player.y <= platform.y + platform.height
      ) {
        player.y = platform.y + platform.height;
        player.velocityY = 0;
      }
    }

    if (
      player.y + player.height > platform.y &&
      player.y < platform.y + platform.height
    ) {
      if (
        player.x + player.width >= platform.x &&
        player.x + player.width <= platform.x + 5
      ) {
        player.x = platform.x - player.width;
      } else if (
        player.x <= platform.x + platform.width &&
        player.x >= platform.x + platform.width - 5
      ) {
        player.x = platform.x + platform.width;
      }
    }
  });

  if (onPlatform) {
    player.isJumping = false;
  }
}

function detectCoinCollision() {
  coins.forEach((coin, index) => {
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const distance = Math.sqrt((playerCenterX - coin.x) ** 2 + (playerCenterY - coin.y) ** 2);
    if (distance < player.width / 2 + coin.radius) {
      player.score += 1;
      coins.splice(index, 1);
    }
  });
}

function checkGroundCollision() {
  const floorHeight = 50;
  if (player.y + player.height > canvas.height - floorHeight) {
    player.y = canvas.height - player.height - floorHeight;
    player.velocityY = 0;
  }
}

function resetGame() {
  gameOver = false;
  player.x = 50;
  player.y = canvas.height - 150 - 50;
  player.velocityX = 0;
  player.velocityY = 0;
  player.score = 0;
  player.speed = 4; // Reset de snelheid naar de beginsnelheid
  camera.x = 0;
  platforms.length = 0;
  coins.length = 0;
  generatePlatforms();
  player.explosionDrawn = false;
  player.explosionCounter = 0;
}

function update() {
  if (!gameOver) {
    handlePlayerVerticalMovement();
    detectPlatformCollision();
    checkGroundCollision();
    detectCoinCollision();

    handlePlayerMovement();
    generateCoins();

    camera.update();

    if (player.isJumping) {
      player.currentImage = characterImage1;
      animationFrame = 0;
    } else {
      animationFrame++;
      if (animationFrame % 20 < 10) {
        player.currentImage = characterImage1;
      } else {
        player.currentImage = characterImage2;
      }
    }

    generatePlatforms();
  }

  if (player.y + player.height >= canvas.height - 50) {
    gameOver = true;
    if (player.score > highScore) {
      highScore = player.score;
    }
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  ctx.save();
  ctx.translate(-camera.x, 0);
  platforms.forEach((platform) => platform.draw());
  drawFloor();
  ctx.restore();
  coins.forEach((coin) => coin.draw());

  drawCharacter();
  drawScoreBox();
  drawHighScoreBox();
  drawGameOverAndReset();
}

function drawCharacter() {
  const characterHeight = player.height;
  const characterWidth = (characterImage1.width / characterImage1.height) * characterHeight;

  if (!gameOver) {
    ctx.save();
    ctx.translate(-camera.x, 0);

    if (player.velocityX < 0) {
      ctx.scale(-1, 1);
      ctx.drawImage(
        player.currentImage,
        -player.x - characterWidth + characterWidth,
        player.y,
        -characterWidth,
        characterHeight
      );
    } else {
      ctx.drawImage(
        player.currentImage,
        player.x,
        player.y,
        characterWidth,
        characterHeight
      );
    }

    ctx.restore();
  }

  if (gameOver && player.explosionCounter < 50) {
    const explosionWidth = characterWidth * 2;
    const explosionHeight = characterHeight * 2;

    ctx.save();
    ctx.translate(-camera.x, 0);
    ctx.drawImage(
      explosionImage,
      player.x - (explosionWidth - characterWidth) / 2,
      player.y - (explosionHeight - characterHeight) / 2,
      explosionWidth,
      explosionHeight
    );
    ctx.restore();

    player.explosionCounter++;
  }
}

function drawFloor() {
  const tileWidth = floorImage.width;
  const tileHeight = floorImage.height;
  const numTiles = Math.ceil(canvas.width / tileWidth) + 1;

  const startX = Math.floor(camera.x / tileWidth) * tileWidth;

  for (let i = 0; i < numTiles; i++) {
    ctx.drawImage(
      floorImage,
      startX + i * tileWidth,
      canvas.height - 50,
      tileWidth,
      tileHeight
    );
  }
}

function drawScoreBox() {
  drawRoundedRect(5, 5, 150, 35, 5, 'white', 'black', 3);
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  ctx.fillText(`Score: ${player.score}`, 10, 30);
}

function drawHighScoreBox() {
  drawRoundedRect(canvas.width - 185, 5, 180, 35, 5, 'white', 'black', 3);
  ctx.fillStyle = 'black';
  ctx.font = '20px Arial';
  ctx.fillText(`High Score: ${highScore}`, canvas.width - 180, 30);
}

function drawGameOverAndReset() {
  if (gameOver) {
    ctx.fillStyle = 'red';
    ctx.font = '40px Arial';
    ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);

    ctx.fillStyle = 'blue';
    ctx.fillRect(canvas.width / 2 - 60, canvas.height / 2 + 20, 120, 40);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('Reset', canvas.width / 2 - 25, canvas.height / 2 + 45);
  }
}

function drawBackground() {
  const scale = canvas.height / backgroundImage.height;
  const scaledWidth = backgroundImage.width * scale;
  const numImages = Math.ceil(canvas.width / scaledWidth) + 1;

  let offsetX = (camera.x * 0.5) % scaledWidth;
  for (let i = 0; i < numImages; i++) {
    ctx.drawImage(backgroundImage, i * scaledWidth - offsetX, 0, scaledWidth, canvas.height);
  }
}

function drawRoundedRect(x, y, width, height, radius, fillColor, borderColor, borderWidth) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  if (borderColor && borderWidth) {
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
  }
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// Initialize game when Start Game button is clicked
startGameButton.addEventListener('click', () => {
    mainMenu.style.display = 'none';
    canvas.style.display = 'block';
    startGame();
});

// Show instructions when Instructions button is clicked
instructionsButton.addEventListener('click', () => {
    alert('Instructions:\n- Tap to jump.\n- Try not to fall into the lava.\n- Collect as many coins as possible.');
});

// Exit button logic specifically for mobile using Cordova/Capacitor
exitButton.addEventListener('click', () => {
    if (confirm("Are you sure you want to exit?")) {
        // Check if running in Cordova
        if (window.cordova && navigator.app) {
            navigator.app.exitApp(); // Exit Cordova app
        }
        // Check if running in Capacitor
        else if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App) {
            Capacitor.Plugins.App.exitApp(); // Exit Capacitor app
        }
        // Fallback alert if neither is detected
        else {
            alert("Exit functionality is not supported on this platform. Please close the app manually.");
        }
    }
});

// Touch ondersteuning voor reset-knop
canvas.addEventListener('click', (event) => {
  if (gameOver) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const buttonX = canvas.width / 2 - 60;
    const buttonY = canvas.height / 2 + 20;
    const buttonWidth = 120;
    const buttonHeight = 40;

    if (
      x >= buttonX &&
      x <= buttonX + buttonWidth &&
      y >= buttonY &&
      y <= buttonY + buttonHeight
    ) {
      resetGame();
    }
  }
});

generatePlatforms();
loadAssets(function() {
  gameLoop();
});
