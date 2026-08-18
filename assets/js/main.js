(function () {
  const header = document.getElementById("site-header");
  const menuWrapper = document.getElementById("menu-wrapper");
  const menuToggle = document.getElementById("menu-toggle");
  const menuClose = document.getElementById("menu-close");
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const mobileSearchToggle = document.getElementById("mobile-search-toggle");
  const searchOpen = document.getElementById("search-open");
  const searchClose = document.getElementById("search-close");
  const searchWrapper = document.getElementById("search-wrapper");
  const heroVideo = document.getElementById("hero-video");
  const videoToggle = document.getElementById("video-toggle");
  const statsSlides = Array.from(document.querySelectorAll(".G29-basic-slider-slide"));
  const statsPrev = document.getElementById("stats-prev");
  const statsNext = document.getElementById("stats-next");
  let statsIndex = 0;

  function setMenuOpen(isOpen) {
    document.body.classList.toggle("menu-open", isOpen);
    menuWrapper.classList.toggle("is-open", isOpen);
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    }
    if (mobileMenuToggle) {
      mobileMenuToggle.setAttribute("aria-expanded", String(isOpen));
      mobileMenuToggle.classList.toggle("is-active", isOpen);
    }
  }

  function setSearchOpen(isOpen) {
    searchWrapper.classList.toggle("is-open", isOpen);
    if (searchOpen) {
      searchOpen.setAttribute("aria-expanded", String(isOpen));
    }
    if (mobileSearchToggle) {
      mobileSearchToggle.setAttribute("aria-expanded", String(isOpen));
      mobileSearchToggle.classList.toggle("is-active", isOpen);
    }
  }

  function updateHeaderOnScroll() {
    const scrolled = window.scrollY > 40;
    header.classList.toggle("is-scrolled", scrolled);
    document.body.classList.toggle("is-scrolled", scrolled);
  }

  function showStatsSlide(index) {
    if (!statsSlides.length) {
      return;
    }

    statsIndex = (index + statsSlides.length) % statsSlides.length;
    statsSlides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === statsIndex);
    });
  }

  menuToggle?.addEventListener("click", () => setMenuOpen(true));
  menuClose?.addEventListener("click", () => setMenuOpen(false));
  mobileMenuToggle?.addEventListener("click", () => {
    const isOpen = !menuWrapper.classList.contains("is-open");
    setMenuOpen(isOpen);
  });

  searchOpen?.addEventListener("click", () => setSearchOpen(true));
  searchClose?.addEventListener("click", () => setSearchOpen(false));
  mobileSearchToggle?.addEventListener("click", () => {
    const isOpen = !searchWrapper.classList.contains("is-open");
    setSearchOpen(isOpen);
  });

  document.querySelectorAll(".submenu-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const submenu = document.getElementById(button.getAttribute("aria-controls"));
      const isOpen = button.getAttribute("aria-expanded") === "true";

      document.querySelectorAll(".submenu-btn").forEach((other) => {
        if (other !== button) {
          other.setAttribute("aria-expanded", "false");
        }
      });
      document.querySelectorAll(".G01-header-submenu").forEach((panel) => {
        if (panel !== submenu) {
          panel.classList.remove("is-open");
        }
      });

      button.setAttribute("aria-expanded", String(!isOpen));
      submenu?.classList.toggle("is-open", !isOpen);
    });
  });

  document.querySelectorAll(".btn-back").forEach((button) => {
    button.addEventListener("click", () => {
      const submenu = button.closest(".G01-header-submenu");
      const trigger = document.querySelector(`[aria-controls="${submenu?.id}"]`);
      submenu?.classList.remove("is-open");
      trigger?.setAttribute("aria-expanded", "false");
    });
  });

  document.querySelectorAll(".submenu-close").forEach((button) => {
    button.addEventListener("click", () => setMenuOpen(false));
  });

  videoToggle?.addEventListener("click", () => {
    if (!heroVideo) {
      return;
    }

    if (heroVideo.paused) {
      heroVideo.play();
      videoToggle.classList.add("is-playing");
      videoToggle.setAttribute("aria-label", "暂停视频");
    } else {
      heroVideo.pause();
      videoToggle.classList.remove("is-playing");
      videoToggle.setAttribute("aria-label", "播放视频");
    }
  });

  if (heroVideo && !heroVideo.paused) {
    videoToggle?.classList.add("is-playing");
  }

  statsPrev?.addEventListener("click", () => showStatsSlide(statsIndex - 1));
  statsNext?.addEventListener("click", () => showStatsSlide(statsIndex + 1));

  window.addEventListener("scroll", updateHeaderOnScroll, { passive: true });
  updateHeaderOnScroll();
  showStatsSlide(0);
})();
