import { PlaylistItem, PlaylistMeta } from './youtubeApi';
import { isKakaoInitialized } from '../utils/kakao.ts';
import { buildFallbackThumbnail } from '../utils/youtube';

type KakaoShareParams = {
  meta: PlaylistMeta;
  playlistId: string;
  items: PlaylistItem[];
  limit?: number;
};

export function sendKakaoShare({
  meta,
  playlistId,
  items,
  limit = 3,
}: KakaoShareParams): void {
  if (!window.Kakao || !isKakaoInitialized()) {
    throw new Error('카카오 SDK 초기화에 실패했습니다. 키를 확인해 주세요.');
  }

  if (!meta || !playlistId || items.length === 0) {
    throw new Error('공유할 데이터가 없습니다.');
  }

  const redirectOrigin =
    (import.meta.env.VITE_REDIRECT_ORIGIN as string | undefined) ||
    `${window.location.protocol}//${window.location.host}`;
  const redirectBase = `${redirectOrigin}/redirect`;
  const buildRedirectLink = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    return `${redirectBase}?${searchParams.toString()}`;
  };
  const playlistRedirectLink = buildRedirectLink({ list: playlistId });
  const contents = items.slice(0, limit).map((item) => {
    const videoRedirectLink = buildRedirectLink({
      v: item.videoId,
      list: playlistId,
    });
    const fallbackThumbnail = buildFallbackThumbnail(item.videoId);
    return {
      title: item.title,
      description: item.description || meta.channelTitle,
      imageUrl: item.thumbnailUrl || fallbackThumbnail,
      link: {
        webUrl: videoRedirectLink,
        mobileWebUrl: videoRedirectLink,
      },
    };
  });

  if (contents.length < 2) {
    throw new Error('리스트 메시지는 최소 2개 영상이 필요합니다.');
  }

  try {
    window.Kakao.Share.sendDefault({
      objectType: 'list',
      headerTitle: meta.title,
      headerLink: {
        webUrl: playlistRedirectLink,
        mobileWebUrl: playlistRedirectLink,
      },
      contents,
      buttons: [
        {
          title: '유투브에서 보기',
          link: {
            webUrl: playlistRedirectLink,
            mobileWebUrl: playlistRedirectLink,
          },
        },
      ],
    });
  } catch {
    throw new Error(
      '카카오 공유에 실패했습니다. 카카오 개발자 콘솔의 웹 도메인에 youtube.com과 img.youtube.com을 등록했는지 확인해 주세요.'
    );
  }
}
