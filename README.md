# Entorno de pruebas con Docker

Este proyecto incluye configuración para levantar una instancia local de pruebas usando Docker (PHP + Apache + MySQL).

## Requisitos

## Puesta en marcha

```bash
# En la carpeta del proyecto
docker compose up -d --build

# Ver logs (opcional)
docker compose logs -f web
```

 Sitio: http://localhost:8082
   - `http://localhost:8082/api/products.php`
   - `http://localhost:8082/api/auth.php?action=me` (cuando haya sesión)

## Variables de entorno
El contenedor `web` usa estas variables (definidas en `docker-compose.yml`):
   - Abre en el navegador: `http://localhost:8082/api/migrate.php`
- `DB_USER=app`
- `DB_PASS=app123`
- `DB_NAME=pagina3d`
   - `http://localhost:8082/api/seed_products.php` carga `data/products.json` si `productos` está vacío.
El contenedor `db` crea la base `pagina3d` con usuario `app/app123`.

## Inicializar la base de datos
1. Migraciones mínimas:
   - Abre en el navegador: `http://localhost:8080/api/migrate.php`
   - Para tablas de pedidos: se crean automáticamente al usar `api/orders.php`
2. Usuarios y roles:
   - Al usar `api/auth.php` se asegura la tabla `usuarios` y agrega la columna `role`.
3. Seed de productos (opcional):
   - `http://localhost:8080/api/seed_products.php` carga `data/products.json` si `productos` está vacío.

## Notas
- El código se monta como volumen: los cambios se reflejan al instante en el contenedor.
- Las subidas de imágenes se guardan en `img/uploads` (volumen `php_uploads`).
- Para reiniciar todo (incluyendo datos):

```bash
docker compose down -v
```

## Troubleshooting
- Si MySQL tarda en iniciar, espera el healthcheck y revisa `docker compose logs db`.
- Si ves error de conexión a DB, valida que `api/config.php` lee variables de entorno (ya configurado).
