<?php
$servername = "localhost";
$username = "mathias"; // o tu usuario de base de datos
$password = "Adminrot"; // tu contraseña de la base de datos
$dbname = "productos"; // el nombre de la base de datos
 
// Crear la conexión
$conn = new mysqli($servername, $username, $password, $dbname);
 
// Verificar si la conexión fue exitosa
if ($conn->connect_error) {
    die("Conexión fallida: " . $conn->connect_error);
}
echo "Conexión exitosa!";
?>