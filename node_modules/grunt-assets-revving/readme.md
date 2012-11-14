# grunt-assets-revving

## Overview

Searches requested files for linked CSS and JS assets, appending a timestamp query string to each asset's URL. Attempts to ignore external resources.

## Installation

Install this grunt plugin next to your project's gruntfile with:

`npm install grunt-assets-revving`

Then add this line somewhere in your `grunt.js`:

```javascript
grunt.loadNpmTasks('grunt-assets-revving');
```

Inside your `grunt.js` file add a section named `rev`.

### files ```string|array```

Array of your static files (or string for single file).

## Config Example

``` javascript
rev: {
  assets: {
    files: [
      'index.html',
      'subdir/index.html'
    ],
  }
}
```

## Usage

Running `grunt rev` will scan `index.html` and `subdir/index.html` line-by-line looking for linked `.css` and `.js` files. If any are found, a Unix timestamp is appended to their URL and the file is written to disk, overwriting the source file. Make sure to save changes to files before running!

---

## License

Copyright (c) 2012 Chris Contolini

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.