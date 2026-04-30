import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

type MixInput = {
  musicBuffer: Buffer;
  musicContentType: string;
  voiceBuffer: Buffer;
  voiceContentType: string;
  voiceStartSeconds?: number;
  totalDurationSeconds?: number;
};

const FFMPEG_BIN = process.env.FFMPEG_PATH || 'ffmpeg';

function extFromContentType(contentType: string): string {
  const value = contentType.toLowerCase();
  if (value.includes('wav')) return 'wav';
  if (value.includes('ogg')) return 'ogg';
  if (value.includes('mp4') || value.includes('m4a') || value.includes('aac')) return 'm4a';
  return 'mp3';
}

function envFloat(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function envBool(name: string): boolean {
  const raw = (process.env[name] || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export async function mixVoiceUnderMusic(input: MixInput): Promise<{
  buffer: Buffer;
  contentType: 'audio/mpeg';
}> {
  const dir = await mkdtemp(path.join(tmpdir(), 'voice-mix-'));
  await mkdir(dir, { recursive: true });
  const musicPath = path.join(dir, `music.${extFromContentType(input.musicContentType)}`);
  const voicePath = path.join(dir, `voice.${extFromContentType(input.voiceContentType)}`);
  const outPath = path.join(dir, 'mixed.mp3');
  try {
    await writeFile(musicPath, input.musicBuffer);
    await writeFile(voicePath, input.voiceBuffer);
    const startMs = Math.max(0, Math.round((input.voiceStartSeconds ?? 0.8) * 1000));
    const totalSeconds = input.totalDurationSeconds ?? 12;
    const useSidechain = envBool('VIDEO_SIDECHAIN_DUCK');
    const musicVol = envFloat('VIDEO_MUSIC_VOLUME', useSidechain ? 0.22 : 0.34);
    const voiceVol = envFloat('VIDEO_VOICE_VOLUME', useSidechain ? 3.0 : 2.6);
    const duckThreshold = envFloat('VIDEO_DUCK_THRESHOLD', 0.12);
    const duckRatio = envFloat('VIDEO_DUCK_RATIO', 8);
    const filter = useSidechain
      ? [
          `[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=${musicVol}[music_in]`,
          `[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,adelay=${startMs}|${startMs},volume=${voiceVol}[voice_in]`,
          `[voice_in]asplit=2[voice_out][voice_sc]`,
          `[music_in][voice_sc]sidechaincompress=threshold=${duckThreshold}:ratio=${duckRatio}:attack=20:release=280:makeup=1[music_ducked]`,
          `[music_ducked][voice_out]amix=inputs=2:duration=longest:normalize=0:dropout_transition=0:weights=1 1[mixed]`,
          `[mixed]alimiter=limit=0.97[out]`,
        ].join(';')
      : [
          `[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=${musicVol}[music]`,
          `[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,adelay=${startMs}|${startMs},volume=${voiceVol}[voice]`,
          `[music][voice]amix=inputs=2:duration=longest:normalize=0:dropout_transition=0:weights=1 1[mixed]`,
          `[mixed]alimiter=limit=0.97[out]`,
        ].join(';');
    const args = [
      '-y',
      '-i', musicPath,
      '-i', voicePath,
      '-filter_complex', filter,
      '-map', '[out]',
      '-t', String(totalSeconds),
      '-ac', '2',
      '-ar', '44100',
      '-c:a', 'libmp3lame',
      '-b:a', '192k',
      outPath,
    ];
    console.log(
      `[audio-mix] running ffmpeg mode=${useSidechain ? 'sidechain' : 'amix'} start=${startMs}ms total=${totalSeconds}s music_vol=${musicVol} voice_vol=${voiceVol}${useSidechain ? ` duck=${duckThreshold}/${duckRatio}` : ''} music=${input.musicBuffer.length}B voice=${input.voiceBuffer.length}B`
    );
    await runFfmpeg(args);
    const buffer = await readFile(outPath);
    console.log(`[audio-mix] ok mixed=${buffer.length}B`);
    return { buffer, contentType: 'audio/mpeg' };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG_BIN, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 16000) stderr = stderr.slice(-16000);
    });
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`ffmpeg mix failed (code=${code}): ${stderr.slice(-1200)}`));
    });
  });
}
