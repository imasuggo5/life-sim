# life-sim

React (frontend) + Java/Spring Boot (backend) のモノレポ。

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

### 開発時の自動リスタート(spring-boot-devtools)

`bootRun`には`spring-boot-devtools`(`developmentOnly`スコープ、本番jarには含まれない)が入っており、コンパイル結果が更新されると自動でアプリが再起動する。

ただし、IDE(VSCode等)は保存時に独自の出力先(`bin/`)へコンパイルするため、devtoolsが監視している`build/classes/...`は自動では更新されない。コードを保存したら、**別ターミナルで以下を実行**して反映させる:

```bash
./gradlew classes
```

`./gradlew bootRun --continuous`を使えば、この手動実行も自動化できるはずだが、**ARM64版Windows環境では動作しない**(Gradleのファイル監視機能が依存する`native-platform`ライブラリがARM64 Windows向けにビルドされていないため、[gradle/gradle#21703](https://github.com/gradle/gradle/issues/21703) 参照)。x64版Windows/Mac/Linuxでは問題なく動くはずなので、該当環境の場合は試してみてよい。

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

## Frontend

React + TypeScript / Vite。

```bash
cd frontend
npm install
npm run dev     # 開発サーバー起動 (http://localhost:5173)
npm run build   # 本番ビルド (dist/)
```

開発サーバーは`/api`宛のリクエストを`http://localhost:8080`(backend)へプロキシする設定になっている(`vite.config.ts`)。フロントの動作確認をするときは、backendを`./gradlew bootRun`で起動しておくこと。

### コードフォーマット・規約チェック

Vite公式テンプレートの標準構成([Prettier](https://prettier.io/)はデフォルト設定、Lintは[oxlint](https://oxc.rs/)、どちらも特定のスタイルガイドには寄せていない)をそのまま使っている。

```bash
npm run format        # 整形崩れがないか検査
npm run format:fix    # 整形を適用
npm run lint           # 規約チェック(oxlint)
```

`git config core.hooksPath .githooks`を設定済みなら、コミット時に`.githooks/pre-commit`が`format:fix`(Prettier)を自動実行する。`lint`(oxlint)はpre-commitフックには含めていない。

## 本番ビルド(1つのアーティファクトにまとめる)

ローカル開発ではfrontend/backendを別プロセスで動かすが、本番はfrontendのビルド成果物をbackendのjarに埋め込み、**Cloud Runサービス1つ**で動かす構成にする。

```bash
cd frontend && npm run build
cp -r dist/* ../backend/src/main/resources/static/
cd ../backend && ./gradlew bootRun
# http://localhost:8080/ でフロント、/api/health でAPIが確認できる
```

または Docker で一括ビルド:

```bash
docker build -t life-sim .
docker run -p 8080:8080 life-sim
```

`backend/src/main/java/com/lifesim/backend/config/SpaWebConfig.java`が、`classpath:/static/`配下の静的ファイル配信と、存在しないパスを`index.html`にフォールバックする処理(SPAのクライアントサイドルーティング用)を担っている。`backend/src/main/resources/static/`は`.gitkeep`のみをコミットしており、実際のビルド成果物はgit管理外(`.gitignore`参照)。

### Docker(ARM64 Windows環境)

ARM64版Windowsでは、Docker Desktopが不安定になりやすい(`docker build`のpullが極端に遅い、`docker info`が応答しない、GUIがエラーになる等)ため、**Docker DesktopのGUIは使わず、WSL2(Ubuntu)内に直接Docker Engineをインストールして使う**。

```bash
# WSLのターミナル内で、初回のみ
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER   # 反映にはターミナルの再起動が必要
sudo service docker start        # WSL再起動のたびに必要(systemd不使用のため自動起動しない)
```

Windows側から使う場合は `wsl -d Ubuntu -e docker ...` のように呼び出すか、WSLのターミナルを直接開いて操作する。

## CI/CD

`.github/workflows/ci.yml`が、`main`へのpushとPull Request時に以下を実行する(Linuxランナー、公開リポジトリのため無料):

- **test-backend**: `./gradlew build`(Spotless/Checkstyle/testすべて含む)
- **test-frontend**: `npm run format` / `npm run lint` / `npm run build`

現時点ではテストのみで、GCPへのデプロイは行わない。今後、段階的に以下を追加していく予定:

1. Artifact Registryへのイメージpush(要GCP事前準備: プロジェクト作成、API有効化、Workload Identity Federation設定)
2. Cloud Runへのデプロイ(要追加のIAM権限)

デプロイ関連の処理は`main`への直接pushの時だけ実行する設計にする予定(フォークからのPull Requestがデプロイ処理を起動しないようにするため)。
