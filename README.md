# Página3D

Sitio web con frontend estático (HTML/CSS/JS) y API en PHP (PDO MySQL).

## Requisitos
- PHP 8.1+ con extensiones `pdo` y `pdo_mysql` habilitadas
- Servidor web local (Apache, Nginx) o el servidor embebido de PHP
- MySQL/MariaDB

## Puesta en marcha (local)
1) Clona o copia el proyecto dentro de tu raíz web (por ejemplo, `htdocs` en XAMPP) o usa el servidor embebido:

```bash
# Opción servidor embebido de PHP
php -S localhost:8080 -t .
```

2) Crea una base de datos (por ejemplo, `pagina3d`) y configura las credenciales mediante variables de entorno aceptadas por `api/config.php` (`DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`) o ajusta ese archivo según tu entorno.

3) Inicializa el esquema básico visitando en el navegador:
- http://localhost:8080/api/migrate.php

4) (Opcional) Carga productos de ejemplo desde `data/products.json`:
- http://localhost:8080/api/seed_products.php

5) Abre el sitio:
- http://localhost:8080/

## Notas
- La API valida sesión vía `api/auth.php`; algunas rutas requieren estar autenticado.
- Si ves errores de conexión a DB, revisa que las credenciales estén bien y que `pdo_mysql` esté habilitado.
