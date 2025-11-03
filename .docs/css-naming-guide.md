# CSS Naming Convention Guide - BEM

## Overview

This project uses **BEM (Block Element Modifier)** naming convention for CSS classes.

BEM stands for:
- **Block**: Independent component
- **Element**: Part of a block
- **Modifier**: Variation or state of a block/element

## Syntax

```css
.block { }
.block__element { }
.block--modifier { }
.block__element--modifier { }
```

## Rules

### 1. Blocks (Components)

Use camelCase for multi-word blocks:

```css
/* ✅ Good */
.albumCard { }
.trackList { }
.heroSection { }
.homePage { }

/* ❌ Bad */
.album-card { }
.AlbumCard { }
.album_card { }
```

### 2. Elements (Parts of a component)

Use double underscore `__` to connect element to its block:

```css
/* ✅ Good */
.albumCard__cover { }
.albumCard__title { }
.albumCard__artist { }
.sidebar__nav { }
.sidebar__navItem { }

/* ❌ Bad */
.albumCardCover { }  /* No separation from block */
.albumCard-cover { }  /* Wrong separator */
.cover { }  /* Too generic, what block? */
```

### 3. Modifiers (States/Variants)

Use double dash `--` for modifiers:

```css
/* ✅ Good - States */
.hero--loading { }
.button--disabled { }
.albumCard--featured { }

/* ✅ Good - Variants */
.button--primary { }
.button--secondary { }
.sidebar__navItem--active { }

/* ❌ Bad */
.heroLoading { }  /* No separation */
.hero-loading { }  /* Wrong separator */
.loadingHero { }  /* Wrong order */
```

### 4. Pseudo-classes

Use standard CSS pseudo-classes (no BEM needed):

```css
/* ✅ Good */
.albumCard:hover { }
.button:active { }
.input:focus { }

/* ❌ Bad - Don't use modifiers for pseudo-classes */
.albumCard--hover { }
```

### 5. Nested elements

Nested elements still reference the main block:

```css
/* ✅ Good */
.albumCard__coverContainer { }
.albumCard__overlay { }
.albumCard__playButton { }

/* ❌ Bad - Don't chain elements */
.albumCard__coverContainer__overlay { }
```

## JavaScript Usage

### Standard classes (no special characters)

```tsx
<div className={styles.albumCard}>
  <div className={styles.albumCard__title}>
  </div>
</div>
```

### Classes with dashes (use bracket notation)

```tsx
<div className={styles['hero--loading']}>
  <div className={styles['hero__cover--loading']} />
</div>
```

## Examples

### Album Card Component

```css
/* Block */
.albumCard { }

/* Elements */
.albumCard__coverContainer { }
.albumCard__cover { }
.albumCard__overlay { }
.albumCard__playButton { }
.albumCard__title { }
.albumCard__artist { }

/* Modifiers */
.albumCard--featured { }
.albumCard--loading { }
.albumCard__playButton--disabled { }

/* Hover states (pseudo-classes) */
.albumCard:hover { }
.albumCard:hover .albumCard__cover { }
```

### Sidebar Component

```css
/* Block */
.sidebar { }

/* Elements */
.sidebar__logo { }
.sidebar__nav { }
.sidebar__navItem { }
.sidebar__navIcon { }
.sidebar__navLabel { }

/* Modifiers */
.sidebar--collapsed { }
.sidebar__navItem--active { }
```

### Loading States (formerly "skeletons")

```css
/* ❌ Old (confusing) */
.heroSkeleton { }
.skeletonCover { }
.skeletonCard { }

/* ✅ New (clear) */
.hero--loading { }
.hero__cover--loading { }
.albumCard--loading { }
```

## Migration Status

### ✅ Refactored (BEM)
- HomePage
- AlbumCard

### ⏳ Pending
- AlbumGrid
- HeroSection
- Sidebar
- TrackList
- AlbumPage
- AlbumsPage
- Header (partial)
- Auth pages
- Admin pages

## Benefits of BEM

1. **Clear hierarchy**: You immediately know which element belongs to which component
2. **No naming conflicts**: Each block has its own namespace
3. **Easy to search**: Search for `.albumCard` finds all related styles
4. **Self-documenting**: The name tells you the structure
5. **Scalable**: Works for projects of any size

## Anti-patterns to Avoid

### ❌ Generic names
```css
.card { }  /* What kind of card? */
.title { }  /* Title of what? */
.button { }  /* Too generic */
```

### ❌ Location-based names
```css
.headerButton { }  /* What if button moves? */
.leftPanel { }  /* What if layout changes? */
```

### ❌ Abbreviations
```css
.btn { }  /* Spell it out: button */
.usr { }  /* Spell it out: user */
.img { }  /* Spell it out: image */
```

### ❌ Mixing conventions
```css
.albumCard { }  /* BEM */
.album-card__title { }  /* Mixed kebab-case */
.AlbumCard-Title { }  /* Mixed PascalCase */
```

## Resources

- [BEM Official](https://getbem.com/)
- [BEM 101 by CSS-Tricks](https://css-tricks.com/bem-101/)
- [MindBEMding by Harry Roberts](https://csswizardry.com/2013/01/mindbemding-getting-your-head-round-bem-syntax/)

## Questions?

If unsure about naming, ask yourself:
1. Is this a component? → **Block**
2. Is this part of a component? → **Element** (`__`)
3. Is this a variant/state? → **Modifier** (`--`)
4. Is this a hover/focus state? → **Pseudo-class** (`:hover`)
