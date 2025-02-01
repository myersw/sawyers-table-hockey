// Initialize variables
let canvas = document.getElementById("gameCanvas");
canvas.width = window.innerWidth * 0.8;  // Dynamic width, 80% of window width
canvas.height = window.innerHeight * 0.6; // Dynamic height, 60% of window height
let ctx = canvas.getContext("2d");
let strikerImage = new Image();

// Load sounds
const goalHorn = new Audio('sounds/goal-horn.mp3');
const boardBounce = new Audio('sounds/board-bounce.mp3');
const strikerHit = new Audio('sounds/striker-hit.mp3');
const redPuckHit = new Audio('sounds/red-puck-hit.mp3');
const goalPostHit = new Audio('sounds/goal-post-hit.mp3');

let puckX = canvas.width / 2,
    puckY = canvas.height / 2,
    puckDx = 4,
    puckDy = 4,
    puckRadius = 15,
    strikerRadius = 100,
    strikerX = canvas.width / 2,
    strikerY = canvas.height - 80,
    goalCount = 0,
    timer = 0,
    timeStarted = Date.now(),
    gameStarted = false,
    redPuckX = (canvas.width - 150) / 2,
    redPuckY = 90,
    redPuckDx = 3,
    redPuckRadius = 20;

const MAX_SPEED = 6;

const goalLineY = 40 + 50;

// Initialize localStorage for storing top 10 times
let topTimes = JSON.parse(localStorage.getItem('topTimes')) || [];

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
        strikerY = canvas.height - 80;
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
    if (puckX - puckRadius < 50) {  
        puckX = 50 + puckRadius;
        puckDx = -puckDx;
        boardBounce.play(); 
    }
    if (puckX + puckRadius > canvas.width - 50) {  
        puckX = canvas.width - 50 - puckRadius;
        puckDx = -puckDx;
        boardBounce.play(); 
    }
    if (puckY - puckRadius < 50) {  
        puckY = 50 + puckRadius;
        puckDy = -puckDy;
        boardBounce.play(); 
    }
    if (puckY + puckRadius > canvas.height - 50) {  
        puckY = canvas.height - 50 - puckRadius;
        puckDy = -puckDy;
        boardBounce.play(); 
    }

    // Move the red puck horizontally back and forth within the goal area width
    redPuckX += redPuckDx;
    let goalWidth = 150;
    if (redPuckX <= (canvas.width - goalWidth) / 2 || redPuckX >= (canvas.width + goalWidth) / 2) {
        redPuckDx = -redPuckDx; 
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

    if (distance < puckRadius + strikerRadius) {
        let angle = Math.atan2(dy, dx);
        let speed = Math.sqrt(puckDx * puckDx + puckDy * puckDy);

        let normalX = Math.cos(angle); 
        let normalY = Math.sin(angle);

        let dotProduct = puckDx * normalX + puckDy * normalY;

        puckDx = puckDx - 2 * dotProduct * normalX;
        puckDy = puckDy - 2 * dotProduct * normalY;

        let speedBoost = 1.2;
        puckDx *= speedBoost;
        puckDy *= speedBoost;

        let overlap = (puckRadius + strikerRadius) - distance;
        puckX += Math.cos(angle) * overlap;
        puckY += Math.sin(angle) * overlap;

        strikerHit.play(); 
    }

    let redPuckDx = puckX - redPuckX;
    let redPuckDy = puckY - redPuckY;
    let redPuckDistance = Math.sqrt(redPuckDx * redPuckDx + redPuckDy * redPuckDy);

    if (redPuckDistance < puckRadius + redPuckRadius) {
        let redPuckAngle = Math.atan2(redPuckDy, redPuckDx);
        let redPuckNormalX = Math.cos(redPuckAngle);
        let redPuckNormalY = Math.sin(redPuckAngle);

        let redPuckDotProduct = puckDx * redPuckNormalX + puckDy * redPuckNormalY;

        puckDx = puckDx - 2 * redPuckDotProduct * redPuckNormalX;
        puckDy = puckDy - 2 * redPuckDotProduct * redPuckNormalY;

        let speedReducer = 0.9;
        puckDx *= speedReducer;
        puckDy *= speedReducer;
        
        let overlap = (puckRadius + redPuckRadius) - redPuckDistance;
        puckX += Math.cos(redPuckAngle) * overlap;
        puckY += Math.sin(redPuckAngle) * overlap;

        redPuckHit.play();
    }
}

// Check if a goal is scored
function checkScore() {
    let goalWidth = 150;
    let goalHeight = 50;
    let goalX = (canvas.width - goalWidth) / 2;
    let goalY = 40;

    if (puckY - puckRadius < goalY + goalHeight && puckY + puckRadius > goalY &&
        puckX - puckRadius >= goalX && puckX + puckRadius <= goalX + goalWidth) {
        goalCount++;
        document.getElementById('goal-count').textContent = `Goals: ${goalCount}`;
        goalHorn.play(); 
        resetPuck();
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
}

// Show the end game modal
function showEndGameModal() {
    document.getElementById('gameOverModal').style.display = 'block';
    document.getElementById('final-score').textContent = `Goals: ${goalCount} | Time: ${timer}s`;

    const topTimesList = document.getElementById('top-times-list');
    topTimesList.innerHTML = '';

    topTimes.forEach((entry, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${index + 1}. ${entry.player}: ${entry.time}s`;
        topTimesList.appendChild(listItem);
    });
}

// Draw the arena
function drawArena() {
    ctx.fillStyle = 'white';
    ctx.fillRect(50, 50, canvas.width - 100, canvas.height - 100); 

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

// Draw the goal at the top center
function drawGoal() {
    let goalWidth = 150;
    let goalHeight = 50;
    let goalX = (canvas.width - goalWidth) / 2;
    let goalY = 40; 

    ctx.beginPath();
    ctx.moveTo(goalX, goalY);
    ctx.lineTo(goalX, goalY + goalHeight); 
    ctx.moveTo(goalX + goalWidth, goalY);
    ctx.lineTo(goalX + goalWidth, goalY + goalHeight); 
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(goalX, goalY);
    ctx.lineTo(goalX + goalWidth, goalY);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 8;
    ctx.stroke();

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

// Handle touchmove event for mobile
canvas.addEventListener('touchmove', function(event) {
    event.preventDefault();  
    if (gameStarted) {
        let touch = event.touches[0];
        strikerX = Math.max(strikerRadius / 2, Math.min(touch.pageX - canvas.offsetLeft, canvas.width - strikerRadius / 2));
        strikerY = Math.max(strikerRadius / 2, Math.min(touch.pageY - canvas.offsetTop - 40, canvas.height - strikerRadius / 2)); // Stagger striker above touch
    }
}, { passive: false });

// Handle mousemove event for desktop
canvas.addEventListener('mousemove', function(event) {
    if (gameStarted) {
        strikerX = Math.max(strikerRadius / 2, Math.min(event.offsetX, canvas.width - strikerRadius / 2));
        strikerY = Math.max(strikerRadius / 2, Math.min(event.offsetY, canvas.height - strikerRadius / 2));
    }
});

// Close the modal when clicking the close button
document.getElementById('closeModal').addEventListener('click', function() {
    document.getElementById('gameOverModal').style.display = 'none';
    document.getElementById('pregame-menu').style.display = 'block';
    document.getElementById('game-container').style.display = 'none';
});

