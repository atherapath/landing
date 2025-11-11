/* AtheraPath – PageWeaver (clean symmetric banners, no fallback) */

(() => {
  // ---------- tiny utils ----------
  const $ = (sel) => document.querySelector(sel);

  const getContext = () => {
    const path = location.pathname;
    const dir = path.slice(0, path.lastIndexOf("/") + 1);
    const file = path.slice(path.lastIndexOf("/") + 1);
    const slug = file.replace(/\.[^.]+$/, "");
    return { dir, slug };
  };

  const formatTitle = (raw) =>
    raw.replace(/[-_]/g, " ")
       .split(" ")
       .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
       .join(" ");

  const mdToHtml = (md) => {
    const esc = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let html = esc
      .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
      .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
      .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+?)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
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

  const startSlideshow = (urls, heroEl, captionEl) => {
    if (!heroEl || !urls.length) return null;
    let i = 0;
    const show = () => {
      const u = urls[i];
      heroEl.src = u + (u.includes("?") ? "&" : "?") + "r=" + Math.random().toString(36).slice(2, 7);
    };
    show();
    if (captionEl) captionEl.textContent = `Image chain slideshow (${urls.length} images, 6s each)`;
    return setInterval(() => {
      i = (i + 1) % urls.length;
      show();
    }, 6000);
  };

  const FALLBACK_IMAGES = [
    "https://picsum.photos/seed/pw1/1600/900.jpg",
    "https://picsum.photos/seed/pw2/1600/900.jpg",
    "https://picsum.photos/seed/pw3/1600/900.jpg",
    "https://picsum.photos/seed/pw4/1600/900.jpg",
    "https://picsum.photos/seed/pw5/1600/900.jpg",
    "https://picsum.photos/seed/pw6/1600/900.jpg",
  ];

  // ---------- main ----------
  document.addEventListener("DOMContentLoaded", async () => {
    const { dir, slug } = getContext();

    // Title
    const title = formatTitle(slug);
    document.title = title;
    const titleEl = $("#page-title");
    if (titleEl) titleEl.textContent = title;

    // --- Images (no flash of fallback) ---
const hero = document.getElementById("hero-image");
const caption = document.getElementById("hero-caption");

// Hide image until we know the real source
if (hero) hero.style.visibility = "hidden";

const locals = await findLocalImages(dir, slug);

const start = (urls) => {
  if (!urls || !urls.length || !hero) return;
  let i = 0;
  const show = () => {
    const u = urls[i];
    hero.onload = () => { hero.style.visibility = "visible"; };
    hero.src = u + (u.includes("?") ? "&" : "?") + "r=" + Math.random().toString(36).slice(2,7);
  };
  show();
  if (caption) caption.textContent = `Image chain slideshow (${urls.length} images, 6s each)`;
  return setInterval(() => { i = (i + 1) % urls.length; show(); }, 6000);
};

let timer = null;

// Prefer locals; only use fallback if none
if (locals && locals.length) {
  timer = start(locals);
} else {
  // last resort
  timer = start(FALLBACK_IMAGES);
}

    // Main markdown
    const mdEl = $("#md-content");
    if (mdEl) {
      try {
        const res = await fetch(`${dir}${slug}.md?cb=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim()) mdEl.innerHTML = mdToHtml(text);
        }
      } catch {}
    }

    // Top banner (exactly as requested)
    {
      const el = $("#top-banner");
      if (el) {
        try {
          const res = await fetch(`${dir}${slug}_top.md?cb=${Date.now()}`, { cache: "no-store" });
          if (res.ok) {
            const text = await res.text();
            if (text && text.trim()) el.innerHTML = mdToHtml(text);
          }
        } catch {}
      }
    }

    // Bottom banner (identical to top, just _bottom)
    {
      const el = $("#bottom-banner");
      if (el) {
        try {
          const res = await fetch(`${dir}${slug}_bottom.md?cb=${Date.now()}`, { cache: "no-store" });
          if (res.ok) {
            const text = await res.text();
            if (text && text.trim()) el.innerHTML = mdToHtml(text);
          }
        } catch {}
      }
    }

    // Optional video block
    const videoContainer = $("#video-container");
    if (videoContainer) {
      const videoUrl = `${dir}${slug}.mp4`;
      let finalUrl = null;
      try {
        const head = await fetch(videoUrl, { method: "HEAD", cache: "no-store" });
        if (head.ok) finalUrl = videoUrl;
      } catch {}
      if (!finalUrl) finalUrl = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

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
})();
