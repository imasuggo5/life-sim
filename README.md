# life-sim

React (frontend) + Java/Spring Boot (backend) のモノレポ。現状は `backend/` のみ実装済み。

## Backend

Spring Boot 4.0.7 / Java 25 / Gradle。

```bash
cd backend
./gradlew build       # ビルド
./gradlew test        # テスト
./gradlew bootRun      # 起動 (http://localhost:8080, /api/health で疎通確認可能)
```

### コードフォーマット

Google Java Style を [Spotless](https://github.com/diffplug/spotless) 経由で強制している。

```bash
./gradlew spotlessApply   # 整形を適用
./gradlew spotlessCheck   # 整形崩れがないか検査
```
