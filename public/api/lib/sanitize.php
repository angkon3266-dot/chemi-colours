<?php
declare(strict_types=1);

/**
 * Whitelist HTML sanitiser for rich-text fields.
 *
 * Admin-entered rich text is rendered with dangerouslySetInnerHTML on the
 * front end, so it is sanitised here on the way IN to the database. Anything
 * not explicitly allowed is stripped.
 */

const ALLOWED_TAGS = [
    'p'   => [],
    'br'  => [],
    'strong' => [], 'b' => [],
    'em' => [], 'i' => [],
    'u'  => [],
    'ul' => [], 'ol' => [], 'li' => [],
    'h2' => [], 'h3' => [], 'h4' => [],
    'blockquote' => [],
    'a'  => ['href', 'title', 'target', 'rel'],
    'span' => [],
    // Journal posts can now embed images mid-paragraph. width/height are
    // whatever the browser reported on insert, kept only so the layout
    // doesn't jump while the real image loads.
    'img' => ['src', 'alt', 'title', 'width', 'height'],
];

function sanitize_html(string $html): string
{
    $html = trim($html);
    if ($html === '') {
        return '';
    }

    $doc = new DOMDocument();
    libxml_use_internal_errors(true);
    // Wrap so DOMDocument keeps it as a fragment and treats input as UTF-8.
    $doc->loadHTML(
        '<?xml encoding="utf-8" ?><div id="chemi-root">' . $html . '</div>',
        LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
    );
    libxml_clear_errors();

    $root = $doc->getElementById('chemi-root');
    if (!$root) {
        return '';
    }

    clean_node($root);

    $out = '';
    foreach ($root->childNodes as $child) {
        $out .= $doc->saveHTML($child);
    }
    return trim($out);
}

function clean_node(DOMNode $node): void
{
    // Walk a static copy: we mutate the tree while iterating.
    foreach (iterator_to_array($node->childNodes) as $child) {
        if ($child instanceof DOMText) {
            continue;
        }

        if ($child instanceof DOMComment) {
            $child->parentNode?->removeChild($child);
            continue;
        }

        if (!$child instanceof DOMElement) {
            $child->parentNode?->removeChild($child);
            continue;
        }

        $tag = strtolower($child->nodeName);

        // These carry executable or styling payloads: drop the element and
        // everything inside it, rather than unwrapping to its text.
        if (in_array($tag, ['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template'], true)) {
            $child->parentNode?->removeChild($child);
            continue;
        }

        if (!array_key_exists($tag, ALLOWED_TAGS)) {
            // Unknown tag: keep its content, drop the tag itself. Clean it
            // BEFORE unwrapping — the promoted children leave this function's
            // loop (which walks a snapshot taken at the top) and are never
            // visited again, so a <script> nested inside an unknown wrapper
            // like <div> or <table> would otherwise survive untouched.
            clean_node($child);
            while ($child->firstChild) {
                $child->parentNode?->insertBefore($child->firstChild, $child);
            }
            $child->parentNode?->removeChild($child);
            continue;
        }

        foreach (iterator_to_array($child->attributes ?? []) as $attr) {
            $name = strtolower($attr->nodeName);
            if (!in_array($name, ALLOWED_TAGS[$tag], true)) {
                $child->removeAttribute($attr->nodeName);
                continue;
            }
            if (($name === 'href' || $name === 'src') && !safe_url($attr->nodeValue ?? '')) {
                $child->removeAttribute($attr->nodeName);
            }
            // width/height must be plain numbers — nothing that could carry
            // a CSS expression or other payload through an attribute value.
            if (($name === 'width' || $name === 'height') && !preg_match('/^\d{1,4}$/', $attr->nodeValue ?? '')) {
                $child->removeAttribute($attr->nodeName);
            }
        }

        // Links that open a new tab must not leak the opener.
        if ($tag === 'a' && $child->getAttribute('target') === '_blank') {
            $child->setAttribute('rel', 'noopener noreferrer');
        }

        clean_node($child);
    }
}

/** Only http(s), mailto, tel and site-relative links survive. */
function safe_url(string $url): bool
{
    $u = trim($url);
    if ($u === '') {
        return false;
    }
    // Exactly one leading slash: "//evil.example/x" is protocol-relative and
    // browsers resolve it to https://evil.example/x, not a same-site path.
    if (preg_match('#^/(?!/)#', $u) || str_starts_with($u, '#')) {
        return true;
    }
    return (bool) preg_match('#^(https?://|mailto:|tel:)#i', $u);
}

/**
 * Google's "Embed a map" panel hands you a whole <iframe> tag. strip_tags()
 * would throw the URL away with it, so pull the src out first and let people
 * paste whichever form they happen to have.
 */
function extract_map_url(string $raw): string
{
    $v = trim($raw);
    if ($v === '') {
        return '';
    }
    if (preg_match('/<iframe[^>]*\ssrc=["\']([^"\']+)["\']/i', $v, $m)) {
        return mb_substr(html_entity_decode($m[1]), 0, 1000);
    }
    return mb_substr(strip_tags($v), 0, 1000);
}

/** Used for plain-text fields that must never contain markup. */
function plain(string $text, int $max = 5000): string
{
    $t = strip_tags($text);
    $t = preg_replace('/\s+/u', ' ', $t) ?? '';
    return trim(mb_substr($t, 0, $max));
}
