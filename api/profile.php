<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require __DIR__ . '/config.php';
session_start();

function requireLogin(): int {
    if (!isset($_SESSION['uid'])) { http_response_code(401); echo json_encode(['error'=>'No autenticado']); exit; }
    return (int)$_SESSION['uid'];
}

function inputJSON(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

try {
    $uid = requireLogin();
    $action = $_GET['action'] ?? $_POST['action'] ?? 'get';
    $pdo = pdo();

    if ($action === 'get') {
        $u = $pdo->prepare('SELECT id, nombre, usuario, email, created_at FROM usuarios WHERE id=:id');
        $u->execute([':id'=>$uid]);
        $user = $u->fetch(PDO::FETCH_ASSOC);

        $dir = $pdo->prepare('SELECT d.id, d.etiqueta, d.linea1, d.linea2, d.ciudad_id, c.nombre AS ciudad, d.provincia, d.pais, d.codigo_postal, d.principal FROM direcciones d LEFT JOIN ciudades c ON c.id=d.ciudad_id WHERE d.user_id=:id ORDER BY d.principal DESC, d.id DESC');
        $dir->execute([':id'=>$uid]);
        $direcciones = $dir->fetchAll(PDO::FETCH_ASSOC);

        $tel = $pdo->prepare('SELECT id, tipo, numero, principal FROM telefonos WHERE user_id=:id ORDER BY principal DESC, id DESC');
        $tel->execute([':id'=>$uid]);
        $telefonos = $tel->fetchAll(PDO::FETCH_ASSOC);

        $card = $pdo->prepare('SELECT id, marca, titular, numero_4, exp_mes, exp_anio, principal FROM tarjetas WHERE user_id=:id ORDER BY principal DESC, id DESC');
        $card->execute([':id'=>$uid]);
        $tarjetas = $card->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['user'=>$user, 'direcciones'=>$direcciones, 'telefonos'=>$telefonos, 'tarjetas'=>$tarjetas]);
        exit;
    }

    if ($action === 'update') {
        $in = inputJSON();
        $nombre  = trim((string)($in['nombre'] ?? ''));
        $usuario = trim((string)($in['usuario'] ?? ''));
        $email   = trim((string)($in['email'] ?? ''));
        if ($nombre==='') { http_response_code(400); echo json_encode(['error'=>'Nombre requerido']); exit; }
        if ($usuario==='' || !preg_match('/^[a-zA-Z0-9_\.\-]{3,30}$/',$usuario)) { http_response_code(400); echo json_encode(['error'=>'Usuario inválido']); exit; }
        if ($email==='' || !filter_var($email, FILTER_VALIDATE_EMAIL)) { http_response_code(400); echo json_encode(['error'=>'Email inválido']); exit; }
        $q = $pdo->prepare('UPDATE usuarios SET nombre=:n, usuario=:u, email=:e WHERE id=:id');
        $q->execute([':n'=>$nombre, ':u'=>$usuario, ':e'=>$email, ':id'=>$uid]);
        echo json_encode(['ok'=>true]);
        exit;
    }

    if ($action === 'cities') {
        $q = $pdo->query('SELECT id, nombre, provincia, pais FROM ciudades ORDER BY pais, provincia, nombre');
        echo json_encode($q->fetchAll(PDO::FETCH_ASSOC));
        exit;
    }

    // Direcciones
    if ($action === 'addr_list') {
        $q = $pdo->prepare('SELECT d.id, d.etiqueta, d.linea1, d.linea2, d.ciudad_id, c.nombre AS ciudad, d.provincia, d.pais, d.codigo_postal, d.principal FROM direcciones d LEFT JOIN ciudades c ON c.id=d.ciudad_id WHERE d.user_id=:id ORDER BY d.principal DESC, d.id DESC');
        $q->execute([':id'=>$uid]);
        echo json_encode($q->fetchAll(PDO::FETCH_ASSOC));
        exit;
    }
    if ($action === 'addr_add') {
        $in = inputJSON();
        $stmt = $pdo->prepare('INSERT INTO direcciones (user_id, etiqueta, linea1, linea2, ciudad_id, provincia, pais, codigo_postal, principal) VALUES (:uid,:et,:l1,:l2,:cid,:prov,:pais,:cp,:pri)');
        $stmt->execute([
            ':uid'=>$uid,
            ':et'=>($in['etiqueta'] ?? null),
            ':l1'=>($in['linea1'] ?? ''),
            ':l2'=>($in['linea2'] ?? null),
            ':cid'=>($in['ciudad_id'] ?? null),
            ':prov'=>($in['provincia'] ?? null),
            ':pais'=>($in['pais'] ?? null),
            ':cp'=>($in['codigo_postal'] ?? null),
            ':pri'=>(!empty($in['principal'])?1:0)
        ]);
        echo json_encode(['ok'=>true, 'id'=>$pdo->lastInsertId()]);
        exit;
    }
    if ($action === 'addr_del') {
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare('DELETE FROM direcciones WHERE id=:id AND user_id=:uid');
        $stmt->execute([':id'=>$id, ':uid'=>$uid]);
        echo json_encode(['ok'=>true]);
        exit;
    }

    // Teléfonos
    if ($action === 'tel_list') {
        $q = $pdo->prepare('SELECT id, tipo, numero, principal FROM telefonos WHERE user_id=:id ORDER BY principal DESC, id DESC');
        $q->execute([':id'=>$uid]);
        echo json_encode($q->fetchAll(PDO::FETCH_ASSOC));
        exit;
    }
    if ($action === 'tel_add') {
        $in = inputJSON();
        $stmt = $pdo->prepare('INSERT INTO telefonos (user_id, tipo, numero, principal) VALUES (:uid,:t,:n,:p)');
        $stmt->execute([':uid'=>$uid, ':t'=>($in['tipo'] ?? 'movil'), ':n'=>($in['numero'] ?? ''), ':p'=>(!empty($in['principal'])?1:0)]);
        echo json_encode(['ok'=>true, 'id'=>$pdo->lastInsertId()]);
        exit;
    }
    if ($action === 'tel_del') {
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare('DELETE FROM telefonos WHERE id=:id AND user_id=:uid');
        $stmt->execute([':id'=>$id, ':uid'=>$uid]);
        echo json_encode(['ok'=>true]);
        exit;
    }

    // Tarjetas (solo demo: guardar last4 y metadatos)
    if ($action === 'card_list') {
        $q = $pdo->prepare('SELECT id, marca, titular, numero_4, exp_mes, exp_anio, principal FROM tarjetas WHERE user_id=:id ORDER BY principal DESC, id DESC');
        $q->execute([':id'=>$uid]);
        echo json_encode($q->fetchAll(PDO::FETCH_ASSOC));
        exit;
    }
    if ($action === 'card_add') {
        $in = inputJSON();
        $numero = preg_replace('/[^0-9]/','', (string)($in['numero'] ?? ''));
        $last4 = substr($numero, -4) ?: null;
        $stmt = $pdo->prepare('INSERT INTO tarjetas (user_id, marca, titular, numero_4, token, exp_mes, exp_anio, principal) VALUES (:uid,:m,:t,:n4,:tok,:mm,:yy,:p)');
        $stmt->execute([
            ':uid'=>$uid,
            ':m'=>($in['marca'] ?? null),
            ':t'=>($in['titular'] ?? null),
            ':n4'=>$last4,
            ':tok'=>null,
            ':mm'=>($in['exp_mes'] ?? null),
            ':yy'=>($in['exp_anio'] ?? null),
            ':p'=>(!empty($in['principal'])?1:0)
        ]);
        echo json_encode(['ok'=>true, 'id'=>$pdo->lastInsertId()]);
        exit;
    }
    if ($action === 'card_del') {
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $pdo->prepare('DELETE FROM tarjetas WHERE id=:id AND user_id=:uid');
        $stmt->execute([':id'=>$id, ':uid'=>$uid]);
        echo json_encode(['ok'=>true]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['error'=>'Acción no soportada']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error'=>'Error del servidor','detail'=>$e->getMessage()]);
}
