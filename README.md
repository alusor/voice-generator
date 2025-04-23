# ElevenLabs + OpenAI Demo

Esta aplicación demuestra la integración completa de las APIs de OpenAI (chat y reconocimiento de voz) con la tecnología de texto a voz de ElevenLabs. Permite a los usuarios mantener una conversación con un asistente de IA y escuchar las respuestas con una voz natural.

## Características

- Chat con un asistente de IA impulsado por OpenAI
- Conversión de respuestas de IA a voz usando ElevenLabs
- Reconocimiento de voz usando OpenAI Whisper
- Flujo conversacional completo de voz a texto y texto a voz
- Siete versiones disponibles:
  - **Versión Estándar**: Respuestas completas con generación de audio al final
  - **Versión Streaming**: Transmisión de texto en tiempo real con generación de audio al final
  - **Versión Combinada**: Respuestas completas con audio generado en una sola llamada API
  - **Versión Tiempo Real**: Transmisión de texto en tiempo real con generación de audio por fragmentos
  - **Versión WebSocket**: Uso de la API WebSocket de ElevenLabs para streaming de audio en tiempo real
  - **Versión Combinada Stream**: Streaming de texto de OpenAI enviado directamente al WebSocket de ElevenLabs
  - **Versión Voice Chat**: Interfaz conversacional completa con reconocimiento de voz y síntesis de voz

## Comenzar

1. Clona este repositorio
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Crea un archivo `.env.local` en el directorio raíz con el siguiente contenido:
   ```
   OPENAI_API_KEY=tu_clave_api_openai_aquí
   ELEVENLABS_API_KEY=tu_clave_api_elevenlabs_aquí
   ELEVENLABS_VOICE_ID=tu_id_de_voz_preferido  # Opcional - por defecto usa "EXAVITQu4vr4xnSDxMaL"
   ```
4. Ejecuta el servidor de desarrollo:
   ```bash
   npm run dev
   ```
5. Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver el resultado.

## Rutas de API

- `/api/chat` - API de OpenAI sin streaming
- `/api/chat/stream` - API de OpenAI con streaming
- `/api/speech` - API de ElevenLabs sin streaming
- `/api/speech/stream` - API de ElevenLabs con streaming
- `/api/tts-stream` - Combina OpenAI y ElevenLabs en una sola llamada
- `/api/real-time-tts` - Streaming en tiempo real de OpenAI a ElevenLabs
- `/api/websocket-tts` - API para configurar WebSocket de ElevenLabs en el cliente
- `/api/elevenlabs-config` - API para obtener la configuración de ElevenLabs
- `/api/speech-to-text` - API para convertir audio a texto usando OpenAI Whisper

## Páginas

- `/` - Interfaz de chat estándar con respuestas sin streaming
- `/stream` - Interfaz avanzada con streaming de texto en tiempo real
- `/combined` - Interfaz que combina OpenAI y ElevenLabs en una sola llamada
- `/realtime` - Interfaz con streaming en tiempo real de OpenAI a ElevenLabs
- `/websocket` - Interfaz que utiliza la API WebSocket de ElevenLabs para streaming directo
- `/combined-stream` - Interfaz que combina el streaming de texto de OpenAI con WebSockets de ElevenLabs
- `/voice-chat` - Interfaz de chat por voz con reconocimiento y síntesis de voz

## Tecnologías Utilizadas

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [OpenAI API](https://platform.openai.com/) - Chat y Whisper
- [ElevenLabs API](https://elevenlabs.io/) - Síntesis de voz
- [TailwindCSS](https://tailwindcss.com/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) para streaming en tiempo real
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) para reproducción de audio en tiempo real
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) para grabación de audio

## Implementaciones de Streaming

El proyecto muestra diferentes enfoques para integrar streaming entre OpenAI y ElevenLabs:

1. **Enfoque básico**: Obtener respuesta completa y convertirla a audio (página principal)
2. **Streaming de texto**: Mostrar texto en tiempo real y generar audio al final (página `/stream`)
3. **Combinado**: Obtener respuesta completa y enviarla a ElevenLabs para generar audio (página `/combined`)
4. **Tiempo real**: Dividir la respuesta en fragmentos mientras se genera, convertir esos fragmentos a audio y reproducirlos en secuencia (página `/realtime`)
5. **WebSocket**: Conectar directamente al WebSocket de ElevenLabs desde el navegador para obtener streaming de audio (página `/websocket`)
6. **Combinado Stream**: Stream de texto de OpenAI enviando cada fragmento al WebSocket de ElevenLabs para generar audio en tiempo real (página `/combined-stream`)
7. **Voice Chat**: Implementación completa de grabación de voz, reconocimiento de voz, streaming de respuesta y síntesis de voz (página `/voice-chat`)

## Voice Chat - Ciclo Conversacional Completo

La versión Voice Chat implementa un flujo conversacional completo:

1. **Grabación de voz**: Utiliza la API MediaRecorder para grabar la voz del usuario
2. **Reconocimiento de voz**: Envía el audio a OpenAI Whisper para transcripción
3. **Procesamiento de texto**: Envía el texto transcrito a la API de chat de OpenAI
4. **Streaming de respuesta**: Recibe la respuesta de OpenAI en tiempo real
5. **Síntesis de voz**: Envía los fragmentos de respuesta al WebSocket de ElevenLabs
6. **Reproducción de audio**: Reproduce los fragmentos de audio a medida que llegan

Esta implementación ofrece la experiencia más natural y cercana a una conversación real con un asistente de IA.

## Consideraciones sobre WebSockets

La implementación de WebSocket utiliza la API oficial de WebSocket de ElevenLabs, que ofrece:

- Menor latencia
- Mejor calidad de streaming de audio
- Control más granular sobre la generación de voz
- Mayor eficiencia al procesar el audio en fragmentos

Para usar esta implementación, es importante entender que:
- La conexión WebSocket se establece directamente desde el navegador a ElevenLabs
- Se requiere un navegador moderno con soporte para WebSocket y Web Audio API
- El streaming de audio funciona mejor en conexiones estables

## Licencia

Este proyecto es de código abierto y está disponible bajo la [Licencia MIT](LICENSE).