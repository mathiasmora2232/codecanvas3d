# Provincias y Carrito (SQL)

A continuación se incluyen scripts SQL listos para ejecutar en phpMyAdmin. Cubren:
- Tabla `provincias`
- Ajuste opcional de `ciudades` para referenciar `provincias`
- Tablas de carrito: `carritos` y `carrito_items`

Ejecuta en este orden.

## 1) Provincias

```sql
CREATE TABLE IF NOT EXISTS provincias (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  pais VARCHAR(80) NOT NULL DEFAULT 'Ecuador',
  UNIQUE KEY uk_pais_nombre (pais, nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Poblar con ejemplos (Ecuador):
```sql
INSERT IGNORE INTO provincias (nombre, pais) VALUES
('Azuay','Ecuador'),('Bolívar','Ecuador'),('Cañar','Ecuador'),('Carchi','Ecuador'),('Chimborazo','Ecuador'),
('Cotopaxi','Ecuador'),('El Oro','Ecuador'),('Esmeraldas','Ecuador'),('Galápagos','Ecuador'),('Guayas','Ecuador'),
('Imbabura','Ecuador'),('Loja','Ecuador'),('Los Ríos','Ecuador'),('Manabí','Ecuador'),('Morona Santiago','Ecuador'),
('Napo','Ecuador'),('Orellana','Ecuador'),('Pastaza','Ecuador'),('Pichincha','Ecuador'),('Santa Elena','Ecuador'),
('Santo Domingo de los Tsáchilas','Ecuador'),('Sucumbíos','Ecuador'),('Tungurahua','Ecuador'),('Zamora Chinchipe','Ecuador');
```

### 1.1) Ajuste de ciudades (opcional, conservando compatibilidad)

Si ya existe `ciudades` con columna `provincia` textual, puedes añadir una referencia a `provincias` sin romper lo existente:

```sql
ALTER TABLE ciudades
  ADD COLUMN provincia_id INT UNSIGNED NULL AFTER nombre,
  ADD KEY idx_provincia (provincia_id),
  ADD CONSTRAINT fk_ciudad_prov FOREIGN KEY (provincia_id)
    REFERENCES provincias(id) ON DELETE SET NULL ON UPDATE CASCADE;
```

Más adelante, puedes poblar `provincia_id` con un UPDATE, por ejemplo:
```sql
UPDATE ciudades c
JOIN provincias p ON p.nombre = c.provincia AND p.pais = COALESCE(c.pais, 'Ecuador')
SET c.provincia_id = p.id
WHERE c.provincia_id IS NULL;
```

(La columna textual `provincia` puede mantenerse por compatibilidad; si deseas eliminarla, hazlo cuando `provincia_id` ya esté correctamente poblada.)

---

## 2) Carrito

```sql
CREATE TABLE IF NOT EXISTS carritos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  session_id VARCHAR(128) NULL UNIQUE,
  estado ENUM('abierto','cerrado') NOT NULL DEFAULT 'abierto',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user (user_id),
  CONSTRAINT fk_carritos_user FOREIGN KEY (user_id)
    REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS carrito_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  carrito_id INT UNSIGNED NOT NULL,
  producto_id INT UNSIGNED NOT NULL,
  variante VARCHAR(60) NULL,
  titulo VARCHAR(255) NULL,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0,
  imagen VARCHAR(255) NULL,
  cantidad INT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_carrito (carrito_id),
  CONSTRAINT fk_items_carrito FOREIGN KEY (carrito_id)
    REFERENCES carritos(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Notas:
- El backend `api/cart.php` usa `session_id()` para identificar el carrito del invitado y `user_id` cuando hay sesión.
- Los ítems guardan un snapshot de `titulo`, `precio` e `imagen` del producto al momento de agregarlo.
- El campo `variante` permite almacenar opciones como color (p.ej., Blanco/Negro).

---

## 3) Verificación rápida

```sql
SELECT COUNT(*) items, SUM(precio*cantidad) total
FROM carrito_items ci JOIN carritos c ON c.id = ci.carrito_id
WHERE c.estado='abierto';
```

Si todo está OK, ya puedes usar las rutas de `api/cart.php`:
- POST `api/cart.php` `{action:'add', product_id, variant, qty}`
- GET  `api/cart.php?action=get`
- POST `api/cart.php` `{action:'update', item_id, qty}`
- POST `api/cart.php` `{action:'remove', item_id}`
- POST `api/cart.php` `{action:'clear'}`
