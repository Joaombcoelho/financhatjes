import { createParser } from 'eventsource-parser';
import { supabase } from '@/integrations/supabase/client';
export async function transcribeAudio(file: File): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Entre novamente para enviar áudio.');
  const form = new FormData(); form.append('file', file);
  const response = await fetch('/api/public/transcribe', { method: 'POST', headers: { Authorization: `Bearer ${data.session.access_token}` }, body: form });
  if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.message ?? 'Não foi possível ler o áudio.'); }
  if (!response.body) throw new Error('A transcrição veio vazia.');
  let text = ''; let completed = false; let failure = '';
  const parser = createParser({ onEvent(event) { if (event.data === '[DONE]') return; try { const d = JSON.parse(event.data); if (d.type === 'transcript.text.delta') text += d.delta ?? ''; if (d.type === 'transcript.text.done') { text = d.text ?? text; completed = true; } if (d.type === 'error' || d.error) failure = d.message ?? d.error?.message ?? 'A transcrição falhou.'; } catch { failure = 'Resposta de áudio inválida.'; } } });
  const reader = response.body.getReader(); const decoder = new TextDecoder();
  while (true) { const { value, done } = await reader.read(); if (done) break; parser.feed(decoder.decode(value, { stream: true })); }
  parser.feed(decoder.decode());
  if (failure) throw new Error(failure);
  if (!completed || !text.trim()) throw new Error('Não foi possível reconhecer a fala. Envie um áudio com voz clara.');
  return text.trim();
}