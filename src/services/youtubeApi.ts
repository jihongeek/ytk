export type PlaylistItem = {
  title: string;
  description: string;
  thumbnailUrl: string;
  videoId: string;
};

export type PlaylistMeta = {
  title: string;
  channelTitle: string;
};

export async function fetchPlaylistMeta(
  playlistId: string,
  apiKey?: string
): Promise<PlaylistMeta> {
  if (!apiKey) {
    throw new Error('YouTube API 키가 설정되어 있지 않습니다.');
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/playlists');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('id', playlistId);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('플레이리스트 정보를 불러오지 못했습니다.');
  }

  const data = (await response.json()) as {
    items?: Array<{ snippet?: { title?: string; channelTitle?: string } }>;
  };

  const item = data.items?.[0];
  if (!item?.snippet?.title) {
    throw new Error('플레이리스트를 찾을 수 없습니다.');
  }

  return {
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle ?? '',
  };
}

export async function fetchPlaylistItems(
  playlistId: string,
  apiKey?: string,
  limit = 3
): Promise<PlaylistItem[]> {
  if (!apiKey) {
    throw new Error('YouTube API 키가 설정되어 있지 않습니다.');
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('playlistId', playlistId);
  url.searchParams.set('maxResults', String(limit));
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('플레이리스트 항목을 불러오지 못했습니다.');
  }

  const data = (await response.json()) as {
    items?: Array<{
      snippet?: {
        title?: string;
        description?: string;
        resourceId?: { videoId?: string };
        thumbnails?: { medium?: { url?: string } };
        videoOwnerChannelTitle?: string;
      };
    }>;
  };

  return (
    data.items?.map((item) => {
      const snippet = item.snippet ?? {};
      return {
        title: snippet.title ?? '제목 없음',
        description: snippet.videoOwnerChannelTitle ?? '',
        thumbnailUrl: snippet.thumbnails?.medium?.url ?? '',
        videoId: snippet.resourceId?.videoId ?? '',
      };
    }) ?? []
  ).filter((item) => item.videoId);
}
