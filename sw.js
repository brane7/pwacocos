const CACHE_NAME = 'click-game-runtime-v4';

// ServiceWorker 설치 시 - 사전 캐시 없이 즉시 활성화
self.addEventListener('install', (event) => {
    console.log('🚀 ServiceWorker 런타임 캐시 모드로 설치 중...');
    // 사전 캐시 없이 즉시 활성화
    self.skipWaiting();
});

// 활성화 시 이전 캐시 정리 및 클라이언트 제어권 확보
self.addEventListener('activate', (event) => {
    console.log('🔄 ServiceWorker 런타임 캐시 모드로 활성화 중...');
    event.waitUntil(
        Promise.all([
            // 이전 캐시 정리
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('🗑️ 이전 캐시 삭제:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // 즉시 클라이언트 제어권 확보
            self.clients.claim()
        ]).then(() => {
            console.log('✅ ServiceWorker 런타임 캐시 모드 활성화 완료!');
        })
    );
});

// 런타임 캐시 전략: 사용자가 요청한 리소스만 캐시
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // pwacocos 폴더 내 요청만 처리
    if (request.url.includes('/pwacocos/')) {
        event.respondWith(
            // 1. 먼저 캐시에서 찾기
            caches.match(request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        console.log('💾 캐시 히트:', request.url);
                        return cachedResponse; // 캐시에서 반환
                    }

                    console.log('🌐 네트워크 요청:', request.url);

                    // 2. 캐시에 없으면 네트워크에서 가져오기
                    return fetch(request)
                        .then((networkResponse) => {
                            // 3. 성공적인 응답만 캐시에 저장
                            if (networkResponse && networkResponse.status === 200) {
                                const responseToCache = networkResponse.clone();

                                // 캐시에 저장 (비동기)
                                caches.open(CACHE_NAME).then((cache) => {
                                    cache.put(request, responseToCache);
                                    console.log('💾 새 리소스 캐시됨:', request.url);
                                }).catch((error) => {
                                    console.warn('⚠️ 캐시 저장 실패:', error);
                                });
                            }

                            return networkResponse;
                        })
                        .catch((error) => {
                            console.error('❌ 네트워크 요청 실패:', request.url, error);

                            // 네트워크 실패 시 fallback 응답
                            if (request.destination === 'image') {
                                return new Response('이미지를 로드할 수 없습니다', {
                                    status: 404,
                                    statusText: 'Not Found'
                                });
                            }

                            throw error;
                        });
                })
        );
    }
});

// 캐시 관리: 메시지 이벤트로 캐시 정리 및 정보 조회 가능
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        console.log('🧹 캐시 정리 요청 받음');
        caches.delete(CACHE_NAME).then(() => {
            console.log('✅ 캐시 정리 완료');
            event.ports[0].postMessage({ success: true });
        }).catch((error) => {
            console.error('❌ 캐시 정리 실패:', error);
            event.ports[0].postMessage({ success: false, error: error.message });
        });
    }

    if (event.data && event.data.type === 'GET_CACHE_INFO') {
        console.log('📊 캐시 정보 요청 받음');
        caches.open(CACHE_NAME).then((cache) => {
            return cache.keys();
        }).then((requests) => {
            const cacheInfo = {
                cacheName: CACHE_NAME,
                cachedUrls: requests.map(req => req.url),
                totalItems: requests.length
            };
            console.log('📊 캐시 정보:', cacheInfo);
            event.ports[0].postMessage({ success: true, data: cacheInfo });
        }).catch((error) => {
            console.error('❌ 캐시 정보 조회 실패:', error);
            event.ports[0].postMessage({ success: false, error: error.message });
        });
    }
});
