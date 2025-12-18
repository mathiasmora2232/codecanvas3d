# Ajuste de Esquema y Creación de Tablas (phpMyAdmin)

Este documento contiene ALTER y CREATE ordenados para alinear tipos, motores y relaciones según tu estado actual.

Importante:
- Motor: InnoDB en todas las tablas con FKs.
- Charset: utf8mb4 (recomendado).
- Tipos FK: deben coincidir EXACTAMENTE (ej. `INT UNSIGNED`).
- Ejecuta EN ORDEN cada bloque en la pestaña SQL de phpMyAdmin.

## 0) Seleccionar base
```sql
USE `exkoltdyxc_printmodels`;
```

## 1) Normalizar tablas existentes
### 1.1 `usuarios`
```sql
-- Asegurar motor y clave primaria UNSIGNED
ALTER TABLE `usuarios` ENGINE=InnoDB;
ALTER TABLE `usuarios` MODIFY `id` INT UNSIGNED NOT NULL AUTO_INCREMENT;

-- Agregar/normalizar columna `usuario` (username) y restricciones
-- Paso seguro: añadir columna NULL, poblarla y luego crear índice único
ALTER TABLE `usuarios` ADD COLUMN `usuario` VARCHAR(60) NULL AFTER `nombre`;
UPDATE `usuarios` SET `usuario` = SUBSTRING_INDEX(`email`, '@', 1) WHERE `usuario` IS NULL OR `usuario` = '';
ALTER TABLE `usuarios` ADD UNIQUE KEY `uk_usuario` (`usuario`);

-- Asegurar email único
ALTER TABLE `usuarios` ADD UNIQUE KEY `uk_email` (`email`);
```

Notas:
- Si alguna de estas operaciones ya existe (columna/índice), phpMyAdmin puede dar error de "ya existe". Puedes saltarte ese paso.

### 1.2 `productos`
```sql
ALTER TABLE `productos` ENGINE=InnoDB;
ALTER TABLE `productos` MODIFY `id` INT UNSIGNED NOT NULL AUTO_INCREMENT;
-- Opcional: índices de apoyo
CREATE INDEX `idx_destacado` ON `productos` (`destacado`);
```

### 1.3 `ciudades`
```sql
ALTER TABLE `ciudades` ENGINE=InnoDB;
ALTER TABLE `ciudades` MODIFY `id` INT UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE `ciudades` ADD UNIQUE KEY `uk_ciudad` (`nombre`, `provincia`, `pais`);
```

### 1.4 `contactos`
```sql
ALTER TABLE `contactos` ENGINE=InnoDB;
ALTER TABLE `contactos` MODIFY `id` INT UNSIGNED NOT NULL AUTO_INCREMENT;
CREATE INDEX `idx_email_contacto` ON `contactos` (`email`);
```

## 2) Crear tablas nuevas (con relaciones)
Orden recomendado para evitar errores de FK.

### 2.1 `clientes` (perfil extendido por usuario)
```sql
DROP TABLE IF EXISTS `clientes`;
CREATE TABLE `clientes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL UNIQUE,
  `nombre` VARCHAR(100) NULL,
  `apellido` VARCHAR(100) NULL,
  `documento` VARCHAR(50) NULL,
  `genero` ENUM('M','F','O') NULL,
  `fecha_nacimiento` DATE NULL,
  `ciudad_id` INT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_clientes_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.2 `direcciones`
```sql
DROP TABLE IF EXISTS `direcciones`;
CREATE TABLE `direcciones` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `etiqueta` VARCHAR(60) NULL,
  `linea1` VARCHAR(200) NOT NULL,
  `linea2` VARCHAR(200) NULL,
  `ciudad_id` INT UNSIGNED NULL,
  `provincia` VARCHAR(120) NULL,
  `pais` VARCHAR(120) NULL,
  `codigo_postal` VARCHAR(30) NULL,
  `principal` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dir_user` (`user_id`),
  KEY `idx_dir_principal` (`user_id`,`principal`),
  CONSTRAINT `fk_dir_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_dir_ciudad` FOREIGN KEY (`ciudad_id`) REFERENCES `ciudades`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.3 `telefonos`
```sql
DROP TABLE IF EXISTS `telefonos`;
CREATE TABLE `telefonos` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `tipo` ENUM('movil','casa','trabajo','otro') DEFAULT 'movil',
  `numero` VARCHAR(40) NOT NULL,
  `principal` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tel_user` (`user_id`),
  CONSTRAINT `fk_tel_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.4 `tarjetas` (metadatos; no guardar PAN)
```sql
DROP TABLE IF EXISTS `tarjetas`;
CREATE TABLE `tarjetas` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `marca` VARCHAR(30) NULL,
  `titular` VARCHAR(120) NULL,
  `numero_4` CHAR(4) NULL,
  `token` VARCHAR(120) NULL,
  `exp_mes` TINYINT NULL,
  `exp_anio` SMALLINT NULL,
  `principal` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_card_user` (`user_id`),
  CONSTRAINT `fk_card_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.5 `carritos`
```sql
DROP TABLE IF EXISTS `carritos`;
CREATE TABLE `carritos` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `estado` ENUM('abierto','cerrado') DEFAULT 'abierto',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cart_user` (`user_id`),
  CONSTRAINT `fk_cart_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.6 `carrito_items`
```sql
DROP TABLE IF EXISTS `carrito_items`;
CREATE TABLE `carrito_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `carrito_id` INT UNSIGNED NOT NULL,
  `producto_id` INT UNSIGNED NOT NULL,
  `cantidad` INT NOT NULL DEFAULT 1,
  `precio_unitario` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ci_cart` (`carrito_id`),
  CONSTRAINT `fk_ci_cart` FOREIGN KEY (`carrito_id`) REFERENCES `carritos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ci_prod` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 3) Semilla de ciudades (opcional)
```sql
INSERT INTO `ciudades` (`nombre`,`provincia`,`pais`) VALUES
('Quito','Pichincha','Ecuador'),
('Guayaquil','Guayas','Ecuador'),
('Cuenca','Azuay','Ecuador')
ON DUPLICATE KEY UPDATE `pais`=VALUES(`pais`);
```

## 4) Verificación
```sql
            SHOW CREATE TABLE `usuarios`\G
            SHOW CREATE TABLE `clientes`\G
            SHOW CREATE TABLE `direcciones`\G
            SHOW CREATE TABLE `telefonos`\G
            SHOW CREATE TABLE `tarjetas`\G
            SHOW CREATE TABLE `carritos`\G
            SHOW CREATE TABLE `carrito_items`\G
```

## 5) Notas y compatibilidad
- Si tu MySQL no permite `DROP TABLE IF EXISTS`, elimina esa línea y crea manualmente.
- Si falla la creación de un FK, revisa que ambas columnas tengan el MISMO tipo y collation, y que las tablas sean InnoDB.
- Evita FKs inversos (usuarios→clientes) para no crear ciclos; `clientes.user_id` basta.
