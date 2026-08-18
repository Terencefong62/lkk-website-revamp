(function () {
  const header = document.querySelector(".G01-header");
  const menuToggleButtons = document.querySelectorAll('[ref="headerToggleBtn"], [ref="menuToggleBtn"]');
  const menuCloseButtons = document.querySelectorAll('[ref="menuCloseBtn"], .G01-header-menu-top .btn-close');
  const searchWrapper = document.getElementById("search-wrapper");
  const searchOpenBtn = document.querySelector('[ref="searchOpenBtn"]');
  const searchCloseBtn = document.querySelector('[ref="searchCloseBtn"]');
  const searchToggleBtn = document.querySelector('[ref="searchToggleBtn"]');
  const heroVideo = document.getElementById("video-1");
  const videoToggle = document.querySelector(".G10-carousel-ctas .btn.-play");
  const storySections = Array.from(document.querySelectorAll(".home-story"));

  function setMenuOpen(isOpen) {
    header?.classList.toggle("-active", isOpen);
    menuToggleButtons.forEach((button) => {
      button.setAttribute("aria-expanded", String(isOpen));
    });
  }

  function setSearchOpen(isOpen) {
    header?.classList.toggle("-search-mobile", isOpen);
    if (isOpen) {
      searchWrapper?.removeAttribute("inert");
    } else {
      searchWrapper?.setAttribute("inert", "");
    }
    searchOpenBtn?.setAttribute("aria-expanded", String(isOpen));
    searchToggleBtn?.setAttribute("aria-expanded", String(isOpen));
  }

  function updateHeaderOnScroll() {
    document.body.classList.toggle("is-scrolled", window.scrollY > 40);
  }

  function updateStorySection(section) {
    const storyChunks = Array.from(section.querySelectorAll(".home-story__chunk"));
    const storyMemories = Array.from(section.querySelectorAll(".home-story__memory"));
    const rect = section.getBoundingClientRect();
    const scrollable = section.offsetHeight - window.innerHeight;

    if (scrollable <= 0) {
      return;
    }

    const progress = Math.min(1, Math.max(0, -rect.top / scrollable));
    const memorySteps = storyMemories.map((memory) => Number(memory.dataset.step || 0));
    const storyStepCount = memorySteps.length
      ? Math.max(...memorySteps) + 1
      : storyChunks.length;
    const activeStep = Math.min(storyStepCount - 1, Math.floor(progress * storyStepCount));
    const activeCount = Math.max(1, Math.ceil(progress * storyChunks.length));

    storyMemories.forEach((memory) => {
      memory.classList.toggle("is-active", Number(memory.dataset.step) === activeStep);
    });

    storyChunks.forEach((chunk, index) => {
      chunk.classList.toggle("is-active", index < activeCount);
    });
  }

  function updateStoryHighlights() {
    storySections.forEach(updateStorySection);
  }

  menuToggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setMenuOpen(!header?.classList.contains("-active"));
    });
  });

  menuCloseButtons.forEach((button) => {
    button.addEventListener("click", () => setMenuOpen(false));
  });

  searchOpenBtn?.addEventListener("click", () => setSearchOpen(true));
  searchCloseBtn?.addEventListener("click", () => setSearchOpen(false));
  searchToggleBtn?.addEventListener("click", () => {
    setSearchOpen(!header?.classList.contains("-search-mobile"));
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
        panel.classList.remove("-active");
      });

      button.setAttribute("aria-expanded", String(!isOpen));
      submenu?.classList.toggle("-active", !isOpen);
    });
  });

  document.querySelectorAll(".btn-back").forEach((button) => {
    button.addEventListener("click", () => {
      const submenu = button.closest(".G01-header-submenu");
      const trigger = document.querySelector(`[aria-controls="${submenu?.id}"]`);
      submenu?.classList.remove("-active");
      trigger?.setAttribute("aria-expanded", "false");
    });
  });

  videoToggle?.addEventListener("click", () => {
    if (!heroVideo) {
      return;
    }

    if (heroVideo.paused) {
      heroVideo.play();
      videoToggle.classList.remove("-play");
    } else {
      heroVideo.pause();
      videoToggle.classList.add("-play");
    }
  });

  window.addEventListener("scroll", () => {
    updateHeaderOnScroll();
    updateStoryHighlights();
  }, { passive: true });

  updateHeaderOnScroll();
  updateStoryHighlights();
})();
