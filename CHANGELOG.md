# Changelog

## Unreleased

### Changed

- Replaced dense cluster positioning with a rooted caller-to-callee hierarchy.
- Kept graph labels readable with compact names and bounded automatic zoom.
- Fixed depth traversal so the slider limits the displayed neighborhood.
- Rendered Mermaid flowcharts left-to-right at their natural size with scrolling and an expanded view.
- Restored native wheel zoom behavior and corrected Cytoscape arrow styling.

### Rationale

Dense neighborhoods previously auto-zoomed small layouts until labels became oversized and overlapping. Hierarchical spacing, bounded zoom, and an expandable Mermaid canvas make call paths readable without removing graph detail.
