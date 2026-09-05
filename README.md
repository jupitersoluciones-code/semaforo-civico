<div align="center">

# 🚦 Semáforo Cívico

**Plataforma de control social a la contratación pública en Colombia**

</div>

## 📋 Descripción

Semáforo Cívico es una herramienta web que permite a los ciudadanos monitorear la contratación
pública municipal, detectar irregularidades y generar alertas. Utiliza un sistema de semáforo
(verde/amarillo/rojo) para evaluar la salud de los contratos públicos.

## ✨ Funcionalidades

- **Filtros por departamento y municipio** para explorar contratos de todo Colombia
- **Semáforo de contratos**: clasificación visual del estado de ejecución
- **Detección de irregularidades**:
  - Contratos Avispa (adiciones >50%)
  - Alerta de inacción (poco avance en plazos largos)
  - Fraccionamiento de contratos
  - Concentración de contratación en un proveedor
  - Contratos directos que exceden topes legales (Decreto 1082 de 2015)
- **Consultas especializadas**: SECOP, cuantías mínimas, interadministrativos y vivienda
- **Estadísticas legales**: límites de menor cuantía según categoría de municipio
- **Gráficos interactivos** de distribución de contratación
- **Comparación entre municipios** (benchmarking territorial)
- **Búsqueda global** de contratos por objeto, proveedor o entidad
- **Perfil de entidades** con historial de contratación
- **Exportación** de datos a CSV y JSON
- **Reportes ciudadanos**: sistema de alertas con persistencia local
- **Asistente IA** (Gemini) para análisis de contratos

## 🗃️ Fuentes de Datos

| Fuente | Descripción | URL |
|---|---|---|
| **Datos Abiertos Colombia** | API Socrata con ~6M contratos SECOP II | [datos.gov.co](https://www.datos.gov.co) |
| **SECOP II Contratos** | Dataset `jbjy-vk9h` | — |
| **DNP** | Proyectos de inversión territorial | [dnp.gov.co](https://www.dnp.gov.co) |
| **CeroCorrupcion.pro** | Estadísticas y auditoría de riesgo agregada | [cerocorrupcion.pro](https://www.cerocorrupcion.pro) |

Datos bajo licencia **CC BY-SA 4.0**.

## 🚀 Inicio rápido

**Prerrequisitos:** Node.js 18+

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de servidor (opcional para desarrollo local y Vercel)
#    Copia .env.local y agrega tus credenciales
GEMINI_API_KEY=tu_api_key
SOCRATA_APP_TOKEN=tu_socrata_token

# 3. Ejecutar en desarrollo
npm run dev

# 4. Build de producción
npm run build

# 5. Ejecutar tests
npm test
```

## 📊 Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run build` | Build de producción (tsc + vite) |
| `npm run preview` | Previsualizar build |
| `npm test` | Ejecutar tests (Vitest) |
| `npm run lint` | Lint (ESLint) |
| `npm run typecheck` | TypeScript type check |
| `npm run format` | Formatear código (Prettier) |

## 🏗️ Tecnologías

- **React 19** + **TypeScript**
- **Vite 6**
- **Tailwind CSS** (build PostCSS)
- **Recharts** (gráficos)
- **Vitest** (testing)
- **Datos.gov.co Socrata API** (datos reales)

## 🚀 Deploy

### Vercel / Netlify
La app está lista para deploy estático (SPA). El archivo `vercel.json` incluye la configuración
de rewrites para SPA. Los secretos configurados en CI/CD:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## 📄 Licencia

Datos públicos bajo licencia **CC BY-SA 4.0**. Código fuente disponible para uso educativo
y civic tech.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:
1. Haz fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/xyz`)
3. Ejecuta `npm run lint` y `npm test` antes de enviar el PR
4. Envía un pull request detallando los cambios
