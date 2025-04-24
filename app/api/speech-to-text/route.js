import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import os from 'os';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    // Extraer el archivo de audio de la solicitud
    const formData = await request.formData();
    const audioFile = formData.get('file');

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Determinar la extensión según el tipo MIME
    let fileExtension = '.webm';
    const fileType = audioFile.type;
    
    if (fileType) {
      if (fileType.includes('wav')) fileExtension = '.wav';
      else if (fileType.includes('mp3')) fileExtension = '.mp3';
      else if (fileType.includes('ogg')) fileExtension = '.ogg';
      else if (fileType.includes('flac')) fileExtension = '.flac';
      else if (fileType.includes('m4a')) fileExtension = '.m4a';
      else if (fileType.includes('mp4')) fileExtension = '.mp4';
      console.log(`Detected file type: ${fileType}, using extension: ${fileExtension}`);
    }
    
    // Crear un archivo temporal con la extensión correcta
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `audio-${Date.now()}${fileExtension}`);
    
    // Convertir el FormData file a un Buffer y escribirlo al archivo temporal
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(tempFilePath, buffer);
    
    console.log(`Created temporary file: ${tempFilePath}`);
    
    // Crear un ReadStream para el archivo temporal
    const fileStream = fs.createReadStream(tempFilePath);

    // Enviar el archivo a OpenAI para transcripción
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      language: 'es',
    });

    // Limpiar - eliminar el archivo temporal
    try {
      fs.unlinkSync(tempFilePath);
      console.log(`Deleted temporary file: ${tempFilePath}`);
    } catch (cleanupError) {
      console.warn('Error cleaning up temp file:', cleanupError);
    }

    // Devolver la transcripción
    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json({ 
      error: `Failed to transcribe audio: ${error.message || error}` 
    }, { status: 500 });
  }
}