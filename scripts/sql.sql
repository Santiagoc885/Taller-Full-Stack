//

CREATE DATABASE auto_market;

USE auto_market;


CREATE TABLE personas (id_persona INT AUTO_INCREMENT PRIMARY KEY,  nombre VARCHAR(100) NOT NULL,  apellido VARCHAR(100) NOT NULL,  cedula VARCHAR(20) NOT NULL,  telefono VARCHAR(20),  email VARCHAR(150));

 CREATE TABLE autos (id_auto INT AUTO_INCREMENT PRIMARY KEY, placa VARCHAR(10) UNIQUE NOT NULL, marca VARCHAR(60) NOT NULL, modelo VARCHAR(100) NOT NULL, anio SMALLINT NOT NULL, estado VARCHAR(20) );


 CREATE TABLE compras (id_compra INT AUTO_INCREMENT PRIMARY KEY, id_auto INT UNIQUE NOT NULL, id_vendedor INT NOT NULL,precio_compra DECIMAL(12,2) NOT NULL, fecha_compra DATE DEFAULT CURRENT_DATE,

FOREIGN KEY (id_auto) REFERENCES autos(id_auto),
FOREIGN KEY (id_vendedor) REFERENCES personas(id_persona));


CREATE TABLE ventas ( id_venta INT AUTO_INCREMENT PRIMARY KEY, id_compra INT UNIQUE NOT NULL, id_comprador INT NOT NULL, precio_venta DECIMAL(12,2) NOT NULL, fecha_venta DATE, ganancia DECIMAL(12,2),

  FOREIGN KEY (id_compra) REFERENCES compras(id_compra),
  FOREIGN KEY (id_comprador) REFERENCES personas(id_persona));



--- INSERTS

INSERT INTO autos (placa, marca, modelo, anio, estado) VALUES
('HFQ536','Renault','Modelo_X',2009,'disponible'),
('LNG133','Chevrolet','Modelo_O',2022,'disponible'),
('APZ115','Toyota','Modelo_T',2024,'disponible'),
('WWV207','Renault','Modelo_R',2015,'disponible'),
('APA575','Mazda','Modelo_E',2013,'disponible');



INSERT INTO personas (nombre, apellido, cedula, telefono, email) VALUES
('Nombre_W','Apellido_C','39309286','3939054443',NULL),
('Nombre_U','Apellido_T','590835099','3665590484',NULL),
('Nombre_F','Apellido_M','506827008','3617805020',NULL),
('Nombre_D','Apellido_J','748753291','3404957161',NULL),
('Nombre_W','Apellido_X','269431890','3105492085',NULL),
('Nombre_Q','Apellido_G','322390562','3629711106',NULL),
('Nombre_R','Apellido_K','140102559','3435310780',NULL),
('Nombre_S','Apellido_P','612908377','3126588475',NULL),
('Nombre_A','Apellido_D','803928712','3507762910',NULL),
('Nombre_B','Apellido_Z','493821002','3017765123',NULL);
   
INSERT INTO compras (id_auto, id_vendedor, precio_compra, fecha_compra) VALUES
(1,1,15087479.11,'2025-12-29'),
(2,3,30396787.21,'2025-09-09'),
(3,5,25381304.56,'2023-11-11'),
(4,7,17657781.07,'2022-03-09'),
(5,9,84907701.39,'2024-10-28');

INSERT INTO ventas (id_compra, id_comprador, precio_venta, fecha_venta, ganancia) VALUES
(1,2,29954250.58,'2026-06-19',14866771.47),
(2,4,48117548.30,'2026-07-14',17720761.09),
(4,8,27133996.02,'2022-04-06',9476214.95);