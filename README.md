# GLYPH ENGINE — landing/

**One HTML file. Infinite pages.**

`glyph.html` is the universal entry point into the AtheraPath content system.

Every “page” in this realm is actually a **glyph** — a Markdown file with a name.
You don’t create pages anymore.  
You **summon** them.

---

## How it works

Just call:

    glyph.html#slug_name

And the engine will automatically load:

    slug_name.md              ← main content
    slug_name_top.md          ← optional banner/header
    slug_name_bottom.md       ← optional footer text
    slug_name.jpg             ← auto image detection
    slug_name_2.jpg
    slug_name_3.jpg

No page duplication.  
No routing files.  
No build step.

---

## Example

    https://atherapath.github.io/landing/glyph.html#the_projection_named_human

Replace the hash with any Markdown filename (without `.md`).

---

## Philosophy

    Slug the name.
    Land the glyph.

Content lives as Markdown.  
The engine handles everything else.

---

## Why this exists

Traditional web publishing forces you to:
- create a page,
- wire routes,
- duplicate structure.

Here, content is **primary**, and the structure emerges automatically.

    Markdown = truth
    glyph.html = portal
    the repo = the realm

---

## Naming Convention

Files discovered automatically when the slug is used:

    slug_name.md
    slug_name_top.md
    slug_name_bottom.md
    slug_name.jpg
    slug_name_2.jpg
    slug_name_3.jpg
    slug_name.mp4

---

## Project status

    ✅ Engine functional
    ✅ Hash routing
    ✅ Dynamic banners + slideshow + video detection
    ⬜ Optional: auto-linking between glyphs
    ⬜ Optional: menu / index page generation

---

> This is not a website.  
> It’s a **publishing ritual.**