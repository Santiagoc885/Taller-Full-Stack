# TALLER FULL STACK: SISTEMA DE COMPRA Y VENTA DE AUTOS

## OBJETIVO

Diseñar e implementar desde cero un sistema integral para la administración de una concesionaria, permitiendo la gestión de:

- **Vendedores:** Personas que suministran vehículos a la empresa.
- **Compradores:** Clientes finales del inventario.
- **Inventario:** Registro detallado de autos.
- **Transacciones:** Control de compras y ventas realizadas por la organización.

El proyecto debe seguir un flujo de desarrollo profesional que incluye:

- Modelado de datos  
- Normalización  
- Implementación de base de datos  
- Desarrollo de API  
- Frontend funcional  

---

# PARTE 1: ANÁLISIS Y MODELO ENTIDAD RELACIÓN (MER)

## ESCENARIO

La concesionaria **AutoMarket Pro** opera bajo las siguientes reglas de negocio:

- La empresa adquiere autos de personas para su posterior reventa.
- Un vehículo no puede ser vendido si no existe un registro previo de su compra por parte de la empresa.
- Cada auto tiene un ciclo de venta único (solo se vende una vez).
- Una persona puede participar en múltiples operaciones como vendedor o comprador.
- El sistema debe permitir la trazabilidad completa del historial del vehículo.
- Debe calcularse la rentabilidad por operación.

---

# PARTE 2: NORMALIZACIÓN

El modelo debe someterse a un proceso de normalización para garantizar la integridad de la información.

## 1FN (PRIMERA FORMA NORMAL)

- Eliminación de atributos multivaluados.
- Asegurar la atomicidad de los valores en cada columna.

## 2FN (SEGUNDA FORMA NORMAL)

- Eliminación de dependencias parciales.
- Garantizar que los datos personales no se repliquen innecesariamente en cada registro transaccional.

## 3FN (TERCERA FORMA NORMAL)

- Eliminación de dependencias transitivas.
- **Regla:** No almacenar datos que puedan ser calculados mediante consultas (ej. margen de ganancia).

---

# PARTE 3: IMPLEMENTACIÓN EN MYSQL (CONSOLA)

## REQUISITOS TÉCNICOS

La implementación debe realizarse exclusivamente mediante la interfaz de línea de comandos (CLI), sin el uso de herramientas gráficas.

## REGLAS DE INTEGRIDAD

- Unicidad de placas de vehículos.
- Restricción de ventas sobre autos inexistentes o previamente vendidos.
- Restricción de borrado para registros con transacciones activas asociadas.
- Unicidad de documentos de identidad para las personas.

---

# PARTE 4: CRUD CON NODE.JS Y EXPRESS

Desarrollo de una API REST enfocada en la entidad principal: **AUTO**.

## OPERACIONES OBLIGATORIAS

- **Create:** Registro de nuevos vehículos.
- **Read:** Listado general y búsqueda por campo único.
- **Update:** Actualización de información técnica.
- **Delete:** Eliminación física con validación de dependencias.

---

# PARTE 5: INVESTIGACIÓN DE MULTER

Antes de la fase de importación masiva, se debe documentar:

- Definición y flujo de un Middleware.
- Protocolo `multipart/form-data`.
- Mecanismos internos de Multer:
  - Diferencias entre `diskStorage` y `memoryStorage`.

---

# PARTE 6: IMPORTACIÓN MASIVA (CSV)

Implementación de funcionalidad para la carga de datos a gran escala:

- Endpoint para la recepción de archivos `.csv`.
- Parsing y validación de la estructura del archivo.
- Inserción masiva en la tabla de inventario con manejo de duplicados.

---

# PARTE 7: FRONTEND BÁSICO

Interfaz de usuario para la interacción con el sistema:

- Formularios de captura de datos para vehículos.
- Tablas de visualización de inventario en tiempo real.
- Módulos de edición y eliminación interactivos.
- Componente de carga de archivos para el procesamiento CSV.