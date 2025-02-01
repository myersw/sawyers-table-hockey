// Initialize variables
let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");
let strikerImage = new Image();

// Load sounds
const goalHorn = new Audio('sounds/goal-horn.mp3');
const boardBounce = new Audio('sounds/board-bounce.mp3');
const strikerHit = new Audio('sounds/striker-hit.mp3');
const redPuckHit = new Audio('sounds/red-puck-hit.mp3');
const goalPostHit = new Audio('sounds/goal-post-hit.mp3');

let puckX, puckY, puckDx, puckDy, puckRadius, strikerRadius = 100,
    strikerX, strikerY, goalCount = 0, timer = 0, timeStarted = Date.now(),
    gameStarted = false, redPuckX, redPuckY, redPuckDx = 5, redPuckRadius = 20;

const MAX_SPEED = 6;  // Maximum allowed speed for the orange puck

// Check if the device is mobile (screen width < 768px)
const isMobile = window.innerWidth < 768;
let strikerTouchOffset = 30;  // Stagger the striker above where you touch on mobile

// Adjust the sizes for mobile screens
let goalWidth = isMobile ? 100 : 130;  // Smaller goal on mobile
let goalHeight = isMobile ? 40 : 50;  // Smaller goal on mobile

if (isMobile) {
    strikerRadius = 80;  // Slightly smaller striker radius on mobile
    puckRadius = 10;  // Slightly smaller orange puck radius on mobile
} else {
    strikerRadius = 100;  // Regular striker radius on desktop
    puckRadius = 12;  // Regular orange puck radius on desktop
}

// Start the game
document.getElementById('start-button').addEventListener('click', startGame);

// Start the game function
function startGame() {
    console.log('Game Starting...');
    playerName = document.getElementById('player-name').value || 'Player';

    // Ensure the image loads before starting the game
    strikerImage.onload = function() {
        document.getElementById('pregame-menu').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        strikerX = canvas.width / 2;
        strikerY = canvas.height - 80; // Adjust striker's initial position
        gameStarted = true;
        goalCount = 0; // Reset goal count
        timer = 0; // Reset timer
        timeStarted = Date.now(); // Reset start time

        // Initialize the pucks (orange and red)
        initializePucks();

        gameLoop();
        startTimer();
    };

    // Set the image source after setting the onload event
    strikerImage.src = 'images/' + document.getElementById('striker-image').value;
}

// Timer function
function startTimer() {
    let timerInterval = setInterval(function() {
        if (goalCount >= 10) {
            clearInterval(timerInterval); // Stop the timer when 10 goals are scored
            topTimes.push({ player: playerName, time: timer });
            topTimes.sort((a, b) => a.time - b.time); // Sort by fastest time
            topTimes = topTimes.slice(0, 10); // Keep top 10
            localStorage.setItem('topTimes', JSON.stringify(topTimes));
            showEndGameModal();
        } else {
            timer = Math.floor((Date.now() - timeStarted) / 1000);
            document.getElementById('time').textContent = `Time: ${timer}s`;
        }
    }, 1000);
}

// Initialize pucks' positions and velocities
function initializePucks() {
    // Set initial positions for the pucks
    puckX = Math.random() * (canvas.width - 100) + 50;  // Random X position for the orange puck
    puckY = Math.random() * (canvas.height - 100) + 50;  // Random Y position for the orange puck
    puckDx = Math.random() > 0.5 ? 4 : -4;  // Initial X velocity for the orange puck
    puckDy = Math.random() > 0.5 ? 4 : -4;  // Initial Y velocity for the orange puck

    // Set initial positions and velocity for the red puck (moving obstacle)
    redPuckX = canvas.width / 2;  // Start at the center of the goal area
    redPuckY = 90;  // Position the red puck slightly in front of the goal
    redPuckDx = 5;  // Speed of the red puck
}

