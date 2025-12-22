<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

try {
    require __DIR__ . '/config.php';

        $sql = "SELECT id, nombre, precio, descripcion, especificaciones, imagenesPeque, imagenInterna, destacado,
                activo, oferta_pct, oferta_desde, oferta_hasta
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

    $now = new DateTimeImmutable('now');
    $data = array_map(function ($r) use ($toBool, $toArray, $now) {
        $base = isset($r['precio']) ? (float)$r['precio'] : 0;
        $offer = (int)($r['oferta_pct'] ?? 0);
        $desde = !empty($r['oferta_desde']) ? new DateTimeImmutable($r['oferta_desde']) : null;
        $hasta = !empty($r['oferta_hasta']) ? new DateTimeImmutable($r['oferta_hasta']) : null;
        $activeOffer = $offer > 0 && (!$desde || $now >= $desde) && (!$hasta || $now <= $hasta);
        $final = $activeOffer ? max(0, $base * (1 - $offer/100)) : $base;
        return [
            'id' => strval($r['id']),
            'title' => $r['nombre'] ?? '',
            'precio' => $final,
            'precioBase' => $base,
            'oferta_pct' => (int)($r['oferta_pct'] ?? 0),
            'descripcion' => $r['descripcion'] ?? '',
            'especificaciones' => $toArray($r['especificaciones'] ?? null),
            'imagenesPeque' => $toArray($r['imagenesPeque'] ?? null),
            'imagenInterna' => $r['imagenInterna'] ?? null,
            'destacado' => $toBool($r['destacado'] ?? false),
        ];
    }, $rows);

    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error del servidor', 'detail' => $e->getMessage()]);
}
