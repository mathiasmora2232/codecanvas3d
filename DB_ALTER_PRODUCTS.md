# ALTER productos y permisos admin

Ejecuta estos SQL en tu base para habilitar el panel admin (idempotente).

```sql
-- Asegurar columnas de productos
ALTER TABLE productos ADD COLUMN slug VARCHAR(160) NULL UNIQUE;
ALTER TABLE productos ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE productos ADD COLUMN stock INT NOT NULL DEFAULT 0;
ALTER TABLE productos ADD COLUMN oferta_pct TINYINT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE productos ADD COLUMN oferta_desde DATETIME NULL;
ALTER TABLE productos ADD COLUMN oferta_hasta DATETIME NULL;
ALTER TABLE productos MODIFY imagenInterna VARCHAR(255);
ALTER TABLE productos MODIFY imagenesPeque TEXT;
ALTER TABLE productos ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE productos ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP;

-- Si alguna ya existe, phpMyAdmin mostrará error "Duplicate column"; es esperado.

-- Asegurar rol en usuarios
ALTER TABLE usuarios ADD COLUMN role ENUM('user','admin') NOT NULL DEFAULT 'user';
```

Notas
- Guarda rutas de imágenes como relativas, por ejemplo: `img/uploads/202512/llavero-12345.jpg`. El admin ya lo hace.
- El frontend calcula el precio final con ofertas; `precioBase` se envía para referencia.
