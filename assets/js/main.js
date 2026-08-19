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

  const storySections = Array.from(document.querySelectorAll(".home-story")).map((section) => {
    const chunks = Array.from(section.querySelectorAll(".home-story__chunk"));
    const memories = Array.from(section.querySelectorAll(".home-story__memory"));
    const memorySteps = memories.map((memory) => Number(memory.dataset.step || 0));
    const stepCount = memorySteps.length
      ? Math.max(...memorySteps) + 1
      : Math.max(chunks.length, 1);

    return {
      section,
      chunks,
      memories,
      stepCount,
      sectionTop: 0,
      scrollable: 0,
      lastStep: -1,
      lastCount: -1,
    };
  });

  let headerScrolled = null;
  let lastScrollY = window.scrollY;
  let scrollTicking = false;
  let storyScrollActive = storySections.length === 0;

  const TOP_THRESHOLD = 40;
  const DIRECTION_THRESHOLD = 6;

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

  function isHeaderInteractionOpen() {
    if (!header) {
      return false;
    }

    return (
      header.classList.contains("-active")
      || header.classList.contains("-search-mobile")
      || Boolean(header.querySelector(".G01-header-submenu.-active"))
      || Boolean(header.querySelector(".G01-header-search-wrapper.-active"))
    );
  }

  function updateHeaderOnScroll() {
    const scrollY = window.scrollY;
    const scrolled = scrollY > TOP_THRESHOLD;

    if (scrolled !== headerScrolled) {
      headerScrolled = scrolled;
      document.body.classList.toggle("is-scrolled", scrolled);
    }

    if (!header) {
      return;
    }

    header.classList.add("-sticky");

    if (scrollY <= TOP_THRESHOLD || isHeaderInteractionOpen()) {
      header.classList.remove("-down");
    } else {
      const delta = scrollY - lastScrollY;

      if (delta > DIRECTION_THRESHOLD) {
        header.classList.add("-down");
      } else if (delta < -DIRECTION_THRESHOLD) {
        header.classList.remove("-down");
      }
    }

    lastScrollY = scrollY;
  }

  function applyInitialStoryStates() {
    storySections.forEach((config) => {
      config.chunks.forEach((chunk) => {
        chunk.classList.remove("is-active");
      });
      config.lastCount = 0;
    });
  }

  function cacheStoryLayouts() {
    const scrollY = window.scrollY;

    storySections.forEach((config) => {
      const rect = config.section.getBoundingClientRect();
      config.sectionTop = scrollY + rect.top;
      config.scrollable = config.section.offsetHeight - window.innerHeight;
      config.lastStep = -1;
      config.lastCount = -1;
    });
  }

  function updateStorySection(config) {
    const { scrollable, sectionTop } = config;

    if (scrollable <= 0) {
      return;
    }

    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;

    if (scrollY + viewportHeight < sectionTop || scrollY > sectionTop + scrollable + viewportHeight) {
      return;
    }

    const progress = Math.min(1, Math.max(0, (scrollY - sectionTop) / scrollable));
    const activeStep = Math.min(config.stepCount - 1, Math.floor(progress * config.stepCount));
    const chunkTotal = config.chunks.length;
    const activeCount = Math.min(chunkTotal, Math.ceil(progress * chunkTotal));

    if (activeStep !== config.lastStep) {
      config.memories.forEach((memory) => {
        memory.classList.toggle("is-active", Number(memory.dataset.step) === activeStep);
      });
      config.lastStep = activeStep;
    }

    if (activeCount !== config.lastCount) {
      config.chunks.forEach((chunk, index) => {
        chunk.classList.toggle("is-active", index < activeCount);
      });
      config.lastCount = activeCount;
    }
  }

  function onScrollFrame() {
    scrollTicking = false;
    updateHeaderOnScroll();

    if (storyScrollActive) {
      storySections.forEach(updateStorySection);
    }
  }

  function scheduleScrollUpdate() {
    if (scrollTicking) {
      return;
    }
    scrollTicking = true;
    requestAnimationFrame(onScrollFrame);
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

  if (storySections.length) {
    applyInitialStoryStates();
    cacheStoryLayouts();

    const storyVisibility = new Map();

    const storyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          storyVisibility.set(entry.target, entry.isIntersecting);
        });
        storyScrollActive = [...storyVisibility.values()].some(Boolean);

        if (storyScrollActive) {
          scheduleScrollUpdate();
        }
      },
      { rootMargin: "120px 0px", threshold: 0 }
    );

    storySections.forEach(({ section }) => {
      storyObserver.observe(section);
    });
  }

  window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
  window.addEventListener(
    "resize",
    () => {
      lastScrollY = window.scrollY;
      cacheStoryLayouts();
      scheduleScrollUpdate();
    },
    { passive: true }
  );

  window.addEventListener("load", () => {
    cacheStoryLayouts();
    scheduleScrollUpdate();
  });

  scheduleScrollUpdate();
})();
