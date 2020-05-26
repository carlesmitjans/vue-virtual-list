export function isScrollable (node) {
    const scrollRegex = /(auto|scroll)/;

    function getStyle (node, prop) {
        getComputedStyle(node, null).getPropertyValue(prop);
    }

    return (
        scrollRegex.test(getStyle(node, 'overflow')) ||
        scrollRegex.test(getStyle(node, 'overflow-x')) ||
        scrollRegex.test(getStyle(node, 'overflow-y'))
    );
};

export function getFirstScrollableParent (node) {
    const parentNode = node && node.parentNode;
    if (!parentNode || parentNode === document.body) {
        return document.body;
    } else if (isScrollable(parentNode)) {
        return parentNode;
    } else {
        return getFirstScrollableParent(parentNode);
    }
};
