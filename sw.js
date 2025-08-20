const CACHE_NAME = 'click-game-v2';
const urlsToCache = [
    '/pwacocos/',
    '/pwacocos/index.html',
    '/pwacocos/main.js',
    '/pwacocos/button.png',
    '/pwacocos/icon.png',
    '/pwacocos/manifest.json'
];

// ServiceWorker 설치 시 캐시에 파일들을 저장
self.addEventListener('install', (event) => {
    console.log('ServiceWorker 설치 중...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('캐시가 열렸습니다');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('모든 파일이 캐시에 저장되었습니다');
                return self.skipWaiting();
            })
    );
});

// 활성화 시 이전 캐시 정리
self.addEventListener('activate', (event) => {
    console.log('ServiceWorker 활성화 중...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('이전 캐시를 삭제합니다:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;

    // pwacocos 폴더 내 요청인지 확인
    if (request.url.includes('/pwacocos/')) {
        event.respondWith(
            caches.match(request)
                .then((response) => {
                    if (response) {
                        return response; // 캐시에서 반환
                    }

                    // 캐시에 없으면 네트워크에서 가져와서 캐시에 저장
                    return fetch(request).then((response) => {
                        if (response && response.status === 200) {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(request, responseToCache);
                            });
                        }
                        return response;
                    });
                })
        );
    }
});
