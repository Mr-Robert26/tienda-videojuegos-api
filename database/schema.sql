-- =====================================================================
--  Tienda Digital de Videojuegos con Gestión de Licencias y Usuarios
--  Script de creación de tablas + 10 registros por tabla (PostgreSQL)
--  Ejecutar en pgAdmin > Query Tool, conectado a la BD "tienda_videojuegos"
-- =====================================================================

-- Limpieza (orden inverso por las llaves foráneas)
DROP TABLE IF EXISTS licencias;
DROP TABLE IF EXISTS videojuegos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS desarrolladoras;

-- ---------------------------------------------------------------------
-- 1. DESARROLLADORAS
-- ---------------------------------------------------------------------
CREATE TABLE desarrolladoras (
    id              SERIAL       PRIMARY KEY,
    nombre_empresa  VARCHAR(100) NOT NULL UNIQUE,
    pais            VARCHAR(60)  NOT NULL
);

-- ---------------------------------------------------------------------
-- 2. VIDEOJUEGOS  (N videojuegos -> 1 desarrolladora)
-- ---------------------------------------------------------------------
CREATE TABLE videojuegos (
    id                SERIAL        PRIMARY KEY,
    titulo            VARCHAR(150)  NOT NULL,
    genero            VARCHAR(50)   NOT NULL,
    precio            NUMERIC(10,2) NOT NULL CHECK (precio > 0),
    desarrolladora_id INTEGER       NOT NULL,
    CONSTRAINT fk_videojuego_desarrolladora
        FOREIGN KEY (desarrolladora_id)
        REFERENCES desarrolladoras(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------
-- 3. USUARIOS
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id              SERIAL       PRIMARY KEY,
    nickname        VARCHAR(50)  NOT NULL UNIQUE,
    correo          VARCHAR(120) NOT NULL UNIQUE
                    CHECK (correo ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    fecha_registro  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 4. LICENCIAS (tabla puente: un usuario compra licencias de videojuegos)
-- ---------------------------------------------------------------------
CREATE TABLE licencias (
    id                 SERIAL      PRIMARY KEY,
    fecha_compra       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    codigo_activacion  VARCHAR(64) NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
    usuario_id         INTEGER     NOT NULL,
    videojuego_id      INTEGER     NOT NULL,
    CONSTRAINT fk_licencia_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_licencia_videojuego
        FOREIGN KEY (videojuego_id)
        REFERENCES videojuegos(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- =====================================================================
--  DATOS DE PRUEBA (10 registros coherentes por tabla)
-- =====================================================================

INSERT INTO desarrolladoras (nombre_empresa, pais) VALUES
('Nintendo',            'Japón'),
('Rockstar Games',      'Estados Unidos'),
('CD Projekt Red',      'Polonia'),
('Ubisoft',             'Francia'),
('FromSoftware',        'Japón'),
('Mojang Studios',      'Suecia'),
('Naughty Dog',         'Estados Unidos'),
('Capcom',              'Japón'),
('Larian Studios',      'Bélgica'),
('Supergiant Games',    'Estados Unidos');

INSERT INTO videojuegos (titulo, genero, precio, desarrolladora_id) VALUES
('The Legend of Zelda: Tears of the Kingdom', 'Aventura',        1399.00, 1),
('Red Dead Redemption 2',                     'Acción',           899.00, 2),
('Cyberpunk 2077',                            'RPG',              799.00, 3),
('Assassin''s Creed Mirage',                  'Acción',           999.00, 4),
('Elden Ring',                                'RPG',             1199.00, 5),
('Minecraft',                                 'Sandbox',          549.00, 6),
('The Last of Us Part I',                     'Acción',          1299.00, 7),
('Resident Evil 4',                           'Survival Horror',  999.00, 8),
('Baldur''s Gate 3',                          'RPG',             1149.00, 9),
('Hades',                                     'Roguelike',        369.00, 10);

INSERT INTO usuarios (nickname, correo, fecha_registro) VALUES
('dark_link',     'darklink@gmail.com',      '2025-01-10 10:15:00'),
('pixel_queen',   'pixelqueen@outlook.com',  '2025-02-03 18:40:00'),
('neo_gamer',     'neo.gamer@yahoo.com',     '2025-03-21 09:05:00'),
('kratos_mx',     'kratos.mx@gmail.com',     '2025-04-14 22:30:00'),
('luna_byte',     'luna.byte@proton.me',     '2025-05-02 13:12:00'),
('speedrunner99', 'speed99@gmail.com',       '2025-06-18 16:45:00'),
('tarnished_01',  'tarnished01@hotmail.com', '2025-07-07 20:00:00'),
('creeper_boy',   'creeperboy@gmail.com',    '2025-08-25 11:25:00'),
('ellie_fan',     'elliefan@outlook.com',    '2025-09-30 08:50:00'),
('bard_master',   'bardmaster@gmail.com',    '2025-10-12 19:35:00');

INSERT INTO licencias (fecha_compra, codigo_activacion, usuario_id, videojuego_id) VALUES
('2025-01-11 12:00:00', 'ZLDA-7K3M-Q9XP-2B4T', 1, 1),
('2025-02-05 19:10:00', 'RDR2-H8N1-L5VW-6C3J', 2, 2),
('2025-03-22 10:30:00', 'CYBR-4P7Q-T2MZ-9F1K', 3, 3),
('2025-04-15 23:05:00', 'ACMR-1D6S-R8YB-3N7H', 4, 4),
('2025-05-03 14:20:00', 'ELDN-5G2W-K7CX-8V4L', 5, 5),
('2025-06-19 17:00:00', 'MNCR-9J4T-B1QZ-5M6P', 6, 6),
('2025-07-08 21:15:00', 'TLOU-3R8F-N6HD-1X2W', 7, 7),
('2025-08-26 12:40:00', 'RE4R-6L1V-P9KS-4T8C', 8, 8),
('2025-10-01 09:10:00', 'BG3L-2M5Y-W7JN-0Q3R', 9, 9),
('2025-10-13 20:05:00', 'HADS-8B3C-Z4GT-7K1F', 10, 10);

-- Verificación
SELECT * FROM desarrolladoras;
SELECT * FROM videojuegos;
SELECT * FROM usuarios;
SELECT * FROM licencias;
