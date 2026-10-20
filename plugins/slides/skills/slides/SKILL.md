---
name: slides
description: "Create browser-based HTML slide presentations with page-by-page navigation like PowerPoint. Uses a modular architecture with individual HTML files per slide, supporting multiple layout templates and themes. Use this skill when the user needs to create any type of presentation or slideshow."
---

# HTML Slides Guide

## Overview

HTML Slides is a browser-based presentation format with the following features:
- Opens directly in any browser, no software installation needed
- Supports keyboard, mouse, and touch navigation
- Modular architecture with separate files per slide, easy to maintain
- Customizable themes

## File Structure

```
project/
├── index.html          # Main controller (navigation logic, style references)
├── styles/
│   ├── base.css        # Base styles (required)
│   └── theme-*.css     # Theme files (choose one)
├── slides/
│   ├── 01_cover.html   # Individual slides
│   ├── 02_xxx.html
│   └── ...
└── images/             # Image assets (optional)
```

## Creation Workflow

1. **Copy the controller file** — from `assets/index.html`
2. **Copy style files** — from `assets/styles/`: `base.css` + a theme file
3. **Create slides** — reference layout templates in `assets/slides/`
4. **Configure the slide list** — edit the `slideFiles` array in `index.html`

## Layout Templates

All templates are located in the `assets/slides/` directory:

| Template | Purpose |
|----------|---------|
| `cover.html` | Cover page, section dividers |
| `content.html` | General content (title + body text) |
| `list.html` | Numbered list layout |
| `grid.html` | Grid card layout |
| `split.html` | Two-column layout |
| `image.html` | Image showcase layout |
| `table.html` | Table layout |
| `quote.html` | Quote / emphasis layout |
| `stats.html` | Statistics / key metrics layout |
| `ending.html` | Closing page |

Each template is an HTML fragment containing only a `<div class="slide">...</div>` structure.

## Themes

All themes are in the `assets/styles/` directory. Switch themes by changing the CSS file reference in `index.html`.

### Basic Themes

| Theme File | Style |
|------------|-------|
| `theme-dark.css` | Dark (deep blue background) |
| `theme-light.css` | Light (white background) |

### Theme Factory Themes

Professional themes from the theme-factory skill with curated color palettes and fonts:

| Theme File | Style | Best For |
|------------|-------|----------|
| `theme-ocean-depths.css` | Deep ocean blue | Corporate presentations, financial reports |
| `theme-sunset-boulevard.css` | Warm sunset tones | Creative proposals, marketing decks |
| `theme-forest-canopy.css` | Forest green | Sustainability, environmental topics |
| `theme-modern-minimalist.css` | Gray-white minimal | Tech, design showcases |
| `theme-golden-hour.css` | Golden autumn warmth | Food & beverage, hospitality branding |
| `theme-arctic-frost.css` | Ice blue cool tones | Healthcare, clean technology |
| `theme-desert-rose.css` | Desert rose | Fashion, beauty brands |
| `theme-botanical-garden.css` | Fresh garden | Gardening, natural products |
| `theme-tech-innovation.css` | Tech blue-black | Tech startups, AI presentations |
| `theme-midnight-galaxy.css` | Cosmic deep purple | Entertainment, gaming industry |

## Asset Management

### Images
- Store in the `images/` directory
- Reference using relative paths: `<img src="images/xxx.png">`

### External Data (optional)
To load detailed data in a modal popup:
- Create a `data/` directory for HTML fragments
- Use `openModal('data/xxx.html')` to load them

## Navigation Features

The controller file includes the following navigation:
- **Keyboard**: ← → to navigate, ↑ first slide, ↓ last slide, Space/Enter next slide
- **Mouse**: Bottom buttons, right-side dot navigation
- **Touch**: Swipe left/right
- **Progress**: Top progress bar, page indicator

## Custom Themes

Modify CSS variables in the theme file:

```css
:root {
    --primary: #background-color;
    --accent: #accent-color;
    --text: #text-color;
    --text-muted: #secondary-text;
    --gold: #heading-decoration-color;
}
```

## Math Formulas (LaTeX)

HTML does not natively support LaTeX rendering. Use the **KaTeX** library.

### 1. Include KaTeX in index.html

Add to `<head>`:

```html
<!-- KaTeX -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
```

Add rendering logic at the end of `<script>`:

```javascript
// KaTeX rendering
function renderMath() {
    if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(document.body, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ],
            throwOnError: false
        });
    }
}
// Call renderMath() after slides have loaded
```

### 2. Formula Syntax

| Type | Syntax | Effect |
|------|--------|--------|
| Inline | `$E = mc^2$` | Embedded in text |
| Block | `$$\mathcal{J}(\theta) = \mathbb{E}[...]$$` | Centered, standalone |

### 3. Caveats

1. **HTML escaping**: `<` is parsed as an HTML tag — use `\lt` instead
   - Bad: `$o_{<t}$`
   - Good: `$o_{\lt t}$`

2. **Pipe symbol**: Use `\mid` for conditional probability bars
   - Bad: `$\pi(y_t | x)$`
   - Good: `$\pi(y_t \mid x)$`

3. **Text mode**: Use `\text{}` for words inside formulas
   - Bad: `$\theta_{old}$` (renders "old" as italic variables)
   - Good: `$\theta_{\text{old}}$`

4. **No PDF images**: HTML `<img>` does not support PDF — convert to PNG/SVG

## Notes

1. Each slide file should only contain `<div class="slide">` content
2. Use `01_`, `02_` prefixes for slide filenames to maintain order
3. The modular architecture requires a local server (`python -m http.server`)
4. Single-file builds can be opened directly in a browser
