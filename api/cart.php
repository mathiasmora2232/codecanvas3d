<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require __DIR__ . '/config.php';

session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Lax',
]);

// Iniciar sesión para poder usar $_SESSION como almacenamiento del carrito
session_start();


const MAX_PER_ITEM = 10; // máximo por producto (mismo tipo)
const MAX_TOTAL = 25;    // máximo total de artículos

function inputJSON(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function productById(int $id): ?array {
    $q = pdo()->prepare('SELECT id, nombre, precio, imagenInterna, imagenesPeque FROM productos WHERE id=:id');
    $q->execute([':id'=>$id]);
    $r = $q->fetch(PDO::FETCH_ASSOC);
    if (!$r) return null;
    $imgPeq = [];
    if (!empty($r['imagenesPeque'])) {
        $s = trim((string)$r['imagenesPeque']);
        $j = json_decode($s, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($j)) $imgPeq = $j; else {
            $parts = preg_split('/[;,]+\s*/', $s);
            $imgPeq = array_values(array_filter(array_map('trim', $parts)));
        }
    }
    return [
        'id'=>(int)$r['id'],
        'title'=>(string)$r['nombre'],
        'precio'=>(float)$r['precio'],
        'imagenInterna'=>$r['imagenInterna'] ?? null,
        'imagenesPeque'=>$imgPeq,
    ];
}

function &cartRef(): array {
    if (!isset($_SESSION['cart']) || !is_array($_SESSION['cart'])) {
        $_SESSION['cart'] = ['items'=>[]];
    }
    return $_SESSION['cart'];
}

function cartSummary(): array {
    $cart = cartRef();
    // Reindexar para que JSON sea un array y no objeto cuando hay unsets
    $items = array_values($cart['items']);
    $total = 0; $count = 0;
    foreach ($items as $it) { $total += (float)$it['precio'] * (int)$it['cantidad']; $count += (int)$it['cantidad']; }
    return ['items'=>$items, 'count'=>$count, 'total'=>$total];
}

try {
    $action = $_GET['action'] ?? $_POST['action'] ?? (inputJSON()['action'] ?? 'get');
    $in = inputJSON();

    if ($action === 'get') {
        echo json_encode(cartSummary());
        exit;
    }

    if ($action === 'add' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $pid = (int)($in['product_id'] ?? 0);
        $qty = max(1, (int)($in['qty'] ?? 1));
        $variant = trim((string)($in['variant'] ?? ''));
        $p = productById($pid);
        if (!$p) { http_response_code(404); echo json_encode(['error'=>'Producto no encontrado']); exit; }
        $img = $p['imagenInterna'] ?: ($p['imagenesPeque'][0] ?? null);

        // límites: máximo por item y máximo total
        $cart = &cartRef();
        $key = $pid.'|'.strtolower($variant);
        $currentTotal = 0; foreach ($cart['items'] as $it) { $currentTotal += (int)$it['cantidad']; }
        if ($currentTotal + $qty > MAX_TOTAL) {
            http_response_code(400);
            echo json_encode(['error'=>'Límite de 25 artículos en el carrito']);
            exit;
        }
        // buscar item
        foreach ($cart['items'] as &$it) {
            $pidField = isset($it['product_id']) ? 'product_id' : (isset($it['producto_id']) ? 'producto_id' : null);
            $pidVal = $pidField ? (int)$it[$pidField] : null;
            $itKey = ($pidVal.'|'.strtolower((string)($it['variante'] ?? '')));
            if ($itKey === $key) {
                $newQty = min(MAX_PER_ITEM, (int)$it['cantidad'] + $qty);
                if ($newQty === (int)$it['cantidad']) {
                    http_response_code(400);
                    echo json_encode(['error'=>'Máximo 10 unidades por producto']);
                    exit;
                }
                $it['cantidad'] = $newQty;
                echo json_encode(cartSummary());
                exit;
            }
        }
        // nuevo item
        $cart['items'][] = [
            'id' => (count($cart['items']) ? (max(array_map(fn($x)=>$x['id'] ?? 0, $cart['items'])) + 1) : 1),
            'product_id' => $pid,
            'variante' => $variant ?: null,
            'titulo' => $p['title'],
            'precio' => $p['precio'],
            'imagen' => $img,
            'cantidad' => min(MAX_PER_ITEM, $qty)
        ];
        echo json_encode(cartSummary());
        exit;
    }

    if ($action === 'update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $itemId = (int)($in['item_id'] ?? 0);
        $qty = max(0, (int)($in['qty'] ?? 1));
        $cart = &cartRef();
        foreach ($cart['items'] as $idx => &$it) {
            if ((int)($it['id'] ?? 0) === $itemId) {
                if ($qty === 0) { unset($cart['items'][$idx]); echo json_encode(cartSummary()); exit; }
                if ($qty > MAX_PER_ITEM) { http_response_code(400); echo json_encode(['error'=>'Máximo 10 unidades por producto']); exit; }
                // comprobar límite total
                $totalExcept = 0; foreach ($cart['items'] as $jt) { if ((int)($jt['id'] ?? 0) !== $itemId) $totalExcept += (int)$jt['cantidad']; }
                if ($totalExcept + $qty > MAX_TOTAL) { http_response_code(400); echo json_encode(['error'=>'Límite de 25 artículos en el carrito']); exit; }
                $it['cantidad'] = $qty;
                echo json_encode(cartSummary());
                exit;
            }
        }
        http_response_code(404); echo json_encode(['error'=>'Item no encontrado']);
        exit;
    }

    if ($action === 'remove' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $itemId = (int)($in['item_id'] ?? 0);
        $cart = &cartRef();
        foreach ($cart['items'] as $idx => $it) {
            if ((int)($it['id'] ?? 0) === $itemId) { unset($cart['items'][$idx]); echo json_encode(cartSummary()); exit; }
        }
        http_response_code(404); echo json_encode(['error'=>'Item no encontrado']);
        exit;
    }

    if ($action === 'clear' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $cart = &cartRef();
        $cart['items'] = [];
        echo json_encode(cartSummary());
        exit;
    }

    http_response_code(400);
    echo json_encode(['error'=>'Acción no soportada']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error'=>'Error del servidor','detail'=>$e->getMessage()]);
}
