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

### 検索エンジン対応

検索エンジンに見つかりやすくする方針(独自ドメインは持たず、Cloud Runの自動生成URL`*.a.run.app`のまま運用)。

- `frontend/index.html`: `description`/OGPメタタグを設定
- `frontend/public/robots.txt`: 全クローラーを明示的に許可(`Allow: /`)
- **Google Search Console**: `https://life-sim-7kbsgabama-an.a.run.app`を「URLプレフィックス」プロパティとして登録済み。所有権確認は`index.html`内の`google-site-verification`メタタグ方式(HTMLファイルアップロード方式ではなくこちらを採用、コード管理下に置けるため)。確認後、Search Consoleの「URL検査」ツールから「インデックス登録をリクエスト」すると、自然なクロールを待つより早くインデックスされる
- GitHubリポジトリの「About」欄にも、実際のCloud RunのURLをWebsiteとして設定すると、GitHubからの被リンクとして発見されやすくなる

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
- **push-image**: **PRが実際にマージされた時だけ**実行(`pull_request: types: [closed]` + `if: github.event.pull_request.merged == true`。直接`main`へのpushやマージせず閉じたPRでは発火しない)。Workload Identity Federationで認証し、ルートの`Dockerfile`をビルドしてArtifact Registryに`latest`と`${{ github.sha }}`タグでpushする
- **deploy**: `push-image`と同じ条件(PRマージ時のみ)で実行。`google-github-actions/deploy-cloudrun`で、Artifact Registryにpushしたイメージ(`${{ github.sha }}`タグ)をCloud Runにデプロイする。コスト最小化のため`--min-instances=0`(スケールtoゼロ)・`--max-instances=2`(意図しないトラフィック急増への上限)を指定。**`--allow-unauthenticated`も必須**(Cloud Runはデフォルトで未認証アクセスを拒否するため、これが無いと誰もアクセスできず`403 Forbidden`になる)

### GCP事前準備(Artifact Registryへのpushに必要、初回のみ)

以下は`gcloud` CLIが使える環境(Cloud Shell、またはローカルに`gcloud`をインストール済みの環境)で実行する。Terraformは使わず、コマンドを直接実行する方針(このプロジェクトの規模ではTerraformのState管理コストの方が大きいため)。

**1. プロジェクト作成 + 課金アカウント紐付け**

```bash
# プロジェクトIDはグローバルに一意である必要がある。例: life-sim-<好きな文字列>
gcloud projects create life-sim-prod --name="life-sim"
gcloud config set project life-sim-prod

# 課金アカウントIDを確認してから紐付け(Cloud Run/Artifact Registryは無料枠内想定だが、GCPの仕様上プロジェクトへの課金アカウント紐付け自体は必須)
gcloud billing accounts list
gcloud billing projects link life-sim-prod --billing-account=XXXXXX-XXXXXX-XXXXXX
```

**2. 必要なAPIを有効化**

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iamcredentials.googleapis.com
```

**3. Artifact Registryリポジトリ作成 + クリーンアップポリシー設定**

```bash
gcloud artifacts repositories create life-sim \
  --repository-format=docker \
  --location=asia-northeast1

# 直近2バージョンのみ保持し、無料枠(0.5GB/月)超過を防ぐ
# (トップレベルは配列。packageNamePrefixesを省略するとリポジトリ内の全パッケージが対象になる)
cat > /tmp/cleanup-policy.json << 'EOF'
[
  {
    "name": "keep-recent-versions",
    "action": {"type": "Keep"},
    "mostRecentVersions": {
      "keepCount": 2
    }
  }
]
EOF

gcloud artifacts repositories set-cleanup-policies life-sim \
  --location=asia-northeast1 \
  --policy=/tmp/cleanup-policy.json
```

**4. Workload Identity Federationのセットアップ(GitHub Actions用のkeyless認証)**

```bash
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
GITHUB_REPO="imasuggo5/life-sim"

# Workload Identity Pool作成
gcloud iam workload-identity-pools create "github-pool" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# OIDC Provider作成(このリポジトリ以外からの認証は拒否するよう制限)
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Actions Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${GITHUB_REPO}'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# デプロイ用サービスアカウント作成
gcloud iam service-accounts create life-sim-deployer \
  --display-name="life-sim GitHub Actions deployer"

# Artifact Registryへのpush権限を付与(Cloud Runへのデプロイ権限は、実際にデプロイジョブを作る段階で追加する)
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:life-sim-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# このGitHubリポジトリからのimpersonationを許可
gcloud iam service-accounts add-iam-policy-binding \
  "life-sim-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/${GITHUB_REPO}"
