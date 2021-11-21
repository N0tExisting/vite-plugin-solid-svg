<h1 align="center">vite-plugin-solid-svg</h1>
<p align="center">Extend Vite with ability to use SVG files as Solid.js components.</p>

### Features:
- [SVGO](https://github.com/svg/svgo) optimization
- Hot Module Replacement support
- Support for `?url` and `?component` query string

#### Currently supported Vite version:

<p><code>2.4.4</code></p>

### Install

```bash
yarn add --dev vite-plugin-solid-svg
```

or

```bash
npm i -D vite-plugin-solid-svg
```

### Setup

```js
// vite.config.js
import solidPlugin from "vite-plugin-solid";
import solidSvg from "vite-plugin-solid-svg";

module.exports = {
  plugins: [
    solidPlugin(),
    solidSvg(),
  ],
};
```

#### Options

```js
SolidSvg({
  // Default behavior when importing `.svg` files, possible options are: 'url' and `component`
  defaultExport: 'component',
})
```

If you need to configure the `svgo` options, you can create a config file `svgo.config.js` in the project's root, following the instructions at [svgo docs](https://github.com/svg/svgo).

### Usage

Import as a Solid.js component:
```js
import MyIcon from './svgs/my-icon.svg';

const App = () => {
  return (
    <div>
        <h1> Title </h1>
        <MyIcon />
    </div>
  );
};

export default App;
```

Import as url:
```js
import myIconUrl from './svgs/my-icon.svg?url';

const App = () => {
  return (
    <div>
        <p>url to icon: {myIconUrl} </p>
    </div>
  );
};

export default App;
```

To import all svg inside a folder, use `[name].svg` as the file value. This will import an object, where the keys are the matched names (without extension), and the values are the corresponding component or url.
```js
import iconsDic from './svgs/[name].svg';

// Will Result in:

iconsDic = {
  icon1: () => import("./svgs/icon1.svg"),
  icon2: () => import("./svgs/icon2.svg")
}

const App = () => {
  const Icon1 = lazy(() => iconsDic.icon1())
  return (
    <div>
        <p>hello</p><Icon1 />
    </div>
  );
};

export default App;
```

### Why

In a Solidjs + vite project, you can easily add an svg image using:

```
import iconUrl from '/svgs/icon.svg'

const App = () => {
  return (
    <div>
      <img href={iconUrl}>
    </div>
  )
}
```

However the fill color of the image cannot be overriden. Importing the svg as a component solves this and allows css styles to cascade into the svg content. Furthermore there may be situations where you'll need to ensure the image has been fully loaded, for example, before starting an animation. This module gives you a component that you can control when it's loaded.

## Credits
This plugin is based on the work from the following projects:
- https://github.com/visualfanatic/vite-svg
- https://github.com/cobbcheng/vite-plugin-svgstring
