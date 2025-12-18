<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require __DIR__ . '/config.php';

try {
    // Solo POST
    if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        exit;
    }

    // Datos
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) { $data = $_POST; }

    $nombre  = trim((string)($data['nombre'] ?? ''));
    $email   = trim((string)($data['email'] ?? ''));
    $mensaje = trim((string)($data['mensaje'] ?? ''));

    if ($nombre === '' || $email === '' || $mensaje === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Faltan campos requeridos']);
        exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Email inválido']);
        exit;
    }

    // Crear tabla si no existe
    $sqlCreate = "CREATE TABLE IF NOT EXISTS contactos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL,
        email VARCHAR(200) NOT NULL,
        mensaje TEXT NOT NULL,
        ip VARCHAR(45) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    pdo()->exec($sqlCreate);

    // Insertar
    $stmt = pdo()->prepare('INSERT INTO contactos (nombre, email, mensaje, ip) VALUES (:n, :e, :m, :ip)');
    $stmt->execute([
        ':n' => $nombre,
        ':e' => $email,
        ':m' => $mensaje,
        ':ip' => $_SERVER['REMOTE_ADDR'] ?? null,
    ]);

    echo json_encode(['ok' => true, 'id' => pdo()->lastInsertId()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error del servidor', 'detail' => $e->getMessage()]);
}
