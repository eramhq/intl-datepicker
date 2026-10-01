// Generates dist/custom-elements.json (referenced by package.json
// "customElements") for IDEs, Storybook and framework tooling.
export default {
  globs: ['src/intl-datepicker.js'],
  outdir: 'dist',
  plugins: [
    {
      name: 'hide-underscore-members',
      // `_`-prefixed members are internal (and mangled in the build).
      packageLinkPhase({ customElementsManifest }) {
        for (const mod of customElementsManifest.modules) {
          for (const decl of mod.declarations || []) {
            if (decl.members) decl.members = decl.members.filter(m => !m.name.startsWith('_'));
            // Drops `name` inferred from `_emit(name, …)`; real events have JSDoc.
            if (decl.events) decl.events = decl.events.filter(e => e.description);
          }
        }
      },
    },
  ],
};
