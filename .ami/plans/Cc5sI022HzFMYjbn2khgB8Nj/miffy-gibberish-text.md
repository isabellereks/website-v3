---
name: "Miffy Gibberish Text"
overview: "Add collision detection between miffy and main content paragraphs that scrambles text to gibberish on overlap and restores on exit."
todos:
  - id: "add-ref"
    content: "Add mainContentRef to content container"
    status: not_started
  - id: "scramble-effect"
    content: "Add useEffect for collision detection and text scrambling"
    status: not_started
  - id: "test"
    content: "Test scramble/restore behavior"
    status: not_started
createdAt: "2026-01-26T05:06:33.374Z"
updatedAt: "2026-01-26T05:06:33.374Z"
---

# Miffy Gibberish Text Effect

## Implementation

1. **Add ref to main content container** (`page.tsx:~280`)
   - Add `mainContentRef` to the `<div className="space-y-4">` wrapper

2. **Create scramble utility functions**
   - `scrambleText(text)` - replace alphanumeric chars with random gibberish
   - `getCollisionElements(miffyRect, container)` - find paragraphs overlapping miffy

3. **Add collision detection effect**
   - New `useEffect` that runs when `miffyPos` changes
   - Check collision between miffy bounds (70x70) and paragraph elements
   - Store original text in `data-original` attribute before scrambling
   - Restore text when miffy moves away

4. **Scramble characters**
   - Use mix of unicode/special chars like `░▒▓█▄▀■□●○◐◑`
   - Only scramble visible text nodes, preserve HTML structure
