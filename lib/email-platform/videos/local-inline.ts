export function shouldRunVideoInlineInLocal(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.VIDEO_LOCAL_INLINE !== '0';
}
