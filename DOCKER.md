# Ejecución de la aplicación con Docker

Requisitos: Docker Desktop y Docker Compose.

## Modo desarrollo (Vite + HMR)

Para iniciar el servidor de desarrollo dentro de un contenedor con hot-reload, se debe ejecutar:

```powershell
# En la raíz del proyecto
docker compose -f docker-compose.dev.yml up --build
```

La aplicación quedará disponible en: http://localhost:5173

Para detener el entorno de desarrollo:

```powershell
docker compose -f docker-compose.dev.yml down
```

## Modo producción (build + servidor)

Para construir los assets y servirlos (puerto 8080 en el host), se debe ejecutar:

```powershell
# En la raíz del proyecto
docker compose up --build -d
```

La aplicación quedará disponible en: http://localhost:8080

Para ver logs del servicio:

```powershell
docker compose logs -f web
```

Para detener y limpiar los recursos creados:

```powershell
docker compose down
```

## Variables de entorno útiles

- VITE_PORT: Puerto del servidor de desarrollo (por defecto 5173)
- CHOKIDAR_USEPOLLING: Fuerza el polling para detectar cambios en volúmenes (true por defecto en desarrollo)

No es necesario tener Node, pnpm ni dependencias instaladas en el equipo local: todo se gestiona dentro del contenedor.
