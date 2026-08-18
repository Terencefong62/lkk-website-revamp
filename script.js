const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".menu-button");

window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 50);
});

menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!open));
  document.body.classList.toggle("menu-open", !open);
});
