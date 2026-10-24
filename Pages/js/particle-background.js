(() => {
    const canvas = document.createElement('canvas');
    canvas.id = 'particle-background';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    const context = canvas.getContext('2d');
    if (!context) {
        console.error('Could not initialize the particle background canvas.');
        canvas.remove();
        return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const particles = [];
    let width = 0;
    let height = 0;
    let lastFrame = 0;
    let animationFrame = 0;

    function createParticle() {
        const angle = Math.random() * Math.PI * 2;
        const speed = 8 + Math.random() * 18;
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            radius: 1 + Math.random() * 1.5,
            alpha: 0.35 + Math.random() * 0.55,
            speed,
            angle,
            targetAngle: angle,
            turnIn: 1 + Math.random() * 4
        };
    }

    function resizeCanvas() {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const particleCount = Math.min(72, Math.max(20, Math.round((width * height) / 24000)));
        particles.length = 0;
        for (let index = 0; index < particleCount; index += 1) {
            particles.push(createParticle());
        }
        drawFrame(0, false);
    }

    function drawFrame(deltaSeconds, animate) {
        context.clearRect(0, 0, width, height);

        if (animate) {
            particles.forEach(particle => {
                particle.turnIn -= deltaSeconds;
                if (particle.turnIn <= 0) {
                    particle.targetAngle = Math.random() * Math.PI * 2;
                    particle.turnIn = 1.5 + Math.random() * 4;
                }

                const angleDifference = Math.atan2(
                    Math.sin(particle.targetAngle - particle.angle),
                    Math.cos(particle.targetAngle - particle.angle)
                );
                particle.angle += angleDifference * Math.min(1, deltaSeconds * 0.4);
                particle.x += Math.cos(particle.angle) * particle.speed * deltaSeconds;
                particle.y += Math.sin(particle.angle) * particle.speed * deltaSeconds;

                if (particle.x < 0 || particle.x > width) particle.angle = Math.PI - particle.angle;
                if (particle.y < 0 || particle.y > height) particle.angle = -particle.angle;
                particle.x = Math.max(0, Math.min(width, particle.x));
                particle.y = Math.max(0, Math.min(height, particle.y));
            });
        }

        particles.forEach((particle, index) => {
            for (let otherIndex = index + 1; otherIndex < particles.length; otherIndex += 1) {
                const other = particles[otherIndex];
                const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
                if (distance > 135) continue;

                context.beginPath();
                context.moveTo(particle.x, particle.y);
                context.lineTo(other.x, other.y);
                context.strokeStyle = `rgba(179, 136, 255, ${(1 - distance / 135) * 0.16})`;
                context.lineWidth = 0.7;
                context.stroke();
            }

            context.beginPath();
            context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            context.fillStyle = `rgba(179, 136, 255, ${particle.alpha})`;
            context.shadowColor = 'rgba(124, 77, 255, 0.9)';
            context.shadowBlur = 10;
            context.fill();
            context.shadowBlur = 0;
        });
    }

    function animate(timestamp) {
        if (reducedMotion.matches) {
            drawFrame(0, false);
            animationFrame = 0;
            return;
        }

        const deltaSeconds = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.05) : 0;
        lastFrame = timestamp;
        drawFrame(deltaSeconds, true);
        animationFrame = window.requestAnimationFrame(animate);
    }

    function startAnimation() {
        window.cancelAnimationFrame(animationFrame);
        lastFrame = 0;
        animationFrame = window.requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        startAnimation();
    });
    reducedMotion.addEventListener('change', startAnimation);

    resizeCanvas();
    startAnimation();
})();
