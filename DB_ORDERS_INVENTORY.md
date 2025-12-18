# Inventario y Pedidos (SQL)

Estas tablas permiten llevar stock por producto y registrar pedidos. No cambian el carrito en memoria; se usarán al confirmar pedido.

## 1) Inventario
```sql
CREATE TABLE IF NOT EXISTS inventario (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  producto_id INT UNSIGNED NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  minimo INT UNSIGNED NOT NULL DEFAULT 0,
  actualizado TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_prod (producto_id),
  CONSTRAINT fk_inv_prod FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Semilla opcional:
```sql
INSERT INTO inventario (producto_id, stock)
SELECT p.id, 100 FROM productos p
ON DUPLICATE KEY UPDATE stock = VALUES(stock);
```

## 2) Pedidos
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

## 3) Nota de uso
- El carrito permanece en sesión (memoria). Al confirmar, se crea un `pedido` con sus `pedido_items`, se descuenta `inventario.stock` y se limpia el carrito.
- Puedes añadir un trigger/procedimiento para evitar confirmar si `inventario.stock` < cantidad.
