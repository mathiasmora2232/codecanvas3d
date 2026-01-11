<?php
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');
require __DIR__ . '/config.php';

function execSQL(PDO $pdo, string $sql): void {
    $pdo->exec($sql);
}

try {
    $pdo = pdo();
    // Nota: en MySQL los DDL (CREATE/ALTER) hacen commit implícito;
    // evitar transacciones alrededor de DDL para no causar errores.

    // usuarios: agregar columna usuario (username) única si no existe
    execSQL($pdo, "CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL,
        email VARCHAR(200) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Add column usuario if missing
    $col = $pdo->query("SHOW COLUMNS FROM usuarios LIKE 'usuario'")->fetch();
    if (!$col) {
        execSQL($pdo, "ALTER TABLE usuarios ADD COLUMN usuario VARCHAR(60) NULL AFTER nombre");
        execSQL($pdo, "UPDATE usuarios SET usuario = SUBSTRING_INDEX(email,'@',1) WHERE usuario IS NULL OR usuario = ''");
        execSQL($pdo, "ALTER TABLE usuarios ADD UNIQUE KEY uk_usuario (usuario)");
    }

    // clientes
    execSQL($pdo, "CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        nombre VARCHAR(100) NULL,
        apellido VARCHAR(100) NULL,
        documento VARCHAR(50) NULL,
        genero ENUM('M','F','O') NULL,
        fecha_nacimiento DATE NULL,
        ciudad_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL,
        CONSTRAINT fk_clientes_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // ciudades
    execSQL($pdo, "CREATE TABLE IF NOT EXISTS ciudades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL,
        provincia VARCHAR(120) NULL,
        pais VARCHAR(120) NOT NULL DEFAULT 'Ecuador',
        UNIQUE KEY uk_ciudad (nombre, provincia, pais)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Seed mínimo de ciudades (idempotente)
    $pdo->exec("INSERT IGNORE INTO ciudades (id, nombre, provincia, pais) VALUES
        (1,'Quito','Pichincha','Ecuador'),
        (2,'Guayaquil','Guayas','Ecuador'),
        (3,'Cuenca','Azuay','Ecuador')");

    // direcciones
    execSQL($pdo, "CREATE TABLE IF NOT EXISTS direcciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        etiqueta VARCHAR(60) NULL,
        linea1 VARCHAR(200) NOT NULL,
        linea2 VARCHAR(200) NULL,
        ciudad_id INT NULL,
        provincia VARCHAR(120) NULL,
        pais VARCHAR(120) NULL,
        codigo_postal VARCHAR(30) NULL,
        principal TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_dir_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        CONSTRAINT fk_dir_ciudad FOREIGN KEY (ciudad_id) REFERENCES ciudades(id) ON DELETE SET NULL,
        INDEX idx_user (user_id),
        INDEX idx_principal (user_id, principal)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // telefonos
    execSQL($pdo, "CREATE TABLE IF NOT EXISTS telefonos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        tipo ENUM('movil','casa','trabajo','otro') DEFAULT 'movil',
        numero VARCHAR(40) NOT NULL,
        principal TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_tel_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // tarjetas (solo token/ultimos4; no guardar PAN completo)
    execSQL($pdo, "CREATE TABLE IF NOT EXISTS tarjetas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        marca VARCHAR(30) NULL,
        titular VARCHAR(120) NULL,
        numero_4 CHAR(4) NULL,
        token VARCHAR(120) NULL,
        exp_mes TINYINT NULL,
        exp_anio SMALLINT NULL,
        principal TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_card_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // carritos
    execSQL($pdo, "CREATE TABLE IF NOT EXISTS carritos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        estado ENUM('abierto','cerrado') DEFAULT 'abierto',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL,
        CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // items del carrito
    execSQL($pdo, "CREATE TABLE IF NOT EXISTS carrito_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        carrito_id INT NOT NULL,
        producto_id INT NOT NULL,
        cantidad INT NOT NULL DEFAULT 1,
        precio_unitario DECIMAL(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_ci_cart FOREIGN KEY (carrito_id) REFERENCES carritos(id) ON DELETE CASCADE,
        INDEX idx_cart (carrito_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    echo "Migración completada.\n";
} catch (Throwable $e) {
    http_response_code(500);
    echo "Error en migración: ".$e->getMessage();
}