// Game loop for continuous rendering
function gameLoop() {
    if (!gameStarted) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the arena with lines, center circle, and goal
    drawArena();

    // Draw the red puck (obstacle)
    drawRedPuck(redPuckX, redPuckY);

    // Draw the puck
    drawPuck(puckX, puckY);

    // Draw the striker
    drawStriker(strikerX, strikerY);

    // Move the puck
    puckX += puckDx;
    puckY += puckDy;

    // Keep the puck within the boundaries of the canvas
    if (puckX - puckRadius < 50) {  // Left boundary
        puckX = 50 + puckRadius;
        puckDx = -puckDx; // Reverse direction
        boardBounce.play(); // Play bounce sound
    }
    if (puckX + puckRadius > canvas.width - 50) {  // Right boundary
        puckX = canvas.width - 50 - puckRadius;
        puckDx = -puckDx; // Reverse direction
        boardBounce.play(); // Play bounce sound
    }
    if (puckY - puckRadius < 50) {  // Top boundary
        puckY = 50 + puckRadius;
        puckDy = -puckDy; // Reverse direction
        boardBounce.play(); // Play bounce sound
    }
    if (puckY + puckRadius > canvas.height - 50) {  // Bottom boundary
        puckY = canvas.height - 50 - puckRadius;
        puckDy = -puckDy; // Reverse direction
        boardBounce.play(); // Play bounce sound
    }

    // Move the red puck horizontally back and forth in front of the goal
    redPuckX += redPuckDx;
    if (redPuckX <= (canvas.width - goalWidth) / 2 || redPuckX >= (canvas.width + goalWidth) / 2) {
        redPuckDx = -redPuckDx; // Reverse direction when it reaches the goal posts
    }

    // Check for collisions and scoring
    checkCollision();
    checkScore();

    // Apply slight friction to puck movement (gradual deceleration)
    puckDx *= 0.99;
    puckDy *= 0.99;

    // Restrict the puck's speed to the maximum allowed
    let speed = Math.sqrt(puckDx * puckDx + puckDy * puckDy);
    if (speed > MAX_SPEED) {
        let scale = MAX_SPEED / speed;
        puckDx *= scale;
        puckDy *= scale;
    }

    requestAnimationFrame(gameLoop);
}

// Draw the striker
function drawStriker(x, y) {
    ctx.drawImage(strikerImage, x - strikerRadius / 2, y - strikerRadius / 2, strikerRadius, strikerRadius);
}

// Draw the red puck (obstacle)
function drawRedPuck(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, redPuckRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
}

// Collision detection for the puck and striker
function checkCollision() {
    let dx = puckX - strikerX;
    let dy = puckY - strikerY;
    let distance = Math.sqrt(dx * dx + dy * dy);

    // If distance is less than the sum of the puck and striker's radii, a collision has occurred
    if (distance < puckRadius + strikerRadius) {
        let angle = Math.atan2(dy, dx);
        let speed = Math.sqrt(puckDx * puckDx + puckDy * puckDy);

        let normalX = Math.cos(angle); 
        let normalY = Math.sin(angle);

        let dotProduct = puckDx * normalX + puckDy * normalY;

        puckDx = puckDx - 2 * dotProduct * normalX;
        puckDy = puckDy - 2 * dotProduct * normalY;

        // Add some additional velocity after collision to make the puck move faster
        let speedBoost = 1.2;
        puckDx *= speedBoost;
        puckDy *= speedBoost;

        // Move the puck away from the striker to avoid it getting stuck
        let overlap = (puckRadius + strikerRadius) - distance;
        puckX += Math.cos(angle) * overlap;
        puckY += Math.sin(angle) * overlap;

        strikerHit.play();  // Play striker hit sound
    }

    // Check for collision with red puck (moving obstacle)
    let redPuckDx = puckX - redPuckX;
    let redPuckDy = puckY - redPuckY;
    let redPuckDistance = Math.sqrt(redPuckDx * redPuckDx + redPuckDy * redPuckDy);

    if (redPuckDistance < puckRadius + redPuckRadius) {
        // Bounce the puck off the red puck
        let redPuckAngle = Math.atan2(redPuckDy, redPuckDx);
        let redPuckNormalX = Math.cos(redPuckAngle);
        let redPuckNormalY = Math.sin(redPuckAngle);

        let redPuckDotProduct = puckDx * redPuckNormalX + puckDy * redPuckNormalY;

        puckDx = puckDx - 2 * redPuckDotProduct * redPuckNormalX;
        puckDy = puckDy - 2 * redPuckDotProduct * redPuckNormalY;

        // Reduce the speed a bit to avoid the puck flying off
        let speedReducer = 0.9;
        puckDx *= speedReducer;
        puckDy *= speedReducer;
        
        // Move the puck away from the red puck
        let overlap = (puckRadius + redPuckRadius) - redPuckDistance;
        puckX += Math.cos(redPuckAngle) * overlap;
        puckY += Math.sin(redPuckAngle) * overlap;

        redPuckHit.play();  // Play red puck hit sound
    }
}

