<?php
// Copia este archivo y rellena las credenciales reales de tu hosting.
// Si prefieres, puedes mantener este mismo archivo y editar los valores.

const DB_HOST = 'localhost';           // ej: 127.0.0.1 o mysql.tu-host.com
const DB_NAME = 'exkoltdyxc_printmodels';     // nombre de la base de datos
const DB_USER = 'mathias';           // usuario MySQL
const DB_PASS = 'Adminrot';   // contraseña MySQL
const DB_CHARSET = 'utf8mb4';

function pdo(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    return $pdo;
}
