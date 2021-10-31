'use strict';

var soup = require('soup');
var urlencode = require('urlencode');
var _ = require('underscore');
var request = require('sync-request');
var crypto = require('crypto');

var log = hexo.log || log.log;

hexo.extend.filter.register('after_post_render', async function (postInfo) {
    var linkShortConfig = hexo.config.link_short;
    if (!linkShortConfig || !linkShortConfig.enable) {
        return;
    }

    validateConfigurationsAndFailFast(linkShortConfig);
    let skips = linkShortConfig.skips || []
    skips = skips.map(s => {
        return s.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&')
    }).map(s => s.replace(/\*/g, '.*?')).map(s => { return new RegExp(`^${s}$`) })

    var options = {
        enable: linkShortConfig.enable,
        selectors: linkShortConfig.selectors ? linkShortConfig.selectors : null,
        skips: skips,
        yoursApi: linkShortConfig.yoursApi,
        token: linkShortConfig.token,
        username: linkShortConfig.username,
        password: linkShortConfig.password,
        bulkShortener: linkShortConfig.bulkShortener,
        forceShort: Boolean(linkShortConfig.forceShort),
        isRunningInLocalServerMode: (process.argv.indexOf('server') > -1 || process.argv.indexOf('s') > -1)
    };

    // console.log(options);
    // console.log(postInfo);

    var contentKeys = ['content', 'more', 'excerpt'];
    contentKeys.forEach((contentKey) => {
        postInfo[contentKey] = getPostHtmlWithShortLink(options, postInfo, postInfo[contentKey]);
    });

    log.log("Update Short Links: " + postInfo.path);
});

function validateConfigurationsAndFailFast(linkShortConfig) {
    if (!linkShortConfig.yoursApi) {
        throw new Error("Api should not be empty, please specify the api in the configuration.");
    }

    if (!linkShortConfig.token && !(linkShortConfig.username && linkShortConfig.password)) {
        throw new Error("Token or Username/Password should not be empty, please specify the information in the configuration.");
    }
}

function getPostHtmlWithShortLink(options, postInfo, postContent) {
    // hexo s
    if (options.isRunningInLocalServerMode && !options.forceShort) {
        return postContent;
    }
    var postSoup = new soup(postContent);
    if (options.bulkShortener) {
        let allLinks = new Set();
        Object.keys(options.selectors).forEach((selector) => {
            var attributeName = options.selectors[selector];
            if (attributeName) {
                postSoup.setAttribute(selector, attributeName, (link) => {
                    if (isExternalLink(link)) allLinks.add(link);
                    return link;
                });
            }
        });
        if (allLinks.size) {
            let linkMap = getShortLinks(options, Array.from(allLinks));
            Object.keys(options.selectors).forEach((selector) => {
                var attributeName = options.selectors[selector];
                if (attributeName) {
                    postSoup.setAttribute(selector, attributeName, (link) => {
                        let fixedAssetPath = linkMap[link];
                        if (fixedAssetPath) {
                            log.log(`Short link: ${link} => ${linkMap[link]}`);
                            return fixedAssetPath
                        }
                        return link;
                    });
                }
            });    
        }
    } else {
        Object.keys(options.selectors).forEach((selector) => {
            var attributeName = options.selectors[selector];
            if (attributeName) {
                postSoup.setAttribute(selector, attributeName, (link) => {
                    var fixedAssetPath = shortLink(options, postInfo, link);
                    if (link !== fixedAssetPath) {
                        log.log(`Short link: ${link} => ${fixedAssetPath}`);
                    }
                    return fixedAssetPath;
                });
            }
        });
    }
    return postSoup.toString();
}

function isExternalLink(link) {
    if (!link || link.length == 0) {
        return false;
    }
    // If the link is a data URI, we don't need to do anything.
    if (isDataURI(link) || isHashURI(link)) {
        return false;
    }

    return /^[a-z]+:\/\/\S+/i.test(link);
}

function shortLink(options, postInfo, link) {
    if (!isExternalLink(link)) {
        return link;
    }

    for (let r of options.skips) {
        if (r.test(link)) {
            console.log('Skip ' + link);
            return link;
        }
    }
    return getShortLink(options, link) || link;
}
function getShortLinks(options, links) {
    // It need plugin bulk_api_bulkshortener
    // https://github.com/kur4ge/bulk_api_bulkshortener
    let params;
    if (options.token) {
        let md5 = crypto.createHash('md5');
        let timestamp = parseInt(new Date().getTime() / 1000);
        md5.update(`${timestamp}${options.token}`);
        params = {
            timestamp: timestamp,
            signature: md5.digest('hex')
        }
    } else {
        params = {
            timestamp: options.username,
            signature: options.password
        }
    }
    params = Object.assign(params, {
        action: 'bulkshortener',
        format: 'json',
        urls: links
    })
    var res = request('GET', options.yoursApi + '?' + urlencode.stringify(params));
    let data = JSON.parse(res.getBody('utf-8')).data;
    let ret = {};
    data.forEach(item => {
        if (item.status !== 'success') {
            log.warn(item.message)
        }
        if (item.url.url && item.shorturl) {
            ret[item.url.url] = item.shorturl;
        }
    });
    return ret;
}
function getShortLink(options, link) {
    let params;
    if (options.token) {
        let md5 = crypto.createHash('md5');
        let timestamp = parseInt(new Date().getTime() / 1000);
        md5.update(`${timestamp}${options.token}`);
        params = {
            timestamp: timestamp,
            signature: md5.digest('hex')
        }
    } else {
        params = {
            timestamp: options.username,
            signature: options.password
        }
    }
    params = Object.assign(params, {
        action: 'shorturl',
        format: 'json',
        url: link
    })
    var res = request('GET', options.yoursApi + '?' + urlencode.stringify(params));
    return JSON.parse(res.getBody('utf-8')).shorturl;
}

function isDataURI(link) {
    return link.indexOf('data:') === 0;
}

function isHashURI(link) {
    return link.indexOf('#') === 0;
}
