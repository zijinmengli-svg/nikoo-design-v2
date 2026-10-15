(function (root, factory) {
    var api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.ProjectMedia = api;
    }
}(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    var DEFAULT_DIMENSIONS = { width: 3840, height: 2160 };
    var PORTRAIT_PROJECT_DIMENSIONS = { width: 2880, height: 2100 };
    var MIAOSHENG_COVER_DIMENSIONS = { width: 2880, height: 1620 };

    function isPositiveNumber(value) {
        return typeof value === 'number' && isFinite(value) && value > 0;
    }

    function getImageDimensions(item) {
        item = item || {};

        if (isPositiveNumber(item.width) && isPositiveNumber(item.height)) {
            return { width: item.width, height: item.height };
        }

        var src = String(item.src || '').split(/[?#]/)[0];

        if (/images\/miaosheng\/02-01-1\.webp$/i.test(src)) {
            return {
                width: MIAOSHENG_COVER_DIMENSIONS.width,
                height: MIAOSHENG_COVER_DIMENSIONS.height
            };
        }

        if (/images\/miaosheng\/02-[^/]+\.webp$/i.test(src) ||
            /images\/pet\/03-[^/]+\.webp$/i.test(src)) {
            return {
                width: PORTRAIT_PROJECT_DIMENSIONS.width,
                height: PORTRAIT_PROJECT_DIMENSIONS.height
            };
        }

        return {
            width: DEFAULT_DIMENSIONS.width,
            height: DEFAULT_DIMENSIONS.height
        };
    }

    function getLoadingHints(index) {
        if (index === 0) {
            return { loading: 'eager', fetchPriority: 'high' };
        }
        return { loading: 'lazy', fetchPriority: 'low' };
    }

    function resetToTop(targetWindow) {
        if (!targetWindow) return;

        try {
            if (targetWindow.history && 'scrollRestoration' in targetWindow.history) {
                targetWindow.history.scrollRestoration = 'manual';
            }
        } catch (error) {
            /* Some embedded browsers expose history as read-only. */
        }

        if (typeof targetWindow.scrollTo === 'function') {
            targetWindow.scrollTo(0, 0);
        }
    }

    return {
        getImageDimensions: getImageDimensions,
        getLoadingHints: getLoadingHints,
        resetToTop: resetToTop
    };
}));