```

**5. GitHubリポジトリにSecrets/Variablesを登録**

まず登録すべき値を確認:

```bash
echo "GCP_PROJECT_ID: ${PROJECT_ID}"
echo "GAR_LOCATION: asia-northeast1"
echo "GCP_WORKLOAD_IDENTITY_PROVIDER: projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
echo "GCP_SERVICE_ACCOUNT: life-sim-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
```

`gh` CLIが使える場合:

```bash
gh variable set GCP_PROJECT_ID --body "$PROJECT_ID"
gh variable set GAR_LOCATION --body "asia-northeast1"
gh secret set GCP_WORKLOAD_IDENTITY_PROVIDER --body "projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
gh secret set GCP_SERVICE_ACCOUNT --body "life-sim-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
```

`gh` CLIが無い場合は、GitHubリポジトリの Settings > Secrets and variables > Actions から手動で登録する(Variablesタブに`GCP_PROJECT_ID`・`GAR_LOCATION`、Secretsタブに`GCP_WORKLOAD_IDENTITY_PROVIDER`・`GCP_SERVICE_ACCOUNT`)。

### Cloud Runへのデプロイに必要な追加権限

Artifact Registryへのpushに加えて、Cloud Runへのデプロイ権限を`life-sim-deployer`に付与する。あわせて、**Cloud Runサービス自体が実行時に使う専用のサービスアカウント**(`life-sim-runtime`)を新規作成する(このアプリはGCPの他のAPIを呼ばないため、追加の権限は一切付与しない最小権限のアカウントにする。GCPのデフォルトのCompute Engine用サービスアカウントに依存すると、Compute Engine APIを有効化していないプロジェクトでは存在せずエラーになるため、依存しない設計にしている)。

```bash
PROJECT_ID=$(gcloud config get-value project)

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:life-sim-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Cloud Run実行専用のサービスアカウントを作成(追加の権限は付与しない)
gcloud iam service-accounts create life-sim-runtime \
  --display-name="life-sim Cloud Run runtime"

# life-sim-deployerが、デプロイ時にこのランタイム用アカウントを指定できるようにする(actAs権限)
gcloud iam service-accounts add-iam-policy-binding \
  "life-sim-runtime@${PROJECT_ID}.iam.gserviceaccount.com" \
  --member="serviceAccount:life-sim-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### IAM構成の全体像

**リソース一覧:**

| リソース名 | 種類 | 役割 |
|---|---|---|
| `github-pool` | Workload Identity Pool | GitHubからの外部認証を受け付ける入れ物 |
| `github-provider` | Provider(`github-pool`内) | GitHub Actionsを信頼する設定。`imasuggo5/life-sim`のみ許可(`--attribute-condition`) |
| `life-sim-deployer` | サービスアカウント | **CI/CDが名乗る**、デプロイ作業用のアカウント |
| `life-sim-runtime` | サービスアカウント | **デプロイ後のCloud Runアプリ自身**が実行時に使うアカウント |

**権限(IAMバインディング)の整理:**

1. `life-sim-deployer`にプロジェクト全体への権限を付与: `roles/artifactregistry.writer`(pushできる)・`roles/run.admin`(デプロイできる)
2. `life-sim-deployer`自身に対し、`github-pool`経由で`imasuggo5/life-sim`から来た身元だけが`roles/iam.workloadIdentityUser`でなりすませるよう設定
3. `life-sim-runtime`自身に対し、`life-sim-deployer`が`roles/iam.serviceAccountUser`で「デプロイ時にこのアカウントを使わせる」と指定できるよう設定
4. `life-sim-runtime`自体には**権限を一切付与しない**(アプリは他のGCP APIを呼ばないため、意図的に最小権限)

**全体の流れ(1回のデプロイで起きること):**

```
GitHub Actions(imasuggo5/life-sim)
  → ①OIDCトークンで認証(github-poolのProviderが検証)
  → ②workloadIdentityUser権限により life-sim-deployer になりすます
life-sim-deployer(CI/CD用アカウント)
  → ③artifactregistry.writer権限でイメージをpush
  → ④run.admin権限でCloud Runにデプロイを実行
  → ⑤serviceAccountUser権限で「実行は life-sim-runtime で」と指定
Cloud Run上で life-sim-runtime として稼働
  (このアカウントには何の権限も無い = アプリに脆弱性があっても他のGCPリソースには影響しない)
```

「デプロイする権限を持つアカウント(`life-sim-deployer`)」と「実際にアプリが動く時のアカウント(`life-sim-runtime`)」を分離することで、被害範囲を最小化する設計にしている。
