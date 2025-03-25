document.addEventListener('DOMContentLoaded', function() {
    // Animation for container entrance
    setTimeout(() => {
        document.querySelector('.container').classList.add('visible');
    }, 100);
    
    // Button event listeners with animation effects
    const teacherBtn = document.getElementById("teacherLogin");
    const studentBtn = document.getElementById("studentLogin");
    
    teacherBtn.addEventListener("click", function(e) {
        e.preventDefault();
        
        // Add click effect
        addClickEffect(this);
        
        // Redirect after animation
        setTimeout(function() {
            window.location.href = "04 Profile/login.html";
        }, 600);
    });
    
    studentBtn.addEventListener("click", function(e) {
        e.preventDefault();
        
        // Add click effect
        addClickEffect(this);
        
        // Redirect after animation
        setTimeout(function() {
            window.location.href = "https://portal-main1.netlify.app/";
        }, 600);
    });
    
    // Add hover effects to cards
    const cards = document.querySelectorAll('.login-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            const icon = this.querySelector('.icon-container');
            icon.style.transform = 'scale(1.1) rotate(5deg)';
        });
        
        card.addEventListener('mouseleave', function() {
            const icon = this.querySelector('.icon-container');
            icon.style.transform = 'scale(1) rotate(0deg)';
        });
    });
    
    // Function to add click animation
    function addClickEffect(button) {
        // Create ripple effect
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        button.appendChild(ripple);
        
        const x = 0;
        const y = 0;
        
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        // Add animation classes to container for page transition
        document.querySelector('.container').classList.add('fade-out');
        
        // Remove ripple after animation completes
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }
    
    // Add CSS for ripple effect
    const style = document.createElement('style');
    style.textContent = `
        .ripple {
            position: absolute;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            width: 100%;
            height: 100%;
            left: 0;
            top: 0;
            opacity: 0;
            transform: scale(0);
            animation: ripple 0.6s ease-out;
        }
        
        @keyframes ripple {
            0% {
                transform: scale(0);
                opacity: 0.5;
            }
            100% {
                transform: scale(2);
                opacity: 0;
            }
        }
        
        .container.visible {
            opacity: 1;
            transform: translateY(0);
        }
        
        .container.fade-out {
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.5s ease;
        }
    `;
    document.head.appendChild(style);
    
    // Add animated floating shapes in the background
    animateShapes();
    
    function animateShapes() {
        const shapes = document.querySelectorAll('.shape');
        shapes.forEach(shape => {
            // Random initial position within constraints
            const randomX = Math.random() * 5 - 2.5; // -2.5% to 2.5%
            const randomY = Math.random() * 5 - 2.5; // -2.5% to 2.5%
            
            // Apply random transform
            shape.style.transform = `translate(${randomX}%, ${randomY}%)`;
        });
    }
});