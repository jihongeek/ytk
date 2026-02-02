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

export function buildPlaylistLink(playlistId: string): string {
  return `https://www.youtube.com/playlist?list=${playlistId}`;
}

export function buildVideoLink(videoId: string, playlistId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`;
}

export function buildFallbackThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}
