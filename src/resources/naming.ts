import type { StaticResource } from "./guidelines.js";

export const projectResources: StaticResource[] = [
  {
    uri: "sf-symbols://project/naming-conventions",
    name: "naming-conventions",
    title: "Naming Conventions",
    text: `# Naming Conventions

Use lowercase dot-separated names that describe namespace, object, and state.

Examples:
- marquei.calendar.confirmed
- marquei.appointment.pending
- marquei.client.badge.vip

Guidelines:
- Prefer semantic names over implementation details.
- Keep related families in the same namespace.
- Use stable names before generating Xcode assets or Swift snippets.
- Avoid spaces, slashes, punctuation-heavy names, and generic suffixes like final2.
`,
  },
  {
    uri: "sf-symbols://project/output-structure",
    name: "output-structure",
    title: "Output Structure",
    text: `# Output Structure

Recommended generated artifacts:
- brief.md and brief.json
- validation-report.md and validation-report.json
- geometry-report.md and geometry-report.json
- annotation-plan.md and annotation-plan.json
- draw-guide-plan.md and draw-guide-plan.json
- import-checklist.md and import-checklist.json
- SwiftUsage.md
- SymbolUsageExamples.swift
- SymbolAnimationPreview.swift
- Assets.xcassets/<symbolName>.symbolset/

Generated paths may be absolute or relative to the current project. Prefer writing artifacts near the source SVG or in an explicit output directory.
`,
  },
];
