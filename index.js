"use strict";
const nodePath = require("path");
const fg = require("fast-glob");
const { readFile } = require("fs/promises");
const { optimize, loadConfig } = require("svgo");
const { URL } = require("url");
const { transformAsync } = require("@babel/core");
const solid = require("babel-preset-solid");

/**
 * @param {string} source The svg source
 * @param {{id: string, root: string}} files The svg source
 * @returns {string} A .js file that exports the svg as a component
 */
async function compileSvg(source, files) {
  //* Stolen from https://github.com/antfu/unplugin-icons/blob/main/src/core/compilers/solid.ts#L4
  const svgWithProps = source
    .trim()
    .replace(/([{}])/g, "{'$1'}")
    .replace(/(?<=<svg.*?)(>)/i, "{...props}>");
  const raw = `
export default (props = {}) => {
  return (<>${svgWithProps}</>)
}
`;

  /** @type {import('@babel/core').TransformOptions} */
  const opts = {
    babelrc: false,
    configFile: false,
    root: files.root,
    filename: files.id,
    sourceFileName: files.id,
    presets: [solid],
    sourceMaps: true,
    // Vite handles sourcemap flattening
    inputSourceMap: false,
  };
  const { code, map } = await transformAsync(raw, opts);

  return { code, map };
}

async function optimizeSvg(content, path) {
  const config = await loadConfig();
  const { data } = await optimize(content, Object.assign({}, config, { path }));
  return data;
}

/**
 * @param {string} path the path to the svg import
 * @param {"url" | "comp"} mode the current mode of the plugin.
 * @returns {[boolean, {mode: "url" | "comp", dir: boolean, inline: boolean}, URL]}
 */
function isSvgImport(path, mode) {
  const url = new URL(nodePath.resolve("/", path));
  const isImport = url.pathname.endsWith(".svg");
  /** @type {boolean} */
  let urlMode;
  if (mode === "url") {
    urlMode = url.searchParams.has("comp") || url.searchParams.has("component");
  } else {
    urlMode = url.searchParams.has("url");
  }
  /** @type {{mode: "url" | "comp", dir: boolean, inline: boolean}} */
  const data = {
    mode: urlMode ? "url" : "comp",
    dir: url.pathname.endsWith("[name].svg"),
    inline: url.searchParams.has("inline"),
  };
  return [isImport, data, url];
}

/**
 * @param {import('./index').Options} options The Plugin options
 * @returns {import('vite').Plugin} The Plugin
 */
module.exports = (options = {}) => {
  const defaultExport =
    options.defaultExport === "component"
      ? "comp"
      : options.defaultExport || "comp";
  const svgRegex = /(?:\[name\])?\.svg(?:\?(comp(?:onent)?|url))?$/;

  /** @type {import('vite').ResolvedConfig} */
  let config;

  return {
    enforce: "pre",
    name: "solid-svg",
    configResolved(cfg) {
      config = cfg;
    },
    resolveId(id, importer) {
      const [isImport, data] = isSvgImport(id, defaultExport);

      if (!isImport) {
        return null;
      }
      if (data.dir) {
        /**
         * when build is from `npm run dev`, the id is an absolute path,
         * with root the project dir, and the importer
         * is the absolute path to the index.html, with root the system root.
         * When build is from `npm run build, the id the same declared in code,
         * and the importer is the absolute path to the importer.
         * If you know a better way to get the absolute path to a "virtual" file, let me know
         */
        const importerDir = nodePath.dirname(importer);
        const absPath = nodePath.isAbsolute(id)
          ? nodePath.join(importerDir, id)
          : nodePath.resolve(importerDir, id);
        return absPath;
      }
    },
    async load(id) {
      const [isImport, data] = isSvgImport(id, defaultExport);

      if (!isImport) {
        return null;
      }

      const type = data.mode;

      if (data.dir) {
        const pattern = id.replace(svgRegex, "*.svg");
        const files = fg.sync(pattern);
        const regex = new RegExp(id.replace(svgRegex, "(.*)\\.svg"));
        let source = "export default {\n";
        files.forEach((file) => {
          const matched = regex.exec(file);
          const name = matched[1];
          const qs = type ? `?${type}` : "";
          source += `"${name}": () => import("${file}${qs}"),\n`;
        });
        source += "}";
        return source;
      }

      if (type === "comp") {
        const idWithoutQuery = id.replace(/\.svg\?.*$/, ".svg");
        const code = await readFile(idWithoutQuery);
        const svg = await optimizeSvg(code, idWithoutQuery);
        const result = await compileSvg(svg, { root: config.root, id });

        return result;
      }
    },
    async transform(source, id) {
      const [isImport, data] = isSvgImport(id, defaultExport);

      if (!isImport) {
        return null;
      }

      if (data.mode === "url") {
        return source;
      }
    },
  };
};
