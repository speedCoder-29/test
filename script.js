// Box 1 - Bounce Animation
gsap.to("#box1", {
  y: -30,
  duration: 0.6,
  ease: "power2.out",
  yoyo: true,
  repeat: -1
});

// Box 2 - Spin Animation
gsap.to("#box2", {
  rotation: 360,
  duration: 2,
  ease: "none",
  repeat: -1
});

// Box 3 - Pulse Animation
gsap.to("#box3", {
  scale: 1.2,
  duration: 0.8,
  ease: "power1.inOut",
  yoyo: true,
  repeat: -1
});

// Box 4 - Slide Animation
gsap.to("#box4", {
  x: 50,
  duration: 1,
  ease: "power2.inOut",
  yoyo: true,
  repeat: -1
});

// Box 5 - Flip Animation
gsap.to("#box5", {
  rotationY: 180,
  duration: 1.5,
  ease: "power2.inOut",
  yoyo: true,
  repeat: -1
});

// Box 6 - Wobble Animation
gsap.to("#box6", {
  rotation: 15,
  duration: 0.15,
  ease: "power1.inOut",
  yoyo: true,
  repeat: -1,
  yoyoEase: true
});
