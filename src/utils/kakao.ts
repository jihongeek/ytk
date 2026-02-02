export function isKakaoInitialized(): boolean {
  return window.Kakao?.isInitialized?.() ?? false;
}

export function initKakao(key: string): void {
  if (!window.Kakao) return;
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(key);
  }
}
