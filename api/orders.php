<?php
declare(strict_types=1);
ini_set('display_errors', '0');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
ob_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require __DIR__ . '/config.php';

session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

function inputJSON(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data) || empty($data)) {
        $data = $_POST ?: $_GET;
    }
    return is_array($data) ? $data : [];
}

function ensureOrdersTables(): void {
    $pdo = pdo();
    // pedidos
    $pdo->exec("CREATE TABLE IF NOT EXISTS pedidos (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NULL,
        estado ENUM('nuevo','procesando','enviado','cancelado') NOT NULL DEFAULT 'nuevo',
        total DECIMAL(10,2) NOT NULL DEFAULT 0,
        creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_user (user_id),
        CONSTRAINT fk_pedido_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    // intento de agregar direccion_id si la tabla ya existe
    try { $pdo->exec("ALTER TABLE pedidos ADD COLUMN direccion_id INT UNSIGNED NULL"); } catch (Throwable $e) { /* ya existe o FK no creada */ }
    try { $pdo->exec("ALTER TABLE pedidos ADD CONSTRAINT fk_pedido_dir FOREIGN KEY (direccion_id) REFERENCES direcciones(id) ON DELETE SET NULL ON UPDATE CASCADE"); } catch (Throwable $e) { /* ignorar si existe */ }
    // pedido_items
    $pdo->exec("CREATE TABLE IF NOT EXISTS pedido_items (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        pedido_id INT UNSIGNED NOT NULL,
        producto_id INT UNSIGNED NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        variante VARCHAR(60) NULL,
        precio DECIMAL(10,2) NOT NULL,
        precio_original DECIMAL(10,2) NULL,
        descuento_pct TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
        cantidad INT UNSIGNED NOT NULL,
        CONSTRAINT fk_pi_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_pi_prod FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function &cartRef(): array {
    if (!isset($_SESSION['cart']) || !is_array($_SESSION['cart'])) {
        $_SESSION['cart'] = ['items'=>[]];
    }
    return $_SESSION['cart'];
}

function cartSnapshot(): array {
    $cart = cartRef();
    $items = array_values($cart['items']);
    $total = 0; $count = 0;
    foreach ($items as $it) { $total += (float)($it['precio'] ?? 0) * (int)($it['cantidad'] ?? 0); $count += (int)($it['cantidad'] ?? 0); }
    return ['items'=>$items, 'count'=>$count, 'total'=>$total];
}

try {
    ensureOrdersTables();

    $pdo = pdo();
    $in = inputJSON();
    $action = $_GET['action'] ?? $_POST['action'] ?? ($in['action'] ?? 'list');

    if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $uid = isset($_SESSION['uid']) ? (int)$_SESSION['uid'] : null; // permitir invitado (NULL)
        $direccionId = isset($in['direccion_id']) ? (int)$in['direccion_id'] : null;

        $snap = cartSnapshot();
        if (empty($snap['items'])) { http_response_code(400); echo json_encode(['error'=>'Carrito vacío']); exit; }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('INSERT INTO pedidos (user_id, estado, total, direccion_id) VALUES (:uid, :st, :tot, :dir)');
            $stmt->execute([':uid'=>$uid, ':st'=>'nuevo', ':tot'=>$snap['total'], ':dir'=>$direccionId]);
            $orderId = (int)$pdo->lastInsertId();

            $ins = $pdo->prepare('INSERT INTO pedido_items (pedido_id, producto_id, titulo, variante, precio, precio_original, descuento_pct, cantidad) VALUES (:pid,:pr,:ti,:va,:pe,:po,:dp,:ca)');
            foreach ($snap['items'] as $it) {
                $prodId = (int)($it['product_id'] ?? ($it['producto_id'] ?? 0));
                $titulo = (string)($it['titulo'] ?? $it['title'] ?? 'Producto');
                $var    = isset($it['variante']) ? (string)$it['variante'] : (isset($it['variant']) ? (string)$it['variant'] : null);
                // refrescar datos de producto para validar stock y obtener precios
                $qp = $pdo->prepare('SELECT id, precio, stock, oferta_pct, oferta_desde, oferta_hasta, nombre FROM productos WHERE id=:id FOR UPDATE');
                $qp->execute([':id'=>$prodId]);
                $pr = $qp->fetch(PDO::FETCH_ASSOC);
                if (!$pr) { throw new RuntimeException('Producto inexistente'); }
                $base = (float)($pr['precio'] ?? 0);
                $offer = (int)($pr['oferta_pct'] ?? 0);
                $desde = !empty($pr['oferta_desde']) ? new DateTimeImmutable($pr['oferta_desde']) : null;
                $hasta = !empty($pr['oferta_hasta']) ? new DateTimeImmutable($pr['oferta_hasta']) : null;
                $now = new DateTimeImmutable('now');
                $active = $offer > 0 && (!$desde || $now >= $desde) && (!$hasta || $now <= $hasta);
                $precio = $active ? max(0, $base * (1 - $offer/100)) : $base;
                $cant   = max(1, (int)($it['cantidad'] ?? $it['qty'] ?? 1));
                // validar stock
                $stock = (int)($pr['stock'] ?? 0);
                if ($stock < $cant) { throw new RuntimeException('Stock insuficiente para "'.$pr['nombre'].'"'); }
                // descontar stock
                $upd = $pdo->prepare('UPDATE productos SET stock=stock-:c WHERE id=:id');
                $upd->execute([':c'=>$cant, ':id'=>$prodId]);
                $ins->execute([':pid'=>$orderId, ':pr'=>$prodId, ':ti'=>$titulo, ':va'=>$var, ':pe'=>$precio, ':po'=>$base, ':dp'=>($active?$offer:0), ':ca'=>$cant]);
            }

            $pdo->commit();

            // Limpiar carrito en sesión
            $_SESSION['cart'] = ['items'=>[]];

            echo json_encode(['ok'=>true, 'id'=>$orderId, 'total'=>$snap['total']]);
        } catch (Throwable $tx) {
            $pdo->rollBack();
            throw $tx;
        }
        exit;
    }

    if ($action === 'list') {
        if (!isset($_SESSION['uid'])) { http_response_code(401); echo json_encode(['error'=>'No autenticado']); exit; }
        $uid = (int)$_SESSION['uid'];
        $q = $pdo->prepare('SELECT p.id, p.user_id, p.estado, p.total, p.creado, p.direccion_id, u.nombre AS usuario_nombre, u.email AS usuario_email FROM pedidos p LEFT JOIN usuarios u ON u.id=p.user_id WHERE p.user_id=:uid ORDER BY p.id DESC');
        $q->execute([':uid'=>$uid]);
        $orders = $q->fetchAll(PDO::FETCH_ASSOC);
        if (!$orders) { echo json_encode([]); exit; }
        $ids = array_map(fn($r)=> (int)$r['id'], $orders);
        $inIds = implode(',', array_fill(0, count($ids), '?'));
        $qi = $pdo->prepare("SELECT id, pedido_id, producto_id, titulo, variante, precio, precio_original, descuento_pct, cantidad FROM pedido_items WHERE pedido_id IN ($inIds) ORDER BY id");
        $qi->execute($ids);
        $items = $qi->fetchAll(PDO::FETCH_ASSOC);
        $map = [];
        foreach ($orders as $o) { $map[(int)$o['id']] = $o + ['items'=>[]]; }
        foreach ($items as $it) { $pid = (int)$it['pedido_id']; if (isset($map[$pid])) $map[$pid]['items'][] = $it; }
        echo json_encode(array_values($map));
        exit;
    }

    if ($action === 'detail') {
        if (!isset($_SESSION['uid'])) { http_response_code(401); echo json_encode(['error'=>'No autenticado']); exit; }
        $uid = (int)$_SESSION['uid'];
        $id = (int)($_GET['id'] ?? 0);
        $q = $pdo->prepare('SELECT p.id, p.user_id, p.estado, p.total, p.creado, p.direccion_id, u.nombre AS usuario_nombre, u.email AS usuario_email FROM pedidos p LEFT JOIN usuarios u ON u.id=p.user_id WHERE p.id=:id AND p.user_id=:uid');
        $q->execute([':id'=>$id, ':uid'=>$uid]);
        $o = $q->fetch(PDO::FETCH_ASSOC);
        if (!$o) { http_response_code(404); echo json_encode(['error'=>'Pedido no encontrado']); exit; }
        $qi = $pdo->prepare('SELECT id, pedido_id, producto_id, titulo, variante, precio, precio_original, descuento_pct, cantidad FROM pedido_items WHERE pedido_id=:pid');
        $qi->execute([':pid'=>$id]);
        $o['items'] = $qi->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($o);
        exit;
    }

    http_response_code(400);
    echo json_encode(['error'=>'Acción no soportada']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error'=>'Error del servidor','detail'=>$e->getMessage()]);
}

?>
