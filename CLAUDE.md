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

backendとは異なり、こちらはGoogle系ではなく**Vite公式テンプレートの標準構成**をそのまま採用する方針(frontend界隈での最頻出パターンを優先)。整形は[Prettier](https://prettier.io/)(デフォルト設定、カスタマイズ無し)、規約チェックは[oxlint](https://oxc.rs/)(`frontend/.oxlintrc.json`はVite公式テンプレート生成のまま)。一度`gts`(Google TypeScript Style)ベースの構成を試したが、「frontendではGoogle色を出さず、Viteの最頻出構成に揃える」という判断で撤回した経緯がある。

```bash
npm run format:fix   # 整形を適用
npm run format       # 整形崩れがないか検査
npm run lint          # 規約チェック(oxlint)
```

自動整形はbackendと同じ2段構え: IDE保存時は`.vscode/settings.json`の`[typescript]`/`[typescriptreact]`スコープで`esbenp.prettier-vscode`が`editor.formatOnSave`により動作(Lintのエディタ統合は`oxc.oxc-vscode`拡張機能)。コミット時は`.githooks/pre-commit`が`npm run format:fix`を自動実行する。`lint`(oxlint)はpre-commitフックには含めていない。

## CI/CD

`.github/workflows/ci.yml`で、`main`へのpush/PR時に`test-backend`(`./gradlew build`)・`test-frontend`(`npm run format`/`lint`/`build`)を実行している。両ジョブとも`ubuntu-latest`(コスト最小化のため、Linuxランナーは公開リポジトリでは無料・Windowsは2倍/macOSは10倍の消費倍率)。

`push-image`ジョブは**PRが実際にマージされた時だけ**実行される(`pull_request: types: [closed]` + `if: github.event.pull_request.merged == true`。直接pushやフォークからのPRクローズでは発火しない)。これに伴い、このリポジトリは`main`への直接pushではなく**PR経由での変更を基本とする運用**にしている(直接pushを続けると、その変更は`push-image`のトリガーにならない)。Workload Identity Federationで認証し、ルートの`Dockerfile`をビルドしてArtifact Registryに`latest`と`${{ github.sha }}`タグでpushする。Docker HubではなくArtifact Registryを使う方針(非公開Docker Hubの場合、結局Artifact Registryのremote repository機能が必要になりメリットが薄いため)。

`deploy`ジョブ(`push-image`と同じPRマージ限定の条件)が、`google-github-actions/deploy-cloudrun`でCloud Runにデプロイする。コスト最小化のため`--min-instances=0`(スケールtoゼロ)・`--max-instances=2`を指定。Cloud Runはデフォルトで未認証アクセスを拒否する(初回デプロイ時に`--allow-unauthenticated`を付け忘れ、`403 Forbidden`になった経緯がある)ため、`--allow-unauthenticated`を必ず指定する。

カスタムドメイン(`imasuggo5.com`、お名前.comで取得)をCloud Runのドメインマッピング機能で紐づけている。固定IPは使っていない(Cloud Runはそもそも固定IPという概念を持たず、ドメインマッピングだけなら追加コストなしで独自ドメインが使える。固定IPが本当に必要な場合はGlobal Load Balancerが必要になり、月$18程度の固定費が発生するため今回は不採用)。

## 環境メモ(Windows/ARM64)

シェルセッションによっては `JAVA_HOME` がPATHに反映されていないことがある。その場合は `gradlew` 実行前に以下が必要:

```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-25.0.4.7-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
```

**Docker DesktopではなくWSL2内のDocker Engineを使う**: このマシン(ARM64 Windows)ではDocker Desktopが不安定だった(`docker build`のイメージpullが極端に遅くなる・`docker info`が応答しなくなる・GUIがエラーになる等)。原因は、Docker DesktopがWindowsホストとWSL2内の実際のデーモンとの間を名前付きパイプで橋渡ししており、この境界を跨ぐ通信が不安定になりやすいため(ARM64版Windowsという組み合わせ自体がまだ枯れていないことも一因と思われる)。そのため、**Docker DesktopのGUIを使わず、WSL2(Ubuntu)内に直接Docker Engineをインストールする**方式に移行済み。

セットアップ手順(初回のみ、WSLのターミナル内で実行):

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo service docker start
```

`usermod`でグループに追加した変更は、WSLのターミナルを一度閉じて開き直す(または`newgrp docker`)まで反映されない。WSLを再起動するたびに`sudo service docker start`でデーモンを起動し直す必要がある(systemdではないため自動起動しない)。

`docker`コマンド自体はWindows側のGitHub Bash/PowerShellからではなく、**`wsl -d Ubuntu -e <command>`経由、またはWSLのターミナルを直接開いて**実行する。
