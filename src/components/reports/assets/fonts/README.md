# Static Inter print cuts

These are the fonts the print surface loads, and nothing else in the app does.

- `inter-print-400-regular.woff2`, `inter-print-600-semibold.woff2`, `inter-print-700-bold.woff2`
  are static instances of the variable Inter the app already depends on
  (`@fontsource-variable/inter`, `inter-latin-wght-normal.woff2`), pinned at the three weights the
  report surface uses. Licence: SIL Open Font License 1.1, see `OFL.txt` (copied verbatim from the
  package).
- Why static: Chromium embeds a variable font as Type3 glyph procedures — 36 font objects per card
  and +28.0% PDF bytes. A static cut embeds as Type0 with one `/FontFile2` subset (DR-05 §Fonts).
- Regenerated with (fontTools is a measurement tool, not a dependency):

  ```
  python -c "from fontTools.ttLib import TTFont; from fontTools.varLib.instancer import instantiateVariableFont; \
  f = instantiateVariableFont(TTFont('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'), {'wght': 400}); \
  f.flavor = 'woff2'; f.save('src/components/reports/assets/fonts/inter-print-400-regular.woff2')"
  ```

  Replace `400` with `600` or `700` for the other two cuts.
- Subsetting is automatic: Chromium embeds only the glyphs a document uses, so these files are a
  build-time artefact and not something to trim per document.
