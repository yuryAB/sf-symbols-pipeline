# SF Symbols Pipeline Workflow

Use this flow for custom SF Symbols work:

1. Choose a close official SF Symbol base when possible.
2. Export the template from the SF Symbols app.
3. Edit in an SVG-capable vector editor such as Figma, Illustrator, Sketch, Affinity Designer, or Inkscape.
4. Preserve semantic layer names, path order, and template structure.
5. Convert final strokes and text to paths before export.
6. Validate and inspect the exported SVG.
7. Compare variable sources when using Ultralight-S, Regular-S, and Black-S.
8. Plan rendering annotations for monochrome, hierarchical, palette, or multicolor behavior.
9. Plan Draw, Variable Draw, variable color, or replace behavior when requested.
10. Import and validate in the SF Symbols app.
11. Export the final SVG from the SF Symbols app.
12. Add the final SVG to an Xcode asset catalog and generate Swift usage examples.

For converted third-party or app-specific icons, keep the original SVG as the geometry source of truth. Do not redraw from memory or from a broken generated symbolset.

For variable symbols, accept source compatibility only after reviewing path counts, path order, group structure, fill/stroke consistency, command signatures, and approximate bounds drift.
