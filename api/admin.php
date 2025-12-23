<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require __DIR__ . '/config.php';

session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

function requireAdmin(): int {
    if (!isset($_SESSION['uid'])) { http_response_code(401); echo json_encode(['error'=>'No autenticado']); exit; }
    $stmt = pdo()->prepare('SELECT id, role FROM usuarios WHERE id=:id');
    $stmt->execute([':id'=>$_SESSION['uid']]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$u || ($u['role'] ?? 'user') !== 'admin') { http_response_code(403); echo json_encode(['error'=>'Requiere administrador']); exit; }
    return (int)$u['id'];
}

function inputJSON(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function ensureProductsColumns(): void {
    $pdo = pdo();
    // columnas nuevas para administrar el catálogo
    $try = function($sql) use ($pdo){ try { $pdo->exec($sql); } catch (Throwable $e) { /* ignorar si ya existe */ } };
    $try("ALTER TABLE productos ADD COLUMN slug VARCHAR(160) NULL UNIQUE");
    $try("ALTER TABLE productos ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1");
    $try("ALTER TABLE productos ADD COLUMN stock INT NOT NULL DEFAULT 0");
    $try("ALTER TABLE productos ADD COLUMN oferta_pct TINYINT UNSIGNED NOT NULL DEFAULT 0");
    $try("ALTER TABLE productos ADD COLUMN oferta_desde DATETIME NULL");
    $try("ALTER TABLE productos ADD COLUMN oferta_hasta DATETIME NULL");
    $try("ALTER TABLE productos MODIFY imagenInterna VARCHAR(255)");
    $try("ALTER TABLE productos MODIFY imagenesPeque TEXT");
    $try("ALTER TABLE productos ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL");
    $try("ALTER TABLE productos ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP");
}

function normalizeImagePath(string $p): string {
    $p = trim(str_replace('\\', '/', $p));
    if ($p === '') return '';
    // Siempre devolver relativo al proyecto (carpeta img)
    if (preg_match('~^/?img/~i', $p)) return preg_replace('~^/~', '', $p);
    return 'img/' . ltrim($p, '/');
}

try {
    requireAdmin();
    ensureProductsColumns();
    $pdo = pdo();
    $action = $_GET['action'] ?? $_POST['action'] ?? (inputJSON()['action'] ?? 'stats');

    // Upload de imágenes
    if ($action === 'upload' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!isset($_FILES['file'])) { http_response_code(400); echo json_encode(['error'=>'Falta archivo']); exit; }
        $f = $_FILES['file'];
        if (($f['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) { http_response_code(400); echo json_encode(['error'=>'Error al subir']); exit; }
        $mime = mime_content_type($f['tmp_name']);
        if (!preg_match('~^image/(jpeg|png|webp|gif)$~i', (string)$mime)) { http_response_code(400); echo json_encode(['error'=>'Formato no permitido']); exit; }
        $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
        $dir = dirname(__DIR__) . '/img/uploads/' . date('Ym');
        if (!is_dir($dir)) { @mkdir($dir, 0777, true); }
        $slug = preg_replace('~[^a-z0-9\-]+~','-', strtolower(pathinfo($f['name'], PATHINFO_FILENAME)));
        $name = $slug . '-' . time() . '.' . $ext;
        $abs = $dir . '/' . $name;
        if (!move_uploaded_file($f['tmp_name'], $abs)) { http_response_code(500); echo json_encode(['error'=>'No se pudo guardar']); exit; }
        $rel = 'img/uploads/' . date('Ym') . '/' . $name;
        echo json_encode(['ok'=>true, 'path'=>$rel]);
        exit;
    }

    // Estadísticas básicas
    if ($action === 'stats') {
        $stats = [];
        $stats['productos'] = (int)$pdo->query('SELECT COUNT(*) FROM productos')->fetchColumn();
        try { $stats['pedidos'] = (int)$pdo->query('SELECT COUNT(*) FROM pedidos')->fetchColumn(); } catch (Throwable $e) { $stats['pedidos']=0; }
        try { $stats['usuarios'] = (int)$pdo->query('SELECT COUNT(*) FROM usuarios')->fetchColumn(); } catch (Throwable $e) { $stats['usuarios']=0; }
        try { $stats['ventas'] = (float)$pdo->query('SELECT IFNULL(SUM(total),0) FROM pedidos')->fetchColumn(); } catch (Throwable $e) { $stats['ventas']=0; }
        echo json_encode($stats);
        exit;
    }

    // Productos CRUD
    if ($action === 'products_list') {
        $q = $pdo->query('SELECT id, nombre, precio, activo, stock, oferta_pct, created_at FROM productos ORDER BY id DESC');
        echo json_encode($q->fetchAll(PDO::FETCH_ASSOC));
        exit;
    }
    if ($action === 'products_get') {
        $id = (int)($_GET['id'] ?? 0);
        $q = $pdo->prepare('SELECT * FROM productos WHERE id=:id');
        $q->execute([':id'=>$id]);
        $row = $q->fetch(PDO::FETCH_ASSOC);
        if (!$row) { http_response_code(404); echo json_encode(['error'=>'No encontrado']); exit; }
        echo json_encode($row);
        exit;
    }
    if ($action === 'products_save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $in = inputJSON();
        $id = isset($in['id']) ? (int)$in['id'] : 0;
        $nombre = trim((string)($in['nombre'] ?? ''));
        $precio = (float)($in['precio'] ?? 0);
        if ($precio > 1000) { http_response_code(400); echo json_encode(['error'=>'Precio supera el límite permitido ($1000)']); exit; }
        if ($precio < 0) { http_response_code(400); echo json_encode(['error'=>'Precio no puede ser negativo']); exit; }
        $descripcion = (string)($in['descripcion'] ?? '');
        $especificaciones = $in['especificaciones'] ?? [];
        if (!is_array($especificaciones)) { $especificaciones = preg_split('/[;,]\s*/', (string)$especificaciones); }
        $especificaciones = json_encode(array_values(array_filter($especificaciones, fn($x)=>trim((string)$x) !== '')));
        $imgInt = normalizeImagePath((string)($in['imagenInterna'] ?? ''));
        $imgPeq = $in['imagenesPeque'] ?? [];
        if (!is_array($imgPeq)) { $imgPeq = preg_split('/[;,]\s*/', (string)$imgPeq); }
        $imgPeq = json_encode(array_values(array_filter(array_map(function($p){ return normalizeImagePath((string)$p); }, $imgPeq))));
        $activo = !empty($in['activo']) ? 1 : 0;
        $stock = (int)($in['stock'] ?? 0);
        $oferta = (int)($in['oferta_pct'] ?? 0);
        $desde = ($in['oferta_desde'] ?? null);
        $hasta = ($in['oferta_hasta'] ?? null);

        if ($id > 0) {
            $sql = 'UPDATE productos SET nombre=:n, precio=:p, descripcion=:d, especificaciones=:e, imagenInterna=:ii, imagenesPeque=:ip, activo=:a, stock=:s, oferta_pct=:o, oferta_desde=:od, oferta_hasta=:oh, updated_at=NOW() WHERE id=:id';
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':n'=>$nombre, ':p'=>$precio, ':d'=>$descripcion, ':e'=>$especificaciones, ':ii'=>$imgInt?:null, ':ip'=>$imgPeq, ':a'=>$activo, ':s'=>$stock, ':o'=>$oferta, ':od'=>$desde, ':oh'=>$hasta, ':id'=>$id]);
        } else {
            $sql = 'INSERT INTO productos (nombre, precio, descripcion, especificaciones, imagenInterna, imagenesPeque, activo, stock, oferta_pct, oferta_desde, oferta_hasta) VALUES (:n,:p,:d,:e,:ii,:ip,:a,:s,:o,:od,:oh)';
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':n'=>$nombre, ':p'=>$precio, ':d'=>$descripcion, ':e'=>$especificaciones, ':ii'=>$imgInt?:null, ':ip'=>$imgPeq, ':a'=>$activo, ':s'=>$stock, ':o'=>$oferta, ':od'=>$desde, ':oh'=>$hasta]);
            $id = (int)$pdo->lastInsertId();
        }
        echo json_encode(['ok'=>true, 'id'=>$id]);
        exit;
    }
    if ($action === 'products_delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $in = inputJSON();
        $id = (int)($in['id'] ?? 0);
        $stmt = $pdo->prepare('UPDATE productos SET activo=0, updated_at=NOW() WHERE id=:id');
        $stmt->execute([':id'=>$id]);
        echo json_encode(['ok'=>true]);
        exit;
    }
    if ($action === 'products_activate' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $in = inputJSON();
        $id = (int)($in['id'] ?? 0);
        $stmt = $pdo->prepare('UPDATE productos SET activo=1, updated_at=NOW() WHERE id=:id');
        $stmt->execute([':id'=>$id]);
        echo json_encode(['ok'=>true]);
        exit;
    }
    if ($action === 'products_remove' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $in = inputJSON();
        $id = (int)($in['id'] ?? 0);
        // eliminar fisicamente
        $stmt = $pdo->prepare('DELETE FROM productos WHERE id=:id');
        $stmt->execute([':id'=>$id]);
        echo json_encode(['ok'=>true]);
        exit;
    }

    if ($action === 'products_restock' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $in = inputJSON();
        $id = (int)($in['id'] ?? 0);
        $add = max(0, (int)($in['add'] ?? 0));
        if ($id <= 0 || $add <= 0) { http_response_code(400); echo json_encode(['error'=>'Parámetros inválidos']); exit; }
        $stmt = $pdo->prepare('UPDATE productos SET stock = stock + :add, updated_at=NOW() WHERE id=:id');
        $stmt->execute([':add'=>$add, ':id'=>$id]);
        echo json_encode(['ok'=>true]);
        exit;
    }

    // Pedidos
    if ($action === 'orders_list') {
        $q = $pdo->query('SELECT p.id, p.user_id, p.estado, p.total, p.creado, p.direccion_id, u.nombre AS usuario_nombre, u.email AS usuario_email FROM pedidos p LEFT JOIN usuarios u ON u.id=p.user_id ORDER BY p.id DESC');
        echo json_encode($q->fetchAll(PDO::FETCH_ASSOC));
        exit;
    }
    if ($action === 'orders_detail') {
        $id = (int)($_GET['id'] ?? 0);
        $q = $pdo->prepare('SELECT p.id, p.user_id, p.estado, p.total, p.creado, p.direccion_id, u.nombre AS usuario_nombre, u.email AS usuario_email FROM pedidos p LEFT JOIN usuarios u ON u.id=p.user_id WHERE p.id=:id');
        $q->execute([':id'=>$id]);
        $o = $q->fetch(PDO::FETCH_ASSOC);
        if(!$o){ http_response_code(404); echo json_encode(['error'=>'No encontrado']); exit; }
        $qi = $pdo->prepare('SELECT id, pedido_id, producto_id, titulo, variante, precio, precio_original, descuento_pct, cantidad FROM pedido_items WHERE pedido_id=:id');
        $qi->execute([':id'=>$id]);
        $o['items'] = $qi->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($o);
        exit;
    }

    // Usuarios
    if ($action === 'users_list') {
        $q = $pdo->query('SELECT id, nombre, usuario, email, role, created_at FROM usuarios ORDER BY id DESC');
        echo json_encode($q->fetchAll(PDO::FETCH_ASSOC));
        exit;
    }
    if ($action === 'users_set_role' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $in = inputJSON();
        $id = (int)($in['id'] ?? 0);
        $role = ($in['role'] ?? 'user') === 'admin' ? 'admin' : 'user';
        $stmt = $pdo->prepare("UPDATE usuarios SET role=:r WHERE id=:id");
        $stmt->execute([':r'=>$role, ':id'=>$id]);
        echo json_encode(['ok'=>true]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['error'=>'Acción no soportada']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error'=>'Error del servidor','detail'=>$e->getMessage()]);
}

?>
