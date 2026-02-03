import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  parsePlaylistId,
  parseVideoId,
  parseYouTubeUrl,
} from '../utils/youtube';

type Platform = 'ios' | 'android' | 'web';

type LinkState = {
  deepLink: string | null;
  fallbackLink: string | null;
  message: string;
};

function getPlatform(userAgent: string): Platform {
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  return 'web';
}

function buildLinks(params: {
  videoId: string | null;
  playlistId: string | null;
  platform: Platform;
}): LinkState {
  const { videoId, playlistId, platform } = params;

  if (!videoId && !playlistId) {
    return {
      deepLink: null,
      fallbackLink: null,
      message: '유효한 YouTube 영상 또는 플레이리스트 정보가 없습니다.',
    };
  }

  const query = new URLSearchParams();
  if (videoId) query.set('v', videoId);
  if (playlistId) query.set('list', playlistId);
  const fallbackLink = videoId
    ? `https://www.youtube.com/watch?${query.toString()}`
    : `https://www.youtube.com/playlist?list=${playlistId}`;

  if (platform === 'web') {
    return {
      deepLink: null,
      fallbackLink,
      message: '데스크톱 환경에서는 웹 링크로 이동합니다.',
    };
  }

  if (platform === 'ios') {
    if (videoId) {
      return {
        deepLink: `vnd.youtube://watch?${query.toString()}`,
        fallbackLink,
        message: 'YouTube 앱으로 이동 중입니다.',
      };
    }

    return {
      deepLink: `vnd.youtube://playlist?list=${playlistId}`,
      fallbackLink,
      message: 'YouTube 앱으로 이동 중입니다.',
    };
  }

  if (videoId) {
    return {
      deepLink: `intent://www.youtube.com/watch?${query.toString()}#Intent;package=com.google.android.youtube;scheme=https;end`,
      fallbackLink,
      message: 'YouTube 앱으로 이동 중입니다.',
    };
  }

  return {
    deepLink: `intent://www.youtube.com/playlist?list=${playlistId}#Intent;package=com.google.android.youtube;scheme=https;end`,
    fallbackLink,
    message: 'YouTube 앱으로 이동 중입니다.',
  };
}

export default function RedirectPage() {
  const location = useLocation();
  const [linkState, setLinkState] = useState<LinkState>({
    deepLink: null,
    fallbackLink: null,
    message: '링크를 준비 중입니다.',
  });

  const params = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    let rawVideoId = searchParams.get('v') || searchParams.get('videoId');
    let rawPlaylistId =
      searchParams.get('list') || searchParams.get('playlistId');
    const urlParam = searchParams.get('url');

    if (urlParam) {
      const parsed = parseYouTubeUrl(urlParam);
      rawVideoId = rawVideoId || parsed.videoId;
      rawPlaylistId = rawPlaylistId || parsed.playlistId;
    }

    const videoId = rawVideoId ? parseVideoId(rawVideoId) : null;
    const playlistId = rawPlaylistId ? parsePlaylistId(rawPlaylistId) : null;

    return { videoId, playlistId };
  }, [location.search]);

  useEffect(() => {
    const platform = getPlatform(navigator.userAgent);
    const nextState = buildLinks({ ...params, platform });
    setLinkState(nextState);

    if (nextState.deepLink) {
      const timeoutId = window.setTimeout(() => {
        if (nextState.fallbackLink) {
          window.location.href = nextState.fallbackLink;
        }
      }, 1500);

      window.location.href = nextState.deepLink;
      return () => window.clearTimeout(timeoutId);
    }

    if (nextState.fallbackLink) {
      window.location.href = nextState.fallbackLink;
    }

    return undefined;
  }, [params]);

  return (
    <div className='app redirect'>
      <header className='header'>
        <h1>YouTube 딥링크</h1>
        <p>{linkState.message}</p>
      </header>
      <section className='panel'>
        <p className='helper'>
          자동 이동이 되지 않으면 아래 버튼을 눌러 주세요.
        </p>
        <div className='redirect-actions'>
          {linkState.deepLink && (
            <a className='redirect-button' href={linkState.deepLink}>
              YouTube 앱 열기
            </a>
          )}
          {linkState.fallbackLink && (
            <a
              className='redirect-button outline'
              href={linkState.fallbackLink}
            >
              웹에서 열기
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
