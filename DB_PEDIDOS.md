# Pedidos + Clientes (SQL completo)

Este documento define una base mínima para gestionar pedidos y cómo relacionarse con la tabla `usuarios` y una tabla de perfil de cliente (`clientes`) como la de tu captura (id, user_id, nombre, apellido, documento, genero, fecha_nacimiento, ciudad_id, timestamps).

Puedes pegar los bloques en phpMyAdmin (pestaña SQL). El script es idempotente.

## 0) Base de datos
```sql
CREATE DATABASE IF NOT EXISTS `exkoltdyxc_printmodels`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `exkoltdyxc_printmodels`;
```

## 1) Usuarios (con `usuario`/username)
```sql
CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  usuario VARCHAR(60) NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 2) Ciudades (catálogo básico)
```sql
CREATE TABLE IF NOT EXISTS ciudades (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  provincia VARCHAR(120) NULL,
  pais VARCHAR(120) NOT NULL DEFAULT 'Ecuador',
  UNIQUE KEY uk_ciudad (nombre, provincia, pais)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO ciudades (id, nombre, provincia, pais) VALUES
  (1,'Quito','Pichincha','Ecuador'),
  (2,'Guayaquil','Guayas','Ecuador'),
  (3,'Cuenca','Azuay','Ecuador');
```

## 3) Clientes (perfil extendido)
```sql
CREATE TABLE IF NOT EXISTS clientes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  nombre VARCHAR(100) NULL,
  apellido VARCHAR(100) NULL,
  documento VARCHAR(50) NULL,
  genero ENUM('M','F','O') NULL,
  fecha_nacimiento DATE NULL,
  ciudad_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_clientes_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_clientes_ciudad FOREIGN KEY (ciudad_id) REFERENCES ciudades(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 4) Direcciones / Teléfonos / Tarjetas (opcional, ya soportado por el frontend)
```sql
CREATE TABLE IF NOT EXISTS direcciones (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  etiqueta VARCHAR(60) NULL,
  linea1 VARCHAR(200) NOT NULL,
  linea2 VARCHAR(200) NULL,
  ciudad_id INT UNSIGNED NULL,
  provincia VARCHAR(120) NULL,
  pais VARCHAR(120) NULL,
  codigo_postal VARCHAR(30) NULL,
  principal TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dir_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_dir_ciudad FOREIGN KEY (ciudad_id) REFERENCES ciudades(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_principal (user_id, principal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS telefonos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  tipo ENUM('movil','casa','trabajo','otro') DEFAULT 'movil',
  numero VARCHAR(40) NOT NULL,
  principal TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tel_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tarjetas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 5) Pedidos + Items (relación con `usuarios` y productos)
```sql
CREATE TABLE IF NOT EXISTS pedidos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  estado ENUM('nuevo','procesando','enviado','cancelado') NOT NULL DEFAULT 'nuevo',
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  creado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user (user_id),
  CONSTRAINT fk_pedido_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedido_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT UNSIGNED NOT NULL,
  producto_id INT UNSIGNED NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  variante VARCHAR(60) NULL,
  precio DECIMAL(10,2) NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  CONSTRAINT fk_pi_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pi_prod FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 6) Cómo usar la tabla `clientes`
- Guarda aquí datos más "personales" que no pertenecen a `usuarios` (que solo tiene nombre, usuario, email, contraseña).
- El frontend puede leer/escribir estos campos desde `api/profile.php?action=get|update` (ver cambios en este repo):
  - GET devuelve `{ user, cliente, direcciones, tarjetas }`.
  - UPDATE acepta además de `nombre, usuario, email` los campos `apellido, documento, genero, fecha_nacimiento, ciudad_id` y hace UPSERT en `clientes`.

## 7) Confirmar pedidos (idea de flujo)
1. Usuario revisa carrito y va a `checkout.html`.
2. Al pulsar "Finalizar compra", tu backend debe:
   - Crear fila en `pedidos` con `user_id` si el usuario está autenticado (o null si invitado).
   - Insertar los ítems en `pedido_items` con `precio` y `cantidad` actuales.
   - (Opcional) Descontar stock en una tabla `inventario`.
3. Limpiar carrito.

> En este repo el checkout actual guarda un pedido simulado en `localStorage`. Puedes migrar fácilmente a tablas usando este esquema.
