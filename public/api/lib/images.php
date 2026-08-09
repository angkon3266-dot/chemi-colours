<?php
declare(strict_types=1);

/**
 * WebP conversion for uploaded photographs.
 *
 * WebP is typically 25–70% smaller than the equivalent JPEG or PNG at the same
 * visual quality, which matters a lot to a buyer opening the catalogue on a
 * phone. Conversion is best-effort: if GD cannot read a file, the original is
 * kept and nothing breaks.
 */

const WEBP_QUALITY = 82;
/** Anything wider than this is scaled down first — no page needs more. */
const MAX_IMAGE_WIDTH = 2000;

function webp_supported(): bool
{
    if (!function_exists('imagewebp') || !function_exists('gd_info')) {
        return false;
    }
    $info = gd_info();
    return !empty($info['WebP Support']);
}

/**
 * Converts an image file to WebP beside itself.
 *
 * @return string|null the new filename, or null if it could not be converted
 */
function convert_to_webp(string $dir, string $filename): ?string
{
    if (!webp_supported()) {
        return null;
    }
    $path = $dir . '/' . $filename;
    if (!is_file($path)) {
        return null;
    }

    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    if ($ext === 'webp') {
        return null; // already done
    }
    if (!in_array($ext, ['jpg', 'jpeg', 'png'], true)) {
        return null; // GIF may be animated; SVG is not raster
    }

    try {
        $img = match ($ext) {
            'png' => @imagecreatefrompng($path),
            default => @imagecreatefromjpeg($path),
        };
        if (!$img) {
            return null;
        }

        // Preserve transparency when the source has it.
        if ($ext === 'png') {
            imagepalettetotruecolor($img);
            imagealphablending($img, false);
            imagesavealpha($img, true);
        }

        $w = imagesx($img);
        $h = imagesy($img);
        if ($w > MAX_IMAGE_WIDTH) {
            $newH = (int) round($h * (MAX_IMAGE_WIDTH / $w));
            $resized = imagescale($img, MAX_IMAGE_WIDTH, $newH);
            if ($resized) {
                imagedestroy($img);
                $img = $resized;
                if ($ext === 'png') {
                    imagealphablending($img, false);
                    imagesavealpha($img, true);
                }
            }
        }

        $webpName = pathinfo($filename, PATHINFO_FILENAME) . '.webp';
        $webpPath = $dir . '/' . $webpName;

        // Never clobber an unrelated file that already has this name.
        if (is_file($webpPath)) {
            $webpName = pathinfo($filename, PATHINFO_FILENAME) . '-' . bin2hex(random_bytes(3)) . '.webp';
            $webpPath = $dir . '/' . $webpName;
        }

        $ok = imagewebp($img, $webpPath, WEBP_QUALITY);
        imagedestroy($img);

        if (!$ok || !is_file($webpPath)) {
            return null;
        }
        // A pathological source can encode larger than the original.
        if (filesize($webpPath) >= filesize($path)) {
            @unlink($webpPath);
            return null;
        }
        @chmod($webpPath, 0644);
        return $webpName;
    } catch (Throwable $e) {
        error_log('[chemi-images] ' . $e->getMessage());
        return null;
    }
}

/**
 * One-time pass over images uploaded before conversion existed.
 * Originals are left on disk; only the database pointer moves.
 *
 * @return array{converted:int, skipped:int, savedBytes:int}
 */
function convert_existing_images(string $dir, int $limit = 200): array
{
    $converted = 0;
    $skipped = 0;
    $saved = 0;

    $rows = db()->query(
        "SELECT id, filename FROM media
         WHERE kind = 'image' AND external_url = '' AND filename <> ''
           AND filename NOT LIKE '%.webp'
         LIMIT " . max(1, min(1000, $limit))
    )->fetchAll();

    $update = db()->prepare(
        "UPDATE media SET filename = ?, mime = 'image/webp', size_bytes = ? WHERE id = ?"
    );

    foreach ($rows as $row) {
        $old = $dir . '/' . $row['filename'];
        $oldSize = is_file($old) ? (int) filesize($old) : 0;
        $new = convert_to_webp($dir, (string) $row['filename']);
        if ($new === null) {
            $skipped++;
            continue;
        }
        $newSize = (int) filesize($dir . '/' . $new);
        $update->execute([$new, $newSize, $row['id']]);
        $saved += max(0, $oldSize - $newSize);
        $converted++;
    }

    return ['converted' => $converted, 'skipped' => $skipped, 'savedBytes' => $saved];
}
