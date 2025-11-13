/* AtheraPath – PageWeaver (hash-aware, clean reload on slug change) */

(() => {
  // ---------- tiny utils ----------
  const $ = (sel) => document.querySelector(sel);

  // ---------- simple hash-based slug support (raw hash = slug) ----------
  const getContext = () => {
    // If hash is present, use it directly, e.g. glyph.html#gas_powered_circus
    const rawHash = (location.hash || "").replace(/^#/, ""); // strip "#"

    if (rawHash) {
      const maybe = rawHash.startsWith("h:") ? rawHash.slice(2) : rawHash; // tolerate h:
      const decoded = decodeURIComponent(maybe);
      const slug = decoded.replace(/\.[^.]+$/, ""); // strip .md / .html if added
      const path = location.pathname;
      const dir = path.slice(0, path.lastIndexOf("/") + 1);
      return { dir, slug };
    }

    // fallback — filename based (original behaviour)
    const path = location.pathname;
    const dir = path.slice(0, path.lastIndexOf("/") + 1);
    const file = path.slice(path.lastIndexOf("/") + 1);
    const slug = file.replace(/\.[^.]+$/, "");
    return { dir, slug };
  };

  const formatTitle = (raw) =>
    raw
      .replace(/[-_]/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const mdToHtml = (md) => {
    const esc = md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    let html = esc
      .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
      .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
      .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      // 🔗 NOTE: still opens https links in new tab – see note below to change this
      .replace(
        /\[([^\]]+?)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      );

    html = html
      .split(/\n{2,}/)
      .map((chunk) => {
        if (/^<h\d>/.test(chunk)) return chunk;
        if (/^\s*[-*] /.test(chunk)) {
          const items = chunk
            .split(/\n/)
            .map((l) => l.replace(/^\s*[-*] /, ""))
            .map((li) => `<li>${li}</li>`)
            .join("");
          return `<ul>${items}</ul>`;
        }
        return `<p>${chunk.replace(/\n/g, "<br>")}</p>`;
      })
      .join("\n");
    return html;
  };

  const probeImage = (url) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => resolve(null);
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.src = url + (url.includes("?") ? "&" : "?") + "cb=" + Date.now();
    });

  const findLocalImages = async (dir, slug) => {
    const suffixes = ["", "_2", "_3", "_4", "_5", "_6"];
    const exts = [".jpg", ".jpeg", ".png", ".webp"];
    const results = [];
    for (const sfx of suffixes) {
      for (const ext of exts) {
        const ok = await probeImage(`${dir}${slug}${sfx}${ext}`);
        if (ok) results.push(ok);
      }
    }
    return results;
  };

  const FALLBACK_IMAGES = [
    "https://picsum.photos/seed/pw1/1600/900.jpg",
    "https://picsum.photos/seed/pw2/1600/900.jpg",
    "https://picsum.photos/seed/pw3/1600/900.jpg",
    "https://picsum.photos/seed/pw4/1600/900.jpg",
    "https://picsum.photos/seed/pw5/1600/900.jpg",
    "https://picsum.photos/seed/pw6/1600/900.jpg",
  ];

  let slideshowTimer = null;

  const startSlideshow = (urls, heroEl, captionEl) => {
    if (!heroEl || !urls.length) return null;
    let i = 0;

    const show = () => {
      const u = urls[i];
      heroEl.onload = () => {
        heroEl.style.visibility = "visible";
      };
      heroEl.src =
        u +
        (u.includes("?") ? "&" : "?") +
        "r=" +
        Math.random().toString(36).slice(2, 7);
    };

    show();
    if (captionEl) {
      captionEl.textContent = `Image chain slideshow (${urls.length} images, 6s each)`;
    }

    return setInterval(() => {
      i = (i + 1) % urls.length;
      show();
    }, 6000);
  };

  // ---------- core loader (runs on initial load + hash change) ----------
  const loadGlyph = async () => {
    const { dir, slug } = getContext();

    // Title
    const title = formatTitle(slug);
    document.title = title;
    const titleEl = $("#page-title");
    if (titleEl) titleEl.textContent = title;

    // Reset image + caption
    const hero = document.getElementById("hero-image");
    const caption = document.getElementById("hero-caption");
    if (hero) {
      hero.style.visibility = "hidden";
      hero.removeAttribute("src");
    }
    if (caption) caption.textContent = "Image loaded by filename convention";

    // Clear existing slideshow
    if (slideshowTimer) {
      clearInterval(slideshowTimer);
      slideshowTimer = null;
    }

    // Load local images or fallback
    try {
      const locals = await findLocalImages(dir, slug);
      const urls = locals && locals.length ? locals : FALLBACK_IMAGES;
      slideshowTimer = startSlideshow(urls, hero, caption);
    } catch (e) {
      // ignore, slideshow just won't run
    }

    // Main markdown
    const mdEl = $("#md-content");
    if (mdEl) {
      mdEl.innerHTML = "";
      try {
        const res = await fetch(`${dir}${slug}.md?cb=${Date.now()}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim()) mdEl.innerHTML = mdToHtml(text);
        }
      } catch {
        // silent fail
      }
    }

    // Top banner
    {
      const el = $("#top-banner");
      if (el) {
        el.innerHTML = "";
        try {
          const res = await fetch(`${dir}${slug}_top.md?cb=${Date.now()}`, {
            cache: "no-store",
          });
          if (res.ok) {
            const text = await res.text();
            if (text && text.trim()) el.innerHTML = mdToHtml(text);
          }
        } catch {
          // silent
        }
      }
    }

    // Bottom banner
    {
      const el = $("#bottom-banner");
      if (el) {
        el.innerHTML = "";
        try {
          const res = await fetch(`${dir}${slug}_bottom.md?cb=${Date.now()}`, {
            cache: "no-store",
          });
          if (res.ok) {
            const text = await res.text();
            if (text && text.trim()) el.innerHTML = mdToHtml(text);
          }
        } catch {
          // silent
        }
      }
    }

    // Optional video block
    const videoContainer = $("#video-container");
    if (videoContainer) {
      videoContainer.innerHTML = ""; // clear previous video on slug change
      const videoUrl = `${dir}${slug}.mp4`;
      let finalUrl = null;
      try {
        const head = await fetch(videoUrl, {
          method: "HEAD",
          cache: "no-store",
        });
        if (head.ok) finalUrl = videoUrl;
      } catch {
        // ignore
      }
      if (!finalUrl) {
        finalUrl =
          "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
      }

      const wrapper = document.createElement("figure");
      wrapper.className = "pw-figure";
      wrapper.style.maxWidth = "600px";
      wrapper.style.margin = "0 auto 18px";

      const videoEl = document.createElement("video");
      videoEl.src = finalUrl;
      videoEl.autoplay = true;
      videoEl.loop = true;
      videoEl.muted = true;
      videoEl.controls = true;
      videoEl.style.width = "100%";
      videoEl.style.border = "1px solid var(--border)";
      videoEl.style.borderRadius = "6px";
      videoEl.style.display = "block";
      videoEl.addEventListener("timeupdate", () => {
        if (videoEl.currentTime >= 6) videoEl.pause();
      });

      const cap = document.createElement("figcaption");
      cap.textContent = "Video loaded by filename convention";
      cap.style.marginTop = "8px";
      cap.style.color = "var(--fg-dim)";
      cap.style.fontSize = ".9rem";
      cap.style.textAlign = "center";
      cap.style.opacity = ".85";

      wrapper.appendChild(videoEl);
      wrapper.appendChild(cap);
      videoContainer.appendChild(wrapper);
    }
  };

  // ---------- bootstrap ----------
  document.addEventListener("DOMContentLoaded", () => {
    loadGlyph(); // initial load

    // Re-run whenever #slug changes (clicking links, editing hash, etc.)
    window.addEventListener("hashchange", () => {
      loadGlyph();
    });
  });
})();