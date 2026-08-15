# life-sim

React (frontend) + Java/Spring Boot (backend) のモノレポ。段階的に構築中で、現状は `backend/` のみ存在する(`frontend/` は未着手)。

## 構成

- `backend/` — Spring Boot 4.0.7, Java 25, Gradle(ラッパー同梱、Gradle自体のインストール不要)
  - `src/main/java/com/lifesim/backend/interfaces/` — APIコントローラー
  - ドメインロジックが増えてきたら `domain/`(エンティティ・値オブジェクト・リポジトリinterface)、`application/`(ユースケース)を `com.lifesim.backend` 配下に追加していく方針

## ビルド・テスト・起動

```bash
cd backend
./gradlew build
./gradlew test
./gradlew bootRun
```

## コードスタイル

Google Java Style を Spotless(`com.diffplug.spotless` + `googleJavaFormat()`)で強制している。

```bash
./gradlew spotlessApply   # 整形を適用
./gradlew spotlessCheck   # 整形崩れがないか検査(CI等で使用)
```

Checkstyleによる規約チェック(命名規則・Javadoc必須化など)は未導入。

IDE連携(任意): IntelliJなら`google-java-format`プラグインを有効化すると標準の整形ショートカット(`Ctrl+Alt+L`)がGoogleスタイルになる。VSCodeなら拡張機能`google-java-format for VS Code`をJavaのデフォルトフォーマッタに設定すると`Shift+Alt+F`で同様に整形される。

## 環境メモ(Windows/ARM64)

シェルセッションによっては `JAVA_HOME` がPATHに反映されていないことがある。その場合は `gradlew` 実行前に以下が必要:

```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-25.0.4.7-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
```
