export type VoiceGender = 'female' | 'male';

export type VoiceoverProvider = 'elevenlabs';

export type VoiceoverAsset = {
  buffer: Buffer;
  s3Url: string;
  contentType: 'audio/mpeg';
  metadata: {
    provider: VoiceoverProvider;
    voice: string;
    gender: VoiceGender;
    model: string;
    script: string;
    accent: 'australian';
  };
};

export type VoiceoverExclusion = {
  voices?: string[];
};
