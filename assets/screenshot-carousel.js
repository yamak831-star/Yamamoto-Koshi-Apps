(function () {
  var AUTOPLAY_INTERVAL = 5000;
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var carousels = document.querySelectorAll("[data-screenshot-carousel]");

  carousels.forEach(function (carousel) {
    var track = carousel.querySelector("[data-carousel-track]");
    var slides = Array.prototype.slice.call(carousel.querySelectorAll("[data-carousel-slide]"));
    var previousButton = carousel.querySelector("[data-carousel-prev]");
    var nextButton = carousel.querySelector("[data-carousel-next]");
    var dots = Array.prototype.slice.call(carousel.querySelectorAll("[data-carousel-dot]"));

    if (!track || slides.length < 2 || !previousButton || !nextButton || dots.length !== slides.length) {
      return;
    }

    var activeIndex = 0;
    var autoplayTimer = 0;
    var programmaticScrollTimer = 0;
    var scrollFrame = 0;
    var isProgrammaticScroll = false;
    var isHovered = false;
    var isFocused = false;
    var isTouching = false;
    var isVisible = true;

    function wrapIndex(index) {
      return (index + slides.length) % slides.length;
    }

    function updateControls() {
      dots.forEach(function (dot, index) {
        dot.setAttribute("aria-current", index === activeIndex ? "true" : "false");
      });

      slides.forEach(function (slide, index) {
        slide.dataset.active = index === activeIndex ? "true" : "false";
      });
    }

    function scrollToActiveSlide(behavior) {
      var slide = slides[activeIndex];
      var trackRect = track.getBoundingClientRect();
      var slideRect = slide.getBoundingClientRect();
      var left = track.scrollLeft + slideRect.left - trackRect.left - (track.clientWidth - slideRect.width) / 2;

      isProgrammaticScroll = true;
      window.clearTimeout(programmaticScrollTimer);

      track.scrollTo({
        left: left,
        behavior: behavior
      });

      programmaticScrollTimer = window.setTimeout(function () {
        isProgrammaticScroll = false;
        syncActiveSlide();
      }, behavior === "smooth" ? 650 : 50);
    }

    function goToSlide(index, options) {
      var settings = options || {};
      var behavior = settings.behavior || (motionQuery.matches ? "auto" : "smooth");

      activeIndex = wrapIndex(index);
      updateControls();
      scrollToActiveSlide(behavior);

      if (settings.restartAutoplay !== false) {
        restartAutoplay();
      }
    }

    function closestSlideIndex() {
      var trackRect = track.getBoundingClientRect();
      var trackCenter = trackRect.left + track.clientWidth / 2;
      var closestIndex = 0;
      var closestDistance = Infinity;

      slides.forEach(function (slide, index) {
        var slideRect = slide.getBoundingClientRect();
        var slideCenter = slideRect.left + slideRect.width / 2;
        var distance = Math.abs(slideCenter - trackCenter);

        if (distance < closestDistance) {
          closestIndex = index;
          closestDistance = distance;
        }
      });

      return closestIndex;
    }

    function syncActiveSlide() {
      var nextIndex = closestSlideIndex();

      if (nextIndex !== activeIndex) {
        activeIndex = nextIndex;
        updateControls();
      }
    }

    function canAutoplay() {
      return !motionQuery.matches &&
        !isHovered &&
        !isFocused &&
        !isTouching &&
        isVisible &&
        document.visibilityState === "visible";
    }

    function stopAutoplay() {
      if (autoplayTimer) {
        window.clearTimeout(autoplayTimer);
        autoplayTimer = 0;
      }
    }

    function startAutoplay() {
      stopAutoplay();

      if (!canAutoplay()) {
        return;
      }

      autoplayTimer = window.setTimeout(function () {
        goToSlide(activeIndex + 1, { restartAutoplay: false });
        startAutoplay();
      }, AUTOPLAY_INTERVAL);
    }

    function restartAutoplay() {
      stopAutoplay();
      startAutoplay();
    }

    function addKeyboardActivation(element, callback) {
      element.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        callback();
      });
    }

    previousButton.addEventListener("click", function () {
      goToSlide(activeIndex - 1);
    });
    addKeyboardActivation(previousButton, function () {
      goToSlide(activeIndex - 1);
    });

    nextButton.addEventListener("click", function () {
      goToSlide(activeIndex + 1);
    });
    addKeyboardActivation(nextButton, function () {
      goToSlide(activeIndex + 1);
    });

    dots.forEach(function (dot, index) {
      dot.addEventListener("click", function () {
        goToSlide(index);
      });
      addKeyboardActivation(dot, function () {
        goToSlide(index);
      });
    });

    slides.forEach(function (slide) {
      slide.addEventListener("dragstart", function (event) {
        event.preventDefault();
      });
    });

    carousel.addEventListener("mouseenter", function () {
      isHovered = true;
      stopAutoplay();
    });

    carousel.addEventListener("mouseleave", function () {
      isHovered = false;
      restartAutoplay();
    });

    carousel.addEventListener("focusin", function () {
      isFocused = true;
      stopAutoplay();
    });

    carousel.addEventListener("focusout", function (event) {
      if (carousel.contains(event.relatedTarget)) {
        return;
      }

      isFocused = false;
      restartAutoplay();
    });

    track.addEventListener("touchstart", function () {
      isTouching = true;
      isProgrammaticScroll = false;
      window.clearTimeout(programmaticScrollTimer);
      stopAutoplay();
    }, { passive: true });

    track.addEventListener("touchend", function () {
      isTouching = false;
      syncActiveSlide();
      restartAutoplay();
    }, { passive: true });

    track.addEventListener("touchcancel", function () {
      isTouching = false;
      syncActiveSlide();
      restartAutoplay();
    }, { passive: true });

    track.addEventListener("scroll", function () {
      if (isProgrammaticScroll) {
        return;
      }

      if (scrollFrame) {
        return;
      }

      scrollFrame = window.requestAnimationFrame(function () {
        scrollFrame = 0;
        syncActiveSlide();
      });
    }, { passive: true });

    document.addEventListener("visibilitychange", restartAutoplay);

    if (typeof IntersectionObserver !== "undefined") {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
        });
        restartAutoplay();
      }, { threshold: [0, 0.35] });

      observer.observe(carousel);
    }

    if (typeof motionQuery.addEventListener === "function") {
      motionQuery.addEventListener("change", restartAutoplay);
    } else if (typeof motionQuery.addListener === "function") {
      motionQuery.addListener(restartAutoplay);
    }

    carousel.classList.add("is-ready");
    updateControls();
    startAutoplay();
  });
}());
