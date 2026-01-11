# Imagen base PHP con Apache
FROM php:8.2-apache

# Instalar extensiones necesarias (PDO MySQL) y habilitar módulos de Apache
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       libzip-dev \
       unzip \
    && docker-php-ext-install pdo pdo_mysql \
    && a2enmod rewrite headers \
    && sed -ri -e 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf \
    && rm -rf /var/lib/apt/lists/*

# Directorio de trabajo
WORKDIR /var/www/html

# Copiar el proyecto (en desarrollo usaremos bind mount via docker-compose)
COPY . /var/www/html

# Exponer puerto
EXPOSE 80

# Salud básica: responder index
HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD curl -f http://localhost/ || exit 1
