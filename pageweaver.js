/* AtheraPath – PageWeaver (sequential hero-first load, lean image chain, no remote fallbacks) */

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
      const slug = decoded.replace(/\.[^.]+$/, ""); // strip .md / .html if someone adds it
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
    // Escape &, < but NOT ">" so we can detect blockquotes
    const esc = md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;");

    let html = esc
      // headings
      .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
      .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
      .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      // strong / em / inline code
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+?)`/g, "<code>$1</code>")
      // links open in SAME TAB (no target="_blank")
      .replace(/\[([^\]]+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');

    html = html
      .split(/\n{2,}/)
      .map((chunk) => {
        const trimmed = chunk.trim();
        if (!trimmed) return "";

        // already-converted headings
        if (/^<h\d>/.test(trimmed)) return trimmed;

        // blockquotes: lines starting with ">"
        if (/^>\s?/.test(trimmed)) {
          const inner = trimmed.replace(/^>\s?/gm, "");
          return `<blockquote>${inner.replace(/\n/g, "<br>")}</blockquote>`;
        }

        // ordered lists: "1. item"
        if (/^\s*\d+\.\s/m.test(trimmed)) {
          const items = trimmed
            .split(/\n/)
            .map((l) => l.replace(/^\s*\d+\.\s/, ""))
            .filter((li) => li.trim().length)
            .map((li) => `<li>${li}</li>`)
            .join("");
          return `<ol>${items}</ol>`;
        }

        // unordered lists: "- item" or "* item"
        if (/^\s*[-*] /.test(trimmed)) {
          const items = trimmed
            .split(/\n/)
            .map((l) => l.replace(/^\s*[-*] /, ""))
            .filter((li) => li.trim().length)
            .map((li) => `<li>${li}</li>`)
            .join("");
          return `<ul>${items}</ul>`;
        }

        // default: paragraph, preserve single newlines as <br>
        return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
      })
      .filter(Boolean)
      .join("\n");

    return html;
  };

  // --- Image helpers: hero-first JPG load, then background chain discovery ---
  const probeJpg = (url) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => resolve(null);
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.src = url + (url.includes("?") ? "&" : "?") + "cb=" + Date.now();
    });

  const setupImages = (dir, slug) => {
    const hero = document.getElementById("hero-image");
    const caption = document.getElementById("hero-caption");
    const figure = hero ? hero.closest("figure") || hero.parentElement : null;

    if (!hero) return;

    hero.style.visibility = "hidden";

    const primaryUrl = `${dir}${slug}.jpg`;

    // Once the first hero image has loaded, we can use the "spare" time
    // to probe for slug_2.jpg..slug_6.jpg in the background.
    const onFirstLoad = () => {
      hero.style.visibility = "visible";
      if (caption) {
        caption.textContent = "Image loaded by filename convention";
      }

      // Now, quietly look for extra frames in sequence.
      (async () => {
        const extras = [];
        for (let i = 2; i <= 6; i++) {
          const url = `${dir}${slug}_${i}.jpg`;
          const found = await probeJpg(url);
          if (!found) break; // stop at first missing link
          extras.push(found);
        }

        if (!extras.length) return;

        const urls = [primaryUrl, ...extras];
        if (caption) {
          caption.textContent = `Image chain slideshow (${urls.length} images, 6s each)`;
        }

        let idx = 0;
        setInterval(() => {
          idx = (idx + 1) % urls.length;
          hero.src = urls[idx];
        }, 6000);
      })();
    };

    // If primary fails, we hide the figure entirely and never check extra images.
    const onError = () => {
      if (figure) figure.style.display = "none";
    };

    hero.addEventListener("load", onFirstLoad, { once: true });
    hero.addEventListener("error", onError, { once: true });

    // Kick off the primary load immediately.
    hero.src = primaryUrl;
  };

  document.addEventListener("DOMContentLoaded", async () => {
    const { dir, slug } = getContext();

    // Title
    const title = formatTitle(slug);
    document.title = title;
    const titleEl = $("#page-title");
    if (titleEl) titleEl.textContent = title;

    // --- Images: hero-first behaviour ---
    setupImages(dir, slug);

    // Helper to load a markdown file into a target element,
    // and hide the element completely if the file is missing / empty.
    const loadMarkdownSection = async (selector, path) => {
      const el = $(selector);
      if (!el) return;

      try {
        const res = await fetch(path + "?cb=" + Date.now(), { cache: "no-store" });
        if (!res.ok) {
          el.style.display = "none";
          return;
        }
        const text = await res.text();
        if (!text || !text.trim()) {
          el.style.display = "none";
          return;
        }
        el.innerHTML = mdToHtml(text);
      } catch {
        el.style.display = "none";
      }
    };

    // Main markdown (slug.md)
    await loadMarkdownSection("#md-content", `${dir}${slug}.md`);

    // Top banner (slug_top.md)
    await loadMarkdownSection("#top-banner", `${dir}${slug}_top.md`);

    // Bottom banner (slug_bottom.md)
    await loadMarkdownSection("#bottom-banner", `${dir}${slug}_bottom.md`);

    // Optional video block sitting neatly between main content and bottom banner
    const videoContainer = $("#video-container");
    if (videoContainer) {
      videoContainer.innerHTML = ""; // clear any old content

      const videoUrl = `${dir}${slug}.mp4`;
      let finalUrl = null;

      try {
        const head = await fetch(videoUrl, { method: "HEAD", cache: "no-store" });
        if (head.ok) finalUrl = videoUrl;
      } catch {
        // ignore
      }

      if (!finalUrl) {
        // last-resort example clip
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
  });

  // On hash change (#slug) behave like you hit refresh
  window.addEventListener("hashchange", () => {
    window.location.reload();
  });
})();
