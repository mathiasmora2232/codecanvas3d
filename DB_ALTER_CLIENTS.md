# ALTERs para tablas existentes: clientes, direcciones, teléfonos y tarjetas

Estos bloques ajustan columnas, índices y claves foráneas en tus tablas ya creadas. Pégalos en phpMyAdmin (pestaña SQL). Están pensados para MySQL/MariaDB 10+/8+.

> Nota: Algunos `ADD CONSTRAINT` pueden fallar si la FK ya existe con otro nombre. En ese caso, omite el bloque o elimina la FK anterior (`ALTER TABLE ... DROP FOREIGN KEY nombre_fk;`) y vuelve a ejecutar.

## Clientes
Asegura relación con `usuarios`, relación opcional con `ciudades`, tipos y un `updated_at` automático.
```sql
ALTER TABLE clientes
  MODIFY `user_id` INT UNSIGNED NOT NULL,
  MODIFY `nombre` VARCHAR(100) NULL,
  MODIFY `apellido` VARCHAR(100) NULL,
  MODIFY `documento` VARCHAR(50) NULL,
  MODIFY `genero` ENUM('M','F','O') NULL,
  MODIFY `fecha_nacimiento` DATE NULL,
  MODIFY `ciudad_id` INT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  ADD UNIQUE KEY IF NOT EXISTS `uk_clientes_user` (`user_id`),
  ADD KEY IF NOT EXISTS `idx_ciudad` (`ciudad_id`);

-- Claves foráneas (ejecuta solo si aún no existen)
ALTER TABLE clientes
  ADD CONSTRAINT `fk_clientes_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_clientes_ciudad` FOREIGN KEY (`ciudad_id`) REFERENCES `ciudades`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
```

## Direcciones
Asegura FKs e índices útiles para consultas por usuario y principal.
```sql
ALTER TABLE direcciones
  MODIFY `user_id` INT UNSIGNED NOT NULL,
  MODIFY `ciudad_id` INT UNSIGNED NULL,
  MODIFY `etiqueta` VARCHAR(60) NULL,
  MODIFY `linea1` VARCHAR(200) NOT NULL,
  MODIFY `linea2` VARCHAR(200) NULL,
  MODIFY `provincia` VARCHAR(120) NULL,
  MODIFY `pais` VARCHAR(120) NULL,
  MODIFY `codigo_postal` VARCHAR(30) NULL,
  MODIFY `principal` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  ADD KEY IF NOT EXISTS `idx_user` (`user_id`),
  ADD KEY IF NOT EXISTS `idx_principal` (`user_id`, `principal`),
  ADD KEY IF NOT EXISTS `idx_ciudad` (`ciudad_id`);

ALTER TABLE direcciones
  ADD CONSTRAINT `fk_dir_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dir_ciudad` FOREIGN KEY (`ciudad_id`) REFERENCES `ciudades`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
```

## Teléfonos
Estandariza tipos, FK y agrega índices.
```sql
ALTER TABLE telefonos
  MODIFY `user_id` INT UNSIGNED NOT NULL,
  MODIFY `tipo` ENUM('movil','casa','trabajo','otro') DEFAULT 'movil',
  MODIFY `numero` VARCHAR(40) NOT NULL,
  MODIFY `principal` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  ADD KEY IF NOT EXISTS `idx_user` (`user_id`),
  ADD KEY IF NOT EXISTS `idx_principal` (`user_id`, `principal`);

ALTER TABLE telefonos
  ADD CONSTRAINT `fk_tel_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
```

## Tarjetas
No guardar PAN completo; usar `numero_4` y `token` (si aplicara). Asegura FK e índices.
```sql
ALTER TABLE tarjetas
  MODIFY `user_id` INT UNSIGNED NOT NULL,
  MODIFY `marca` VARCHAR(30) NULL,
  MODIFY `titular` VARCHAR(120) NULL,
  MODIFY `numero_4` CHAR(4) NULL,
  MODIFY `token` VARCHAR(120) NULL,
  MODIFY `exp_mes` TINYINT NULL,
  MODIFY `exp_anio` SMALLINT NULL,
  MODIFY `principal` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  ADD KEY IF NOT EXISTS `idx_user` (`user_id`),
  ADD KEY IF NOT EXISTS `idx_principal` (`user_id`, `principal`),
  ADD UNIQUE KEY IF NOT EXISTS `uk_card_token` (`token`);

ALTER TABLE tarjetas
  ADD CONSTRAINT `fk_card_user` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
```

## Comprobaciones útiles (opcional)
Para ver si ya existen FKs/índices antes de aplicar:
```sql
SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME='clientes' AND CONSTRAINT_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL;
SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='clientes';
```

## Collation y motor (opcional)
Unifica a `InnoDB` + `utf8mb4_unicode_ci`:
```sql
ALTER TABLE clientes CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, ENGINE=InnoDB;
ALTER TABLE direcciones CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, ENGINE=InnoDB;
ALTER TABLE telefonos CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, ENGINE=InnoDB;
ALTER TABLE tarjetas CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, ENGINE=InnoDB;
```

## Orden recomendado
1. Ejecuta los `ALTER ... MODIFY/ADD COLUMN/INDEX`.
2. Ejecuta los `ADD CONSTRAINT` (FKs).
3. Verifica con las consultas de `information_schema`.

Si necesitas que los `ALTER` se ejecuten automáticamente con control de existencia, puedo generar un `api/migrate_clients.php` que detecte y aplique solo lo necesario.
