# SF Symbols Checklists

## Import Ready

- Exported SVG is based on an SF Symbols template or a deliberate custom-template strategy.
- No raster images are present.
- No live artwork text is present.
- Live strokes are outlined.
- Paths are preferably closed and filled.
- No fragile filters, shadows, blur, masks, or manual gradients are required.
- Semantic layer names and path order are preserved.
- Rendering annotations are planned.
- SF Symbols app import and template validation are complete.
- Final SF Symbols app export is ready for Xcode.

## Animation Ready

- Whole-symbol effects have been previewed.
- Layer-sensitive effects keep stable named layers.
- Replace families preserve shared base layers and order.
- Draw and Variable Draw guide point plans are complete.
- Regular annotations are verified first.
- Ultralight and Black guide point order is verified when variable templates are used.
- Symbol effects are tested in SwiftUI previews and on device where possible.

## QA

- Symbol is legible at small sizes.
- Monochrome, hierarchical, palette, and multicolor behavior match intent.
- Light mode, dark mode, high contrast, and accessibility sizes are checked.
- Xcode asset catalog import succeeds.
- SwiftUI uses `Image("symbolName")`.
- UIKit uses asset-based `UIImage(named:)`.
- Animation targets behave acceptably.
- Human designer or engineer signs off after SF Symbols app validation.
