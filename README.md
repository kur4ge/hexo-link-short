# hexo-asset-path

[![npm version](https://badge.fury.io/js/hexo-asset-path.svg)](http://badge.fury.io/js/@kur4ge/hexo-link-short)

This plugin can automatically extract external links in articles, and use YOURS api to automatically shrink them into short links.

## Installation

``` bash
$ npm install @kur4ge/hexo-link-short --save
```

## Usage

### Setting up the configuration in _config.ymal
```
link_short:
  enable: true

  # When forceShort is true, link_short will also work when serving locally(hexo s).
  forceShort: false
  
  # yoursApi url
  yoursApi: https://yourls/yourls-api.php

  # yours Token, you can found in https://yourls/admin/tools.php
  token: ********
  # or you can set username and password
  username:
  password:

  # Need install plugin https://github.com/kur4ge/bulk-shortener in yourls
  # When enabled, multiple links will be shortened in one request
  bulkShortener: true

  # Selectors and attribute names for getting the elements to update.
  selectors:
    a[href]: href
```

### Debugging
The posts and links we updated is outputted to the hexo log. Just simply enable debug mode and logging in hexo, then you can see it.
```
hexo s --debug --log
```

## License

BSD v3
