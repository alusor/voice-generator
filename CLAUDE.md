# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- `npm run dev` - Run development server with Turbopack
- `npm run build` - Build the application
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint checks

## Code Style
- **Imports**: Order by external libraries first, then internal modules
- **Formatting**: Follow Next.js conventions with ESLint config
- **Component Structure**: Functional components with named exports
- **CSS**: Use Tailwind CSS for styling
- **Naming**: Use camelCase for variables/functions, PascalCase for components
- **File Structure**: Page components in app directory following Next.js App Router
- **Error Handling**: Use try/catch for async operations
- **Images**: Use Next.js Image component with proper alt text and dimensions

## Project Structure
- Next.js 15 with App Router
- React 19
- Tailwind CSS for styling
- Geist font for typography


## Proyecto
Resumen del Proyecto ElevenLabs + OpenAI Demo

  Objetivo del Proyecto

  Hemos creado una aplicación de demostración que integra las APIs de OpenAI (Chat y Whisper) con la tecnología de texto a voz de ElevenLabs, permitiendo mantener conversaciones con IA y escuchar las
  respuestas con voces naturales.

  Componentes Principales Implementados

  1. Interfaz básica de chat con texto
    - Entrada de texto y visualización de respuestas
    - Conversión de respuestas a voz
  2. Streaming de texto
    - Visualización de respuestas en tiempo real mientras se generan
    - Generación de audio al completarse la respuesta
  3. Streaming combinado
    - Envío de fragmentos de texto a ElevenLabs a medida que se generan
    - Reproducción de audio en tiempo real
  4. Interfaz de WebSockets con ElevenLabs
    - Conexión directa del navegador a la API de WebSockets de ElevenLabs
    - Control mejorado sobre la generación de audio
  5. Chat por voz
    - Grabación de voz del usuario
    - Transcripción usando OpenAI Whisper
    - Streaming de respuestas de texto y audio

  Tecnologías Utilizadas

  - Frontend: React, Next.js, TailwindCSS
  - APIs externas: OpenAI (Chat completions, Whisper), ElevenLabs
  - Técnicas de streaming: EventSource (SSE), WebSockets
  - Audio: MediaRecorder API, Web Audio API

  Estructura del Proyecto

  elevenlabs-demo/
  ├── app/
  │   ├── api/
  │   │   ├── chat/
  │   │   │   ├── route.js
  │   │   │   └── stream/route.js
  │   │   ├── elevenlabs-config/route.js
  │   │   ├── real-time-tts/route.js
  │   │   ├── speech/
  │   │   │   ├── route.js
  │   │   │   └── stream/route.js
  │   │   ├── speech-to-text/route.js
  │   │   ├── tts-stream/route.js
  │   │   └── websocket-tts/route.js
  │   ├── combined/page.js
  │   ├── combined-stream/page.js
  │   ├── page.js (página principal)
  │   ├── realtime/page.js
  │   ├── stream/page.js
  │   ├── voice-chat/page.js
  │   └── websocket/page.js
  ├── components/
  │   └── MediaRecorder.js
  └── public/

  Implementaciones de Streaming

  1. Enfoque básico (página principal)
    - Obtener respuesta completa de texto
    - Convertir a audio al final
  2. Streaming de texto (/stream)
    - Mostrar texto en tiempo real
    - Generar audio al terminar
  3. Combinado (/combined)
    - Endpoint unificado cliente-servidor
  4. Tiempo real (/realtime)
    - División de respuesta en fragmentos
    - Conversión a audio por fragmentos
    - Reproducción secuencial
  5. WebSocket (/websocket)
    - Conexión directa del navegador a ElevenLabs
  6. Streaming combinado (/combined-stream)
    - Envío de fragmentos de texto al WebSocket
    - Reproducción en tiempo real
  7. Chat por voz (/voice-chat)
    - Reconocimiento de voz con Whisper
    - Ciclo completo de conversación

  Desafíos Superados

  1. SSR vs. APIs del navegador
    - Uso de importación dinámica con next/dynamic
    - Verificaciones de entorno para evitar errores de SSR
  2. Formato de audio correcto para Whisper
    - Implementación de archivo temporal en servidor
    - Manejo correcto de formData para archivos
  3. Integración con WebSockets de ElevenLabs
    - Configuración correcta de parámetros
    - Manejo de chunks para mejor calidad de voz
  4. Reproducción de audio en streaming
    - Uso de Web Audio API
    - Manejo de cola de reproducción

  Próximos Pasos Posibles

  1. Mejoras de UX
    - Activación por voz automática
    - Feedback visual durante la grabación y respuesta
  2. Optimización del streaming
    - Ajuste fino de parámetros para reducir latencia
    - Evaluación de calidad vs. velocidad en diferentes configuraciones
  3. Historial de conversación persistente
    - Almacenamiento de conversaciones
    - Continuación de contexto entre sesiones
  4. Selección de voces
    - Interfaz para elegir diferentes voces de ElevenLabs
    - Posibilidad de crear o clonar voces
  5. Mejora de accesibilidad
    - Soporte para lectores de pantalla
    - Atajos de teclado

  Consideraciones para Producción

  1. Seguridad de API keys
    - Implementar un sistema de tokens temporales
    - No exponer claves de API al cliente
  2. Optimización de costos
    - Monitoreo de uso de APIs
    - Implementación de límites y cuotas
  3. Manejo de errores robusto
    - Recuperación de conexiones perdidas
    - Retroalimentación clara al usuario
  4. Pruebas de carga
    - Rendimiento con múltiples usuarios simultáneos
    - Escalado de recursos según necesidad

  ---
  Este proyecto ofrece una base sólida para construir aplicaciones conversacionales avanzadas con voz usando las APIs de OpenAI y ElevenLabs. Las diferentes implementaciones demuestran diversos enfoques
  para el streaming de texto y voz, desde los más simples hasta los más sofisticados con WebSockets.