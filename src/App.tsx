import { useEffect, useState } from 'react';
import './App.css';
import {
  fetchPlaylistItems,
  fetchPlaylistMeta,
  PlaylistItem,
  PlaylistMeta,
} from './services/youtubeApi';
import { sendKakaoShare } from './services/kakaoShare.ts';
import { initKakao } from './utils/kakao.ts';
import { parsePlaylistId } from './utils/youtube';

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
    initKakao(KAKAO_JS_KEY);
  }, []);

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
        fetchPlaylistMeta(id, YT_API_KEY),
        fetchPlaylistItems(id, YT_API_KEY, PLAYLIST_ITEMS_LIMIT),
      ]);
      setMeta(playlistMeta);
      setItems(playlistItems);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    setError(null);

    try {
      if (!meta || !playlistId) {
        throw new Error('공유할 데이터가 없습니다.');
      }

      sendKakaoShare({
        meta,
        playlistId,
        items,
        limit: PLAYLIST_ITEMS_LIMIT,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      );
    }
  };

  return (
    <div className='app'>
      <header className='header'>
        <h1>유튜브 플레이리스트 카카오톡 공유</h1>
        <p>유튜브 플레이리스트 링크를 넣고 리스트 메시지로 공유하세요.</p>
      </header>

      <section className='panel'>
        <label className='label' htmlFor='playlist-input'>
          플레이리스트 URL 또는 ID
        </label>
        <div className='input-row'>
          <input
            id='playlist-input'
            type='text'
            placeholder='https://www.youtube.com/playlist?list=...'
            value={playlistUrl}
            onChange={(event) => setPlaylistUrl(event.target.value)}
          />
          <button type='button' onClick={handleLoad} disabled={loading}>
            {loading ? '불러오는 중...' : '불러오기'}
          </button>
        </div>
        {error && <p className='error'>{error}</p>}
        {!YT_API_KEY && (
          <p className='warning'>VITE_YT_API_KEY 환경 변수를 설정해 주세요.</p>
        )}
        {!KAKAO_JS_KEY && (
          <p className='warning'>
            VITE_KAKAO_JS_KEY 환경 변수를 설정해 주세요.
          </p>
        )}
      </section>

      {meta && (
        <section className='panel'>
          <div className='meta'>
            <h2>{meta.title}</h2>
            <span>{meta.channelTitle}</span>
          </div>
          <div className='list'>
            {items.map((item) => (
              <article key={item.videoId} className='list-item'>
                {item.thumbnailUrl && (
                  <img src={item.thumbnailUrl} alt='' loading='lazy' />
                )}
                <div>
                  <h3>{item.title}</h3>
                  {item.description && <p>{item.description}</p>}
                </div>
              </article>
            ))}
          </div>
          <button type='button' className='share' onClick={handleShare}>
            카카오톡으로 공유
          </button>
        </section>
      )}
    </div>
  );
}
