# Scripts SQL (sin migrador)

Ejecuta estos bloques en phpMyAdmin (pestaña SQL) para crear/ajustar el esquema. Adapta el nombre de la base si es distinto.

```sql
-- 0) Seleccionar base de datos
USE `exkoltdyxc_printmodels`;
```

## A) Usuarios: agregar campo `usuario` (username) único
```sql
-- Crea la tabla si no existe (estructura base)
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(200) NOT NULL,
  `usuario` VARCHAR(60) NULL,
  `email` VARCHAR(200) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email` (`email`),
  UNIQUE KEY `uk_usuario` (`usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Si tu tabla ya existe pero no tiene la columna `usuario`, agrégala y crea el índice único
ALTER TABLE `usuarios` ADD COLUMN IF NOT EXISTS `usuario` VARCHAR(60) NULL AFTER `nombre`;
ALTER TABLE `usuarios` ADD UNIQUE KEY IF NOT EXISTS `uk_usuario` (`usuario`);
```

## B) Clientes (perfil extendido por usuario)
```sql
-- IMPORTANTE: el tipo de `clientes.user_id` debe coincidir EXACTAMENTE con `usuarios.id`.
-- Si ves el error 1005 errno 150, probablemente `usuarios.id` es INT firmado.
-- Arregla primero `usuarios.id` a UNSIGNED y motor InnoDB:
-- ALTER TABLE `usuarios` MODIFY `id` INT UNSIGNED NOT NULL AUTO_INCREMENT;
-- ALTER TABLE `usuarios` ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `clientes` (
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

## C) Ciudades (catálogo)
```sql
CREATE TABLE IF NOT EXISTS `ciudades` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(120) NOT NULL,
  `provincia` VARCHAR(120) NULL,
  `pais` VARCHAR(120) NOT NULL DEFAULT 'Ecuador',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ciudad` (`nombre`, `provincia`, `pais`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Semilla mínima (opcional, idempotente si uk_ciudad existe)
INSERT INTO `ciudades` (`nombre`,`provincia`,`pais`) VALUES
('Quito','Pichincha','Ecuador'),
('Guayaquil','Guayas','Ecuador'),
('Cuenca','Azuay','Ecuador')
ON DUPLICATE KEY UPDATE `pais`=VALUES(`pais`);
```

## D) Direcciones
```sql
CREATE TABLE IF NOT EXISTS `direcciones` (
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
  CONSTRAINT `fk_dir_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dir_ciudad` FOREIGN KEY (`ciudad_id`) REFERENCES `ciudades`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## E) Teléfonos
```sql
CREATE TABLE IF NOT EXISTS `telefonos` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `tipo` ENUM('movil','casa','trabajo','otro') DEFAULT 'movil',
  `numero` VARCHAR(40) NOT NULL,
  `principal` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tel_user` (`user_id`),
  CONSTRAINT `fk_tel_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## F) Tarjetas (solo metadatos; no almacenar PAN completo)
```sql
CREATE TABLE IF NOT EXISTS `tarjetas` (
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
  CONSTRAINT `fk_card_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## G) Carrito y sus ítems
```sql
CREATE TABLE IF NOT EXISTS `carritos` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `estado` ENUM('abierto','cerrado') DEFAULT 'abierto',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_cart_user` (`user_id`),
  CONSTRAINT `fk_cart_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `carrito_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `carrito_id` INT UNSIGNED NOT NULL,
  `producto_id` INT UNSIGNED NOT NULL,
  `cantidad` INT NOT NULL DEFAULT 1,
  `precio_unitario` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ci_cart` (`carrito_id`),
  CONSTRAINT `fk_ci_cart` FOREIGN KEY (`carrito_id`) REFERENCES `carritos`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ci_prod` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## H) Productos (opcional: recomendaciones de tipos)
Si tu tabla `productos` ya existe, puedes dejarla tal cual. Si quieres permitir listas como JSON para `especificaciones` e `imagenesPeque`, usa `TEXT` o `JSON`:
```sql
-- Ejemplo de ajuste (opcional)
ALTER TABLE `productos` MODIFY `especificaciones` TEXT NULL;
ALTER TABLE `productos` MODIFY `imagenesPeque` TEXT NULL;
```

## I) Usuario administrador (opcional)
Genera un hash con PHP y crea el admin:
```sql
-- Sustituye <HASH> por el generado (password_hash)
INSERT INTO `usuarios` (`nombre`,`usuario`,`email`,`password_hash`) VALUES
('Admin','admin','admin@tusitio.com','<HASH>');
```

> Para generar el hash en tu equipo: `php -r "echo password_hash('TuClaveSegura123', PASSWORD_DEFAULT), PHP_EOL;"`

---
Estas definiciones usan InnoDB + utf8mb4 y relaciones con claves foráneas. Si tu hosting no permite FKs, elimina las líneas `CONSTRAINT ... FOREIGN KEY ...` antes de ejecutar.
