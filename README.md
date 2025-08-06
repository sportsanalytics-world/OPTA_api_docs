# OPTA API Documentation MCP Server

Un servidor MCP (Model Context Protocol) para consultar la documentación de la API de fútbol de OPTA.

## Características

- 🔐 **Autenticación automática** con las credenciales de OPTA
- 🔍 **Búsqueda inteligente** en toda la documentación
- 📚 **Cache de documentación** para mejorar el rendimiento
- 🛠️ **Herramientas MCP** para consultar endpoints específicos
- 🔄 **Actualización automática** del cache cada 24 horas

## Instalación

1. Clona el repositorio:
```bash
git clone <tu-repositorio>
cd OPTA_api_docs
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp env.example .env
```

Edita el archivo `.env` con tus credenciales de OPTA:
```env
OPTA_USERNAME=tu_usuario_aqui
OPTA_PASSWORD=tu_password_aqui
OPTA_DOCS_BASE_URL=https://docs.performgroup.com/docs/rh/sdapi
```

## Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

## Herramientas MCP Disponibles

### 1. `search_opta_documentation`
Busca en toda la documentación de OPTA por términos específicos.

**Parámetros:**
- `query` (string): Términos de búsqueda

**Ejemplo:**
```json
{
  "query": "possession events"
}
```

### 2. `get_endpoint_details`
Obtiene detalles completos de un endpoint específico.

**Parámetros:**
- `url` (string): URL del endpoint de OPTA

**Ejemplo:**
```json
{
  "url": "/docs/rh/sdapi/Topics/soccer/opta-sdapi-soccer-api-possession-events.htm"
}
```

### 3. `list_all_endpoints`
Lista todos los endpoints disponibles.

**Parámetros:**
- `category` (string, opcional): Filtrar por categoría

**Ejemplo:**
```json
{
  "category": "soccer"
}
```

### 4. `refresh_documentation_cache`
Actualiza el cache de documentación.

### 5. `get_cache_status`
Obtiene el estado actual del cache.

## Configuración en Cursor

Para usar este servidor MCP en Cursor, agrega la siguiente configuración a tu `settings.json`:

```json
{
  "mcpServers": {
    "opta-api-docs": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "OPTA_USERNAME": "tu_usuario",
        "OPTA_PASSWORD": "tu_password"
      }
    }
  }
}
```

## Estructura del Proyecto

```
src/
├── index.ts                 # Punto de entrada
├── mcpServer.ts            # Servidor MCP principal
├── types/
│   └── index.ts            # Definiciones de tipos TypeScript
└── services/
    ├── optaScraper.ts      # Servicio para scrapear OPTA
    └── documentationManager.ts # Gestor de documentación y cache
```

## Endpoints Conocidos

El servidor incluye los siguientes endpoints de OPTA:

- **Soccer API Possession Events**: Eventos de posesión en fútbol
- **Soccer API Match Events**: Eventos de partidos de fútbol
- **Soccer API Player Statistics**: Estadísticas de jugadores
- **Soccer API Team Statistics**: Estadísticas de equipos

## Desarrollo

### Agregar Nuevos Endpoints

Para agregar nuevos endpoints, edita el archivo `src/services/optaScraper.ts` y agrega las URLs en el array `knownEndpoints`.

### Personalizar Búsqueda

Puedes modificar la lógica de búsqueda en `src/services/documentationManager.ts` para ajustar los pesos de relevancia.

## Troubleshooting

### Error de Autenticación
- Verifica que las credenciales en `.env` sean correctas
- Asegúrate de que tu cuenta tenga acceso a la documentación de OPTA

### Error de Conexión
- Verifica tu conexión a internet
- Comprueba que la URL base sea accesible

### Cache No Se Actualiza
- Usa la herramienta `refresh_documentation_cache` para forzar una actualización
- Verifica el estado del cache con `get_cache_status`

## Licencia

MIT 