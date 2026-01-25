// Create a master timeline to control all animations
const master = gsap.timeline();

// Box 1 - Bounce Animation
const bounce = gsap.to("#box1", {
  y: -30,
  duration: 0.6,
  ease: "power2.out",
  yoyo: true,
  repeat: -1
});

// Box 2 - Spin Animation
const spin = gsap.to("#box2", {
  rotation: 360,
  duration: 2,
  ease: "none",
  repeat: -1
});

// Box 3 - Pulse Animation
const pulse = gsap.to("#box3", {
  scale: 1.2,
  duration: 0.8,
  ease: "power1.inOut",
  yoyo: true,
  repeat: -1
});

// Box 4 - Slide Animation
const slide = gsap.to("#box4", {
  x: 50,
  duration: 1,
  ease: "power2.inOut",
  yoyo: true,
  repeat: -1
});

// Box 5 - Flip Animation
const flip = gsap.to("#box5", {
  rotationY: 180,
  duration: 1.5,
  ease: "power2.inOut",
  yoyo: true,
  repeat: -1
});

// Box 6 - Wobble Animation
const wobble = gsap.to("#box6", {
  rotation: 15,
  duration: 0.15,
  ease: "power1.inOut",
  yoyo: true,
  repeat: -1,
  yoyoEase: true
});

// Store all animations in an array
const animations = [bounce, spin, pulse, slide, flip, wobble];

// Speed control
const speedSlider = document.getElementById("speed");
const speedValue = document.getElementById("speedValue");

speedSlider.addEventListener("input", (e) => {
  const speed = parseFloat(e.target.value);
  speedValue.textContent = speed + "x";

  // Update timeScale for all animations
  animations.forEach(anim => {
    anim.timeScale(speed);
  });
});

// Bouncer button - click to bounce
const bouncer = document.getElementById("bouncer");

bouncer.addEventListener("click", () => {
  gsap.to("#bouncer", {
    y: -50,
    duration: 0.5,
    ease: "bounce.out",
    yoyo: true,
    repeat: 1
  });
});

// Cascade cards animation - repeats forever
gsap.fromTo(".card",
  { x: -200, opacity: 0 },
  {
    x: 0,
    opacity: 1,
    duration: 0.8,
    stagger: 0.15,
    ease: "power2.out",
    repeat: -1,
    repeatDelay: 1
  }
);

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// Gallery items - fade and slide up on scroll
gsap.from(".gallery-item", {
  y: 80,
  opacity: 0,
  duration: 0.8,
  stagger: 0.2,
  ease: "power2.out",
  scrollTrigger: {
    trigger: ".gallery",
    start: "top 85%"
  }
});
