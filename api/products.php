<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

try {
    require __DIR__ . '/config.php';

        $sql = "SELECT id, nombre, precio, descripcion, especificaciones, imagenesPeque, imagenInterna, destacado,
                activo, stock, oferta_pct, oferta_desde, oferta_hasta
            FROM productos WHERE COALESCE(activo,1)=1 ORDER BY id DESC";
    $stmt = pdo()->prepare($sql);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    // Normalizadores para adaptar columnas a la estructura usada por el frontend
    $toBool = function ($v): bool {
        if (is_bool($v)) return $v;
        $v = strtolower(trim((string)$v));
        return in_array($v, ['1','true','t','yes','y','si','sí','on'], true);
    };
    $toArray = function ($v): array {
        if ($v === null) return [];
        if (is_array($v)) return $v;
        $s = (string)$v;
        $s = trim($s);
        if ($s === '') return [];
        // Intentar JSON
        $json = json_decode($s, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($json)) return $json;
        // Separado por ; o ,
        $parts = preg_split('/[;,]+\s*/', $s);
        return array_values(array_filter(array_map('trim', $parts), fn($x)=>$x!==''));
    };

    // Limpieza adicional de strings con escapes o comillas redundantes
    $cleanItem = function($s): string {
        $s = trim((string)$s);
        if ($s === '') return '';
        // Si parece un JSON string, intentar decodificarlo
        $decoded = json_decode($s, true);
        if (json_last_error() === JSON_ERROR_NONE && is_string($decoded)) {
            $s = $decoded;
        } else {
            // Quitar comillas alrededor y desescapar \" -> "
            $s = preg_replace('/^\"|\"$/', '"', $s); // no hace nada si no hay comillas
            $s = preg_replace('/^"(.*)"$/', '$1', $s);
            $s = str_replace('\\"', '"', $s);
            $s = preg_replace('/\\{2,}/', '\\', $s);
        }
        return $s;
    };

    $now = new DateTimeImmutable('now');
    $data = array_map(function ($r) use ($toBool, $toArray, $now) {
        $base = isset($r['precio']) ? (float)$r['precio'] : 0;
        $offer = (int)($r['oferta_pct'] ?? 0);
        $desde = !empty($r['oferta_desde']) ? new DateTimeImmutable($r['oferta_desde']) : null;
        $hasta = !empty($r['oferta_hasta']) ? new DateTimeImmutable($r['oferta_hasta']) : null;
        $activeOffer = $offer > 0 && (!$desde || $now >= $desde) && (!$hasta || $now <= $hasta);
        $final = $activeOffer ? max(0, $base * (1 - $offer/100)) : $base;
        $stock = (int)($r['stock'] ?? 0);
        $lowThreshold = 5;
        $stockState = $stock <= 0 ? 'sin_stock' : ($stock <= $lowThreshold ? 'poco_stock' : 'stock_ok');
        $specs = array_map($cleanItem, $toArray($r['especificaciones'] ?? null));
        return [
            'id' => strval($r['id']),
            'title' => $r['nombre'] ?? '',
            'precio' => $final,
            'precioBase' => $base,
            'precioConDescuento' => $activeOffer ? $final : null,
            'oferta_pct' => (int)($r['oferta_pct'] ?? 0),
            'oferta_activa' => $activeOffer,
            'descripcion' => $r['descripcion'] ?? '',
            'especificaciones' => $specs,
            'imagenesPeque' => $toArray($r['imagenesPeque'] ?? null),
            'imagenInterna' => $r['imagenInterna'] ?? null,
            'destacado' => $toBool($r['destacado'] ?? false),
            'stock' => $stock,
            'stockState' => $stockState,
        ];
    }, $rows);

    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error del servidor', 'detail' => $e->getMessage()]);
}
