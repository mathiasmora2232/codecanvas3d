<?php
// Configuración de conexión a la base de datos
$servername = getenv('DB_HOST') ?: "localhost";
$username   = getenv('DB_USER') ?: "exkoltdyxc_mathias";
$password   = getenv('DB_PASS') ?: "Adminrot";
$dbname     = getenv('DB_NAME') ?: "exkoltdyxc_printmodels";

// Devuelve una única instancia PDO lista para usarse
function pdo(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    // Variables definidas en el ámbito del archivo
    $host = $GLOBALS['servername'] ?? 'localhost';
    $db   = $GLOBALS['dbname'] ?? '';
    $user = $GLOBALS['username'] ?? '';
    $pass = $GLOBALS['password'] ?? '';

    $dsn = "mysql:host={$host};dbname={$db};charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    $pdo = new PDO($dsn, $user, $pass, $options);
    return $pdo;
}
?>

 