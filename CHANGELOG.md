# Changelog

## [3.4.1](https://github.com/aiyu-ayaan/Aiyu/compare/v3.4.0...v3.4.1) (2026-04-04)


### Bug Fixes

* enhance Docker setup with Redis and PM2 support, update README and add local compose file ([017102d](https://github.com/aiyu-ayaan/Aiyu/commit/017102dd4b40cef0f7b01f54502d6f0068221219))

## [3.4.0](https://github.com/aiyu-ayaan/Aiyu/compare/v3.3.0...v3.4.0) (2026-04-04)


### Features

* add BlogLinkInput component to support internal blog selection and external URL entry ([7604dbe](https://github.com/aiyu-ayaan/Aiyu/commit/7604dbe38191d2beb093ca935a01048aa505de81))
* enhance blog management with slug generation and Open Graph image support ([147b1fd](https://github.com/aiyu-ayaan/Aiyu/commit/147b1fdec616cea952949f3fea7b9a9738718701))
* implement client-side project filtering, sorting, and display components for the projects page ([ef3211f](https://github.com/aiyu-ayaan/Aiyu/commit/ef3211f501393acb766924ce1a612cafb0ef6a57))
* implement deployment and project management components with associated data models and fetchers ([2fb8193](https://github.com/aiyu-ayaan/Aiyu/commit/2fb8193b14197db43d8081b581807b33d1d6576b))
* Minor Relase done ✅ ([2d18584](https://github.com/aiyu-ayaan/Aiyu/commit/2d18584337f6bef6c7eb33e2ddf43e144a598a45))
* **workflows:** enhance deployment process with manual release notes and PR checks ([1e12e89](https://github.com/aiyu-ayaan/Aiyu/commit/1e12e8931d3739d1a4aec9519d30e9f8a461b665))


### Bug Fixes

* **blog:** restore soft detail page background blend ([af26085](https://github.com/aiyu-ayaan/Aiyu/commit/af26085ff4656c32ef54ea7ca4c63fc933104372))
* **build:** skip db fetches during build with safe data fallbacks ([b2fa0d0](https://github.com/aiyu-ayaan/Aiyu/commit/b2fa0d0991fc1a44afde4556832786460f29645a))
* **cache:** harden redis usage in docker runtime ([9bec460](https://github.com/aiyu-ayaan/Aiyu/commit/9bec460eb7646e05515b19a1c2f69265db96920f))
* **cache:** verify redis-backed API caching in dev ([ff4053a](https://github.com/aiyu-ayaan/Aiyu/commit/ff4053abfae51566abba42c7e14718ecaa40e0fc))
* **deployments, projects:** adjust heading margin and padding for improved layout ([bbf58fc](https://github.com/aiyu-ayaan/Aiyu/commit/bbf58fc8bd8518ff98b1e75d8ccaf5968b6dc3df))


### Performance Improvements

* **api:** optimize public queries with caching, lean reads, and limits ([57dff63](https://github.com/aiyu-ayaan/Aiyu/commit/57dff639505546a4a980e49cc66050fd8fdc641e))
* **cache:** add Redis-backed shared cache with memory fallback ([3d6022f](https://github.com/aiyu-ayaan/Aiyu/commit/3d6022f1d8eb85a60dd7db94faa4522ef1b399e0))
* **rendering:** enable ISR and server-prefetch public content ([c0c8fc2](https://github.com/aiyu-ayaan/Aiyu/commit/c0c8fc24523ec69083b1435658817287ca7811e7))
* **scroll:** reduce blog detail paint cost ([1788765](https://github.com/aiyu-ayaan/Aiyu/commit/1788765f8dd86bdbf0930c4879108f2cc5c3048c))

## [3.3.0](https://github.com/aiyu-ayaan/Aiyu/compare/v3.2.0...v3.3.0) (2026-03-31)


### Features

* Beta Badge Integration ([#139](https://github.com/aiyu-ayaan/Aiyu/issues/139)) ([70a1e77](https://github.com/aiyu-ayaan/Aiyu/commit/70a1e774934d54af28467e011ff6d13ad0446d52))

## [3.2.0](https://github.com/aiyu-ayaan/Aiyu/compare/v3.1.0...v3.2.0) (2026-03-30)


### Features

* User Experience & UI Improvements ([#134](https://github.com/aiyu-ayaan/Aiyu/issues/134)) ([60cb754](https://github.com/aiyu-ayaan/Aiyu/commit/60cb754f6ef9ec7e8b40032bc2eaec3fa75c0f6d))

## [3.0.1](https://github.com/aiyu-ayaan/Aiyu/compare/v3.0.0...v3.0.1) (2026-03-29)


### Bug Fixes

* Release v3.0.1 done([#127](https://github.com/aiyu-ayaan/Aiyu/issues/127)) ([243b5c5](https://github.com/aiyu-ayaan/Aiyu/commit/243b5c5f53fa40f92f32cb46c5ca92e3043d587d))

## [3.0.0](https://github.com/aiyu-ayaan/Aiyu/compare/v2.1.11...v3.0.0) (2026-03-29)


### ⚠ BREAKING CHANGES

* theme interaction model changed (legacy segmented theme control removed), and UI structure/behavior has been fully redesigned across major routes.

### Features

* Release V2.1.12  ([#125](https://github.com/aiyu-ayaan/Aiyu/issues/125)) ([46eddf6](https://github.com/aiyu-ayaan/Aiyu/commit/46eddf657269ddead90e91d42528a307aa0f0024))
