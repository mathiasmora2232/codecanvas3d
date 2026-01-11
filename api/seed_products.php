<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/config.php';

try {
    $pdo = pdo();

    // Crear tabla productos si no existe
    $pdo->exec("CREATE TABLE IF NOT EXISTS productos (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        precio DECIMAL(10,2) NOT NULL DEFAULT 0,
        descripcion TEXT NULL,
        especificaciones TEXT NULL,
        imagenInterna VARCHAR(255) NULL,
        imagenesPeque TEXT NULL,
        destacado TINYINT(1) NOT NULL DEFAULT 0,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        stock INT NOT NULL DEFAULT 0,
        oferta_pct TINYINT UNSIGNED NOT NULL DEFAULT 0,
        oferta_desde DATETIME NULL,
        oferta_hasta DATETIME NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Evitar duplicados: solo seed si está vacío
    $count = (int)$pdo->query('SELECT COUNT(*) FROM productos')->fetchColumn();
    if ($count > 0) { echo json_encode(['ok'=>true,'seeded'=>false,'message'=>'La tabla productos ya tiene datos']); exit; }

    $jsonPath = dirname(__DIR__) . '/data/products.json';
    if (!file_exists($jsonPath)) { http_response_code(404); echo json_encode(['error'=>'No se encontró data/products.json']); exit; }

    $raw = file_get_contents($jsonPath);
    $items = json_decode($raw, true);
    if (!is_array($items)) { http_response_code(400); echo json_encode(['error'=>'JSON inválido en products.json']); exit; }

    $stmt = $pdo->prepare('INSERT INTO productos (nombre, precio, descripcion, especificaciones, imagenInterna, imagenesPeque, destacado, activo, stock, oferta_pct, oferta_desde, oferta_hasta) 
        VALUES (:n,:p,:d,:e,:ii,:ip,:dest,:act,:st,:ofp,:ofd,:ofh)');

    $toArray = function ($v): array {
        if ($v === null) return [];
        if (is_array($v)) return $v;
        $s = trim((string)$v);
        if ($s === '') return [];
        $json = json_decode($s, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($json)) return $json;
        $parts = preg_split('/[;,]+\s*/', $s);
        return array_values(array_filter(array_map('trim', $parts), fn($x)=>$x!==''));
    };

    foreach ($items as $it) {
        $nombre = (string)($it['title'] ?? $it['nombre'] ?? 'Producto');
        $precio = (float)($it['precio'] ?? $it['price'] ?? 0);
        $descripcion = isset($it['descripcion']) ? (string)$it['descripcion'] : (isset($it['description']) ? (string)$it['description'] : null);
        $especificaciones = isset($it['especificaciones']) ? json_encode($toArray($it['especificaciones']), JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES) : null;
        $imagenInterna = isset($it['imagenInterna']) ? (string)$it['imagenInterna'] : (isset($it['image']) ? (string)$it['image'] : null);
        $imagenesPeque = json_encode($toArray($it['imagenesPeque'] ?? $it['thumbnails'] ?? []), JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
        $destacado = (int)(($it['destacado'] ?? $it['featured'] ?? false) ? 1 : 0);
        $activo = (int)(($it['activo'] ?? true) ? 1 : 0);
        $stock = (int)($it['stock'] ?? 10);
        $oferta_pct = (int)($it['oferta_pct'] ?? 0);
        $oferta_desde = isset($it['oferta_desde']) ? (string)$it['oferta_desde'] : null;
        $oferta_hasta = isset($it['oferta_hasta']) ? (string)$it['oferta_hasta'] : null;

        $stmt->execute([
            ':n'=>$nombre,
            ':p'=>$precio,
            ':d'=>$descripcion,
            ':e'=>$especificaciones,
            ':ii'=>$imagenInterna,
            ':ip'=>$imagenesPeque,
            ':dest'=>$destacado,
            ':act'=>$activo,
            ':st'=>$stock,
            ':ofp'=>$oferta_pct,
            ':ofd'=>$oferta_desde,
            ':ofh'=>$oferta_hasta,
        ]);
    }

    echo json_encode(['ok'=>true,'seeded'=>true,'inserted'=>count($items)]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error'=>'Error al hacer seed','detail'=>$e->getMessage()]);
}