// Check if a goal is scored
function checkScore() {
    let goalX = (canvas.width - goalWidth) / 2;
    let goalY = 40;  // Goal at the top center

    // Check if puck is fully within the goal area
    if (puckY - puckRadius < goalY + goalHeight && puckY + puckRadius > goalY &&
        puckX - puckRadius >= goalX && puckX + puckRadius <= goalX + goalWidth) {
        // Goal scored
        goalCount++;
        document.getElementById('goal-count').textContent = `Goals: ${goalCount}`;
        goalHorn.play();  // Play goal horn sound
        resetPuck();  // Reset puck position after scoring
    }

    if (goalCount >= 10) {
        endGame();
    }
}

// Reset puck after scoring
function resetPuck() {
    puckX = Math.random() * (canvas.width - 100) + 50;
    puckY = Math.random() * (canvas.height - 100) + 50;
    puckDx = Math.random() > 0.5 ? 4 : -4;
    puckDy = Math.random() > 0.5 ? 4 : -4;
}

// End game and show modal
function endGame() {
    gameStarted = false;
    document.getElementById('gameOverModal').style.display = 'block';
    document.getElementById('final-score').textContent = `Goals: ${goalCount} | Time: ${timer}s`;

    // Load top times from localStorage
    let topTimes = JSON.parse(localStorage.getItem('topTimes')) || [];
    const topTimesList = document.getElementById('top-times-list');
    topTimesList.innerHTML = ''; 

    // Display top 10 fastest times
    topTimes.forEach((entry, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${index + 1}. ${entry.player}: ${entry.time}s`;
        topTimesList.appendChild(listItem);
    });
}

// Show the end game modal
function showEndGameModal() {
    document.getElementById('gameOverModal').style.display = 'block';
    document.getElementById('final-score').textContent = `Goals: ${goalCount} | Time: ${timer}s`;
}

// Draw the hockey arena
function drawArena() {
    ctx.fillStyle = 'white';
    ctx.fillRect(50, 50, canvas.width - 100, canvas.height - 100);  // Arena with rounded corners

    ctx.beginPath();
    ctx.arc(50, 50, 50, Math.PI, 1.5 * Math.PI); 
    ctx.arc(canvas.width - 50, 50, 50, 1.5 * Math.PI, 2 * Math.PI);  
    ctx.arc(canvas.width - 50, canvas.height - 50, 50, 0, 0.5 * Math.PI); 
    ctx.arc(50, canvas.height - 50, 50, 0.5 * Math.PI, Math.PI); 
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000000';  
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(50, canvas.height / 2);
    ctx.lineTo(canvas.width - 50, canvas.height / 2);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(50, 150);
    ctx.lineTo(canvas.width - 50, 150);
    ctx.moveTo(50, canvas.height - 150);
    ctx.lineTo(canvas.width - 50, canvas.height - 150);
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 4;
    ctx.stroke();

    drawGoal();
}

// Draw the goal
function drawGoal() {
    let goalX = (canvas.width - goalWidth) / 2;
    let goalY = 40;  // Goal at the top center

    // Goal Posts
    ctx.beginPath();
    ctx.moveTo(goalX, goalY);
    ctx.lineTo(goalX, goalY + goalHeight); 
    ctx.moveTo(goalX + goalWidth, goalY);
    ctx.lineTo(goalX + goalWidth, goalY + goalHeight); 
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Crossbar
    ctx.beginPath();
    ctx.moveTo(goalX, goalY);
    ctx.lineTo(goalX + goalWidth, goalY);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 8;  
    ctx.stroke();

    // Netting effect
    let netSpacing = 10;
    for (let i = 0; i < goalHeight; i += netSpacing) {
        ctx.beginPath();
        ctx.moveTo(goalX, goalY + i);
        ctx.lineTo(goalX + goalWidth, goalY + i);
        ctx.strokeStyle = 'lightgray';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// Draw the puck
function drawPuck(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, puckRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'orange';
    ctx.fill();
}

// Adjust canvas size dynamically based on screen size
function resizeCanvas() {
    if (window.innerWidth < 768) {
        canvas.width = window.innerWidth * 0.9;  // Mobile: 90% of the screen width
        canvas.height = window.innerHeight * 0.7; // Mobile: 70% of the screen height
    } else {
        canvas.width = 800;  // Desktop: fixed width
        canvas.height = 600; // Desktop: fixed height
    }
}

// Initial canvas resize
resizeCanvas();

// Resize canvas on window resize
window.addEventListener('resize', resizeCanvas);

