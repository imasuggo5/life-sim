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

`build.gradle`(Groovy)自体は`googleJavaFormat()`の対象外(Java専用ツールのため)。`groovyGradle`ブロックで軽量ルール(タブ→スペース、末尾空白除去)のみ整形しており、`greclipse`等の本格的なGroovyフォーマッタは導入していない。

**自動整形の仕組み:**
- IDE(保存時): `.vscode/settings.json`でJavaファイルは`editor.formatOnSave`+`google-java-format for VS Code`拡張機能により、Spotlessと同じエンジンで整形される。`.vscode/extensions.json`で拡張機能を推奨表示。IntelliJの場合は`google-java-format`プラグインを有効化すると標準の整形ショートカット(`Ctrl+Alt+L`)がGoogleスタイルになる。
- コミット時: `git config core.hooksPath .githooks`(clone後に1回実行)を設定していれば、`.githooks/pre-commit`が`./gradlew spotlessApply`を自動実行し、整形済みの状態で再ステージしてからコミットされる。`build.gradle`はIDE側では整形されないため、実質このフックが唯一の整形経路になる。

## 環境メモ(Windows/ARM64)

シェルセッションによっては `JAVA_HOME` がPATHに反映されていないことがある。その場合は `gradlew` 実行前に以下が必要:

```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-25.0.4.7-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
```
