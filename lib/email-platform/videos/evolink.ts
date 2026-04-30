type EvolinkTrack = {
  taskId: string;
  model: string;
  audioUrl: string;
  durationSeconds: number | null;
};

type EvolinkOptions = {
  excludeAudioUrls?: string[];
  excludeTaskIds?: string[];
  maxAttempts?: number;
};

function baseUrl(): string {
  return (process.env.EVOLINK_API_BASE_URL || 'https://api.evolink.ai').replace(/\/+$/, '');
}

function key(): string {
  return (process.env.EVOLINK_API_KEY || '').trim();
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function generateMusicWithEvolink(
  prompt: string,
  options: EvolinkOptions = {}
): Promise<EvolinkTrack | null> {
  const apiKey = key();
  if (!apiKey) return null;
  const maxAttempts = Math.max(1, Math.min(options.maxAttempts ?? 3, 5));
  const excludedUrls = new Set((options.excludeAudioUrls ?? []).filter(Boolean));
  const excludedIds = new Set((options.excludeTaskIds ?? []).filter(Boolean));
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const track = await generateOnce(apiKey, prompt);
    if (!track) {
      if (attempt === maxAttempts) return null;
      continue;
    }
    if (!excludedUrls.has(track.audioUrl) && !excludedIds.has(track.taskId)) {
      return track;
    }
    console.log(`[evolink] excluded track returned attempt=${attempt} taskId=${track.taskId}`);
    if (attempt === maxAttempts) return track;
  }
  return null;
}

async function generateOnce(apiKey: string, prompt: string): Promise<EvolinkTrack | null> {
  const model = process.env.EVOLINK_SUNO_MODEL || 'suno-v5-beta';
  try {
    console.log(`[evolink] POST /v1/audios/generations model=${model}`);
    const createRes = await fetch(`${baseUrl()}/v1/audios/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        custom_mode: false,
        instrumental: true,
        prompt,
      }),
    });
    const createData = await safeJson(createRes);
    if (!createRes.ok) {
      console.warn(
        `[evolink] create failed status=${createRes.status} body=${JSON.stringify(createData).slice(0, 240)}`
      );
      return null;
    }
    const taskId = typeof (createData as { id?: unknown })?.id === 'string' ? (createData as { id: string }).id : '';
    if (!taskId) {
      console.warn(`[evolink] no task id in response body=${JSON.stringify(createData).slice(0, 240)}`);
      return null;
    }
    console.log(`[evolink] task created id=${taskId}`);

    const startedAt = Date.now();
    let lastStatus = '';
    while (Date.now() - startedAt < 180000) {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const taskRes = await fetch(`${baseUrl()}/v1/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const taskData = await safeJson(taskRes);
      if (!taskRes.ok) {
        console.warn(`[evolink] poll failed status=${taskRes.status}`);
        continue;
      }
      const status = typeof (taskData as { status?: unknown })?.status === 'string' ? (taskData as { status: string }).status : '';
      if (status !== lastStatus) {
        console.log(`[evolink] task ${taskId} status=${status}`);
        lastStatus = status;
      }
      if (status === 'failed' || status === 'error') {
        console.warn(`[evolink] task ${taskId} terminal status=${status}`);
        return null;
      }
      if (status !== 'completed') continue;

      const resultData = Array.isArray((taskData as { result_data?: unknown[] }).result_data)
        ? ((taskData as { result_data: Array<Record<string, unknown>> }).result_data[0] || {})
        : {};
      const audioUrl = typeof resultData.audio_url === 'string' ? resultData.audio_url : '';
      if (!audioUrl) {
        console.warn(`[evolink] task ${taskId} completed without audio_url`);
        return null;
      }
      const durationSeconds = typeof resultData.duration === 'number' ? resultData.duration : null;
      console.log(`[evolink] task ${taskId} ready audioUrl=${audioUrl.slice(0, 80)}…`);
      return { taskId, model, audioUrl, durationSeconds };
    }
    console.warn(`[evolink] task ${taskId} polling timed out after 180s`);
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    console.warn(`[evolink] exception: ${message}`);
    return null;
  }
}
