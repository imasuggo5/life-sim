# life-sim

React (frontend) + Java/Spring Boot (backend) のモノレポ。段階的に構築中。

## 構成

- `backend/` — Spring Boot 4.0.7, Java 25, Gradle(ラッパー同梱、Gradle自体のインストール不要)
  - `src/main/java/com/lifesim/backend/interfaces/` — APIコントローラー
  - ドメインロジックが増えてきたら `domain/`(エンティティ・値オブジェクト・リポジトリinterface)、`application/`(ユースケース)を `com.lifesim.backend` 配下に追加していく方針
- `frontend/` — React + TypeScript, Vite(ラッパー無し、`.nvmrc`でNode 24.19.0を指定)
  - Viteのデフォルトテンプレートのデモページ・アセットは削除済み(不要なコードを持ち込まない方針)
  - 開発サーバーは`/api`宛のリクエストをbackend(`localhost:8080`)へプロキシする設定(`vite.config.ts`)。フロント単体の動作確認時もbackendを起動しておく必要がある

## ビルド・テスト・起動

```bash
# backend
cd backend
./gradlew build
./gradlew test
./gradlew bootRun

# frontend
cd frontend
npm install
npm run dev
npm run build
```

## コードスタイル

### Backend

Google Java Style を Spotless(`com.diffplug.spotless` + `googleJavaFormat()`)で強制している。

```bash
./gradlew spotlessApply   # 整形を適用
./gradlew spotlessCheck   # 整形崩れがないか検査(CI等で使用)
```

規約チェック(未使用import・命名規則・Javadoc必須化など)はCheckstyle + Googleの公式ruleset(`google_checks.xml`, `backend/config/checkstyle/checkstyle.xml`)で行っている。

```bash
./gradlew checkstyleMain checkstyleTest   # 検査(自動修正はできない)
```

レポートは`backend/build/reports/checkstyle/`に出力される。`./gradlew build`にも組み込まれているが、デフォルト設定では違反はほぼ`warning`扱いのためビルド自体は失敗しない(`error`severityの違反のみビルドを失敗させる)。**pre-commitフックには組み込んでいない**(自動修正できないツールをcommitのブロックに使うと、作業途中のコードをcommitしづらくなるため)。規約違反はビルド時やCI導入後のCIチェックで気づく運用とする。

`build.gradle`(Groovy)自体は`googleJavaFormat()`の対象外(Java専用ツールのため)。`groovyGradle`ブロックで軽量ルール(タブ→スペース、末尾空白除去)のみ整形しており、`greclipse`等の本格的なGroovyフォーマッタは導入していない。

**自動整形の仕組み:**
- IDE(保存時): `.vscode/settings.json`でJavaファイルは`editor.formatOnSave`+`google-java-format for VS Code`拡張機能により、Spotlessと同じエンジンで整形される。`.vscode/extensions.json`で拡張機能を推奨表示。IntelliJの場合は`google-java-format`プラグインを有効化すると標準の整形ショートカット(`Ctrl+Alt+L`)がGoogleスタイルになる。
- コミット時: `git config core.hooksPath .githooks`(clone後に1回実行)を設定していれば、`.githooks/pre-commit`が`./gradlew spotlessApply`を自動実行し、整形済みの状態で再ステージしてからコミットされる。`build.gradle`はIDE側では整形されないため、実質このフックが唯一の整形経路になる。

### Frontend

backendと同じ「Google公式スタイル」路線。整形は[Prettier](https://prettier.io/)(設定はGoogleの[`gts`](https://github.com/google/gts)のものをそのまま使用: `frontend/.prettierrc.json`)、規約チェックは`gts`のESLint設定(`require('gts')`で読み込み)にReact用ルール(`eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`)を足したもの(`frontend/eslint.config.js`)。Vite標準の`oxlint`は不使用(Google系ツールに統一するため置き換え)。

```bash
npm run format:fix   # 整形を適用(spotlessApply相当)
npm run format       # 整形崩れがないか検査(spotlessCheck相当)
npm run lint          # 規約チェック(checkstyleMain相当、自動修正なし)
```

自動整形の仕組みもbackendと対称: IDE保存時は`.vscode/settings.json`の`[typescript]`/`[typescriptreact]`スコープで`esbenp.prettier-vscode`が`editor.formatOnSave`により動作。コミット時は`.githooks/pre-commit`が`npm run format:fix`を自動実行する。`lint`(ESLint)は自動修正できないため、backendのCheckstyleと同様pre-commitフックには含めていない。

`gts`自体は`typescript-eslint`/`eslint`/`prettier`等を依存関係として同梱しているため、`frontend/package.json`には`gts`のみを明示的に追加している(バージョンの二重管理を避けるため)。

## 環境メモ(Windows/ARM64)

シェルセッションによっては `JAVA_HOME` がPATHに反映されていないことがある。その場合は `gradlew` 実行前に以下が必要:

```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-25.0.4.7-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
```
