export function parsePlaylistId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const listId = url.searchParams.get('list');
    if (listId) return listId;
  } catch {
    // Not a URL. Continue with raw ID handling.
  }

  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function parseVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes('youtu.be')) {
      const pathId = url.pathname.replace('/', '').trim();
      if (pathId) return pathId;
    }

    const videoId = url.searchParams.get('v');
    if (videoId) return videoId;
  } catch {
    // Not a URL. Continue with raw ID handling.
  }

  if (/^[a-zA-Z0-9_-]{6,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function parseYouTubeUrl(input: string): {
  videoId: string | null;
  playlistId: string | null;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { videoId: null, playlistId: null };
  }

  try {
    const url = new URL(trimmed);
    let videoId: string | null = null;

    if (url.hostname.includes('youtu.be')) {
      const pathId = url.pathname.replace('/', '').trim();
      videoId = pathId || null;
    } else {
      videoId = url.searchParams.get('v');
    }

    const playlistId = url.searchParams.get('list');

    return {
      videoId,
      playlistId,
    };
  } catch {
    return { videoId: null, playlistId: null };
  }
}

export function buildPlaylistLink(playlistId: string): string {
  return `https://www.youtube.com/playlist?list=${playlistId}`;
}

export function buildVideoLink(videoId: string, playlistId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`;
}

export function buildFallbackThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}
