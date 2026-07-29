function toggleMenu() {
  const menu = document.querySelector(".menu-links");
  const icon = document.querySelector(".hamburger-icon");
  menu.classList.toggle("open");
  icon.classList.toggle("open");
}

let lightboxTrigger = null;

function openLightbox(src, alt) {
  const lightbox = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  lightboxTrigger = document.activeElement;
  img.src = src;
  img.alt = alt;
  lightbox.classList.add("open");
  document.body.style.overflow = "hidden";
  lightbox.querySelector(".lightbox-close").focus({ preventScroll: true });
}

function closeLightbox() {
  const lightbox = document.getElementById("lightbox");
  lightbox.classList.remove("open");
  document.body.style.overflow = "";
  if (lightboxTrigger) lightboxTrigger.focus();
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.getElementById("lightbox").classList.contains("open")) {
    closeLightbox();
  }
});

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

if (prefersReducedMotion) {
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );

  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
}
