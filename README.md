# life-sim

React (frontend) + Java/Spring Boot (backend) のモノレポ。現状は `backend/` のみ実装済み。

## セットアップ(clone後に1回)

```bash
git config core.hooksPath .githooks
```

コミット前に自動整形(後述)が走るようにするための設定。加えて、VSCodeで開くと `.vscode/extensions.json` から `google-java-format` 拡張機能の導入が推奨される(保存時に自動整形される)。

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

`.java`と`build.gradle`(Groovy)の両方が対象。`git config core.hooksPath .githooks`を設定済みなら、コミット時に`.githooks/pre-commit`が自動で`spotlessApply`を実行し、整形済みの状態でコミットされる。

### 規約チェック(Checkstyle)

Google公式ruleset(`google_checks.xml`)を使い、未使用import・命名規則・Javadoc必須化などをチェックする。

```bash
./gradlew checkstyleMain checkstyleTest
```

レポートは`backend/build/reports/checkstyle/`に出力される。自動修正はできないため、pre-commitフックには含まれていない(`./gradlew build`実行時、またはCI導入後はCIで検知する)。
