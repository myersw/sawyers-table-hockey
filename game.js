// Initialize variables
let canvas = document.getElementById("gameCanvas");
canvas.width = 800;  // Explicit canvas width
canvas.height = 600; // Explicit canvas height
let ctx = canvas.getContext("2d");
let strikerImage = new Image();

// Load sounds
const goalHorn = new Audio('sounds/goal-horn.mp3');  // Goal horn sound
const boardBounce = new Audio('sounds/board-bounce.mp3');  // Board bounce sound
const strikerHit = new Audio('sounds/striker-hit.mp3');  // Striker hit sound
const redPuckHit = new Audio('sounds/red-puck-hit.mp3');  // Red puck hit sound
const goalPostHit = new Audio('sounds/goal-post-hit.mp3');  // Goal post hit sound

let puckX = canvas.width / 2,
    puckY = canvas.height / 2,
    puckDx = 4, // Initial speed for the puck
    puckDy = 4, // Initial speed for the puck
    puckRadius = 12, // Slightly smaller orange puck
    strikerRadius = 100, // Adjust this as needed
    strikerX = canvas.width / 2,
    strikerY = canvas.height - 80,
    goalCount = 0,
    timer = 0,
    timeStarted = Date.now(),
    gameStarted = false,
    redPuckX = (canvas.width - 150) / 2,  // Positioned just below the goal, centered
    redPuckY = 90, // Positioned below the goal at the top of the canvas
    redPuckDx = 5, // Increased speed for the red puck
    redPuckRadius = 20; // Increased radius for the red puck

const MAX_SPEED = 6;  // Maximum allowed speed for the orange puck

// Define the goal line at the bottom of the goal area
const goalLineY = 40 + 50; // Goal Y position + height of the goal area

// Check if the device is mobile (screen width < 768px)
const isMobile = window.innerWidth < 768;
let strikerTouchOffset = 30;  // Stagger the striker above where you touch on mobile

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

    // Move the red puck horizontally back and forth within the goal area width
    redPuckX += redPuckDx;
    let goalWidth = 150;  // Width of the goal (reduced)
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
    ctx.fillStyle = 'red'; // The blocker puck will be red
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
    // Define the goal area boundaries
    let goalWidth = 150;  // Reduced goal width
    let goalHeight = 50; // Height of the goal area
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

    // Check if the game has ended after 10 goals
    if (goalCount >= 10) {
        endGame();
    }
}

// Reset puck after scoring
function resetPuck() {
    puckX = Math.random() * (canvas.width - 100) + 50;
    puckY = Math.random() * (canvas.height - 100) + 50;
    puckDx = Math.random() > 0.5 ? 4 : -4; // Initial puck speed
    puckDy = Math.random() > 0.5 ? 4 : -4; // Initial puck speed
}

// End game and show modal
function endGame() {
    gameStarted = false;
    // Show the modal with the final score
    document.getElementById('gameOverModal').style.display = 'block';
    document.getElementById('final-score').textContent = `Goals: ${goalCount} | Time: ${timer}s`;
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



// Add event listener for mouse movement to control striker position
canvas.addEventListener('mousemove', function(event) {
    if (gameStarted) {
        strikerX = Math.max(strikerRadius / 2, Math.min(event.offsetX, canvas.width - strikerRadius / 2));
        strikerY = Math.max(strikerRadius / 2, Math.min(event.offsetY, canvas.height - strikerRadius / 2));
    }
});

// Add event listener for touch movement (mobile support)
canvas.addEventListener('touchmove', function(event) {
    event.preventDefault();  // Prevent default touch behavior
    if (gameStarted) {
        let touch = event.touches[0];
        strikerX = Math.max(strikerRadius / 2, Math.min(touch.pageX - canvas.offsetLeft, canvas.width - strikerRadius / 2));
        strikerY = Math.max(strikerRadius / 2, Math.min(touch.pageY - canvas.offsetTop, canvas.height - strikerRadius / 2));
    }
}, { passive: false });

// Close the modal when clicking the close button
document.getElementById('closeModal').addEventListener('click', function() {
    document.getElementById('gameOverModal').style.display = 'none';
    // Reset game to initial state
    document.getElementById('pregame-menu').style.display = 'block';
    document.getElementById('game-container').style.display = 'none';
});

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
