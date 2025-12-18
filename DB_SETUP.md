# Configuración de Base de Datos (phpMyAdmin)

Guía rápida para crear las tablas que usa esta página en MySQL/MariaDB desde phpMyAdmin.

## 0) Datos de conexión
- Servidor: `localhost`
- Base de datos: `exkoltdyxc_printmodels`
- Usuario: `exkoltdyxc_mathias`
- Archivo que usa la conexión: `api/config.php`

Si la base de datos no existe, créala primero (pestaña SQL):
```sql
CREATE DATABASE IF NOT EXISTS `exkoltdyxc_printmodels`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `exkoltdyxc_printmodels`;
```

## 1) Tabla productos
Campos usados por el frontend y la API: `id, nombre, precio, descripcion, especificaciones, imagenesPeque, imagenInterna, destacado`.

> Nota: Para máxima compatibilidad, se definen `especificaciones` e `imagenesPeque` como `TEXT` (se guardan arrays como JSON). Si usas MySQL 5.7+/8.0 puedes cambiarlas a `JSON`.

```sql
USE `exkoltdyxc_printmodels`;

CREATE TABLE IF NOT EXISTS `productos` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(200) NOT NULL,
  `precio` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `descripcion` TEXT NULL,
  `especificaciones` TEXT NULL COMMENT 'JSON con lista de strings',
  `imagenesPeque` TEXT NULL COMMENT 'JSON con lista de URLs',
  `imagenInterna` VARCHAR(255) NULL,
  `destacado` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_destacado` (`destacado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Ejemplo de inserción (valores JSON como texto):
```sql
INSERT INTO `productos` (`nombre`, `precio`, `descripcion`, `especificaciones`, `imagenesPeque`, `imagenInterna`, `destacado`)
VALUES (
  'Pack navideño', 35000,
  'Combinación de diseños navideños: bola, corazón y otros.',
  '["Material: PLA", "Pack: 2-3 piezas", "Colores: navideños"]',
  '["img/IMPRESION-3D-4.jpg"]',
  'img/IMPRESION-3D-4.jpg',
  1
);
```

## 2) Tabla contactos
La API `api/contact.php` crea la tabla automáticamente si no existe, pero puedes crearla manualmente:
```sql
USE `exkoltdyxc_printmodels`;

CREATE TABLE IF NOT EXISTS `contactos` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(200) NOT NULL,
  `email` VARCHAR(200) NOT NULL,
  `mensaje` TEXT NOT NULL,
  `ip` VARCHAR(45) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 3) Tabla usuarios (login/registro)
La API `api/auth.php` también la crea si no existe. Ahora incluye `usuario` (nombre de usuario) único.
```sql
USE `exkoltdyxc_printmodels`;

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
```

### Crear usuario administrador (opcional)
Genera un hash seguro con PHP (en tu terminal):
```bash
php -r "echo password_hash('TuClaveSegura123', PASSWORD_DEFAULT), PHP_EOL;"
```
Copia el hash que imprima y crea el usuario:
```sql
INSERT INTO `usuarios` (`nombre`, `email`, `password_hash`)
VALUES ('Admin', 'admin@tusitio.com', '<PEGA_AQUI_EL_HASH>');
```
Luego puedes iniciar sesión en `account.html` con ese correo y contraseña.

## 4) Importarlo desde phpMyAdmin
1. Entra a phpMyAdmin y selecciona tu servidor `localhost`.
2. Crea o selecciona la base `exkoltdyxc_printmodels`.
3. Abre la pestaña "SQL".
4. Pega y ejecuta los bloques anteriores en este orden:
   - Crear Base de datos (si no existe) + `USE`.
   - Tabla `productos` (y opcionalmente el INSERT de ejemplo).
   - Tabla `contactos`.
  - Tabla `usuarios` (y opcionalmente el admin).

## 7) Migración automática
También puedes ejecutar el script que crea/ajusta todas las tablas relacionadas con clientes, direcciones, teléfonos, tarjetas, ciudades y carrito:

`api/migrate.php`

Ábrelo en el navegador (o con `php api/migrate.php`) y verás “Migración completada” si todo salió bien. Es idempotente (seguro de ejecutar varias veces).

## 5) Verificación rápida
- Ejecuta en el navegador: `http://localhost:8000/api/products.php` (server embebido) o la ruta de tu hosting.
- Si la conexión falla, revisa credenciales en `api/config.php`.
- Si no hay filas en `productos`, el frontend mostrará lista vacía.

## 6) Notas
- Todas las tablas usan `utf8mb4` para soportar emojis y acentos.
- Para guardar arrays en `productos`, envía JSON válido en `especificaciones` y `imagenesPeque`.
- La API ya maneja errores y te mostrará `{ error, detail }` cuando algo salga mal.
