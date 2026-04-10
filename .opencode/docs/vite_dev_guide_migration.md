# Migration from v7 | Vite

> Source: https://vite.dev/guide/migration
> Cached: 2026-04-07T12:27:51.324Z

---

Are you an LLM? You can read better optimized documentation at /guide/migration.md for this page in Markdown format# Migration from v7 [​](#migration-from-v7)

If you are migrating from `rolldown-vite`, the technical preview release for Rolldown integrated Vite for v6 & v7, only the sections with NRV in the title are applicable.

## Default Browser Target Change [NRV](#migration-from-v7) [​](#default-browser-target-change)

The default browser value of `build.target` and `'baseline-widely-available'`, is updated to newer browser version:

- Chrome 107 → 111
- Edge 107 → 111
- Firefox 104 → 114
- Safari 16.0 → 16.4

These browser versions align with [Baseline Widely Available](https://web-platform-dx.github.io/web-features/) feature sets as of 2026-01-01. In other words, they were all released about two and a half years ago.

## Rolldown [​](#rolldown)

Vite 8 uses [Rolldown](https://rolldown.rs/) and [Oxc](https://oxc.rs/) based tools instead of [esbuild](https://esbuild.github.io/) and [Rollup](https://rollupjs.org/).

### Gradual Migration [​](#gradual-migration)

The `rolldown-vite` package implements Vite 7 with Rolldown, without other Vite 8 changes. This can be used as an intermediate step to migrate to Vite 8. See [the Rolldown Integration guide](https://v7.vite.dev/guide/rolldown) in the Vite 7 docs to switch to `rolldown-vite` from Vite 7.

For users migrating from `rolldown-vite` to Vite 8, you can undo the dependency changes in `package.json` and update to Vite 8:

json```
{
  "devDependencies": {
    "vite": "npm:rolldown-vite@7.2.2"
    "vite": "^8.0.0"
  }
}
```

### Dependency Optimizer Now Uses Rolldown [​](#dependency-optimizer-now-uses-rolldown)

Rolldown is now used for dependency optimization instead of esbuild. Vite still supports [`optimizeDeps.esbuildOptions`](/config/dep-optimization-options#optimizedeps-esbuildoptions) for backward compatibility by converting it to [`optimizeDeps.rolldownOptions`](/config/dep-optimization-options#optimizedeps-rolldownoptions) automatically. `optimizeDeps.esbuildOptions` is now deprecated and will be removed in the future and we encourage you to migrate to `optimizeDeps.rolldownOptions`.

The following options are converted automatically:

- [`esbuildOptions.minify`](https://esbuild.github.io/api/#minify) -> [`rolldownOptions.output.minify`](https://rolldown.rs/reference/OutputOptions.minify)
- [`esbuildOptions.treeShaking`](https://esbuild.github.io/api/#tree-shaking) -> [`rolldownOptions.treeshake`](https://rolldown.rs/reference/InputOptions.treeshake)
- [`esbuildOptions.define`](https://esbuild.github.io/api/#define) -> [`rolldownOptions.transform.define`](https://rolldown.rs/reference/InputOptions.transform#define)
- [`esbuildOptions.loader`](https://esbuild.github.io/api/#loader) -> [`rolldownOptions.moduleTypes`](https://rolldown.rs/reference/InputOptions.moduleTypes)
- [`esbuildOptions.preserveSymlinks`](https://esbuild.github.io/api/#preserve-symlinks) -> [`!rolldownOptions.resolve.symlinks`](https://rolldown.rs/reference/InputOptions.resolve#symlinks)
- [`esbuildOptions.resolveExtensions`](https://esbuild.github.io/api/#resolve-extensions) -> [`rolldownOptions.resolve.extensions`](https://rolldown.rs/reference/InputOptions.resolve#extensions)
- [`esbuildOptions.mainFields`](https://esbuild.github.io/api/#main-fields) -> [`rolldownOptions.resolve.mainFields`](https://rolldown.rs/reference/InputOptions.resolve#mainfields)
- [`esbuildOptions.conditions`](https://esbuild.github.io/api/#conditions) -> [`rolldownOptions.resolve.conditionNames`](https://rolldown.rs/reference/InputOptions.resolve#conditionnames)
- [`esbuildOptions.keepNames`](https://esbuild.github.io/api/#keep-names) -> [`rolldownOptions.output.keepNames`](https://rolldown.rs/reference/OutputOptions.keepNames)
- [`esbuildOptions.platform`](https://esbuild.github.io/api/#platform) -> [`rolldownOptions.platform`](https://rolldown.rs/reference/InputOptions.platform)
- [`esbuildOptions.plugins`](https://esbuild.github.io/plugins/) -> [`rolldownOptions.plugins`](https://rolldown.rs/reference/InputOptions.plugins) (partial support)

You can get the options set by the compatibility layer from the `configResolved` hook:

js```
const plugin = {
  name: 'log-config',
  configResolved(config) {
    console.log('options', config.optimizeDeps.rolldownOptions)
  },
},
```

### JavaScript Transforms by Oxc [​](#javascript-transforms-by-oxc)

Oxc is now used for JavaScript transformation instead of esbuild. Vite still supports the [`esbuild`](/config/shared-options#esbuild) option for backward compatibility by converting it to [`oxc`](/config/shared-options#oxc) automatically. `esbuild` is now deprecated and will be removed in the future and we encourage you to migrate to `oxc`.

The following options are converted automatically:

- `esbuild.jsxInject` -> `oxc.jsxInject`
- `esbuild.include` -> `oxc.include`
- `esbuild.exclude` -> `oxc.exclude`
- [`esbuild.jsx`](https://esbuild.github.io/api/#jsx) -> [`oxc.jsx`](https://oxc.rs/docs/guide/usage/transformer/jsx)
`esbuild.jsx: 'preserve'` -> `oxc.jsx: 'preserve'`
- `esbuild.jsx: 'automatic'` -> `oxc.jsx: { runtime: 'automatic' }`
[`esbuild.jsxImportSource`](https://esbuild.github.io/api/#jsx-import-source) -> `oxc.jsx.importSource`

- `esbuild.jsx: 'transform'` -> `oxc.jsx: { runtime: 'classic' }`
[`esbuild.jsxFactory`](https://esbuild.github.io/api/#jsx-factory) -> `oxc.jsx.pragma`
- [`esbuild.jsxFragment`](https://esbuild.github.io/api/#jsx-fragment) -> `oxc.jsx.pragmaFrag`

- [`esbuild.jsxDev`](https://esbuild.github.io/api/#jsx-dev) -> `oxc.jsx.development`
- [`esbuild.jsxSideEffects`](https://esbuild.github.io/api/#jsx-side-effects) -> `oxc.jsx.pure`

- [`esbuild.define`](https://esbuild.github.io/api/#define) -> [`oxc.define`](https://oxc.rs/docs/guide/usage/transformer/global-variable-replacement#define)
- [`esbuild.banner`](https://esbuild.github.io/api/#banner) -> custom plugin using transform hook
- [`esbuild.footer`](https://esbuild.github.io/api/#footer) -> custom plugin using transform hook

The [`esbuild.supported`](https://esbuild.github.io/api/#supported) option is not supported by Oxc. If you need this option, please see [oxc-project/oxc#15373](https://github.com/oxc-project/oxc/issues/15373).

You can get the options set by the compatibility layer from the `configResolved` hook:

js```
const plugin = {
  name: 'log-config',
  configResolved(config) {
    console.log('options', config.oxc)
  },
},
```

Currently, the Oxc transformer does not support lowering native decorators as we are waiting for the specification to progress, see ([oxc-project/oxc#9170](https://github.com/oxc-project/oxc/issues/9170)).

Workaround for lowering native decoratorsYou can use [Babel](https://babeljs.io/) or [SWC](https://swc.rs/) to lower native decorators for the time being.

**Using Babel:**

npmYarnpnpmBunDenobash```
$ npm install -D @rolldown/plugin-babel @babel/plugin-proposal-decorators
```

bash```
$ yarn add -D @rolldown/plugin-babel @babel/plugin-proposal-decorators
```

bash```
$ pnpm add -D @rolldown/plugin-babel @babel/plugin-proposal-decorators
```

bash```
$ bun add -D @rolldown/plugin-babel @babel/plugin-proposal-decorators
```

bash```
$ deno add -D npm:@rolldown/plugin-babel npm:@babel/plugin-proposal-decorators
```

vite.config.tsts```
import { defineConfig } from 'vite'
import babel from '@rolldown/plugin-babel'

function decoratorPreset(options: Record<string, unknown>) {
  return {
    preset: () => ({
      plugins: [['@babel/plugin-proposal-decorators', options]],
    }),
    rolldown: {
      // Only run this transform if the file contains a decorator.
      filter: {
        code: '@',
      },
    },
  }
}

export default defineConfig({
  plugins: [babel({ presets: [decoratorPreset({ version: '2023-11' })] })],
})
```

**Using SWC:**

npmYarnpnpmBunDenobash```
$ npm install -D @rollup/plugin-swc @swc/core
```

bash```
$ yarn add -D @rollup/plugin-swc @swc/core
```

bash```
$ pnpm add -D @rollup/plugin-swc @swc/core
```

bash```
$ bun add -D @rollup/plugin-swc @swc/core
```

bash```
$ deno add -D npm:@rollup/plugin-swc npm:@swc/core
```

js```
import { defineConfig, withFilter } from 'vite'

export default defineConfig({
  // ...
  plugins: [
    withFilter(
      swc({
        swc: {
          jsc: {
            parser: { decorators: true, decoratorsBeforeExport: true },
            transform: { decoratorVersion: '2023-11' },
          },
        },
      }),
      // Only run this transform if the file contains a decorator.
      { transform: { code: '@' } },
    ),
  ],
})
```

#### esbuild Fallbacks [​](#esbuild-fallbacks)

`esbuild` is no longer directly used by Vite and is now an optional dependency. If you are using a plugin that uses the `transformWithEsbuild` function, you need to install `esbuild` as a `devDependency`. The `transformWithEsbuild` function is deprecated and will be removed in the future. We recommend migrating to the new `transformWithOxc` function instead.

### JavaScript Minification by Oxc [​](#javascript-minification-by-oxc)

The Oxc Minifier is now used for JavaScript minification instead of esbuild. You can use the deprecated [`build.minify: 'esbuild'`](/config/build-options#build-minify) option to switch back to esbuild. This configuration option will be removed in the future and you need install `esbuild` as a `devDependency` as Vite no longer relies on esbuild directly.

If you were using the `esbuild.minify*` options to control minification behavior, you can now use `build.rolldownOptions.output.minify` instead. If you were using the `esbuild.drop` option, you can now use [`build.rolldownOptions.output.minify.compress.drop*` options](https://oxc.rs/docs/guide/usage/minifier/dead-code-elimination).

Property mangling and its related options ([`mangleProps`, `reserveProps`, `mangleQuoted`, `mangleCache`](https://esbuild.github.io/api/#mangle-props)) are not supported by Oxc. If you need these options, please see [oxc-project/oxc#15375](https://github.com/oxc-project/oxc/issues/15375).

esbuild and Oxc Minifier make slightly different assumptions about source code. In case you suspect the minifier is causing breakage in your code, you can compare these assumptions here:

- [esbuild minify assumptions](https://esbuild.github.io/api/#minify-considerations)
- [Oxc Minifier assumptions](https://oxc.rs/docs/guide/usage/minifier.html#assumptions)

Please report any issues you find related to minification in your JavaScript apps.

### CSS Minification by Lightning CSS [​](#css-minification-by-lightning-css)

[Lightning CSS](https://lightningcss.dev/) is now used for CSS minification by default. You can use the [`build.cssMinify: 'esbuild'`](/config/build-options#build-cssminify) option to switch back to esbuild. Note that you need to install `esbuild` as a `devDependency`.

Lightning CSS supports better syntax lowering and your CSS bundle size might increase slightly.

### Consistent CommonJS Interop [​](#consistent-commonjs-interop)

The `default` import from a CommonJS (CJS) module is now handled in a consistent way.

If it matches one of the following conditions, the `default` import is the `module.exports` value of the importee CJS module. Otherwise, the `default` import is the `module.exports.default` value of the importee CJS module:

- The importer is `.mjs` or `.mts`.
- The closest `package.json` for the importer has a `type` field set to `module`.
- The `module.exports.__esModule` value of the importee CJS module is not set to true.

The previous behaviorIn development, if it matches one of the following conditions, the `default` import is the `module.exports` value of the importee CJS module. Otherwise, the `default` import is the `module.exports.default` value of the importee CJS module:

- *The importer is included in the dependency optimization* and `.mjs` or `.mts`.
- *The importer is included in the dependency optimization* and the closest `package.json` for the importer has a `type` field set to `module`.
- The `module.exports.__esModule` value of the importee CJS module is not set to true.

In build, the conditions were:

- The `module.exports.__esModule` value of the importee CJS module is not set to true.
- *`default` property of `module.exports` does not exist*.

(assuming [`build.commonjsOptions.defaultIsModuleExports`](https://github.com/rollup/plugins/tree/master/packages/commonjs#defaultismoduleexports) is not changed from the default `'auto'`)

See Rolldown's docs about this problem for more details: [Ambiguous `default` import from CJS modules - Bundling CJS | Rolldown](https://rolldown.rs/in-depth/bundling-cjs#ambiguous-default-import-from-cjs-modules).

This change may break some existing code importing CJS modules. You can use the deprecated `legacy.inconsistentCjsInterop: true` option to temporarily restore the previous behavior. If you find a package that is affected by this change, please report it to the package author or send them a pull request. Make sure to link to the Rolldown documentation above so that the author can understand the context.

### Removed Module Resolution Using Format Sniffing [​](#removed-module-resolution-using-format-sniffing)

When both `browser` and `module` fields are present in `package.json`, Vite used to resolve the field based on the content of the file and it used to pick the ESM file for browsers. This was introduced because some packages were using the `module` field to point to ESM files for Node.js and some other packages were using the `browser` field to point to UMD files for browsers. Given that the modern `exports` field solved this problem and is now adopted by many packages, Vite no longer uses this heuristic and always respects the order of the [`resolve.mainFields`](/config/shared-options#resolve-mainfields) option. If you were relying on this behavior, you can use the [`resolve.alias`](/config/shared-options#resolve-alias) option to map the field to the desired file or apply a patch with your package manager (e.g. `patch-package`, `pnpm patch`).

### Require Calls For Externalized Modules [​](#require-calls-for-externalized-modules)

`require` calls for externalized modules are now preserved as `require` calls and not converted to `import` statements. This is to preserve the semantics of `require` calls. If you want to convert them to `import` statements, you can use [Rolldown's built-in `esmExternalRequirePlugin`](https://rolldown.rs/builtin-plugins/esm-external-require), which is re-exported from `vite`.

js```
import { defineConfig, esmExternalRequirePlugin } from 'vite'

export default defineConfig({
  // ...
  plugins: [
    esmExternalRequirePlugin({
      external: ['react', 'vue', /^node:/],
    }),
  ],
})
```

See Rolldown's docs for more details: [`require` external modules - Bundling CJS | Rolldown](https://rolldown.rs/in-depth/bundling-cjs#require-external-modules).

### `import.meta.url` in UMD / IIFE [​](#import-met

... [Content truncated]