import { useEffect, useMemo, useState } from 'react';
import './App.css';

type PlaylistItem = {
  title: string;
  description: string;
  thumbnailUrl: string;
  videoId: string;
};

type PlaylistMeta = {
  title: string;
  channelTitle: string;
};

declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (args: unknown) => void;
      };
    };
  }
}

const YT_API_KEY = import.meta.env.VITE_YT_API_KEY as string | undefined;
const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;

const PLAYLIST_ITEMS_LIMIT = 3;

function parsePlaylistId(input: string): string | null {
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

async function fetchPlaylistMeta(playlistId: string): Promise<PlaylistMeta> {
  if (!YT_API_KEY) {
    throw new Error('YouTube API 키가 설정되어 있지 않습니다.');
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/playlists');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('id', playlistId);
  url.searchParams.set('key', YT_API_KEY);

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

async function fetchPlaylistItems(playlistId: string): Promise<PlaylistItem[]> {
  if (!YT_API_KEY) {
    throw new Error('YouTube API 키가 설정되어 있지 않습니다.');
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('playlistId', playlistId);
  url.searchParams.set('maxResults', String(PLAYLIST_ITEMS_LIMIT));
  url.searchParams.set('key', YT_API_KEY);

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

export default function App() {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [meta, setMeta] = useState<PlaylistMeta | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!KAKAO_JS_KEY) return;
    if (!window.Kakao) return;
    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(KAKAO_JS_KEY);
    }
  }, []);

  const playlistLink = useMemo(() => {
    if (!playlistId) return '';
    return `https://www.youtube.com/playlist?list=${playlistId}`;
  }, [playlistId]);

  const handleLoad = async () => {
    setError(null);
    setMeta(null);
    setItems([]);

    const id = parsePlaylistId(playlistUrl);
    if (!id) {
      setError('플레이리스트 URL 또는 ID를 확인해 주세요.');
      return;
    }

    setPlaylistId(id);
    setLoading(true);
    try {
      const [playlistMeta, playlistItems] = await Promise.all([
        fetchPlaylistMeta(id),
        fetchPlaylistItems(id),
      ]);
      setMeta(playlistMeta);
      setItems(playlistItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    setError(null);

    if (!window.Kakao || !window.Kakao.isInitialized()) {
      setError('카카오 SDK 초기화에 실패했습니다. 키를 확인해 주세요.');
      return;
    }

    if (!meta || !playlistId || items.length === 0) {
      setError('공유할 데이터가 없습니다.');
      return;
    }

    const contents = items.slice(0, 3).map((item) => {
      const videoUrl = `https://www.youtube.com/watch?v=${item.videoId}&list=${playlistId}`;
      const fallbackThumbnail = `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`;
      return {
        title: item.title,
        description: item.description || meta.channelTitle,
        imageUrl: item.thumbnailUrl || fallbackThumbnail,
        link: {
          webUrl: videoUrl,
          mobileWebUrl: videoUrl,
        },
      };
    });

    if (contents.length < 2) {
      setError('리스트 메시지는 최소 2개 영상이 필요합니다.');
      return;
    }

    try {
      window.Kakao.Share.sendDefault({
        objectType: 'list',
        headerTitle: meta.title,
        headerLink: {
          webUrl: playlistLink,
          mobileWebUrl: playlistLink,
        },
        contents,
        buttons: [
          {
            title: '유투브에서 보기',
            link: {
              webUrl: playlistLink,
              mobileWebUrl: playlistLink,
            },
          },
        ],
      });
    } catch {
      setError(
        '카카오 공유에 실패했습니다. 카카오 개발자 콘솔의 웹 도메인에 youtube.com과 img.youtube.com을 등록했는지 확인해 주세요.',
      );
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>유튜브 플레이리스트 카카오톡 공유</h1>
        <p>유튜브 플레이리스트 링크를 넣고 리스트 메시지로 공유하세요.</p>
      </header>

      <section className="panel">
        <label className="label" htmlFor="playlist-input">
          플레이리스트 URL 또는 ID
        </label>
        <div className="input-row">
          <input
            id="playlist-input"
            type="text"
            placeholder="https://www.youtube.com/playlist?list=..."
            value={playlistUrl}
            onChange={(event) => setPlaylistUrl(event.target.value)}
          />
          <button type="button" onClick={handleLoad} disabled={loading}>
            {loading ? '불러오는 중...' : '불러오기'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {!YT_API_KEY && (
          <p className="warning">VITE_YT_API_KEY 환경 변수를 설정해 주세요.</p>
        )}
        {!KAKAO_JS_KEY && (
          <p className="warning">VITE_KAKAO_JS_KEY 환경 변수를 설정해 주세요.</p>
        )}
      </section>

      {meta && (
        <section className="panel">
          <div className="meta">
            <h2>{meta.title}</h2>
            <span>{meta.channelTitle}</span>
          </div>
          <div className="list">
            {items.map((item) => (
              <article key={item.videoId} className="list-item">
                {item.thumbnailUrl && (
                  <img src={item.thumbnailUrl} alt="" loading="lazy" />
                )}
                <div>
                  <h3>{item.title}</h3>
                  {item.description && <p>{item.description}</p>}
                </div>
              </article>
            ))}
          </div>
          <button type="button" className="share" onClick={handleShare}>
            카카오톡으로 공유
          </button>
        </section>
      )}
    </div>
  );
}
