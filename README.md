# OPTA API Documentation MCP Server

Un servidor MCP (Model Context Protocol) para consultar la documentación de la API de fútbol de OPTA.

## Características

- 🔐 **Autenticación automática** con las credenciales de OPTA
- 🔍 **Búsqueda inteligente** en toda la documentación
- 📚 **Cache de documentación** para mejorar el rendimiento
- 🛠️ **Herramientas MCP** para consultar endpoints específicos
- 🔄 **Actualización automática** del cache cada 24 horas
- 🚀 **Listo para despliegue** en Render con configuración automática
- 📖 **Documentación completa** de endpoints con ejemplos

## Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/sportsanalytics-world/OPTA_api_docs.git
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
OPTA_DOCS_BASE_URL=https://docs.performgroup.com
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

### Procesar Endpoints
```bash
npm run process:endpoints
```

## Herramientas MCP Disponibles

### `get_endpoint_documentation`
Obtiene la documentación HTML de un endpoint específico de OPTA y responde preguntas sobre ella.

**Parámetros:**
- `endpoint_code` (string): Código del endpoint (ej: MA13, MA1, PE2, etc.)
- `question` (string): Pregunta sobre la documentación del endpoint

**Ejemplo:**
```json
{
  "endpoint_code": "MA13",
  "question": "What is the overview of this endpoint?"
}
```

## Configuración en Cursor

Para usar este servidor MCP en Cursor, agrega la siguiente configuración a tu `~/.cursor/mcp.json`:

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

## Despliegue en Render

El proyecto incluye configuración automática para despliegue en Render:

1. **Conecta tu repositorio** a Render
2. **Render detectará automáticamente** el `render.yaml`
3. **Configura las variables de entorno** en Render:
   - `OPTA_USERNAME`: Tu usuario de OPTA
   - `OPTA_PASSWORD`: Tu contraseña de OPTA
   - `OPTA_DOCS_BASE_URL`: Ya configurado

### Configuración de Render (`render.yaml`)
```yaml
services:
  - type: web
    name: opta-api-docs-mcp
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: OPTA_USERNAME
        sync: false
      - key: OPTA_PASSWORD
        sync: false
      - key: OPTA_DOCS_BASE_URL
        value: https://docs.performgroup.com/docs/rh/sdapi
    autoDeploy: true
```

## Estructura del Proyecto

```
src/
├── index.ts                 # Punto de entrada
├── mcpServer.ts            # Servidor MCP principal
├── types/
│   └── index.ts            # Definiciones de tipos TypeScript
├── services/
│   ├── optaScraper.ts      # Servicio para scrapear OPTA
│   └── documentationManager.ts # Gestor de documentación y cache
└── scripts/
    ├── processOptaEndpoints.ts # Procesamiento de endpoints
    └── discoverEndpoints.ts    # Descubrimiento de endpoints
```

## Endpoints Conocidos

El servidor incluye los siguientes endpoints de OPTA:

- **MA13 - Soccer API Possession Events**: Eventos de posesión en fútbol
- **MA3 - Soccer API Match Events**: Eventos de partidos de fútbol
- **MA12 - Soccer API Match Expected Goals**: Expected Goals de partidos
- **MA6 - Soccer API Commentary**: Comentarios automáticos y manuales
- **MA1 - Soccer API Fixtures and Results**: Fixtures y resultados

## Ejemplos de Uso

### Consultar Documentación de un Endpoint
```bash
# Obtener overview de MA13
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "get_endpoint_documentation",
      "arguments": {
        "endpoint_code": "MA13",
        "question": "What is the overview of this endpoint?"
      }
    }
  }'
```

## Desarrollo

### Agregar Nuevos Endpoints

Para agregar nuevos endpoints, edita el archivo `src/services/optaScraper.ts` y agrega las URLs en el array `knownEndpoints`.

### Personalizar Búsqueda

Puedes modificar la lógica de búsqueda en `src/services/documentationManager.ts` para ajustar los pesos de relevancia.

### Scripts Disponibles

- `npm run build`: Compila el proyecto TypeScript
- `npm run dev`: Ejecuta en modo desarrollo
- `npm start`: Ejecuta en modo producción
- `npm run process:endpoints`: Procesa y actualiza los endpoints

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

### Error de MCP Server
- Verifica que el servidor esté corriendo: `npm start`
- Comprueba los logs del servidor
- Asegúrate de que las dependencias estén actualizadas: `npm install`

## Tecnologías Utilizadas

- **Node.js**: Runtime de JavaScript
- **TypeScript**: Lenguaje de programación tipado
- **@modelcontextprotocol/sdk**: SDK para servidores MCP
- **Axios**: Cliente HTTP
- **Cheerio**: Parser HTML
- **Zod**: Validación de esquemas

## Licencia

MIT 