# Shipwreckeds Front

Interfaz web del juego Shipwreckeds, construida con React y TypeScript. Este repositorio contiene la capa de presentación que se comunica con los servicios de backend para gestionar autenticación, lobby y partidas en tiempo real.

## Tecnologías principales

- **Vite**: bundler y servidor de desarrollo para aplicaciones modernas en React.
- **React + TypeScript**: base de la interfaz, tipado estático y componentes reutilizables.
- **Tailwind CSS**: sistema de utilidades para estilos y maquetación.
- **StompJS**: comunicación en tiempo real mediante WebSockets.

## Puesta en marcha

```bash
npm install
npm run dev
```

Por defecto la aplicación se sirve en `http://localhost:5173`. Ajustar las variables de entorno si el backend se ejecuta en otra ubicación.

## Estructura del proyecto

```
src/
	components/        Componentes de UI para pantallas principales
	styles/            Hojas CSS para layouts y formularios
	utils/             Hooks y utilidades compartidas
	assets/            Recursos estáticos (imágenes, fuentes)
```

Los componentes de juego (`src/components/GameCanvas`) encapsulan la lógica de interacción en tiempo real (canvas, eventos de eliminación, modal de votación, etc.). Los hooks en `src/utils/GameCanvas` abstraen la comunicación con el servidor, gestión de bucles de juego y movimiento de personajes.

## Scripts útiles

- `npm run dev`: inicia el servidor de desarrollo con recarga en caliente.
- `npm run build`: genera la versión optimizada para producción.
- `npm run preview`: sirve la build generada para verificación.
